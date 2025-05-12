import express, { type Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { promisify } from "node:util";
import { randomBytes, timingSafeEqual, scrypt } from "node:crypto";
import { storage } from "./storage.js";
import { User as SelectUser } from "@shared/schema.js";
import { type DecodedIdToken } from "firebase-admin/auth";
import { auth, db } from "./firebaseAdmin.js";
import { shouldUseEmulators } from "./firebaseEmulators.js";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

declare module 'express-session' {
  interface SessionData {
    anonymousSearchCount?: number;
    conversationContext?: Array<{
      query: string;
      answer?: string;
      timestamp: number;
    }>;
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: express.Application) {
  const MemStore = MemoryStore(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "find-search-secret-key",
    resave: false,
    saveUninitialized: true, 
    store: new MemStore({
      checkPeriod: 86400000, 
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, 
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        let retries = 3;
        let user = null;
        let lastError = null;
        
        while (retries > 0 && !user) {
          try {
            user = await storage.getUserByUsername(username);
            break;
          } catch (err) {
            console.log(`Database error in getUserByUsername, retries left: ${retries}`, err);
            lastError = err;
            retries--;
            const delay = Math.min(100 * Math.pow(2, 3 - retries), 2000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        if (!user) {
          if (lastError) {
            console.error("Database error after retries:", lastError);
            return done(lastError);
          }
          return done(null, false, { message: 'Invalid username' });
        }
        
        try {
          const isValidPassword = await comparePasswords(password, user.password);
          if (!isValidPassword) {
            return done(null, false, { message: 'Invalid password' });
          }
          return done(null, user);
        } catch (passwordError) {
          console.error("Password verification error:", passwordError);
          return done(passwordError);
        }
      } catch (error) {
        console.error("Unexpected error in authentication:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    let retries = 3;
    let user = null;
    let lastError = null;
    
    while (retries > 0 && !user) {
      try {
        user = await storage.getUser(id);
        if (user) {
          return done(null, user);
        } else {
          console.log(`User with id ${id} not found in deserializeUser`);
          return done(null, false);
        }
      } catch (err) {
        console.log(`Database error in deserializeUser, retries left: ${retries}`, err);
        lastError = err;
        retries--;
        const delay = Math.min(100 * Math.pow(2, 3 - retries), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    if (lastError) {
      console.error("Database error in deserializeUser after retries:", lastError);
      return done(lastError, null);
    }
    
    return done(null, false);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const isDeveloperUser = req.body.email?.endsWith('@replit.com') || 
                            req.body.email?.endsWith('@example.com') || 
                            req.body.username === 'GaryOcean' || 
                            await storage.isFirstUser();
      
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        subscriptionTier: isDeveloperUser ? 'pro' : 'free',
        searchCount: 0,
        subscriptionExpiresAt: isDeveloperUser ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined, 
      });

      req.login(user, (err) => {
        if (err) return next(err);
        if (req.session.anonymousSearchCount) {
          delete req.session.anonymousSearchCount;
        }
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ 
        message: "Missing credentials", 
        details: "Both username and password are required"
      });
    }
    
    passport.authenticate("local", (err: any, user: SelectUser | false, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ 
          message: "Authentication system error", 
          details: "There was a problem with the authentication system. Please try again later."
        });
      }
      if (!user) {
        const errorMessage = info?.message || "Invalid username or password";
        const errorDetails = "Please check your credentials and try again. If you don't have an account, you can register for one.";
        console.log(`Failed login attempt for username: ${req.body.username}`);
        return res.status(401).json({ 
          message: errorMessage,
          details: errorDetails
        });
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.status(500).json({ 
            message: "Login session error", 
            details: "Your credentials were valid, but there was a problem creating your session. Please try again."
          });
        }
        
        if (req.session.anonymousSearchCount) {
          delete req.session.anonymousSearchCount;
        }
        
        try {
          const currentUser = req.user;
          if (currentUser?.subscriptionTier === 'free') {
            const isDeveloperUser = currentUser.email?.endsWith('@replit.com') || 
                                  currentUser.email?.endsWith('@example.com') ||
                                  currentUser.username === 'GaryOcean';
            
            if (isDeveloperUser && currentUser.id) {
              const updatedUser = await storage.updateUserSubscription(
                currentUser.id, 
                'pro',
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
              );
              req.user = updatedUser;
              console.log(`User ${currentUser.username || 'unknown'} automatically upgraded to Pro tier (developer account)`); 
            }
          }
          res.status(200).json(req.user);
        } catch (err) {
          console.error("Error upgrading user tier:", err);
          res.status(200).json(req.user);
        }
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized", message: "Authentication required to access this resource." });
    }
    res.json(req.user);
  });
}
