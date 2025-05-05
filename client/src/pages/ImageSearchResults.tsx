import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchTabs from '@/components/SearchTabs';
import AIAnswer from '@/components/AIAnswer';
import TraditionalResults from '@/components/TraditionalResults';
import { SearchResults } from '@/lib/types';

export default function ImageSearchResults() {
  const { searchId } = useParams<{ searchId: string }>();
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!searchId) {
      setLocation('/'); // Redirect to home if no search ID
      return;
    }

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/image-search/${searchId}`);
        if (!response.ok) {
          throw new Error(`Error fetching image search results: ${response.statusText}`);
        }

        const data = await response.json();
        if (!isMounted) return;

        // Update query from the data
        if (data.query && data.query !== 'image search') {
          setSearchQuery(data.query);
        }

        // Check if processing is completed
        if (data.status === 'completed' && data.results) {
          setResults(data.results);
          setIsLoading(false);
          clearInterval(pollInterval);
        } else if (data.status === 'failed') {
          setError(data.error || 'Failed to process image search');
          setIsLoading(false);
          clearInterval(pollInterval);
        } else {
          // Still processing - increment poll count
          setPollingCount(prev => prev + 1);
          // If we've been polling for too long, show a timeout error
          if (pollingCount > 60) { // 60 polls * 1 second = 1 minute timeout
            setError('Image search processing took too long. Please try again.');
            setIsLoading(false);
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error polling image search results:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
        clearInterval(pollInterval);
      }
    }, 1000); // Poll every second

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [searchId, pollingCount, setLocation]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <section className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-white">
              {isLoading ? 'Analyzing your image...' : searchQuery ? `Search results for: ${searchQuery}` : 'Image search results'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isLoading ? 'Please wait while we process your image and find relevant information.' : 'Here are the results based on your image search.'}
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {pollingCount < 10 ? 'Analyzing your image...' :
                 pollingCount < 20 ? 'Searching the web for relevant information...' :
                 pollingCount < 30 ? 'Processing search results...' :
                 'Almost there, finalizing your results...'}
              </p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
              <h2 className="text-xl font-medium text-red-700 dark:text-red-400 mb-2">Error</h2>
              <p className="text-red-600 dark:text-red-300">{error}</p>
              <button 
                onClick={() => setLocation('/')}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Go back to search
              </button>
            </div>
          ) : results ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 order-2 lg:order-1">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Web Results</h2>
                <TraditionalResults results={results.traditional} />
              </div>
              
              <div className="lg:col-span-4 order-1 lg:order-2">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">AI Answer</h2>
                <AIAnswer 
                  answer={results.ai.answer} 
                  sources={results.ai.sources} 
                  model={results.ai.model} 
                />
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">
              <p className="text-gray-600 dark:text-gray-400">No results found for your image search.</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
