# This is a Nix configuration file for Firebase Studio / Project IDX
{ pkgs, ... }: {
  channel = "unstable";  # Using unstable channel for latest packages

  packages = [
    pkgs.nodejs_22
    pkgs.typescript
    # pkgs.yarn # Removed to standardize on npm
    pkgs.git
  ];

  env = { };

  idx.extensions = [
    "svelte.svelte-vscode"
    "vue.volar"
    "esbenp.prettier-vscode"
    "ms-vscode.vscode-typescript-next"
    "rvest.vs-code-prettier-eslint"
    "saoudrizwan.claude-dev"
    "dbaeumer.vscode-eslint"  # Adding ESLint extension
    "eamodio.gitlens"
    "ms-azuretools.vscode-docker"
    "mikestead.dotenv"
    "christian-kohler.pathintellisense"
    "pkief.material-icon-theme"
  ];

  idx.previews = {
    enable = true;
    previews = {
      web = {
        command = [
          "npm"
          "run"
          "dev"
          "--"
          "--port"
          "$PORT"
          "--host"
          "0.0.0.0"
        ];
        manager = "web";
        env = {
          PORT = "$PORT";
          HOST = "0.0.0.0";
          BROWSER = "none";
        };
      };
    };
  };

  idx.workspace = {
    onCreate = { };
    onStart = { };
  };
}
