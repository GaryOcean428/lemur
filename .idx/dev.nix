# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{pkgs}: {
  # Which nixpkgs channel to use.
  channel = "unstable"; # Maintained from previous configuration

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_22
    pkgs.typescript
    pkgs.git
    pkgs.firebase-tools
  ];

  # Sets environment variables in the workspace
  env = {
    # Firebase project configuration (from previous)
    VITE_FIREBASE_PROJECT_ID = "lemur-86e1b";
    FIREBASE_PROJECT = "lemur-86e1b";
    
    # TypeScript configuration (from previous)
    TS_NODE_PROJECT = "./client/tsconfig.json";
    
    # Development environment settings (from previous)
    NODE_ENV = "development";
  };

  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # Core development tools
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
      "pkief.material-icon-theme"
      "mikestead.dotenv"
      "eamodio.gitlens"
      "bradlc.vscode-tailwindcss"
      
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
