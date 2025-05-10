# Firebase Studio / Project IDX Environment Configuration

## Overview
This project is configured to run in Firebase Studio/Project IDX environment, which provides a managed development environment with built-in preview capabilities.

## Key Configuration Files

### dev.nix
- Located in `.idx/dev.nix`
- Configures the development environment
- Manages dependencies, extensions, and preview settings
- Handles Firebase emulator configuration

### Project Structure
- Client code in `client/` directory
- Server code in `server/` directory
- Vite configuration in client directory
- Firebase configuration in project root

## Development Server

The development server is managed by IDX's preview system:
- Runs from the client directory
- Uses Vite for development
- Automatically handles port allocation
- Manages HMR configuration

### HMR Configuration
The Hot Module Replacement (HMR) is configured to work with IDX's secure environment:
```typescript
hmr: {
  protocol: 'wss',  // Use secure WebSocket
  host: process.env.PREVIEW_URL ? new URL(process.env.PREVIEW_URL).hostname : undefined,
  clientPort: process.env.PREVIEW_URL ? 443 : undefined,  // Use HTTPS port
}
```

## Environment Variables
Required environment variables in dev.nix:
```nix
env = {
  VITE_FIREBASE_PROJECT_ID = "lemur-86e1b";
  FIREBASE_PROJECT = "lemur-86e1b";
}
```

Preview environment variables:
```nix
env = {
  PORT = "$PORT";  # Managed by IDX
  BROWSER = "none";
  PREVIEW_URL = "https://$PREVIEW_URL";  # For HMR configuration
  VITE_FIREBASE_PROJECT_ID = "lemur-86e1b";
  FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
  FIRESTORE_EMULATOR_HOST = "localhost:8080";
  FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";
}
```

## Firebase Emulators
Firebase emulators are automatically started by the workspace configuration:
- Auth: Port 9099
- Firestore: Port 8080
- Storage: Port 9199
- Functions: Port 5001
- Hosting: Port 5000

## Development Workflow
1. IDX automatically installs dependencies on workspace creation
2. Firebase emulators start automatically
3. Development server runs in preview window with secure HMR
4. HMR updates are handled through secure WebSocket connection

## Important Notes
- Do not run a separate development server - use IDX's preview system
- Firebase emulators are managed by IDX workspace configuration
- Path aliases are configured relative to the client directory
- TypeScript configuration is split between client and server
- HMR uses secure WebSocket (WSS) protocol for live updates
- Preview URL is automatically configured for secure connections