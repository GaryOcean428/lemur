# TypeScript Configuration in Firebase Studio IDX

This document explains how TypeScript is configured in this project within Firebase Studio IDX.

## Configuration Overview

The environment has two TypeScript setups:

1. **System-level TypeScript**: Provided by `pkgs.typescript` in the Nix config, currently version 5.8.2 in the unstable channel
   - Used for command-line TypeScript operations in the terminal
   - Ensures TypeScript CLI tools are available in the environment

2. **Project-level TypeScript**: Installed in `client/node_modules/typescript`, specifically version 5.6.3
   - Used by VS Code for code intelligence, linting, and compilation
   - Ensures consistent TypeScript behavior across team members

## How This Works

1. **VS Code Configuration**: 
   - VS Code is configured to use the project-specific TypeScript installed in `client/node_modules/typescript`
   - This is set up in `.vscode/settings.json` with:
     ```json
     {
       "typescript.tsdk": "./client/node_modules/typescript/lib",
       "typescript.enablePromptUseWorkspaceTsdk": true
     }
     ```
   - The `enablePromptUseWorkspaceTsdk` setting ensures VS Code prompts you to use the workspace version

2. **Environment Variables**:
   - `TS_NODE_PROJECT` is set to "./client/tsconfig.json" to ensure any ts-node usage finds the right config
   - `NODE_ENV` is set to "development" to enable development features

3. **Lifecycle Hooks**:
   - When the workspace is created, an automatic `npm install` will run in the client directory
   - This ensures TypeScript and other dependencies are properly installed
   - The hooks are configured using the simplified Firebase Studio IDX compatible syntax:
     ```nix
     # Commands to run when the workspace is first created
     idx.workspace.onCreate = [
       "cd client && npm install"
     ];
     ```
   - This format follows the official Firebase Studio `dev.nix` reference structure

4. **Preview Command**:
   - The preview command has been configured to use proper syntax for shell commands:
     ```nix
     command = [
       "bash"
       "-c"
       "cd client && npm run dev"
     ];
     ```
   - This fixes the "Error: spawn cd ENOENT" issue that can occur with incorrectly formatted commands

## Possible Issues and Solutions

If you encounter TypeScript-related errors:

1. **"Cannot find module" errors**:
   - Run `cd client && npm install` to ensure dependencies are installed
   - Check if the path in import statements matches the actual file structure

2. **TS version mismatch warnings**:
   - Click on the TypeScript version in the VS Code status bar (bottom right)
   - Select "Use Workspace Version" to use the 5.6.3 version
   - If you don't see this option, restart VS Code or the workspace

3. **IDX typescript environment errors**:
   - The base environment now uses `pkgs.typescript` from the Nix unstable channel
   - This should provide TypeScript command-line tools in the development environment
   - If you get "Cannot find TypeScript" errors in the terminal, rebuild the environment

4. **Preview server fails to start**:
   - If you see "Error: spawn cd ENOENT", the command syntax has been updated to fix this
   - You may need to restart the Firebase Studio environment to apply the changes

5. **Environment issues after modifying dev.nix**:
   - Use "Hard Restart" from the command palette (Cmd+Shift+P on Mac, Ctrl+Shift+P on Windows/Linux)
   - If that doesn't work, use the "Rebuild Environment" command

## Making Changes

If you need to change the TypeScript version:

1. Update the version in `client/package.json`
2. Run `cd client && npm install` to update the node_modules version
3. Restart the TypeScript server in VS Code:
   - Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)
   - Type "TypeScript: Restart TS Server" and select it

## Firebase Studio IDX Environment

To apply changes made to the `.idx/dev.nix` file:

1. You need to rebuild the Firebase Studio environment:
   - Use the command palette (Cmd+Shift+P on Mac, Ctrl+Shift+P on Windows/Linux)
   - Select "Hard Restart" to restart the environment
   - For more significant changes, use the "Rebuild Environment" command
   - In some cases, you may need to close and reopen the Firebase Studio workspace

2. Extensions:
   - Firebase Studio uses the Open VSX registry for extensions, not the VS Code Marketplace
   - Some extensions like "firebase.vscode-firebase" and "christian-kohler.pathintellisense" 
     weren't found in the OpenVSX registry
   - These have been commented out in the dev.nix configuration
   - You can check available extensions at: https://open-vsx.org/

3. Preview Command:
   - The preview command now uses proper Nix syntax for shell commands:
     ```nix
     command = [
       "bash"
       "-c"
       "cd client && npm run dev"
     ];
     ```
   - This ensures proper directory navigation and command execution

## Rebuilding the Environment

After making changes to dev.nix, you'll need to rebuild the environment:

1. **Command Palette Method**:
   - Open the command palette (Cmd+Shift+P on Mac, Ctrl+Shift+P on Windows/Linux)
   - For minor changes: Run the "Hard Restart" command
   - For major changes: Run the "Rebuild Environment" command

2. **Manual Method** (if command palette options don't work):
   - Close your Firebase Studio workspace tab
   - Return to the Firebase Studio home page
   - Reopen your workspace

3. **Troubleshooting After Rebuild**:
   - If you see a blank screen, try using the "Reset" option from the Firebase Studio menu
   - If an internal error occurs, refresh the page after a minute
   - If you see "Whoops...We need to start a new VM", please wait as this can take up to 5 minutes
