import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import {
  User as FirebaseUser,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getIdToken,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
// Import from direct config file instead of environment variable-based config
import { auth, db, googleProvider, githubProvider } from "../firebaseConfigDirect";
import { useToast } from "@/hooks/use-toast";

// Define our application-specific User type
export interface AppUser extends FirebaseUser {
  subscriptionTier?: 'free' | 'basic' | 'pro' | 'developer';
  subscriptionExpiresAt?: string;
  username?: string;
  searchCount?: number;
  searchCountResetAt?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    defaultSearchFocus?: 'web' | 'academic';
    modelPreference?: 'compound-beta-mini' | 'compound-beta';
  };
}

interface UserStatusResponse {
  user: AppUser | null; // This was the old structure
  // Let's assume the API returns the AppUser fields directly or nested under a 'user' key
  // For robustness, we can be flexible or define a strict API contract
  tier?: 'free' | 'basic' | 'pro' | 'developer';
  searchCount?: number;
  searchLimit?: number; // Make sure this matches API response
  preferences?: AppUser['preferences'];
  // If API nests under 'user', then it would be: user: Partial<AppUser> 
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
      if (!navigator.onLine) {
        console.log("Device is offline, using cached user data if available");
        if (user) return;

        setUser(prevUser => ({
          ...(prevUser || {} as AppUser),
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          subscriptionTier: "free",
          searchCount: 0,
          // searchLimit: 5, // Assuming searchLimit comes from API or a default
          preferences: prevUser?.preferences || { theme: "system", defaultSearchFocus: "web", modelPreference: "compound-beta" },
        }));
        toast({
          title: "Offline Mode",
          description: "You're currently offline. Some features may be limited.",
          variant: "default",
        });
        return;
      }
      
