# Preliminary Firestore Schema for Lemur

This document outlines a preliminary schema for Firestore to support the Lemur application, including user data, saved research, preferences, and tier management.

## Collections

### 1. `users`

Stores user-specific information, linked to Firebase Authentication UID.

-   **Document ID**: `Firebase Auth UID`
-   **Fields**:
    -   `email`: (string) User's email address.
    -   `displayName`: (string, optional) User's display name.
    -   `photoURL`: (string, optional) URL to user's profile picture.
    -   `createdAt`: (timestamp) Timestamp of account creation.
    -   `lastLoginAt`: (timestamp) Timestamp of last login.
    -   `tier`: (string) User's subscription tier (e.g., "free", "basic", "pro"). Defaults to "free".
    -   `searchCount`: (number) Number of searches performed in the current billing cycle/period. Resets monthly.
    -   `searchCountResetAt`: (timestamp) Timestamp when the search count was last reset.
    -   `preferences`: (map, optional) User-specific preferences.
        -   `theme`: (string, e.g., "light", "dark", "system")
        -   `defaultSearchFocus`: (string, e.g., "web", "academic")
        -   `modelPreference`: (string, e.g., "compound-beta-mini", "compound-beta") - though this is also tier-dependent.

### 2. `savedSearches` (or `aiAnswers`)

Stores AI-generated answers or summaries from user searches.

-   **Document ID**: Auto-generated Firestore ID.
-   **Fields**:
    -   `userId`: (string) Firebase Auth UID of the user who saved the search.
    -   `query`: (string) The original search query.
    -   `searchFocus`: (string, e.g., "web", "academic") The focus of the search.
    -   `answer`: (string) The synthesized AI answer/report.
    -   `sources`: (array of maps) List of sources used for the answer.
        -   `title`: (string)
        -   `url`: (string)
        -   `snippet`: (string, optional)
    -   `createdAt`: (timestamp) Timestamp when the search was saved.
    -   `updatedAt`: (timestamp) Timestamp of the last update (if any).
    -   `tags`: (array of strings, optional) User-defined tags for organization.
    -   `title`: (string, optional) User-defined title for the saved search.

### 3. `deepResearchProjects`

Stores results and artifacts from deep research sessions.

-   **Document ID**: Auto-generated Firestore ID.
-   **Fields**:
    -   `userId`: (string) Firebase Auth UID of the user who initiated the research.
    -   `initialQuery`: (string) The main query for the deep research.
    -   `status`: (string) Current status of the research (e.g., "in-progress", "completed", "failed").
    -   `iterations`: (number) Number of iterations performed.
    -   `finalReport`: (string) The comprehensive final report generated.
    -   `processLog`: (array of strings) Log of the agentic research process.
    -   `sourcesUsed`: (array of maps) Aggregated list of all sources consulted across iterations.
        -   `title`: (string)
        -   `url`: (string)
        -   `contentSnippet`: (string, optional)
    -   `createdAt`: (timestamp) Timestamp when the research project was started.
    -   `updatedAt`: (timestamp) Timestamp of the last update.
    -   `title`: (string, optional) User-defined title for the research project.

## Considerations for Tier Management:

-   The `users` collection will store the `tier` and `searchCount`.
-   Backend logic (e.g., Firebase Functions or server endpoints secured by Firebase Auth) will be responsible for:
    -   Checking `tier` and `searchCount` before allowing a search.
    -   Incrementing `searchCount` after a successful search (including follow-ups).
    -   Resetting `searchCount` monthly (e.g., via a scheduled Firebase Function).
    -   Enforcing model access based on `tier`.

## Security Rules:

Firestore security rules will be crucial to ensure users can only access and modify their own data.

-   **`users` collection**: Users can read/write their own document.
-   **`savedSearches` / `deepResearchProjects` collections**: Users can create, read, update, and delete documents where `userId` matches their Auth UID.

This preliminary schema provides a foundation. It can be refined as development progresses and more specific data requirements emerge.

