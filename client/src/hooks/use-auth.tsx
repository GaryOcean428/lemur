import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import {
  User as FirebaseUser,
  signInWithPopup,
<<<<<<< HEAD
  signInWithRedirect,
  getRedirectResult,
=======
>>>>>>> origin/development
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
<<<<<<< HEAD
      // First check if we're online
      if (!navigator.onLine) {
        console.log("Device is offline, using cached user data if available");
        
        // If we already have user data, keep using it
        if (user) {
          return;
        }
        
        // Set basic user info we can get from Firebase auth
        setUser(prevUser => ({
          ...(prevUser || {} as AppUser),
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          tier: "free", // Default tier when offline
          searchCount: 0,
          searchLimit: 5, // Default conservative limit when offline
          preferences: prevUser?.preferences || { theme: "system", defaultSearchFocus: "web" },
        }));
        
        toast({
          title: "Offline Mode",
          description: "You're currently offline. Some features may be limited.",
          variant: "default",
        });
        
        return;
      }
      
      const token = await getIdToken(firebaseUser);
      
      // Always use a relative URL for API calls to avoid CSP issues
      // This will make requests relative to the current origin
      const apiUrl = '/api/user/status';
      
      // Log the API URL for debugging
      console.log(`Fetching user status from: ${apiUrl}`);

      // Log the token for debugging
      console.log(`Authorization token: ${token ? 'Exists' : 'Does not exist'}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Include cookies to handle cross-origin requests
      });

      if (!response.ok) {
        let errorMessage = `Failed to fetch user status (${response.status})`;
        // Clone the response before trying to read it, so it can be read again if JSON parsing fails
        const responseClone = response.clone();
        try {
          const errorData = await response.json(); // Attempt to parse as JSON
          errorMessage = errorData.error || errorData.message || `API Error: ${response.status}`;
        } catch (parseError) {
          // If JSON parsing fails, try to get the error message as plain text from the cloned response
          try {
            const textError = await responseClone.text();
            errorMessage = textError || `API Error: ${response.status} - ${response.statusText}`;
          } catch (textReadError) {
            // If reading as text also fails, use a generic message
            errorMessage = `API Error: ${response.status} - ${response.statusText} (Could not read error response)`;
          }
        }
        throw new Error(errorMessage);
      }

=======
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
>>>>>>> origin/development
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
<<<<<<< HEAD
      
      // If the error is due to being offline, handle it gracefully
      if (!navigator.onLine || e.message?.includes('offline') || e.message?.includes('network')) {
        console.log("Network error detected, using offline mode");
        
        // Set basic user info we can get from Firebase auth
        setUser(prevUser => {
          // Only update if we don't have user data already
          if (prevUser) return prevUser;
          
          return {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            tier: "free", // Default tier when offline
            searchCount: 0,
            searchLimit: 5, // Default conservative limit when offline
            preferences: { theme: "system", defaultSearchFocus: "web" },
          };
        });
        
        toast({
          title: "Offline Mode",
          description: "You're currently offline. Some features may be limited.",
          variant: "default",
        });
      } else {
        // For other errors, show error toast
        setError(e);
        toast({
          title: "Could not update user status",
          description: e.message || "Failed to sync with server.",
          variant: "destructive",
        });
      }
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

  // Check for redirect result when the component mounts
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          toast({
            title: "Signed in successfully",
            description: `Welcome, ${result.user.displayName || result.user.email}!`,
          });
          // onAuthStateChanged will handle user state update and API fetch
        }
      } catch (e: any) {
        console.error("Redirect sign-in error:", e);
        setError(e);
        toast({
          title: "Sign-in failed",
          description: e.message || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    };
    
    handleRedirectResult();
  }, [toast]);

  // Directly use redirect method, since popup is causing issues in many browsers
  const handleSignIn = async (provider: typeof googleProvider | typeof githubProvider) => {
    setIsLoading(true);
    setError(null);
    try {
      // Use redirect method directly instead of popup
      console.log('Using redirect method for authentication');
      await signInWithRedirect(auth, provider);
      // No toast here as page will refresh from redirect
      // Result will be handled by getRedirectResult() in useEffect
    } catch (e: any) {
      console.error("Social sign-in error:", e);
      setError(e);
      toast({
        title: "Sign-in failed",
        description: e.message || "An unknown error occurred.",
        variant: "destructive",
      });
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
=======
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
>>>>>>> origin/development
        description: e.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

<<<<<<< HEAD
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
=======
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
>>>>>>> origin/development
        description: e.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

<<<<<<< HEAD
=======
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

>>>>>>> origin/development
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

