import { Source } from "@/lib/types";
import DOMPurify from 'dompurify';
import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { MessageCircleMore, LogIn, ArrowUpCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface AIAnswerProps {
  answer: string;
  sources: Source[];
  model: string;
  contextual?: boolean; // Indicates if this is a contextual follow-up answer
  authRequired?: boolean; // Indicates if authentication is required (for limit reached scenarios)
}

export default function AIAnswer({ answer, sources, model, contextual = false, authRequired = false }: AIAnswerProps) {
  const [, setLocation] = useLocation();
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [showFollowUpInput, setShowFollowUpInput] = useState(false);
  const { user } = useAuth();
  
  // Check if this is a limit reached message
  const isLimitReached = model === 'limit-reached';
  
  // Enhanced markdown rendering function with improved citation handling
  function renderMarkdown(text: string): string {
    // Step 1: Process citations to make them clickable with better pattern matching
    let processedText = text
      // Handle [Source X] pattern citation links
      .replace(/\[Source (\d+)\]/g, (match, sourceNumber) => {
        const sourceIndex = parseInt(sourceNumber) - 1;
        if (sourceIndex >= 0 && sourceIndex < sources.length) {
          return `<a href="#source-${sourceIndex + 1}" class="citation-link" title="${sources[sourceIndex].title}">${match}</a>`;
        }
        return match;
      })
      // Handle [X] pattern citation links
      .replace(/\[(\d+)\](?!\()/g, (match, sourceNumber) => {
        const sourceIndex = parseInt(sourceNumber) - 1;
        if (sourceIndex >= 0 && sourceIndex < sources.length) {
          return `<a href="#source-${sourceIndex + 1}" class="citation-link" title="${sources[sourceIndex].title}">${match}</a>`;
        }
        return match;
      })
      // Handle (Source: title) pattern - common in AI responses
      .replace(/\(Source: ([^\)]+)\)/g, (match, sourceTitle) => {
        // Find source by title (partial match)
        const sourceIndex = sources.findIndex(source => 
          source.title.toLowerCase().includes(sourceTitle.toLowerCase()) ||
          sourceTitle.toLowerCase().includes(source.title.toLowerCase())
        );
        
        if (sourceIndex >= 0) {
          return `<a href="#source-${sourceIndex + 1}" class="citation-link" title="${sources[sourceIndex].title}">(Source: ${sourceTitle})</a>`;
        }
        return match;
      })
      // Handle citation patterns like "according to [source name]"
      .replace(/according to ([\w\s\-\.]+)/gi, (match, sourceName) => {
        // Find source by domain or title (partial match)
        const sourceIndex = sources.findIndex(source => 
          source.title.toLowerCase().includes(sourceName.toLowerCase()) || 
          (source.domain && source.domain.toLowerCase().includes(sourceName.toLowerCase()))
        );
        
        if (sourceIndex >= 0) {
          return `according to <a href="#source-${sourceIndex + 1}" class="citation-link" title="${sources[sourceIndex].title}">${sourceName}</a>`;
        }
        return match;
      });
    
    // Step 2: Convert markdown to HTML
    // Headers
    processedText = processedText
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Bold and italic
    processedText = processedText
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Lists
    // Convert ordered lists (very basic conversion)
    processedText = processedText.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    processedText = processedText.replace(/(<li>.+<\/li>\n)+/g, '<ol>$&</ol>');
    
    // Convert unordered lists (very basic conversion)
    processedText = processedText.replace(/^- (.+)$/gm, '<li>$1</li>');
    processedText = processedText.replace(/^\* (.+)$/gm, '<li>$1</li>');
    processedText = processedText.replace(/(<li>.+<\/li>\n)+/g, '<ul>$&</ul>');
    
    // Links (only handle standard markdown links)
    processedText = processedText.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Code blocks
    processedText = processedText.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    processedText = processedText.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Paragraphs (add p tags to text blocks)
    processedText = processedText.replace(/^(?!<[a-z][^>]*>)(.+)$/gm, '<p>$1</p>');
    
    // Step 3: Sanitize HTML to prevent XSS
    return DOMPurify.sanitize(processedText);
  }

  // Render the markdown to HTML
  const html = renderMarkdown(answer);
  
  // Handle feedback events
  const handleFeedback = (type: 'like' | 'dislike' | 'share') => {
    console.log(`User ${type}d the answer`);
  };

  // Handle follow-up question submission
  const handleFollowUpSubmit = () => {
    if (!followUpQuery.trim()) return;
    
    // Navigate to search results with the follow-up query and flag
    setLocation(`/search?q=${encodeURIComponent(followUpQuery)}&followUp=true`);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md dark:shadow-gray-800/30 p-6 mb-6 border border-gray-100 dark:border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-[hsl(var(--neutral))] dark:text-white/90">
          {isLimitReached ? 'Search Limit Reached' : 'AI-Generated Answer'}
        </h3>
        {contextual && (
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 font-medium">
            Contextual Follow-up
          </span>
        )}
      </div>
      
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800 font-medium">
            AI Summary
          </span>
          {sources.length > 0 && (
            <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full border border-green-200 dark:border-green-800 font-medium flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 11v8a1 1 0 0 0 1 1h8"/>
                <path d="M4 11V7a4 4 0 0 1 4-4h8"/>
                <path d="M12 19v-8h8"/>
                <path d="M20 11V7a4 4 0 0 0-4-4h-8"/>
              </svg>
              {sources.length} sources cited
            </span>
          )}
          <span className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full border border-purple-200 dark:border-purple-800 font-medium inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="8" height="8" x="8" y="8" rx="1"/>
              <path d="M12 4v4"/>
              <path d="M4 12h4"/>
              <path d="M12 16v4"/>
              <path d="M16 12h4"/>
            </svg>
            Groq {model.replace('compound-beta', 'Compound').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </div>
      </div>
      <div 
        className="prose dark:prose-invert prose-headings:font-semibold prose-headings:text-primary dark:prose-headings:text-primary-light prose-a:text-citation prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-strong:text-primary-dark dark:prose-strong:text-primary-light prose-code:text-primary-dark dark:prose-code:text-primary-light prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:rounded-md prose-pre:p-4 prose-pre:overflow-x-auto prose-li:marker:text-primary dark:prose-li:marker:text-primary-light max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      
      {/* Follow-up question section - only show for regular answers, not limit reached */}
      {!isLimitReached && !showFollowUpInput ? (
        <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 text-base"
            onClick={() => setShowFollowUpInput(true)}
          >
            <MessageCircleMore className="h-4 w-4" />
            Ask a follow-up question
          </Button>
        </div>
      ) : !isLimitReached && showFollowUpInput ? (
        <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <form onSubmit={(e) => { e.preventDefault(); handleFollowUpSubmit(); }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={followUpQuery}
                  onChange={(e) => setFollowUpQuery(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  className="flex-grow rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button type="submit">
                  Search
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      
      {isLimitReached && (
        <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
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
        <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[hsl(var(--neutral-muted))]">Sources ({sources.length}):</h4>
            <div className="text-xs px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium border border-green-200 dark:border-green-800">
              {sources.length} citations used
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <ol className="text-sm space-y-3">
              {sources.map((source, index) => (
                <li key={index} className="pb-2 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="flex justify-center items-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <a 
                        id={`source-${index + 1}`}
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-primary dark:text-primary-light hover:underline"
                      >
                        {source.title}
                      </a>
                      {source.domain && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                          <span className="inline-block w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 mr-1.5"></span>
                          {source.domain}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      
      <div className="mt-6 flex justify-between">
        <div className="text-xs text-[hsl(var(--neutral-muted))]">
          {isLimitReached ? 'Lemur Search' : 
            model === 'llama-3.3-70b-versatile' ? 'Powered by Groq Llama 3.3 70B Versatile' : 
            model === 'llama-4-scout-17b-16e-instruct' ? 'Powered by Groq Llama 4 Scout 17B Instruct' : 
            `Powered by Groq ${model}`
          }
        </div>
        {!isLimitReached && (
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
        )}
      </div>
    </div>
  );
}