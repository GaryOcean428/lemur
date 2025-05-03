import { Source } from "@/lib/types";

interface AIAnswerProps {
  answer: string;
  sources: Source[];
  model: string;
}

export default function AIAnswer({ answer, sources, model }: AIAnswerProps) {
  // Process answer to replace citation markers with proper links
  const processedAnswer = answer.replace(/\[Source \d+\]/g, (match) => {
    const sourceIndex = parseInt(match.match(/\d+/)![0]) - 1;
    return `<a href="#source-${sourceIndex + 1}" class="citation-link">${match}</a>`;
  });

  const handleFeedback = (type: 'like' | 'dislike' | 'share') => {
    // In a real app, this would send feedback to the backend
    console.log(`User ${type}d the answer`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4">AI-Generated Answer</h3>
      
      <div 
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: processedAnswer }}
      />
      
      <div className="mt-6 border-t border-gray-100 pt-4">
        <h4 className="text-sm font-semibold text-[hsl(var(--neutral-muted))] mb-2">Sources:</h4>
        <ol className="text-sm space-y-1">
          {sources.map((source, index) => (
            <li key={index}>
              <a 
                id={`source-${index + 1}`}
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="citation-link hover:underline"
              >
                [{index + 1}] {source.title}
              </a>
            </li>
          ))}
        </ol>
      </div>
      
      <div className="mt-6 flex justify-between">
        <div className="text-xs text-[hsl(var(--neutral-muted))]">
          Powered by {model === 'compound-beta' ? 'Groq Compound Beta (Llama 4 Scout & Llama 3.3 70B)' : 
                      model === 'compound-beta-mini' ? 'Groq Compound Beta Mini (Llama 3.3)' : 
                      `Groq ${model}`}
        </div>
        <div className="flex space-x-2">
          <button 
            className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors"
            onClick={() => handleFeedback('like')}
            aria-label="Like this answer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 10v12"/>
              <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
            </svg>
          </button>
          <button 
            className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors"
            onClick={() => handleFeedback('dislike')}
            aria-label="Dislike this answer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 14V2"/>
              <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/>
            </svg>
          </button>
          <button 
            className="text-[hsl(var(--neutral-muted))] hover:text-[hsl(var(--primary))] transition-colors"
            onClick={() => handleFeedback('share')}
            aria-label="Share this answer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" x2="12" y1="2" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
