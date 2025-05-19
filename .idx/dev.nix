# .idx/dev.nix - Firebase Studio 2025 Configuration
{pkgs}: {
  channel = "stable-24.11";

  packages = [
    pkgs.nodejs_22
    pkgs.yarn
    pkgs.firebase-tools
    pkgs.typescript
    pkgs.jq
    pkgs.gh
    pkgs.python311
    pkgs.concurrently
    pkgs.google-cloud-sdk
  ];

  idx = {
    extensions = [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "firebase.vscode-firebase",
      "github.copilot",
      "saoudrizwan.claude-dev",
      "antfu.vite",
      "bradlc.vscode-tailwindcss",
      "DavidAnson.vscode-markdownlint",
      "eamodio.gitlens",
      "GitHub.vscode-codeql",
      "github.vscode-github-actions",
      "jnoortheen.nix-ide",
      "mikestead.dotenv",
      "ms-azuretools.vscode-docker",
      "ms-vscode.vscode-typescript-next",
      "PKief.material-icon-theme",
      "Redis.redis-for-vscode",
      "rvest.vs-code-prettier-eslint",
      "Selemondev.shadcn-vue",
      "svelte.svelte-vscode",
      "vitest.explorer",
      "Vue.volar"
    ];

    previews = {
      client = {
        command = "yarn client:dev"; # Starts your client development server
        manager = "web";
        env = { PORT = "$PORT"; }; # IDX injects the port for the preview
      };
    };

    processes = {
      # Starts Firebase emulators for auth, firestore, functions, and storage
      "firebase-emulators" = "firebase emulators:start --only auth,firestore,functions,storage";
      # Starts your API development server
      "api-server" = "yarn api:dev";
    };

    workspace = {
      onCreate = {
        install-deps = "yarn install";
        open-main-file.openFiles = ["packages/client/src/main.tsx"]; # Original path maintained
      };
      onStart = {
        # 'start-all' functionality is now handled by idx.previews and idx.processes
        type-check = "yarn workspaces foreach run type-check";
      };
    };

  };

  env = {
    NODE_ENV = "development";
    FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199"; # Added for storage emulator
  };
}
