# Lemur Architecture Documentation

## 1. Overview

Lemur is an AI-powered search engine that combines traditional web search results with AI-synthesized answers. The application leverages Groq's Compound Beta and Compound Beta Mini AI models to deliver a dual-format search experience. The system follows a modern full-stack architecture with a React frontend, Node.js backend, and PostgreSQL database.

## 2. System Architecture

Lemur follows a client-server architecture with clear separation between frontend and backend:

```
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│                 │           │                 │           │                 │
│  Client (React) │ ◄────────►│  Server (Node)  │ ◄────────►│     Database    │
│                 │           │                 │           │  (PostgreSQL)   │
└─────────────────┘           └─────────────────┘           └─────────────────┘
                                      ▲
                                      │
                                      ▼
                              ┌─────────────────┐
                              │  External APIs  │
                              │  - Groq API     │
                              │  - Tavily API   │
                              │  - Stripe API   │
                              └─────────────────┘
```

### Key Architectural Patterns

1. **Monorepo Structure**: The codebase follows a monorepo approach with client, server, and shared code organized in a single repository.
   
2. **API-First Backend**: The server exposes a RESTful API that the client consumes for search functionality and user management.
   
3. **Component-Based UI**: The frontend uses a component-based architecture with shadcn/ui components and a consistent design system.
   
4. **Tiered Service Model**: The application implements a tiered subscription model with different capabilities for free, basic, and pro users.

## 3. Key Components

### 3.1 Frontend Architecture

- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: Combination of React hooks, context API, and Zustand for global state
- **Routing**: Wouter for lightweight client-side routing
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation

The frontend is structured as follows:
- `/client/src/components/`: Reusable UI components
- `/client/src/pages/`: Page components representing different routes
- `/client/src/hooks/`: Custom React hooks
- `/client/src/lib/`: Utility functions and shared logic
- `/client/src/store/`: Zustand stores for global state management

### 3.2 Backend Architecture

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 
- **API**: RESTful endpoints for search, user management, and subscription handling
- **Authentication**: Passport.js with session-based authentication
- **Database ORM**: Drizzle ORM with PostgreSQL

The backend is structured as follows:
- `/server/index.ts`: Entry point for the Express server
- `/server/routes.ts`: API route definitions
- `/server/auth.ts`: Authentication logic
- `/server/db.ts`: Database connection setup
- `/server/storage.ts`: Data access layer
- `/server/directCompound.ts`: Integration with Groq's Compound API

### 3.3 Shared Code

- `/shared/schema.ts`: Database schema definitions shared between frontend and backend
- Types and interfaces used across both client and server

### 3.4 Database Schema

The application uses a PostgreSQL database with the following main tables:
- **users**: User accounts with subscription tier information
- **search_history**: Record of search queries by users
- **saved_searches**: Searches saved by users including AI answers and results
- **search_feedback**: User feedback on search results

## 4. Data Flow

### 4.1 Search Flow

1. User submits a search query through the frontend
2. The query is sent to one of two backend endpoints:
   - `/api/direct-search`: Uses Groq Compound Beta's built-in search capabilities
   - `/api/search`: Uses a separate pipeline that calls Tavily for web results and Groq for AI answers
3. The backend processes the query and determines which model to use based on query complexity and user tier
4. External API calls are made to Groq and/or Tavily
5. Results are processed, stored in search history, and returned to the client
6. The frontend displays both traditional web results and AI-synthesized answers

### 4.2 Authentication Flow

1. User registers or logs in through the auth interface
2. Credentials are validated against the database
3. Upon successful authentication, a session is created
4. The session is maintained through cookies and used for subsequent requests
5. User permissions and limits are enforced based on subscription tier

### 4.3 Subscription Flow

1. User selects a subscription plan
2. Payment is processed through Stripe integration
3. Upon successful payment, the user's account is updated with the new subscription tier
4. User is granted access to tier-specific features and limits

## 5. External Dependencies

### 5.1 AI Search Services

- **Groq API**: Provides AI model access for generating answers to user queries
  - Uses Compound Beta for comprehensive AI synthesis with multiple tool calls
  - Uses Compound Beta Mini for faster, simpler queries with lower latency

- **Tavily API**: Used for traditional web search results

### 5.2 Payment Processing

- **Stripe**: Handles subscription payments and recurring billing
  - Frontend integration via `@stripe/react-stripe-js` and `@stripe/stripe-js`
  - Backend webhook handling for subscription events

### 5.3 Database

- **Neon Database**: Serverless PostgreSQL database
  - Connected via `@neondatabase/serverless`
  - Schema managed by Drizzle ORM

## 6. Deployment Strategy

The application is configured for deployment on Replit:

- **Development**: Uses `npm run dev` to start both frontend and backend in development mode
- **Production Build**:
  - Frontend: Built with Vite (`vite build`)
  - Backend: Bundled with esbuild
  - Combined into a single deployable package

Deployment configuration:
- Auto-scaled deployment target
- Port 5000 exposed internally, mapped to port 80 externally
- Static assets served from `/dist/public`
- Environment variables required for external API keys and database connection

### 6.1 Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for securing user sessions
- `GROQ_API_KEY`: API key for Groq
- `TAVILY_API_KEY`: API key for Tavily search
- `STRIPE_SECRET_KEY`: Stripe API key for payment processing
- `STRIPE_WEBHOOK_SECRET`: Secret for verifying Stripe webhook events

## 7. Key Architectural Decisions

### 7.1 Dual Search Strategy

The system implements two different search approaches:

1. **Direct Compound Search**: Using Groq Compound Beta's built-in search tool capabilities
   - Pro: Simplified integration with a single API call
   - Pro: Better coherence between search and answer
   - Con: Limited control over search parameters

2. **Traditional Pipeline**: Separate calls to Tavily for search and Groq for answers
   - Pro: More control over search parameters and result presentation
   - Pro: Fallback option if one service is unavailable
   - Con: Requires more complex integration and error handling

The system is designed to try direct search first and fall back to the traditional pipeline if needed.

### 7.2 Tiered User Experience

- **Anonymous Users**: Limited to 1 search with the compound-beta-mini model
- **Free Tier**: 5 searches with compound-beta-mini model and truncated answers
- **Basic Tier**: Unlimited searches with auto-selected model and truncated answers
- **Pro Tier**: Unlimited searches with model selection and full-length answers

This approach enables monetization while providing value at all tiers.

### 7.3 Contextual Follow-up

The system implements a session-based conversation context that allows users to ask follow-up questions without repeating all context. This creates a more natural search experience and is implemented using:

- Session storage for conversation history
- Automatic detection of likely follow-ups
- Context enhancement for AI responses