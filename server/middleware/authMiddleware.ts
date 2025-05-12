import { Request, Response, NextFunction } from "express";
import { auth } from "../firebaseAdmin";

// Middleware to verify Firebase ID token
export const authenticateFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Server Auth] Authenticating request for: ${req.method} ${req.path}`);
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[Server Auth] Authorization header missing or not Bearer type.");
    return res.status(401).send({ message: "Unauthorized: No token provided or invalid format." });
  }

  const idToken = authHeader.split("Bearer ")[1];

  if (!idToken || idToken === "null" || idToken === "undefined" || idToken.trim() === "") {
    console.log("[Server Auth] Bearer token is effectively empty (null, undefined, or whitespace).");
    return res.status(401).send({ message: "Unauthorized: Bearer token is empty or invalid." });
  }

  console.log("[Server Auth] Received ID token starts with:", idToken ? idToken.substring(0, 30) + '...' : 'null/undefined');

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log("[Server Auth] Token verification successful. Decoded token UID:", decodedToken.uid);
    (req as any).user = decodedToken;
    console.log(`[Server Auth] User authenticated: ${decodedToken.uid} for path: ${req.path}`);
    next();
  } catch (error: any) {
    console.error("[Server Auth] Error verifying Firebase ID token. Code:", error.code, "Message:", error.message);
    return res.status(403).send({
        message: "Forbidden: Invalid, expired, or malformed token.",
        code: error.code,
        detail: error.message
    });
  }
};