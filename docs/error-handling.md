# Error Handling in Lemure Search

## Overview

Lemure implements a robust error handling strategy to ensure users receive helpful feedback when issues occur with external APIs or user limits. This document outlines the approach to error handling and provides guidance for future development.

## Types of Errors

### 1. Authentication and Subscription Errors

These errors occur when users reach their search limits or have authentication issues:

- **Anonymous User Limit**: Anonymous users can perform only one search before being prompted to sign in
- **Free Tier Limit**: Free tier users have a limit of 5 searches per session
- **Authentication Failures**: Issues with logging in or session management

### 2. External API Errors

These errors occur when external services fail or are temporarily unavailable:

- **Groq API Errors**: Issues with the AI model service (HTTP 500, 502 errors)
- **Tavily API Errors**: Issues with the web search service
- **Rate Limit Errors**: When APIs enforce rate limits on requests

### 3. Network and Client Errors

These errors occur due to network issues or client-side problems:

- **Network Connectivity**: User loses connection during a search
- **Browser Compatibility**: Issues with specific browsers
- **Client-side Parsing**: Problems parsing API responses

## Error Handling Strategy

### 1. User-Friendly Messages

We provide clear, user-friendly error messages that:

- Explain what went wrong in simple terms
- Offer guidance on what action to take
- Avoid technical jargon or stack traces

### 2. Error Classification

Errors are classified based on their type:

- **User Action Required**: Errors requiring the user to take action (e.g., sign in, upgrade)
- **Temporary Service Issues**: Errors that should resolve with retries (e.g., temporary API outages)
- **System Failures**: More serious errors requiring system administrator attention

### 3. Graceful Degradation

When specific components fail, the system attempts to continue functioning:

- If the AI service fails, traditional search results may still be available
- If specific tabs fail, other tabs may still work

## Implementation Details

### Client-Side Error Handling

1. The `api.ts` module contains error handling logic for API requests:
   - Parses error responses from the server
   - Detects specific error types based on response codes and content
   - Throws appropriate error objects with user-friendly messages

2. The `SearchResults.tsx` component handles displaying errors to users:
   - Shows appropriate error UI based on error type
   - Provides relevant actions (Try Again, Sign In, Upgrade, etc.)
   - Uses friendly language to explain the issue

### Server-Side Error Handling

1. The `routes.ts` file contains error handling for search endpoints:
   - Validates request parameters
   - Catches and logs errors from external APIs
   - Returns appropriate status codes and error messages

2. Error logging captures detailed error information for debugging:
   - Logs technical details for debugging purposes
   - Avoids exposing sensitive information in user-facing errors

## Future Improvements

1. **Improved Retry Logic**: Implement automatic retries for temporary failures

2. **Error Monitoring**: Add a central error monitoring system to track error rates and types

3. **Partial Results**: Return partial results when only some components of the search fail

4. **Predictive Warnings**: Proactively warn users about potential issues before they occur

5. **Fallback Data Sources**: Implement alternative data sources when primary sources fail