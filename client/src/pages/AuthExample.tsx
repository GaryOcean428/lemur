/**
 * Firebase Authentication Example (2025 Best Practices)
 * 
 * Chain of Draft: Page Setup → Auth Integration → State Management → Routing
 * 
 * Demonstrates the integration of Modern Authentication UI component
 * with Firebase Auth following 2025 best practices.
 */
import React, { useState, useEffect } from 'react';
import { getAuth, User, onAuthStateChanged, signOut } from 'firebase/auth';
import ModernAuthUI from '../auth/ModernAuthUI';
import '../auth/modern-auth.css';

const AuthExample: React.FC = () => {
  // User authentication state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get Firebase Auth instance
  const auth = getAuth();
  
  // Watch for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    // Clean up subscription
    return () => unsubscribe();
  }, [auth]);
  
  // Handle authentication success
  const handleAuthSuccess = (user: User) => {
    console.log('Authentication successful:', user);
    // You could also trigger analytics events or redirect here
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <p>Loading authentication...</p>
      </div>
    );
  }
  
  return (
    <div className="auth-example-page">
      <div className="auth-container">
        {user ? (
          // User is signed in
          <div className="auth-profile">
            <h2>Welcome, {user.displayName || 'User'}</h2>
            
            <div className="profile-card">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="profile-image" 
                />
              ) : (
                <div className="profile-initial">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="profile-details">
                <p>
                  <strong>Email:</strong> {user.email}
                  {user.emailVerified ? (
                    <span className="verified-badge" title="Email verified">✓</span>
                  ) : (
                    <span className="unverified-badge" title="Email not verified">!</span>
                  )}
                </p>
                
                <p><strong>User ID:</strong> {user.uid}</p>
                
                <p>
                  <strong>Providers:</strong> {user.providerData.map(p => p.providerId).join(', ')}
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleSignOut}
              className="sign-out-button"
            >
              Sign Out
            </button>
          </div>
        ) : (
          // User is not signed in - show auth UI
          <ModernAuthUI 
            onSuccess={handleAuthSuccess}
            onError={(error) => console.error('Auth error:', error)}
            showEmailAuth={true}
            showSocialAuth={true}
            enabledProviders={['google.com', 'github.com', 'password']}
            labels={{
              title: 'Firebase Auth (2025)',
              emailLabel: 'Email Address',
              passwordLabel: 'Password',
              signInButton: 'Sign In',
              signUpButton: 'Create Account',
              forgotPassword: 'Forgot Password?',
              orSeparator: 'or continue with',
              toggleModeText: {
                signIn: "Don't have an account? Sign up",
                signUp: "Already have an account? Sign in"
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

// Add some additional styling for the example page
const styles = `
.auth-example-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: #f5f7fa;
}

.auth-container {
  width: 100%;
  max-width: 480px;
}

.auth-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #4285f4;
  animation: spin 1s ease infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-profile {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 2rem;
}

.auth-profile h2 {
  margin-top: 0;
  text-align: center;
  margin-bottom: 1.5rem;
}

.profile-card {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f7f9fc;
  border-radius: 8px;
}

.profile-image {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 1.5rem;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.profile-initial {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #4285f4;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  margin-right: 1.5rem;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.profile-details {
  flex: 1;
}

.profile-details p {
  margin: 0.5rem 0;
  font-size: 0.9375rem;
}

.verified-badge {
  display: inline-block;
  width: 16px;
  height: 16px;
  background-color: #34a853;
  color: white;
  border-radius: 50%;
  text-align: center;
  line-height: 16px;
  font-size: 10px;
  margin-left: 0.5rem;
}

.unverified-badge {
  display: inline-block;
  width: 16px;
  height: 16px;
  background-color: #fbbc05;
  color: white;
  border-radius: 50%;
  text-align: center;
  line-height: 16px;
  font-size: 10px;
  margin-left: 0.5rem;
}

.sign-out-button {
  width: 100%;
  height: 44px;
  background-color: #f1f3f5;
  color: #4a4a4a;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sign-out-button:hover {
  background-color: #e9ecef;
}

@media (prefers-color-scheme: dark) {
  .auth-example-page {
    background-color: #121212;
  }
  
  .auth-profile {
    background-color: #1f1f1f;
    color: #f0f0f0;
  }
  
  .profile-card {
    background-color: #2d2d2d;
  }
  
  .sign-out-button {
    background-color: #2d2d2d;
    color: #f0f0f0;
    border-color: #444;
  }
  
  .sign-out-button:hover {
    background-color: #3d3d3d;
  }
}

@media (max-width: 480px) {
  .auth-example-page {
    padding: 1rem;
  }
  
  .profile-card {
    flex-direction: column;
    text-align: center;
  }
  
  .profile-image,
  .profile-initial {
    margin-right: 0;
    margin-bottom: 1rem;
  }
}
`;

// Add the styles to the document
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);

export default AuthExample;
