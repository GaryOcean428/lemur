# Firebase Cloud Function Deployment Instructions

This document provides instructions for deploying the Firebase Cloud Function located in `/home/ubuntu/lemur/functions/src/index.ts`. This function is designed to reset monthly search counts for users.

## Prerequisites

1.  **Node.js and npm**: Ensure you have Node.js (version specified in your `functions/package.json`, typically LTS) and npm installed on your local machine where you will run deployment commands.
2.  **Firebase CLI**: Install or update the Firebase Command Line Interface:
    ```bash
    npm install -g firebase-tools
    ```
3.  **Firebase Project**: You must have already created your Firebase project and initialized Firestore.
4.  **Authentication**: Log in to Firebase using the CLI:
    ```bash
    firebase login
    ```
5.  **Project Initialization for Functions**: If you haven't already set up Firebase Functions in your project directory (`/home/ubuntu/lemur/` or your local equivalent), you would typically initialize it. However, since the `functions` directory structure and a basic `index.ts` are provided, you mainly need to ensure a `package.json` exists within the `functions` directory.

## `functions/package.json` Setup

Navigate to your `functions` directory (`cd /home/ubuntu/lemur/functions` or your local equivalent). If a `package.json` doesn't exist, create one or ensure it has the necessary dependencies. A minimal `package.json` would look like this:

```json
{
  "name": "lemur-functions",
  "version": "1.0.0",
  "description": "Firebase Cloud Functions for Lemur App",
  "main": "lib/index.js", // Or your compiled JS output directory
  "scripts": {
    "build": "tsc", // If using TypeScript
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18" // Specify your Node.js version (e.g., 16, 18, 20)
  },
  "dependencies": {
    "firebase-admin": "^11.0.0", // Use appropriate version
    "firebase-functions": "^4.0.0" // Use appropriate version
  },
  "devDependencies": {
    "typescript": "^4.0.0" // If using TypeScript
  },
  "private": true
}
```

**Important Notes for `package.json`**:
*   Adjust Node.js engine version and dependency versions as needed.
*   If you are using TypeScript (as the provided `index.ts` implies), you need `typescript` in `devDependencies` and a `tsconfig.json` in the `functions` directory.
*   The `main` field should point to the compiled JavaScript output (e.g., `lib/index.js` if your `tsconfig.json` outputs to a `lib` directory).

## `functions/tsconfig.json` (If using TypeScript)

Create a `tsconfig.json` file in your `functions` directory:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2017", // Or a newer target compatible with your Node.js version
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "compileOnSave": true,
  "include": [
    "src"
  ]
}
```

## Deployment Steps

1.  **Install Dependencies**: Navigate to your `functions` directory in your terminal and run:
    ```bash
    cd /path/to/your/project/lemur/functions
    npm install
    ```

2.  **Compile TypeScript (if applicable)**: If you are using TypeScript, compile your `index.ts` file to JavaScript:
    ```bash
    npm run build
    ```
    This will typically create a `lib` directory with the compiled `index.js` file.

3.  **Select Firebase Project**: Ensure the Firebase CLI is configured to use the correct project:
    ```bash
    firebase use <your-firebase-project-id> 
    # e.g., firebase use lemur-86e1b
    ```

4.  **Deploy the Function(s)**: Deploy your functions to Firebase:
    ```bash
    firebase deploy --only functions
    ```
    If you want to deploy a specific function (e.g., `resetMonthlySearchCounts` if it were an HTTP function, or `scheduledResetMonthlySearchCounts` for the pub/sub one):
    ```bash
    firebase deploy --only functions:resetMonthlySearchCounts 
    # or firebase deploy --only functions:scheduledResetMonthlySearchCounts
    ```

## Scheduling the Function (for Pub/Sub version)

The provided `index.ts` includes a commented-out example for a Pub/Sub triggered function (`scheduledResetMonthlySearchCounts`) that is scheduled to run at `00:00` on the 1st day of every month in the UTC timezone.

```typescript
// export const scheduledResetMonthlySearchCounts = functions.pubsub
//   .schedule("0 0 1 * *") // Runs at 00:00 on the 1st day of every month
//   .timeZone("UTC") // Specify your timezone
//   .onRun(async (context) => { /* ... logic ... */ });
```

If you uncomment and deploy this Pub/Sub function, Firebase will automatically create the necessary Google Cloud Scheduler job to trigger it according to the schedule.

**Alternatively, for the HTTP-triggered function (`resetMonthlySearchCounts`)**: 
You would need to manually set up a Google Cloud Scheduler job to call the HTTP endpoint of this function on your desired schedule (e.g., first of the month).

1.  Go to the [Google Cloud Scheduler console](https://console.cloud.google.com/cloudscheduler).
2.  Select your Firebase project.
3.  Create a new job:
    *   **Name**: e.g., `lemur-reset-search-counts`
    *   **Frequency**: Use cron syntax, e.g., `0 0 1 * *` for midnight on the first of the month.
    *   **Timezone**: Select your desired timezone.
    *   **Target type**: HTTP
    *   **URL**: Get this from the Firebase console after deploying your HTTP function. It will look something like `https://<region>-<project-id>.cloudfunctions.net/resetMonthlySearchCounts`.
    *   **HTTP method**: GET or POST (depending on your function, GET is fine for this one if no body is needed).
    *   **Auth header (Recommended for security)**: If you implemented a secret token check in your HTTP function, configure the scheduler to send that token in a header (e.g., `X-Scheduler-Token` with your secret value).

## Monitoring and Logs

You can monitor the execution of your Cloud Functions and view logs in the Firebase console under the "Functions" section, then "Logs" tab, or in the Google Cloud Console under "Cloud Functions" and "Logging".

This completes the deployment and scheduling instructions for the Firebase Cloud Function.
