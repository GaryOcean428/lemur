/**
 * Modern Firebase Authentication UI (2025 Best Practices)
 * 
 * Chain of Draft: Config → Providers → Hooks → UI Components → Integration
 * 
 * A React-based UI for Firebase Authentication using direct Firebase API
 * instead of the deprecated firebaseui library.
 */
import React, { useState, useEffect } from 'react';
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  GithubAuthProvider, 
  OAuthProvider,
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  EmailAuthProvider,
  Auth,
  User,
  AuthProvider as FirebaseAuthProvider,
  AuthError,
  linkWithPopup
} from 'firebase/auth';

// Types for Auth UI configuration
interface AuthUIProviderConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  provider: FirebaseAuthProvider;
  scopes?: string[];
  customParameters?: Record<string, string>;
}

interface ModernAuthUIProps {
  /** Callback when authentication is successful */
  onSuccess?: (user: User) => void;
  
  /** Callback when authentication fails */
  onError?: (error: AuthError) => void;
  
  /** Callback when authentication is cancelled */
  onCancel?: () => void;
  
  /** Show email authentication form */
  showEmailAuth?: boolean;
  
  /** Show social authentication buttons */
  showSocialAuth?: boolean;
  
  /** Enable or disable specific providers */
  enabledProviders?: string[];
  
  /** CSS classes */
  className?: string;
  
  /** Additional styling for the auth container */
  style?: React.CSSProperties;
  
  /** Labels and text customization */
  labels?: {
    title?: string;
    emailLabel?: string;
    passwordLabel?: string;
    signInButton?: string;
    signUpButton?: string;
    forgotPassword?: string;
    orSeparator?: string;
    toggleModeText?: {
      signIn: string;
      signUp: string;
    }
  }
}

/**
 * Modern Firebase Authentication UI Component
 */
