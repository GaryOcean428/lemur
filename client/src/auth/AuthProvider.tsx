/**
 * Firebase Authentication Provider
 * 
 * Chain of Draft: Context → State → Effects → Children → Security
 * 
 * Provides authentication state and methods throughout the application
 * using React Context API with enhanced security features.
 */
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  User, 
  getAuth, 
  onAuthStateChanged, 
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Define the shape of the authentication context
interface AuthContextType {
  // Current user state
  currentUser: User | null;
  userLoading: boolean;
  
  // Additional user metadata
  userRoles: string[];
  isAdmin: boolean;
  
  // Auth status
  isAuthenticated: boolean;
  
  // Auth actions
  signOutUser: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
  // Last activity tracking for security
  lastActivity: Date;
  updateActivity: () => void;
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component properties
interface AuthProviderProps {
  children: React.ReactNode;
  /** Force email verification before allowing access */
  requireEmailVerification?: boolean;
  /** Session timeout in minutes (default: 30) */
  sessionTimeoutMinutes?: number;
}

/**
 * Authentication Provider Component
 * 
 * Manages authentication state and provides it to the entire application
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children,
  requireEmailVerification = false,
  sessionTimeoutMinutes = 30
}) => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  
  // Firebase services
  const auth = getAuth();
  const firestore = getFirestore();
  
  // Timeout for inactive session
  const sessionTimeoutMs = sessionTimeoutMinutes * 60 * 1000;
  
  // Update user activity timestamp
  const updateActivity = () => {
    setLastActivity(new Date());
  };
  
  // Fetch user roles from Firestore
  const fetchUserRoles = async (user: User): Promise<string[]> => {
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data()?.role ? [userSnap.data().role] : ['user'];
      } else {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
        return ['user'];
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return ['user']; // Default role
    }
  };

  // Sign out the current user
  const signOutUser = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };
  
  // Send email verification
  const sendVerificationEmail = async (): Promise<void> => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
      }
    }
  };
  
  // Send password reset email
  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset:', error);
      throw error;
    }
  };
  
  // Monitor authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Handle verified email requirement
      if (user && requireEmailVerification && !user.emailVerified) {
        // Log out users with unverified emails if verification is required
        await signOut(auth);
        setCurrentUser(null);
      } else {
        setCurrentUser(user);
        
        // Fetch roles if we have a user
        if (user) {
          const roles = await fetchUserRoles(user);
          setUserRoles(roles);
          
          // Update last login time
          const userRef = doc(firestore, 'users', user.uid);
          await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        } else {
          setUserRoles([]);
        }
      }
      
      setUserLoading(false);
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [auth, requireEmailVerification]);
  
  // Session timeout monitoring
  useEffect(() => {
    // Skip if no user or still loading
    if (!currentUser || userLoading) return;
    
    const checkInactivity = () => {
      const now = new Date();
      const inactiveTime = now.getTime() - lastActivity.getTime();
      
      // Log out if session is inactive beyond threshold
      if (inactiveTime > sessionTimeoutMs) {
        signOutUser();
      }
    };
    
    // Check inactivity every minute
    const intervalId = setInterval(checkInactivity, 60000);
    
    // Set up activity listeners
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'click'];
    const handleActivity = () => updateActivity();
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity);
    });
    
    // Cleanup
    return () => {
      clearInterval(intervalId);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [currentUser, userLoading, lastActivity, sessionTimeoutMs]);
  
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    currentUser,
    userLoading,
    userRoles,
    isAdmin: userRoles.includes('admin'),
    isAuthenticated: !!currentUser,
    signOutUser,
    sendVerificationEmail,
    resetPassword,
    lastActivity,
    updateActivity
  }), [currentUser, userLoading, userRoles, lastActivity]);
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
