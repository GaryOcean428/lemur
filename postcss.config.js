/**
 * PostCSS Configuration (2025 Best Practices for IDX/Firebase Studio)
 * 
 * Chain of Draft: Module Resolution → Plugin Configuration → Error Handling
 */

// Use a function to allow for dynamic plugin resolution
export default () => {
  // Create a robust plugin configuration for IDX environments
  return {
    plugins: {
      // Use explicit path for tailwind in IDX environments
      tailwindcss: {
        config: './tailwind.config.ts'
      },
      autoprefixer: {
        // Modern browser targeting for 2025
        overrideBrowserslist: ['last 2 versions', 'not dead', 'not ie <= 11']
      },
    },
  };
}
