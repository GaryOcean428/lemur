# Lemur Developer Guide

## Introduction

This guide will help you get started with developing for the Lemur search engine project. It covers development setup, coding standards, and workflows to help you contribute effectively.

## Development Environment Setup

### Prerequisites

- Node.js 20.x or later
- PostgreSQL database
- Git

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-org/lemur.git
   cd lemur
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up environment variables:
   ```sh
   cp .env.example .env.local
   ```
   Edit `.env.local` to add your API keys for Tavily and Groq.

4. Start the development server:
   ```sh
   npm run dev
   ```

## Project Structure

```
├── client/              # Frontend code
│   ├── src/
│   │   ├── assets/      # Static assets
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions
│   │   ├── pages/       # Page components
│   │   ├── store/       # State management
│   │   └── styles/      # CSS and theme files
│   └── index.html       # HTML entry point
├── docs/                # Documentation
├── server/              # Backend code
│   ├── auth.ts          # Authentication
│   ├── db.ts            # Database connection
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   └── storage.ts       # Data storage interface
├── shared/              # Shared code between client and server
│   └── schema.ts        # Database schema and types
└── tests/               # Test files
```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for feature work
- `feature/[name]` - Feature branches
- `bugfix/[name]` - Bug fix branches

### Commit Guidelines

Follow conventional commits pattern:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Formatting changes
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `test:` - Adding or modifying tests
- `chore:` - Changes to the build process or auxiliary tools

### Pull Requests

- Create a PR against the `develop` branch
- Ensure all tests pass
- Request review from at least one team member
- Address review comments
- Squash and merge once approved

## Adding New Features

### Frontend Components

1. Create new components in `client/src/components/`
2. Follow the existing pattern for naming and organization
3. Use shadcn/ui components where possible
4. Keep components small and focused

### API Endpoints

1. Add new routes in `server/routes.ts`
2. Update the database schema in `shared/schema.ts` if needed
3. Implement necessary storage operations in `server/storage.ts`
4. Add corresponding API client functions in `client/src/lib/api.ts`

### State Management

1. Use Zustand for global state in `client/src/store/`
2. Use React Query for API data fetching

## Testing

### Running Tests

```sh
node tests/api-test.js  # Run API tests
npm test               # Run all other tests
```

### Writing Tests

- Place tests in the `tests/` directory
- Name test files with `.test.js` or `.test.ts` suffix
- Test both UI components and API endpoints

## Deployment

### Staging Deployment

Staging deployments happen automatically when changes are merged to the `develop` branch.

### Production Deployment

Production deployments require manual approval and happen when changes are merged to the `main` branch.

## External Integrations

### Tavily API

Tavily is used for traditional web search results. See the [API documentation](https://docs.tavily.com/) for details.

### Groq API

Groq is used for AI-powered answers. See the [API documentation](https://console.groq.com/docs/quickstart) for details.

## Resources

- [Lemur API Reference](../api/reference.md)
- [Protocol Integration Guide](../protocols/mcp-a2a-integration.md)
- [Architecture Overview](../architecture/search-architecture.md)
