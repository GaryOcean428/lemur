import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import createMemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Extend express-session with our custom properties
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

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "find-search-secret-key",
    resave: false,
    saveUninitialized: true, // Changed to true to save anonymous sessions
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // Extended to 30 days for better persistence
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
        // Add retries for database operations with exponential backoff
        let retries = 3;
        let user = null;
        let lastError = null;
        
        while (retries > 0 && !user) {
          try {
            user = await storage.getUserByUsername(username);
            // If we got here, the database query succeeded
            break;
          } catch (err) {
            // Log the error but don't fail yet, we'll retry
            console.log(`Database error in getUserByUsername, retries left: ${retries}`, err);
            lastError = err;
            retries--;
            // Wait with exponential backoff before retrying
            const delay = Math.min(100 * Math.pow(2, 3 - retries), 2000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        // If we still have no user after retries, handle the error or not found case
        if (!user) {
          if (lastError) {
            console.error("Database error after retries:", lastError);
            return done(lastError);
          }
          return done(null, false, { message: 'Invalid username' });
        }
        
        // Check the password once we have a user
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
    // Add retries for database operations with exponential backoff
    let retries = 3;
    let user = null;
    let lastError = null;
    
    while (retries > 0 && !user) {
      try {
        user = await storage.getUser(id);
        if (user) {
          return done(null, user);
        } else {
          // User not found case - might be deleted or invalid session
          console.log(`User with id ${id} not found in deserializeUser`);
          return done(null, false);
        }
      } catch (err) {
        // Log the error but don't fail yet, we'll retry
        console.log(`Database error in deserializeUser, retries left: ${retries}`, err);
        lastError = err;
        retries--;
        // Wait with exponential backoff before retrying
        const delay = Math.min(100 * Math.pow(2, 3 - retries), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we still have no user after retries and it was due to an error
    if (lastError) {
      console.error("Database error in deserializeUser after retries:", lastError);
      return done(lastError, null);
    }
    
    // If we got here, the user wasn't found but no error occurred
    return done(null, false);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // All developer users assigned Pro tier automatically
      // This includes the first registered user and any user with specific developer email domains
      const isDeveloperUser = req.body.email?.endsWith('@replit.com') || 
                            req.body.email?.endsWith('@example.com') || 
                            req.body.username === 'GaryOcean' || 
                            await storage.isFirstUser();
      
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        subscriptionTier: isDeveloperUser ? 'pro' : 'free',
        searchCount: 0,
        subscriptionExpiresAt: isDeveloperUser ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined, // 1 year for developers
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Clear anonymous search count when user registers
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
    // Add basic validation for the request body
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
        // Provide more helpful error messages based on info
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
        
        // Clear anonymous search count when user logs in
        if (req.session.anonymousSearchCount) {
          delete req.session.anonymousSearchCount;
        }
        
        try {
          // Check if user needs to be assigned Pro tier (developers and specific email domains)
          if (req.user && req.user.subscriptionTier === 'free') {
            const isDeveloperUser = req.user.email?.endsWith('@replit.com') || 
                                  req.user.email?.endsWith('@example.com') ||
                                  req.user.username === 'GaryOcean';
            
            if (isDeveloperUser) {
              // Update to Pro tier with 1 year expiration
              const updatedUser = await storage.updateUserSubscription(
                req.user.id, 
                'pro',
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
              );
              req.user = updatedUser;
              console.log(`User ${req.user.username} automatically upgraded to Pro tier (developer account)`); 
            }
          }
    
          res.status(200).json(req.user);
        } catch (err) {
          console.error("Error upgrading user tier:", err);
          // Still return the user even if tier upgrade fails
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

  app.get("/api/user/status", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized", message: "Authentication required to access this resource." });
    }
    res.json(req.user);
  });


}