export const ModernAuthUI: React.FC<ModernAuthUIProps> = ({
  onSuccess,
  onError,
  onCancel,
  showEmailAuth = true,
  showSocialAuth = true,
  enabledProviders = ['google.com', 'github.com', 'facebook.com', 'microsoft.com', 'apple.com', 'password'],
  className = '',
  style = {},
  labels = {
    title: 'Sign in to your account',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    signInButton: 'Sign In',
    signUpButton: 'Create Account',
    forgotPassword: 'Forgot Password?',
    orSeparator: 'or',
    toggleModeText: {
      signIn: "Don't have an account? Sign up",
      signUp: "Already have an account? Sign in"
    }
  }
}) => {
  // Authentication state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  
  // Get Firebase Auth instance
  const auth = getAuth();
  
  // Configure available providers
  const providers: AuthUIProviderConfig[] = [
    {
      id: 'google.com',
      name: 'Google',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>,
      provider: new GoogleAuthProvider()
    },
    {
      id: 'facebook.com',
      name: 'Facebook',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"><linearGradient id="awSgIinfw5_FS5MLHI~A9a" x1="6.228" x2="42.077" y1="4.896" y2="43.432" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0d61a9"/><stop offset="1" stop-color="#16528c"/></linearGradient><path fill="url(#awSgIinfw5_FS5MLHI~A9a)" d="M42,40c0,1.105-0.895,2-2,2H8c-1.105,0-2-0.895-2-2V8c0-1.105,0.895-2,2-2h32 c1.105,0,2,0.895,2,2V40z"/><path d="M25,38V27h-4v-6h4v-2.138c0-5.042,2.666-7.818,7.505-7.818c1.995,0,3.077,0.14,3.598,0.208 l0.858,0.111L37,12.224L37,17h-3.635C32.237,17,32,18.378,32,19.535V21h4.723l-0.928,6H32v11H25z" opacity=".05"/><path d="M25.5,37.5v-11h-4v-5h4v-2.638c0-4.788,2.422-7.318,7.005-7.318c1.971,0,3.03,0.138,3.54,0.204 l0.436,0.057l0.02,0.442V16.5h-3.135c-1.623,0-1.865,1.901-1.865,3.035V21.5h4.64l-0.773,5H31.5v11H25.5z" opacity=".07"/><path fill="#fff" d="M33.365,16H36v-3.754c-0.492-0.064-1.531-0.203-3.495-0.203c-4.101,0-6.505,2.08-6.505,6.819V22h-4v4 h4v11h5V26h3.938l0.618-4H31v-2.465C31,17.661,31.612,16,33.365,16z"/></svg>,
      provider: new FacebookAuthProvider()
    },
    {
      id: 'github.com',
      name: 'GitHub',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>,
      provider: new GithubAuthProvider()
    },
    {
      id: 'microsoft.com',
      name: 'Microsoft',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 23 23"><path fill="#f3f3f3" d="M0 0h23v23H0z"/><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>,
      provider: new OAuthProvider('microsoft.com')
    },
    {
      id: 'apple.com',
      name: 'Apple',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16"><path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516.024.034 1.52.087 2.475-1.258.955-1.345.762-2.391.728-2.43Zm3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422.212-2.189 1.675-2.789 1.698-2.854.023-.065-.597-.79-1.254-1.157a3.692 3.692 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56.244.729.625 1.924 1.273 2.796.576.984 1.34 1.667 1.659 1.899.319.232 1.219.386 1.843.067.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758.347-.79.505-1.217.473-1.282Z"/><path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516.024.034 1.52.087 2.475-1.258.955-1.345.762-2.391.728-2.43Zm3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422.212-2.189 1.675-2.789 1.698-2.854.023-.065-.597-.79-1.254-1.157a3.692 3.692 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56.244.729.625 1.924 1.273 2.796.576.984 1.34 1.667 1.659 1.899.319.232 1.219.386 1.843.067.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758.347-.79.505-1.217.473-1.282Z"/></svg>,
      provider: new OAuthProvider('apple.com')
    }
  ].filter(p => enabledProviders.includes(p.id));
  
  // Reset error when inputs change
  useEffect(() => {
    if (error) setError(null);
  }, [email, password, displayName]);
  
  // Handle sign in with email/password
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (isSignUp) {
        // Create new account
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update profile if display name is provided
        if (displayName && credential.user) {
          await updateProfile(credential.user, { displayName });
        }
        
        if (onSuccess) onSuccess(credential.user);
      } else {
        // Sign in to existing account
        const credential = await signInWithEmailAndPassword(auth, email, password);
        if (onSuccess) onSuccess(credential.user);
      }
    } catch (err) {
      const firebaseError = err as AuthError;
      setError(firebaseError.message);
      if (onError) onError(firebaseError);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle sign in with provider popup
  const handleProviderSignIn = async (provider: FirebaseAuthProvider) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, provider);
      if (onSuccess) onSuccess(result.user);
    } catch (err) {
      // Check if error is due to popup being closed
      const firebaseError = err as AuthError;
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        if (onCancel) onCancel();
      } else {
        setError(firebaseError.message);
        if (onError) onError(firebaseError);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle password reset
  const handlePasswordReset = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent. Check your inbox.');
    } catch (err) {
      const firebaseError = err as AuthError;
      setError(firebaseError.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`modern-auth-ui ${className}`} style={style}>
      <h2 className="auth-title">{labels.title}</h2>
      
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      
      {showEmailAuth && (
        <form onSubmit={handleEmailSignIn} className="auth-form">
          {isSignUp && (
            <div className="auth-input-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                disabled={isLoading}
              />
            </div>
          )}
          
          <div className="auth-input-group">
            <label htmlFor="email">{labels.emailLabel}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="auth-input-group">
            <label htmlFor="password">{labels.passwordLabel}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              disabled={isLoading}
            />
          </div>
          
          {!isSignUp && (
            <button 
              type="button" 
              className="auth-text-button"
              onClick={handlePasswordReset}
              disabled={isLoading}
            >
              {labels.forgotPassword}
            </button>
          )}
          
          <button 
            type="submit" 
            className="auth-submit-button"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : isSignUp ? labels.signUpButton : labels.signInButton}
          </button>
          
          <button 
            type="button" 
            className="auth-toggle-button"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={isLoading}
          >
            {isSignUp ? labels.toggleModeText.signUp : labels.toggleModeText.signIn}
          </button>
        </form>
      )}
      
      {showEmailAuth && showSocialAuth && providers.length > 0 && (
        <div className="auth-separator">
          <span>{labels.orSeparator}</span>
        </div>
      )}
      
      {showSocialAuth && providers.length > 0 && (
        <div className="auth-providers">
          {providers.filter(p => p.id !== 'password').map((providerConfig) => (
            <button
              key={providerConfig.id}
              className={`auth-provider-button auth-provider-${providerConfig.id}`}
              onClick={() => handleProviderSignIn(providerConfig.provider)}
              disabled={isLoading}
            >
              <span className="auth-provider-icon">{providerConfig.icon}</span>
              <span>Continue with {providerConfig.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModernAuthUI;
