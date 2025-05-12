/**
 * FirebaseUI Authentication Configuration
 * 
 * Chain of Draft: Config → Providers → UI Options → Security
 * 
 * This module configures FirebaseUI for authentication with multiple providers
 * and enhanced security features following Firebase best practices.
 */
import * as firebaseui from 'firebaseui';
import {
  GoogleAuthProvider,
  EmailAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider,
  PhoneAuthProvider,
  OAuthProvider,
  getAuth,
  signOut
} from 'firebase/auth';

/**
 * Available authentication providers
 * Enable/disable by adding/removing from the signInOptions array
 */
export const getFirebaseUIConfig = (): firebaseui.auth.Config => {
  const auth = getAuth();
  
  return {
    // Popup vs Redirect: Popup provides better UX for most web applications
    signInFlow: 'popup',
    
    // Sign-in successful callback URL
    signInSuccessUrl: '/dashboard',
    
    // Show provider logos in button
    signInOptions: [
      // Email authentication with password requirements and email verification
      {
        provider: EmailAuthProvider.PROVIDER_ID,
        requireDisplayName: true,
        disableSignUp: {
          status: false, // Set to true to disable sign up
          adminEmail: 'admin@example.com', // Receive notifications for new sign-ups
        },
        // Password complexity requirements
        passwordPolicy: {
          minimumLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumeric: true,
          requireNonAlphanumeric: true
        },
      },
      
      // Google authentication
      {
        provider: GoogleAuthProvider.PROVIDER_ID,
        // Use Google's custom scopes for additional permissions
        scopes: ['profile', 'email'],
        customParameters: {
          // Forces account selection even when one account is available
          prompt: 'select_account'
        }
      },
      
      // GitHub authentication
      {
        provider: GithubAuthProvider.PROVIDER_ID,
        scopes: ['user:email']
      },
      
      // Phone authentication (disabled by default - enable if needed)
      // {
      //   provider: PhoneAuthProvider.PROVIDER_ID,
      //   defaultCountry: 'US',
      //   whitelistedCountries: ['+1', '+44', '+86'], // Customize allowed countries
      // },
      
      // Microsoft authentication
      {
        provider: OAuthProvider.PROVIDER_ID,
        providerName: 'microsoft.com',
        scopes: ['mail.read', 'calendars.read'],
        customParameters: {
          prompt: 'consent',
        }
      },
      
      // Apple authentication
      {
        provider: 'apple.com',
        scopes: ['email', 'name']
      },
    ],
    
    // Terms of service and privacy policy URLs
    tosUrl: '/terms-of-service',
    privacyPolicyUrl: '/privacy-policy',
    
    // Advanced UI customization
    uiShown: function() {
      // Hide any loading indicators once UI is ready
      const loader = document.getElementById('loader');
      if (loader) {
        loader.style.display = 'none';
      }
    },
    
    // Custom UI callbacks
    callbacks: {
      // Handle successful sign-in
      signInSuccessWithAuthResult: (authResult, redirectUrl) => {
        // User successfully signed in
        console.log('Authentication successful:', authResult);
        
        // You can add custom logic here such as:
        // 1. Associate signed-in user with an existing account
        // 2. Record analytics events
        // 3. Create user profile in Firestore if it doesn't exist
        
        // Return false to avoid automatic redirect
        // Instead, handle navigation programmatically
        return false;
      },
      
      // Callback when user enters an invalid email
      signInFailure: (error) => {
        // Handle specific error cases
        console.error('Authentication error:', error);
        return Promise.resolve();
      },
      
      // Show custom UI for unrecoverable errors
      uiShown: () => {
        document.getElementById('loader')?.style.display = 'none';
      }
    },
    
    // Auto upgrade anonymous users
    autoUpgradeAnonymousUsers: true,
    
    // Custom credential helper (e.g., for Google One Tap)
    credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO
  };
};

/**
 * Safely sign out the current user and redirect to home
 */
export const signOutUser = async (): Promise<void> => {
  const auth = getAuth();
  try {
    await signOut(auth);
    // Redirect to home page after sign out
    window.location.href = '/';
  } catch (error) {
    console.error('Sign out error:', error);
  }
};

/**
 * Check if current user email is verified
 * Used to enforce email verification requirements
 */
export const isEmailVerified = (): boolean => {
  const auth = getAuth();
  return auth.currentUser?.emailVerified ?? false;
};
