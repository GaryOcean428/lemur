import { useState } from 'react';
import { useLocation } from 'wouter';
import { MessageCircleMore, LogIn, ArrowUpCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import DOMPurify from 'dompurify';

interface Source {
  title: string;
  url: string;
  domain?: string;
}

interface AIAnswerProps {
  answer: string;
  sources: Source[];
  model: string;
  contextual?: boolean;
  authRequired?: boolean;
}

export function AIAnswer({ answer, sources, model, contextual = false, authRequired = false }: AIAnswerProps) {
  const [, setLocation] = useLocation();
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [showFollowUpInput, setShowFollowUpInput] = useState(false);

  // Check if this is a limit reached message
  const isLimitReached = model === 'limit-reached';

  // Enhanced markdown rendering function with improved citation handling
  function renderMarkdown(text: string): string {
    // Step 1: Process citations to make them clickable with better pattern matching
    let processedText = text
      // Handle [Source X] pattern citation links with visual enhancement
      .replace(/\[Source (\d+)\]/g, (_, sourceNumber) => {
        const sourceIndex = parseInt(sourceNumber) - 1;
        if (sourceIndex >= 0 && sourceIndex < sources.length) {
          return `<a href="#source-${sourceIndex + 1}" class="citation-link" title="${sources[sourceIndex].title}">[Source ${sourceNumber}]</a>`;
        }
        return `[Source ${sourceNumber}]`;
      })
      // Handle [X] pattern citation links
      .replace(/\[(\d+)\](?!\()/g, (_, sourceNumber) => {
        const sourceIndex = parseInt(sourceNumber) - 1;
        if (sourceIndex >= 0 && sourceIndex < sources.length) {
          return `<a href="#source-${sourceIndex + 1}" class="citation-link" title="${sources[sourceIndex].title}">[${sourceNumber}]</a>`;
        }
        return `[${sourceNumber}]`;
      });

    // Step 2: Convert markdown to HTML
    processedText = processedText
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^(?!<[a-z][^>]*>)(.+)$/gm, '<p>$1</p>');

    // Step 3: Sanitize HTML to prevent XSS
    return DOMPurify.sanitize(processedText);
  }

  // Handle follow-up question submission
  const handleFollowUpSubmit = () => {
    if (!followUpQuery.trim()) return;
    setLocation(`/search?q=${encodeURIComponent(followUpQuery)}&isFollowUp=true`);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">
          {isLimitReached ? 'Search Limit Reached' : 'AI-Generated Answer'}
        </h3>
        {contextual && (
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
            Contextual Follow-up
          </span>
        )}
      </div>

      <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }} />

      {!isLimitReached && !showFollowUpInput ? (
        <div className="mt-6 border-t pt-4">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2"
            onClick={() => setShowFollowUpInput(true)}
          >
            <MessageCircleMore className="h-4 w-4" />
            Ask a follow-up question
          </Button>
        </div>
      ) : !isLimitReached && showFollowUpInput ? (
        <div className="mt-6 border-t pt-4">
          <form onSubmit={(e) => { e.preventDefault(); handleFollowUpSubmit(); }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={followUpQuery}
                onChange={(e) => setFollowUpQuery(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="flex-grow rounded-md border px-3 py-2"
              />
              <Button type="submit">Search</Button>
            </div>
          </form>
        </div>
      ) : null}

      {isLimitReached && (
        <div className="mt-6 border-t pt-4">
          <div className="flex flex-col space-y-3">
            {authRequired ? (
              <Button 
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setLocation('/auth')}
              >
                <LogIn className="h-4 w-4" />
                Sign in to continue
              </Button>
            ) : (
              <Button 
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setLocation('/subscription')}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Upgrade your subscription
              </Button>
            )}
          </div>
        </div>
      )}

      {!isLimitReached && sources.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Sources:</h4>
          <ol className="space-y-2">
            {sources.map((source, index) => (
              <li key={index} className="text-sm">
                <a
                  id={`source-${index + 1}`}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {source.title}
                </a>
                {source.domain && (
                  <span className="text-gray-500 ml-2">({source.domain})</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500">
        {isLimitReached ? 'Lemur Search' : `Powered by ${model}`}
      </div>
    </div>
  );
}