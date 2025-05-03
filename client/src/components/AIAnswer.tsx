import { Source } from "@/lib/types";

interface AIAnswerProps {
  answer: string;
  sources: Source[];
  model: string;
}

export default function AIAnswer({ answer, sources, model }: AIAnswerProps) {
  // Convert Markdown to HTML
  function renderMarkdown(text: string): string {
    // Pre-process Source links to properly link them
    text = text.replace(/\[Source (\d+)\]/g, (match, sourceNumber) => {
      const sourceIndex = parseInt(sourceNumber) - 1;
      return `<a href="#source-${sourceIndex + 1}" class="citation-link">${match}</a>`;
    });

    // Also handle other common citation formats like [1], [2], etc.
    text = text.replace(/\[(\d+)\]/g, (match, sourceNumber) => {
      const sourceIndex = parseInt(sourceNumber) - 1;
      if (sourceIndex >= 0 && sourceIndex < sources.length) {
        return `<a href="#source-${sourceIndex + 1}" class="citation-link">${match}</a>`;
      }
      return match; // If it's not a valid source index, leave it as is
    });

    // Split text into paragraphs (empty lines as separators)
    const paragraphs = text.split(/\n{2,}/);
    const processedParagraphs = paragraphs.map(processParagraph);
    return processedParagraphs.join('');
  }

  // Process a single paragraph based on its type
  function processParagraph(paragraph: string): string {
    paragraph = paragraph.trim();
    if (!paragraph) return '';

    // Code block
    if (paragraph.startsWith('```')) {
      return processCodeBlock(paragraph);
    }
    
    // Unordered list (starts with * or -)
    if (paragraph.match(/^[\s]*[\*\-]\s/m)) {
      return processUnorderedList(paragraph);
    }
    
    // Ordered list (starts with 1. 2. etc)
    if (paragraph.match(/^[\s]*\d+\.\s/m)) {
      return processOrderedList(paragraph);
    }
    
    // Heading (starts with #)
    if (paragraph.match(/^#+\s/)) {
      return processHeading(paragraph);
    }
    
    // Regular paragraph
    return `<p>${processInlineFormats(paragraph)}</p>`;
  }

  // Process code blocks
  function processCodeBlock(block: string): string {
    const match = block.match(/```(?:[a-zA-Z]+)?\n?([\s\S]*?)```/);
    if (!match) return `<pre><code>${escapeHtml(block)}</code></pre>`;
    
    const code = match[1];
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }

  // Process unordered lists with better handling for nested content and spacing
  function processUnorderedList(listText: string): string {
    const items = listText.split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Extract content after the list marker (* or -) 
        const content = line.replace(/^[\s]*[\*\-]\s+/, '');
        
        // Handle nested lists or complex content in list items
        const processedContent = processInlineFormats(content);
        
        return `<li>${processedContent}</li>`;
      });
    
    // Join with newlines for better readability in the HTML source
    return `<ul>\n  ${items.join('\n  ')}\n</ul>`;
  }

  // Process ordered lists with better handling for nested content and spacing
  function processOrderedList(listText: string): string {
    const items = listText.split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Extract content after the list marker (1., 2., etc)
        const content = line.replace(/^[\s]*\d+\.\s+/, '');
        
        // Handle nested lists or complex content in list items
        const processedContent = processInlineFormats(content);
        
        return `<li>${processedContent}</li>`;
      });
    
    // Join with newlines for better readability in the HTML source
    return `<ol>\n  ${items.join('\n  ')}\n</ol>`;
  }

  // Process headings
  function processHeading(headingText: string): string {
    const match = headingText.match(/^(#+)\s+(.+)$/);
    if (!match) return `<p>${processInlineFormats(headingText)}</p>`;
    
    const level = Math.min(match[1].length, 6); // h1-h6 only
    const content = match[2];
    
    return `<h${level}>${processInlineFormats(content)}</h${level}>`;
  }

  // Process inline formatting (bold, italic, code)
  function processInlineFormats(text: string): string {
    // First, preprocess any HTML-like content that should be preserved
    const placeholders: Record<string, string> = {};
    let counter = 0;
    let processedText = text;
    
    // Extract existing HTML-like tags and replace with placeholders
    // Handle both Source tags and numeric citation tags
    processedText = processedText.replace(/<a[^>]*>\[(?:Source\s*)?\d+\]<\/a>/g, (match) => {
      const placeholder = `__CITATION_PLACEHOLDER_${counter}__`;
      placeholders[placeholder] = match;
      counter++;
      return placeholder;
    });
    
    // Also capture any citation numeric-only references [1], [2], etc. that still need to be linked
    processedText = processedText.replace(/\[(\d+)\]/g, (match, sourceNumber) => {
      const sourceIndex = parseInt(sourceNumber) - 1;
      if (sourceIndex >= 0 && sourceIndex < sources.length) {
        const placeholder = `__CITATION_PLACEHOLDER_${counter}__`;
        placeholders[placeholder] = `<a href="#source-${sourceIndex + 1}" class="citation-link">${match}</a>`;
        counter++;
        return placeholder;
      }
      return match; // If it's not a valid source index, leave it as is
    });
    
    // Now escape HTML
    processedText = escapeHtml(processedText);
    
    // Process markdown formatting
    
    // Handle inline code (between backticks)
    processedText = processedText.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle bold text - globally to catch all instances
    processedText = processedText.replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text - globally to catch all instances
    processedText = processedText.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
    
    // Also handle underscores for both bold and italic (common alternative syntax)
    processedText = processedText.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
    processedText = processedText.replace(/_([^_]+?)_/g, '<em>$1</em>');
    
    // Handle line breaks
    processedText = processedText.replace(/\n/g, '<br>');
    
    // Restore placeholders
    Object.keys(placeholders).forEach(placeholder => {
      processedText = processedText.replace(placeholder, placeholders[placeholder]);
    });
    
    return processedText;
  }

  // Helper to escape HTML
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Process the answer with our markdown renderer
  const processedAnswer = renderMarkdown(answer);

  const handleFeedback = (type: 'like' | 'dislike' | 'share') => {
    // In a real app, this would send feedback to the backend
    console.log(`User ${type}d the answer`);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md dark:shadow-gray-800/30 p-6 mb-6 border border-gray-100 dark:border-gray-800">
      <h3 className="text-xl font-semibold mb-4 text-[hsl(var(--neutral))] dark:text-white/90">AI-Generated Answer</h3>
      
      <div 
        className="prose dark:prose-invert prose-headings:font-semibold prose-headings:text-primary dark:prose-headings:text-primary-light prose-a:text-citation prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-strong:text-primary-dark dark:prose-strong:text-primary-light prose-code:text-primary-dark dark:prose-code:text-primary-light prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:rounded-md prose-pre:p-4 prose-pre:overflow-x-auto prose-li:marker:text-primary dark:prose-li:marker:text-primary-light max-w-none"
        dangerouslySetInnerHTML={{ __html: processedAnswer }}
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
