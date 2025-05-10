# Firebase Configuration for Lemur

## Setting Up Firebase Credentials

### For Development

1. **Environment Variables Approach (Recommended)**

   Add the following environment variables to your `.env.local` file:

   ```
   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_CLIENT_EMAIL="your-service-account-email"
   FIREBASE_PRIVATE_KEY="your-private-key-with-newlines"
   ```

   The Firebase Admin SDK will use these values automatically.

2. **Service Account Key File (Alternative for Local Development Only)**

   If you prefer using a service account key file during local development:
   
   - Download the service account key from the Firebase Console
   - Save it as `server/serviceAccountKey.json`
   - Ensure this file is in your `.gitignore` (it is already added)
   - **NEVER commit this file to version control**

### For Production

Always use environment variables in production. Never deploy the `serviceAccountKey.json` file to production servers.

## Security Notice

The Firebase service account key grants administrative access to your Firebase project. Treat it as you would a database password or API key:

- **NEVER commit the service account key to version control**
- Rotate keys regularly
- Use environment variables where possible
- Use different service accounts for development and production

## Cleaning Sensitive Data

If you accidentally committed the service account key to Git:

1. Run the provided script to clean the Git history:
   ```bash
   ./scripts/clean-sensitive-data.sh
   ```

2. Immediately rotate the service account key in the Firebase Console

## Additional Resources

For more information on securing Firebase credentials, see:
- `docs/security_best_practices.md` - Comprehensive guide on securing Firebase credentials
- `server/firebaseAdmin.example.ts` - Example of initializing Firebase Admin SDK with environment variables
