import { ShoppingBag } from "lucide-react";

interface ShoppingResultProps {
  query: string;
  loading?: boolean;
}

export default function ShoppingResults({ query, loading = false }: ShoppingResultProps) {
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-4 capitalize dark:text-white">Shopping Search</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
          Shopping search capabilities for "{query}" will be implemented in a future update.
          <br /><br />
          This feature will display products from various retailers with pricing information, reviews, and purchase options.
        </p>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 opacity-40 pointer-events-none">
          {/* Placeholder product cards */}
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-1" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse mb-1" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
