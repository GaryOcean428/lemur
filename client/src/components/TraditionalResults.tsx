import { TraditionalResult } from "@/lib/types";

interface TraditionalResultsProps {
  results: TraditionalResult[];
}

export default function TraditionalResults({ results }: TraditionalResultsProps) {
  if (results.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 text-center">
        <p className="text-[hsl(var(--neutral-muted))]">No traditional results found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <div key={index} className="bg-white rounded-xl shadow-md p-4">
          <div className="flex justify-between items-center mb-1">
            <div className="text-xs text-[hsl(var(--neutral-muted))]">{result.domain}</div>
            {result.date && (
              <div className="text-xs text-[hsl(var(--neutral-muted))]">{result.date}</div>
            )}
          </div>
          {/* Flex container for content and image */}
          <div className={`${result.image ? 'flex gap-4' : ''}`}>
            <div className="flex-grow">
              <h3 className="text-lg font-medium">
                <a 
                  href={result.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[hsl(var(--primary))] hover:underline"
                >
                  {result.title}
                </a>
              </h3>
              <p className="text-sm text-[hsl(var(--neutral-muted))] mt-1">
                {result.snippet}
              </p>
            </div>
            
            {/* Image if available */}
            {result.image && (
              <div className="flex-shrink-0">
                <img 
                  src={result.image.url} 
                  alt={result.image.alt || result.title}
                  className="w-24 h-24 object-cover rounded-lg" 
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
