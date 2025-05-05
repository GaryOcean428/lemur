import { GraduationCap } from "lucide-react";

interface AcademicResultProps {
  query: string;
  loading?: boolean;
}

export default function AcademicResults({ query, loading = false }: AcademicResultProps) {
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-4 capitalize dark:text-white">Academic Search</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
          Academic search capabilities for "{query}" will be implemented in a future update.
          <br /><br />
          This feature will display scholarly articles, research papers, and academic resources with proper citations and publication details.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-6 opacity-40 pointer-events-none">
          {/* Placeholder academic papers */}
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="border dark:border-gray-700 rounded-xl p-5 text-left">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-4" />
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
