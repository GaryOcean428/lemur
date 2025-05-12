import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { app } from './firebaseConfigDirect';

// For development environments, register the debug token
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - self is available in browser context
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// Initialize App Check with reCAPTCHA v3
// For production, you'll need a valid site key from Google reCAPTCHA
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(
    process.env.NODE_ENV === 'production'
      ? import.meta.env.VITE_RECAPTCHA_KEY || '6Lc_placeholderkey_donotuse'
      : '6Lc_placeholderkey_donotuse' // Placeholder for dev mode with debug token
  ),
  isTokenAutoRefreshEnabled: true
});

export { appCheck };