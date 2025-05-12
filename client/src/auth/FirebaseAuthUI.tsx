/**
 * FirebaseUI Authentication Component
 * 
 * Chain of Draft: Props → State → Effects → Render → Optimize
 * 
 * A reusable React component that integrates FirebaseUI for authentication,
 * providing a consistent and accessible sign-in experience with multiple providers.
 */
import React, { useEffect, useRef, useState } from 'react';
import * as firebaseui from 'firebaseui';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseUIConfig } from './firebaseUIConfig';

// Import FirebaseUI CSS
import 'firebaseui/dist/firebaseui.css';

interface FirebaseAuthUIProps {
  /** Optional URL to redirect after successful sign-in */
  signInSuccessUrl?: string;
  
  /** Optional callback when authentication is successful */
  onAuthSuccess?: (user: User) => void;
  
  /** Optional callback when authentication fails */
  onAuthError?: (error: Error) => void;
  
  /** Custom CSS class names for the container */
  className?: string;
  
  /** Show a user-friendly loading state */
  showLoader?: boolean;
  
  /** Loading text to display while FirebaseUI initializes */
  loadingText?: string;
  
  /** Unique ID for the FirebaseUI container */
  containerId?: string;
}

/**
 * FirebaseAuthUI Component
 * 
 * Renders a fully-featured authentication UI powered by FirebaseUI
 */
export const FirebaseAuthUI: React.FC<FirebaseAuthUIProps> = ({
  signInSuccessUrl,
  onAuthSuccess,
  onAuthError,
  className = '',
  showLoader = true,
  loadingText = 'Loading authentication...',
  containerId = 'firebaseui-auth-container',
}) => {
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [authInstance, setAuthInstance] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs to prevent unnecessary re-renders
  const uiRef = useRef<firebaseui.auth.AuthUI | null>(null);
  const configRef = useRef(getFirebaseUIConfig());
  
  // Update config if signInSuccessUrl is provided
  if (signInSuccessUrl) {
    configRef.current.signInSuccessUrl = signInSuccessUrl;
  }
  
  // Extend callbacks to include custom handlers
  const extendedConfig = {
    ...configRef.current,
    callbacks: {
      ...configRef.current.callbacks,
      signInSuccessWithAuthResult: (authResult: any, redirectUrl: string) => {
        // Call the custom success handler if provided
        if (onAuthSuccess && authResult.user) {
          onAuthSuccess(authResult.user);
        }
        
        // If the original config had a callback, respect its return value
        if (configRef.current.callbacks?.signInSuccessWithAuthResult) {
          return configRef.current.callbacks.signInSuccessWithAuthResult(authResult, redirectUrl);
        }
        
        // Otherwise return true to use the provided redirect URL
        return Boolean(signInSuccessUrl);
      },
      signInFailure: (error: firebaseui.auth.AuthUIError) => {
        setError(error);
        if (onAuthError) {
          onAuthError(error);
        }
        
        // If the original config had a callback, return its result
        if (configRef.current.callbacks?.signInFailure) {
          return configRef.current.callbacks.signInFailure(error);
        }
        
        return Promise.resolve();
      }
    }
  };
  
  // Initialize FirebaseUI when the component mounts
  useEffect(() => {
    // Get Firebase Auth instance
    const auth = getAuth();
    
    // Setup auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthInstance(user);
    });
    
    // Only initialize if not already done
    if (!uiRef.current) {
      // Initialize FirebaseUI Auth
      const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
      uiRef.current = ui;
      
      // Start the FirebaseUI Auth flow
      ui.start(`#${containerId}`, extendedConfig);
      setIsInitialized(true);
    }
    
    // Cleanup when component unmounts
    return () => {
      unsubscribe();
      if (uiRef.current) {
        uiRef.current.reset();
      }
    };
  }, [containerId]);
  
  // Handle rendering loading state and errors
  const renderContent = () => {
    if (error) {
      return (
        <div className="auth-error" role="alert">
          <p>Authentication Error: {error.message}</p>
          <button onClick={() => setError(null)}>Try Again</button>
        </div>
      );
    }
    
    return (
      <>
        {showLoader && !isInitialized && (
          <div id="loader" className="auth-loader">
            <p>{loadingText}</p>
          </div>
        )}
        <div id={containerId}></div>
      </>
    );
  };
  
  return (
    <div className={`firebase-auth-container ${className}`}>
      {renderContent()}
    </div>
  );
};

export default FirebaseAuthUI;
