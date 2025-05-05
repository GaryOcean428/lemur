import { Image } from "lucide-react";

interface ImageResultProps {
  query: string;
  loading?: boolean;
}

export default function ImageResults({ query, loading = false }: ImageResultProps) {
  // In a real implementation, this would fetch and display image results
  // Currently, it's a placeholder that matches the design from the screenshot
  
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Image className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-4 capitalize dark:text-white">Images Search</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
          Image search capabilities for "{query}" will be implemented in a future update.
          <br /><br />
          This feature will display grid of relevant images from around the web with attribution and filtering options.
        </p>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 opacity-40 pointer-events-none">
          {/* Placeholder image tiles */}
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
