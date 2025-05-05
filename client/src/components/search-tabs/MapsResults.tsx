import { MapPin } from "lucide-react";

interface MapsResultProps {
  query: string;
  loading?: boolean;
}

export default function MapsResults({ query, loading = false }: MapsResultProps) {
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-4 capitalize dark:text-white">Maps Search</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
          Maps search capabilities for "{query}" will be implemented in a future update.
          <br /><br />
          This feature will display geographic results with interactive maps, business information, and directions.
        </p>
        <div className="mt-8 w-full opacity-40 pointer-events-none">
          {/* Placeholder map view */}
          <div className="aspect-[16/9] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="border dark:border-gray-700 rounded-lg p-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse mb-1" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse mb-2" />
                <div className="flex">
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mr-2" />
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
