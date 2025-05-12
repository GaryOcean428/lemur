/**
 * Authentication Page Component
 * 
 * Chain of Draft: Layout → FirebaseUI → State → Navigation → Security
 *
 * Demonstrates the integration of FirebaseUI for a comprehensive
 * authentication experience with multiple providers.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User } from 'firebase/auth';
import FirebaseAuthUI from '../auth/FirebaseAuthUI';
import { useAuth } from '../auth/AuthProvider';

interface AuthPageProps {
  /** Page title */
  title?: string;
  
  /** Custom message displayed above sign-in UI */
  message?: string;
  
  /** Additional styles for the auth container */
  className?: string;
}

/**
 * Authentication Page
 * 
 * Presents a clean sign-in/sign-up interface using FirebaseUI
 * and handles post-authentication flows like email verification.
 */
const AuthPage: React.FC<AuthPageProps> = ({
  title = 'Sign in to your account',
  message = 'Choose your preferred sign-in method below',
  className = '',
}) => {
  // State and hooks
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, userLoading } = useAuth();
  const [verificationSent, setVerificationSent] = useState(false);
  
  // Extract return URL from query parameters
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  
  // Handle successful authentication
  const handleAuthSuccess = (user: User) => {
    console.log('Authentication successful', user);
    
    // Check if email verification is needed
    if (user.providerData[0]?.providerId === 'password' && !user.emailVerified) {
      // Handle email verification flow
      setVerificationSent(true);
    } else {
      // Navigate to the return URL or dashboard
      navigate(returnUrl);
    }
  };
  
  // Handle authentication errors
  const handleAuthError = (error: Error) => {
    console.error('Authentication error:', error);
    // You could also show a toast notification or error message here
  };
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !userLoading && !verificationSent) {
      navigate(returnUrl);
    }
  }, [isAuthenticated, userLoading, returnUrl, navigate, verificationSent]);
  
  // Render the verification screen if applicable
  if (verificationSent && currentUser) {
    return (
      <div className="auth-verification-container">
        <h2>Verify your email</h2>
        <p>
          A verification email has been sent to <strong>{currentUser.email}</strong>.
          Please check your inbox and verify your email before continuing.
        </p>
        <p>
          After verifying your email, you can return here and refresh the page.
        </p>
        <div className="verification-actions">
          <button 
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }
  
  // Main authentication UI
  return (
    <div className={`auth-page-container ${className}`}>
      <div className="auth-content">
        <h1>{title}</h1>
        <p className="auth-message">{message}</p>
        
        {/* FirebaseUI Auth Component */}
        <FirebaseAuthUI
          onAuthSuccess={handleAuthSuccess}
          onAuthError={handleAuthError}
          signInSuccessUrl={returnUrl}
          className="auth-ui-container"
          showLoader={true}
          loadingText="Setting up secure authentication..."
        />
      </div>
      
      {/* Help Links */}
      <div className="auth-help-links">
        <a href="/terms-of-service" className="auth-link">Terms of Service</a>
        <span className="auth-link-divider">•</span>
        <a href="/privacy-policy" className="auth-link">Privacy Policy</a>
        <span className="auth-link-divider">•</span>
        <a href="/help" className="auth-link">Need Help?</a>
      </div>
    </div>
  );
};

export default AuthPage;
