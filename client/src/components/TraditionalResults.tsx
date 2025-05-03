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
          <div className="text-xs text-[hsl(var(--neutral-muted))] mb-1">{result.domain}</div>
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
      ))}
    </div>
  );
}
