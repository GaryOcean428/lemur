import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getIdToken,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db, googleProvider, githubProvider } from "../firebaseConfig";
import { useToast } from "@/hooks/use-toast";

// Define our application-specific User type
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  tier: "free" | "basic" | "pro";
  searchCount: number;
  searchLimit: number | "Infinity";
  preferences?: Record<string, any>; // User preferences
}

interface UserStatusResponse {
    uid: string;
    email?: string;
    displayName?: string;
    tier: "free" | "basic" | "pro";
    searchCount: number;
    searchLimit: number | "Infinity";
    preferences?: Record<string, any>;
}

interface EmailPasswordCredentials {
  email: string;
  password: string;
}

type AuthContextType = {
  user: AppUser | null;
  isLoading: boolean;
  error: Error | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signUpWithEmailPassword: (credentials: EmailPasswordCredentials) => Promise<void>;
  signInWithEmailPassword: (credentials: EmailPasswordCredentials) => Promise<void>;
  logout: () => Promise<void>;
  fetchUserStatus: () => Promise<void>; // Function to manually refresh user status
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAndUpdateUserStatus = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      const token = await getIdToken(firebaseUser);
      const response = await fetch("/api/user/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch user status");
      }
      const statusData: UserStatusResponse = await response.json();
      
      setUser(prevUser => ({
        ...(prevUser || {} as AppUser),
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        tier: statusData.tier,
        searchCount: statusData.searchCount,
        searchLimit: statusData.searchLimit,
        preferences: statusData.preferences || prevUser?.preferences || {},
      }));

    } catch (e: any) {
      console.error("Error fetching user status from API:", e);
      setError(e);
      toast({
        title: "Could not update user status",
        description: e.message || "Failed to sync with server.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setIsLoading(true);
      setError(null);
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          await updateDoc(userRef, { lastLoginAt: serverTimestamp() });
        } else {
          // This part handles new user creation for social sign-ins
          // For email/password, user creation in Firestore is handled by the signUp function
          // or by the backend if we choose to create user doc there upon first API call.
          // For now, let's assume social sign-in creates the doc here.
          if (!firebaseUser.email) { // Email/password sign up might not have email if not set yet
             console.warn("New user from social sign-in without email, this might be an issue.");
          }
          const newUserFirestoreData = {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            tier: "free",
            searchCount: 0,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            preferences: { theme: "system", defaultSearchFocus: "web" },
          };
          await setDoc(userRef, newUserFirestoreData);
          console.log("New user (social) created in Firestore:", newUserFirestoreData);
        }
        await fetchAndUpdateUserStatus(firebaseUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchAndUpdateUserStatus]);

  const handleSignIn = async (provider: typeof googleProvider | typeof githubProvider) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      toast({
        title: "Signed in successfully",
        description: `Welcome, ${result.user.displayName || result.user.email}!`,
      });
      // onAuthStateChanged will handle user state update and API fetch
    } catch (e: any) {
      console.error("Social sign-in error:", e);
      setError(e);
      toast({
        title: "Sign-in failed",
        description: e.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = () => handleSignIn(googleProvider);
  const signInWithGitHub = () => handleSignIn(githubProvider);

  const signUpWithEmailPassword = async ({ email, password }: EmailPasswordCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      // Create user document in Firestore
      const userRef = doc(db, "users", firebaseUser.uid);
      const newUserFirestoreData = {
        email: firebaseUser.email,
        displayName: firebaseUser.email, // Or prompt for display name
        photoURL: null,
        tier: "free",
        searchCount: 0,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        preferences: { theme: "system", defaultSearchFocus: "web" },
      };
      await setDoc(userRef, newUserFirestoreData);
      // onAuthStateChanged will handle setting the user state and fetching API status
      toast({
        title: "Account created successfully",
        description: `Welcome, ${firebaseUser.email}!`,
      });
    } catch (e: any) {
      console.error("Sign-up error:", e);
      setError(e);
      toast({
        title: "Sign-up failed",
        description: e.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithEmailPassword = async ({ email, password }: EmailPasswordCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle user state update and API fetch
      toast({
        title: "Signed in successfully",
        description: `Welcome back, ${userCredential.user.email}!`,
      });
    } catch (e: any) {
      console.error("Email sign-in error:", e);
      setError(e);
      toast({
        title: "Sign-in failed",
        description: e.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (e: any) {
      console.error("Sign-out error:", e);
      setError(e);
      toast({
        title: "Sign-out failed",
        description: e.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const manualFetchUserStatus = useCallback(async () => {
    if (auth.currentUser) {
      setIsLoading(true);
      await fetchAndUpdateUserStatus(auth.currentUser);
      setIsLoading(false);
    }
  }, [fetchAndUpdateUserStatus]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        signInWithGoogle,
        signInWithGitHub,
        signUpWithEmailPassword,
        signInWithEmailPassword,
        logout,
        fetchUserStatus: manualFetchUserStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

