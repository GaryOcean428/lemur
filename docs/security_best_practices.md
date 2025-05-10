# Firebase Security Best Practices

## Service Account Keys

### What are Service Account Keys?
Service account keys are private credentials that allow server applications to authenticate with Firebase services. They are extremely sensitive because they grant programmatic access to your Firebase project resources with elevated privileges. Anyone with your service account key can:

- Read and write to your Firestore database
- Access and modify Firebase Authentication users
- Invoke privileged admin APIs
- Potentially access other Google Cloud resources

### Security Risks
The `serviceAccountKey.json` file contains private keys that should **never** be exposed, especially in public repositories. Exposing these keys could lead to:

1. **Unauthorized database access**: Attackers could read/write data to your Firestore database
2. **User impersonation**: Creation of unauthorized admin accounts
3. **Data theft or manipulation**: Modification of your application data
4. **Potential billing and quota abuse**: Running costly operations against your account

### Best Practices for Service Account Keys

1. **Never commit service account keys to version control**
   - Always add `serviceAccountKey.json` to your `.gitignore` file
   - If accidentally committed, immediately rotate the key and clean the Git history

2. **Use environment variables when possible**
   - For services like Google Cloud Run, App Engine, or Cloud Functions, use the built-in service account
   - For local development, use application default credentials

3. **Rotate keys regularly**
   - Create new service account keys periodically
   - Delete old, unused keys

4. **Restrict service account permissions**
   - Follow the principle of least privilege
   - Grant only the permissions needed for your application

5. **Use different service accounts for different environments**
   - Development
   - Staging
   - Production

## Cleaning Sensitive Data from Git History

If you have accidentally committed sensitive data like service account keys to your Git repository, you need to completely remove it from the Git history, not just from the current files.

### Using the Provided Script

We've included a script (`scripts/clean-sensitive-data.sh`) to help you clean your Git history:

```bash
# Make the script executable
chmod +x scripts/clean-sensitive-data.sh

# Run the script
./scripts/clean-sensitive-data.sh
```

The script will:
1. Remove `server/serviceAccountKey.json` from all commits in history
2. Clean up Git objects to ensure the data is fully removed
3. Provide instructions for force pushing the changes

### Manual Alternative: Using BFG Repo-Cleaner

For larger repositories, you might prefer using the BFG Repo-Cleaner:

1. Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
2. Run:
   ```bash
   java -jar bfg.jar --delete-files serviceAccountKey.json your-repo.git
   cd your-repo.git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

## After Cleaning: Next Steps

After removing the sensitive data from your repository:

1. **Revoke and regenerate** your service account key immediately
2. **Monitor your Firebase project** for any suspicious activity
3. **Implement secure key handling** in your development workflow
4. **Educate your team** about handling sensitive credentials

## Using the Firebase Admin SDK Securely

When initializing the Firebase Admin SDK:

```typescript
// GOOD: Using environment variables
import { initializeApp, cert } from 'firebase-admin/app';

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

// BAD: Directly importing the service account key
// import serviceAccount from "./serviceAccountKey.json";
```

## Local Development Environment

For local development:

1. Create a `.env.local` file (already in `.gitignore`)
2. Add your Firebase service account details:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nMulti-line\nPrivate\nKey\n-----END PRIVATE KEY-----\n"
   ```
3. Use the `dotenv` package to load these variables

## Further Resources

- [Google Cloud - Best practices for managing service account keys](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [GitHub - Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
