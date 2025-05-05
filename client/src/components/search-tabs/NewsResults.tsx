import { Newspaper } from "lucide-react";

interface NewsResultProps {
  query: string;
  loading?: boolean;
}

export default function NewsResults({ query, loading = false }: NewsResultProps) {
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Newspaper className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-4 capitalize dark:text-white">News Search</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
          News search capabilities for "{query}" will be implemented in a future update.
          <br /><br />
          This feature will display the latest news articles from trusted sources with publication dates and source attribution.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 opacity-40 pointer-events-none">
          {/* Placeholder news articles */}
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-start bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
              <div className="flex-shrink-0 w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mr-4" />
              <div className="flex-grow">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
