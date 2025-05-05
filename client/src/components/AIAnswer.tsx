import { Source } from "@/lib/types";
import DOMPurify from 'dompurify';

interface AIAnswerProps {
  answer: string;
  sources: Source[];
  model: string;
  contextual?: boolean; // Indicates if this is a contextual follow-up answer
}

export default function AIAnswer({ answer, sources, model, contextual = false }: AIAnswerProps) {
  // Basic markdown rendering function for improved readability
  function renderMarkdown(text: string): string {
    // Step 1: Process citations to make them clickable
    let processedText = text
      // Handle [Source X] pattern citation links
      .replace(/\[Source (\d+)\]/g, (match, sourceNumber) => {
        const sourceIndex = parseInt(sourceNumber) - 1;
        if (sourceIndex >= 0 && sourceIndex < sources.length) {
          return `<a href="#source-${sourceIndex + 1}" class="citation-link">${match}</a>`;
        }
        return match;
      })
      // Handle simple [X] pattern citation links
      .replace(/\[(\d+)\](?!\()/g, (match, sourceNumber) => {
        const sourceIndex = parseInt(sourceNumber) - 1;
        if (sourceIndex >= 0 && sourceIndex < sources.length) {
          return `<a href="#source-${sourceIndex + 1}" class="citation-link">${match}</a>`;
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

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md dark:shadow-gray-800/30 p-6 mb-6 border border-gray-100 dark:border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-[hsl(var(--neutral))] dark:text-white/90">AI-Generated Answer</h3>
        {contextual && (
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 font-medium">
            Contextual Follow-up
          </span>
        )}
      </div>
      
      <div 
        className="prose dark:prose-invert prose-headings:font-semibold prose-headings:text-primary dark:prose-headings:text-primary-light prose-a:text-citation prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-strong:text-primary-dark dark:prose-strong:text-primary-light prose-code:text-primary-dark dark:prose-code:text-primary-light prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:rounded-md prose-pre:p-4 prose-pre:overflow-x-auto prose-li:marker:text-primary dark:prose-li:marker:text-primary-light max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      
      <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
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
          Powered by {model === 'llama-3.3-70b-versatile' ? 'Groq Llama 3.3 70B Versatile' : 
                      model === 'llama-4-scout-17b-16e-instruct' ? 'Groq Llama 4 Scout 17B Instruct' : 
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