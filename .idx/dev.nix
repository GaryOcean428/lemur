# This is a Nix configuration file for Firebase Studio / Project IDX
{ pkgs, ... }: {
  channel = "unstable";  # Using unstable channel for latest packages

  packages = [
    pkgs.nodejs_22
    pkgs.typescript
    pkgs.git
    pkgs.firebase-tools  # Add Firebase CLI
  ];

  env = {
    VITE_FIREBASE_PROJECT_ID = "lemur-86e1b";
    FIREBASE_PROJECT = "lemur-86e1b";
  };

  idx.extensions = [
    "dbaeumer.vscode-eslint"
    "esbenp.prettier-vscode"
    "firebase.vscode-firebase"
    "ms-vscode.vscode-typescript-next"
    "pkief.material-icon-theme"
    "mikestead.dotenv"
    "christian-kohler.pathintellisense"
    "eamodio.gitlens"
  ];

  idx.previews = {
    enable = true;
    previews = {
      web = {
        command = [
          "cd"
          "client"
          "&&"
          "vite"
          "--port"
          "$PORT"
          "--host"
          "--clearScreen"
          "false"
        ];
        manager = "web";
        env = {
          PORT = "$PORT";
          BROWSER = "none";
          PREVIEW_URL = "https://$PREVIEW_URL";
          VITE_FIREBASE_PROJECT_ID = "lemur-86e1b";
          FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
          FIRESTORE_EMULATOR_HOST = "localhost:8080";
          FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";
        };
      };
    };
  };

  idx.workspace = {
    onCreate = {
      deps = {
        command = [
          "npm"
          "install"
          "&&"
          "cd"
          "client"
          "&&"
          "npm"
          "install"
        ];
      };
    };
    onStart = {
      emulators = {
        command = ["firebase", "emulators:start"];
        env = {
          FIREBASE_PROJECT = "lemur-86e1b";
        };
      };
    };
  };
}