      const token = await getIdToken(firebaseUser);
      const apiUrl = '/api/user/status';
      console.log(`Fetching user status from: ${apiUrl}`);
      console.log(`Authorization token: ${token ? 'Exists' : 'Does not exist'}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json', // Explicitly request JSON
        },
        credentials: 'include',
      });

      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        let errorMessage = `Failed to fetch user status (${response.status})`;
        const responseClone = response.clone(); // Clone for safe reading
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || `API Error: ${response.status}`;
          } catch (parseError) {
            errorMessage = `API Error: ${response.status} (failed to parse JSON error response)`;
          }
        } else {
          try {
            const textError = await responseClone.text(); // Read as text if not JSON
            errorMessage = textError || `API Error: ${response.status} - ${response.statusText}`;
          } catch (textReadError) {
            errorMessage = `API Error: ${response.status} - ${response.statusText} (Could not read error response)`;
          }
        }
        throw new Error(errorMessage);
      }

      // Even if response.ok is true, check content type before parsing
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text();
        throw new Error(`Expected JSON response but received ${contentType || 'unknown content type'}. Response body: ${responseText.substring(0, 100)}...`);
      }

      const statusData: UserStatusResponse = await response.json();
      
      setUser(prevUser => ({
        ...(prevUser || {} as FirebaseUser), // Base on FirebaseUser first
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        // Now update with API data, providing defaults if necessary
        subscriptionTier: statusData.tier || prevUser?.subscriptionTier || 'free',
        subscriptionExpiresAt: statusData.subscriptionExpiresAt || prevUser?.subscriptionExpiresAt,
        username: statusData.username || prevUser?.username,
        searchCount: statusData.searchCount !== undefined ? statusData.searchCount : prevUser?.searchCount,
        searchCountResetAt: statusData.searchCountResetAt || prevUser?.searchCountResetAt,
        // searchLimit: statusData.searchLimit !== undefined ? statusData.searchLimit : prevUser?.searchLimit,
        preferences: statusData.preferences || prevUser?.preferences || { theme: "system", defaultSearchFocus: "web", modelPreference: "compound-beta" },
      } as AppUser));

    } catch (e: any) {
      console.error("Error fetching/updating user status:", e);
      if (!navigator.onLine || e.message?.includes('offline') || e.message?.includes('network') || e.message?.includes('Failed to fetch')) {
        console.log("Network error detected or API fetch failed, using offline mode or cached data");
        if (user) return; // Keep existing user data if already populated

        setUser(prevUser => ({
          ...(prevUser || {} as AppUser),
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          subscriptionTier: "free", 
          searchCount: 0,
          // searchLimit: 5, 
          preferences: prevUser?.preferences || { theme: "system", defaultSearchFocus: "web", modelPreference: "compound-beta" },
        }));
        if (e.message && !e.message.includes('offline')) { // Avoid double toast if already handled by offline check
            toast({
                title: "Server Unreachable",
                description: "Could not connect to the server. Using offline data.",
                variant: "default",
            });
        }
      } else {
        setError(e);
        toast({
          title: "Could not update user status",
          description: e.message || "Failed to sync with server.",
          variant: "destructive",
        });
      }
    }
  }, [toast, user]); // Added user to dependency array for offline caching logic

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
          const newUserFirestoreData = {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email, // Default to email if displayName is null
            photoURL: firebaseUser.photoURL,
            subscriptionTier: "free",
            searchCount: 0,
            // searchLimit: 5, // Initial limit, should be confirmed by API
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            preferences: { theme: "system", defaultSearchFocus: "web", modelPreference: "compound-beta" },
          };
          try {
            await setDoc(userRef, newUserFirestoreData);
            console.log("New user created in Firestore:", newUserFirestoreData);
          } catch (dbError) {
            console.error("Error creating new user in Firestore:", dbError);
            // Decide if we should bail out or proceed with potentially limited functionality
          }
        }
        await fetchAndUpdateUserStatus(firebaseUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchAndUpdateUserStatus]);

  useEffect(() => {
    const handleRedirectResult = async () => {
      setIsLoading(true); // Set loading true while processing redirect
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User is available in result.user, onAuthStateChanged will also fire.
          // Toast for successful sign-in.
          toast({
            title: "Signed in successfully",
            description: `Welcome, ${result.user.displayName || result.user.email}!`,
          });
        }
      } catch (e: any) {
        console.error("Redirect sign-in error:", e);
        setError(e);
        toast({
          title: "Sign-in failed",
          description: e.message || "An unknown error occurred during redirect sign-in.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false); // Set loading false after processing redirect or if no redirect
      }
    };
    
    // Only run this once on initial mount if not already loading from onAuthStateChanged
    if(isLoading) { // Check if onAuthStateChanged is already running
        handleRedirectResult();
    }
  }, [toast]); // isLoading removed from dependencies as it causes loop

  const handleSignIn = async (provider: typeof googleProvider | typeof githubProvider) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Using redirect method for authentication with', provider.providerId);
      await signInWithRedirect(auth, provider);
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
      const userRef = doc(db, "users", firebaseUser.uid);
      const newUserFirestoreData = {
        email: firebaseUser.email,
        displayName: firebaseUser.email, 
        photoURL: null,
        subscriptionTier: "free",
        searchCount: 0,
        // searchLimit: 5,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        preferences: { theme: "system", defaultSearchFocus: "web", modelPreference: "compound-beta" },
      };
      await setDoc(userRef, newUserFirestoreData);
      toast({
        title: "Account created successfully",
        description: `Welcome, ${firebaseUser.email}!`,
      });
      // onAuthStateChanged will handle user state update and API fetch
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
      toast({
        title: "Signed in successfully",
        description: `Welcome back, ${userCredential.user.email}!`,
      });
      // onAuthStateChanged will handle user state update and API fetch
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
      setUser(null); // Explicitly set user to null on logout
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
    } else {
      // toast({ title: "Not Signed In", description: "Cannot fetch user status.", variant: "destructive" });
      console.log("Cannot fetch user status, user not signed in.");
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
