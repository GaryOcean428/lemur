# Firebase Deployment Guide for Lemur

This document outlines how to deploy the Lemur application to Firebase.

## Prerequisites

- Node.js 18 or higher
- Firebase CLI installed globally
  ```bash
  npm install -g firebase-tools
  ```
- Firebase project created in the Firebase Console
- Proper environment variables configured

## Environment Setup

### Local Environment Variables

1. Create an `.env.local` file at the project root with the following variables:

```
# Firebase configuration
VITE_FIREBASE_API_KEY="YOUR_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="YOUR_PROJECT_ID.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_FIREBASE_STORAGE_BUCKET="YOUR_PROJECT_ID.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
VITE_FIREBASE_APP_ID="YOUR_APP_ID"
VITE_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID"
VITE_API_BASE_URL="/api"

# Firebase Admin SDK credentials (for local development)
FIREBASE_PROJECT_ID="lemur-86e1b"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-email@project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Other API keys and configuration
GROQ_API_KEY="YOUR_GROQ_API_KEY"
TAVILY_API_KEY="YOUR_TAVILY_API_KEY"
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
SERPER_API_KEY="YOUR_SERPER_API_KEY"

# Database connection
DATABASE_URL="YOUR_DATABASE_CONNECTION_STRING"
SESSION_SECRET="YOUR_SESSION_SECRET"

# Stripe configuration
STRIPE_SECRET_KEY="YOUR_STRIPE_SECRET_KEY"
VITE_STRIPE_PUBLIC_KEY="YOUR_STRIPE_PUBLIC_KEY"
STRIPE_BASIC_PRICE_ID="YOUR_BASIC_PRICE_ID"
STRIPE_PRO_PRICE_ID="YOUR_PRO_PRICE_ID"

# Redis/KV storage
REDIS_URL="YOUR_REDIS_URL"
KV_REST_API_URL="YOUR_KV_REST_API_URL"
KV_REST_API_TOKEN="YOUR_KV_REST_API_TOKEN"
```

### Firebase Functions Environment Variables

For production deployment, configure Firebase Functions environment variables:

```bash
firebase functions:config:set firebase.project_id="YOUR_PROJECT_ID" \
  firebase.client_email="YOUR_CLIENT_EMAIL" \
  firebase.private_key="YOUR_PRIVATE_KEY" \
  database.url="YOUR_DATABASE_URL" \
  database.session_secret="YOUR_SESSION_SECRET" \
  apis.groq="YOUR_GROQ_API_KEY" \
  apis.openai="YOUR_OPENAI_API_KEY" \
  apis.tavily="YOUR_TAVILY_API_KEY" \
  apis.serper="YOUR_SERPER_API_KEY" \
  apis.stripe.secret_key="YOUR_STRIPE_SECRET_KEY" \
  apis.stripe.basic_price_id="YOUR_BASIC_PRICE_ID" \
  apis.stripe.pro_price_id="YOUR_PRO_PRICE_ID" \
  redis.url="YOUR_REDIS_URL" \
  redis.rest_api_url="YOUR_KV_REST_API_URL" \
  redis.rest_api_token="YOUR_KV_REST_API_TOKEN"
```

## Development

### Local Development

Run the development server:

```bash
npm run dev
```

For Firebase emulators:

```bash
npm run emulators
```

### Building

Build the client and functions for production:

```bash
# Build client
npm run build

# Build functions
npm run build:functions
```

## Deployment

### Deploy Everything

Deploy both hosting and functions:

```bash
npm run deploy
```

### Deploy Only Hosting

Deploy only the client-side code:

```bash
npm run deploy:hosting
```

### Deploy Only Functions

Deploy only the server-side functions:

```bash
npm run deploy:functions
```

## Continuous Deployment

This project includes a GitHub Actions workflow in `.github/workflows/firebase-deploy.yml` that automatically deploys to Firebase when changes are pushed to the main branch.

To use it, you must set up the following GitHub secrets:

- `FIREBASE_SERVICE_ACCOUNT`: Your Firebase service account JSON (base64 encoded)
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- All environment variables listed in the workflow file

## Project Structure

```
lemur/
├── client/               # Frontend React application
├── server/               # Backend server code
├── functions/            # Firebase Functions
│   ├── index.ts          # Functions entry point
│   └── environment.ts    # Environment configuration
├── dist/                 # Built client code for hosting
├── firebase.json         # Firebase configuration
├── firestore.rules       # Firestore security rules
└── package.json          # Project dependencies and scripts
```

## Troubleshooting

### Common Issues

1. **Firebase Functions Deployment Fails**
   
   Check the logs with:
   ```bash
   firebase functions:log
   ```

2. **Missing Environment Variables**
   
   Ensure all required environment variables are set in both the local .env.local file and the Firebase Functions config.

3. **CORS Issues**
   
   If experiencing CORS issues, check the CORS configuration in the API and ensure the client is connecting to the correct backend URL.

4. **Authentication Problems**
   
   If users cannot authenticate, verify the Firebase configuration in both the client and server.

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)