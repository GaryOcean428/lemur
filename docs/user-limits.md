# Lemure Search: User Limits and Session Management

## Anonymous Users

- Anonymous users (not logged in) get 1 search with the compound-beta-mini model before being prompted to sign in
- This limit is tracked using session data which persists for 30 days
- When an anonymous user logs in or creates an account, their anonymous search count is reset

## Free Tier Users

- Free tier users get 5 searches
- After 5 searches, they are prompted to upgrade to a paid tier
- Free tier users always use the compound-beta-mini model for AI answers
- AI answers are truncated to 1500 characters for free tier users

## Basic Tier Users

- Basic tier users get unlimited searches
- Basic tier users use the auto-selected model (compound-beta or compound-beta-mini based on query complexity)
- AI answers are truncated to 1500 characters for basic tier users

## Pro Tier Users

- Pro tier users get unlimited searches
- Pro tier users can select their preferred model (compound-beta, compound-beta-mini, or auto)
- Pro tier users get full-length AI answers with no truncation
- Pro tier users get access to additional features like Deep Research mode

## System Implementation

### Session-Based Tracking

- Anonymous searches are tracked using express-session with memory store
- Session data is configured to persist for 30 days
- Session cookies are configured with httpOnly, secure (in production), and sameSite: "lax"

### Database Tracking

- Authenticated user searches are tracked in the database
- Each authenticated search increments the user's searchCount field
- The searchCount is checked on each request to enforce tier limits

### Model Selection

- Pro users can select their preferred model via a query parameter
- Automatic model selection uses factors like query length, complexity indicators, and source count
- The system defaults to the most powerful model for complex queries and the fastest model for simple queries
