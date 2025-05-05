import { Users } from "lucide-react";

interface SocialResultProps {
  query: string;
  loading?: boolean;
}

export default function SocialResults({ query, loading = false }: SocialResultProps) {
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-4 capitalize dark:text-white">Social Search</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
          Social media search capabilities for "{query}" will be implemented in a future update.
          <br /><br />
          This feature will display relevant content from social media platforms with engagement metrics and posting dates.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-6 opacity-40 pointer-events-none">
          {/* Placeholder social posts */}
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="border dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mr-3" />
                <div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse mb-1" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                </div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-4" />
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
