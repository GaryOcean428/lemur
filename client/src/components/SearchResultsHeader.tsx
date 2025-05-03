interface SearchResultsHeaderProps {
  query: string;
  resultCount: number;
}

export default function SearchResultsHeader({ query, resultCount }: SearchResultsHeaderProps) {
  // Format the number with commas
  const formattedCount = resultCount.toLocaleString();
  
  // Calculate a random time (for display purposes only)
  const randomTime = (Math.random() * 0.8 + 0.2).toFixed(2);
  
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold">
        Results for <span className="text-[hsl(var(--primary))] font-bold">"{query}"</span>
      </h2>
      <p className="text-[hsl(var(--neutral-muted))]">
        About {formattedCount} results ({randomTime} seconds)
      </p>
    </div>
  );
}
