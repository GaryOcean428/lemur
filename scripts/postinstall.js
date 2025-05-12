git add .idx/dev.nix
git commit -m "fix: update IDX configuration to use workspace instead of preview"/**
 * Postinstall Script for Firebase Project 2025 Best Practices
 *
 * Chain of Draft: Check → Setup → Link → Configure
 *
 * Ensures consistent workspace setup across environments by:
 * 1. Checking and creating required directories
 * 2. Configuring tsconfig.json files
 * 3. Setting up dependencies across workspaces
 * 4. Configuring Firebase emulators for development
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// Root directory
const rootDir = path.resolve('.');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

console.log('🔧 Running post-install configuration for Firebase 2025 best practices...');

// Ensure dev-data directory exists for emulator data
const devDataDir = path.join(rootDir, 'dev-data');
if (!fs.existsSync(devDataDir)) {
  console.log('📁 Creating dev-data directory for emulator state...');
  fs.mkdirSync(devDataDir, { recursive: true });
}

// Fix TypeScript config in client workspace
const clientTsConfigPath = path.join(rootDir, 'client', 'tsconfig.node.json');
if (fs.existsSync(clientTsConfigPath)) {
  console.log('🔍 Updating client TypeScript configuration...');
  const tsConfig = JSON.parse(fs.readFileSync(clientTsConfigPath, 'utf8'));

  // Fix Vite configuration path
  tsConfig.include = ['../vite.config.ts'];

  // Add recommended compiler options
  tsConfig.compilerOptions = {
    ...tsConfig.compilerOptions,
    strict: true,
    forceConsistentCasingInFileNames: true,
  };

  fs.writeFileSync(clientTsConfigPath, JSON.stringify(tsConfig, null, 2));
}

// Create Firebase Studio symlinks if needed
const firebaseStudioConfigDir = path.join(rootDir, '.firebase-studio');
if (!fs.existsSync(firebaseStudioConfigDir)) {
  console.log('🔗 Setting up Firebase Studio integration...');
  fs.mkdirSync(firebaseStudioConfigDir, { recursive: true });

  // Create Studio configuration
  const studioConfig = {
    projectId: 'lemur-86e1b',
    emulators: {
      enabled: true,
      port: packageJson.config.emulator_ui_port
    },
    devServer: {
      port: packageJson.config.vite_port
    }
  };

  fs.writeFileSync(
    path.join(firebaseStudioConfigDir, 'config.json'),
    JSON.stringify(studioConfig, null, 2)
  );
}

// Configure environment variables for FirebaseUI
console.log('🔐 Configuring FirebaseUI for authentication...');
const envLocalPath = path.join(rootDir, '.env.local');
let envContent = '';

if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf8');

  // Add FirebaseUI config if not present
  if (!envContent.includes('VITE_FIREBASE_UI_CONFIG')) {
    envContent += '\n\n# FirebaseUI Configuration\n';
    envContent += 'VITE_FIREBASE_UI_CONFIG={"signInFlow":"popup","signInOptions":["google.com","facebook.com","password"]}\n';
  }

  fs.writeFileSync(envLocalPath, envContent);
}

// Verify Firebase emulator configuration
try {
  console.log('🔄 Checking Firebase configuration...');
  execSync('firebase --version', { stdio: 'inherit' });
  console.log('✅ Firebase CLI is installed');
} catch (error) {
  console.log('⚠️ Firebase CLI not found. Installing globally...');
  try {
    execSync('npm install -g firebase-tools', { stdio: 'inherit' });
    console.log('✅ Firebase CLI installed successfully');
  } catch (installError) {
    console.error('❌ Failed to install Firebase CLI:', installError.message);
  }
}

console.log('\n✨ Post-installation setup complete! Your project is now configured with Firebase 2025 best practices.');
console.log('\n📝 Next steps:');
console.log('  1. Run "npm run dev:full" to start the full development environment');
console.log('  2. Or "npm run dev:studio" to use Firebase Studio integration');
console.log('  3. Visit Firebase Console to manage your project: https://console.firebase.google.com/project/lemur-86e1b\n');
