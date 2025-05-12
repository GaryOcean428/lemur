# Firebase Studio Configuration with 2025 Best Practices
# https://firebase.google.com/docs/studio/customize-workspace
{pkgs}: {
  # Use latest stable channel for maximum compatibility
  channel = "unstable";

  # Comprehensive development tools
  packages = [
    pkgs.nodejs_22
    pkgs.typescript
    pkgs.git
    pkgs.firebase-tools
    pkgs.jq               # JSON processing for Firebase configs
    pkgs.gh               # GitHub CLI for CI/CD integration
    pkgs.python311        # For AI-powered tooling
    pkgs.concurrently     # Run multiple commands concurrently
  ];

  # Environment variables with enhanced security
  env = {
    # Firebase configuration
    VITE_FIREBASE_PROJECT_ID = "lemur-86e1b";
    FIREBASE_PROJECT = "lemur-86e1b";
    
    # Development configuration
    TS_NODE_PROJECT = "./client/tsconfig.json";
    NODE_ENV = "development";
    
    # Port configuration for consistent development
    PORT = "9000";
    VITE_PORT = "9000";
    API_PORT = "5080";
    
    # Enable Firebase Emulator detection
    FIREBASE_EMULATOR_MODE = "true";
    FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  };
  
  # Configure workspace environments for full-stack development (Firebase Studio 2025)
  workspace = {
    # Main client application
    web = {
      directory = "";
      command = "npm run dev:client";
      port = 9000;
      processReadyPattern = "Local:";
    };
    
    # Firebase Emulators UI
    emulators = {
      directory = "";
      command = "npm run emulators";
      port = 4000;
      processReadyPattern = "All emulators ready";
    };
    
    # API Server
    api = {
      directory = "";
      command = "npm run dev";
      port = 5080;
      processReadyPattern = "server started";
    };
  };
  
  idx = {
    # Extensions for optimal Firebase development (2025 recommended)
    extensions = [
      # Core development tools
      "dbaeumer.vscode-eslint"              # JavaScript/TypeScript linting
      "esbenp.prettier-vscode"              # Consistent code formatting
      "ms-azuretools.vscode-docker"         # Container management
      "pkief.material-icon-theme"           # Enhanced file icons
      "mikestead.dotenv"                    # Environment file support
      "eamodio.gitlens"                     # Git integration
      "bradlc.vscode-tailwindcss"           # Tailwind CSS support
      
      # Firebase-specific extensions
      "firebase.vscode-firebase"            # Firebase integration
      
      # AI development tools (2025 features)
      "github.copilot"                      # AI code assistance
      "github.copilot-chat"                 # AI development chat
      "firebase.genkit-ai"                  # Firebase Genkit AI integration
      
      # Documentation and quality
      "DavidAnson.vscode-markdownlint"
      
      # CI/CD and deployment
      "GitHub.vscode-codeql"
      "github.vscode-github-actions"
      "ms-azuretools.vscode-docker"
      
      # TypeScript/JavaScript
      "ms-vscode.vscode-typescript-next"
      "rvest.vs-code-prettier-eslint"
      
      # AI assistance
      "saoudrizwan.claude-dev"
    ];

    workspace = {
      onCreate = {
        install-client-deps = "cd client && npm install";
        open-main-file = {
          openFiles = ["client/src/main.tsx"];
        };
      };
      onStart = {
        type-check = "cd client && npx tsc --noEmit";
      };
    };

    # Enable previews and customize configuration
    previews = {
      enable = true;
      previews = {
        web = {
          # Modified to ensure vite is properly available through npx
          command = [
            "bash"
            "-c"
            "cd client && npm install && npx vite --clearScreen false --port $PORT --host 0.0.0.0"
          ];
          manager = "web";
          env = {
            # Networking configuration
            PORT = "$PORT";
            BROWSER = "none";
            HOST = "0.0.0.0";
            
            # Firebase configuration
            VITE_FIREBASE_PROJECT_ID = "lemur-86e1b";
            VITE_FIREBASE_API_KEY = "AIzaSyDK-sGc06yhE24rUWuXzce87zosdyg6D_M";
            VITE_FIREBASE_AUTH_DOMAIN = "lemur-86e1b.firebaseapp.com";
            VITE_FIREBASE_STORAGE_BUCKET = "lemur-86e1b.appspot.com";
            VITE_FIREBASE_MESSAGING_SENDER_ID = "1084727035842";
            VITE_FIREBASE_APP_ID = "1:1084727035842:web:8c1a0502583915785a78f0";
            VITE_FIREBASE_MEASUREMENT_ID = "G-T6X6E8J9XN";
            
            # Firebase emulator configuration
            FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
            FIRESTORE_EMULATOR_HOST = "localhost:8080";
            FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";
          };
        };
      };
    };
  };
}
