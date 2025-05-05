import { Video } from "lucide-react";

interface VideoResultProps {
  query: string;
  loading?: boolean;
}

export default function VideoResults({ query, loading = false }: VideoResultProps) {
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Video className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-4 capitalize dark:text-white">Videos Search</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
          Video search capabilities for "{query}" will be implemented in a future update.
          <br /><br />
          This feature will display relevant videos with previews, duration, and source information.
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 opacity-40 pointer-events-none">
          {/* Placeholder video results */}
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-1" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
