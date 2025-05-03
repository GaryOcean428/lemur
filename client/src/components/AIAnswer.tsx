import { Source } from "@/lib/types";

interface AIAnswerProps {
  answer: string;
  sources: Source[];
  model: string;
}

export default function AIAnswer({ answer, sources, model }: AIAnswerProps) {
  // Import the marked library
  // @ts-ignore - we know marked exists from package.json
  const marked = window.marked;
  // Helper function to convert Markdown-like syntax to HTML
  function simpleMarkdownToHtml(text: string): string {
    let html = text;
    
    // First, escape any HTML to prevent injection
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#039;');
    
    // Handle code blocks (must be done before other formatting)
    html = html.replace(/```([\s\S]*?)```/g, (match, p1) => {
      return '<pre><code>' + p1.trim() + '</code></pre>';
    });
    
    // Handle inline code (must be done before other formatting)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle headings (# Heading 1, ## Heading 2, etc.)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Handle unordered lists (bulleted)
    let inList = false;
    let listItems: string[] = [];
    
    // Process unordered lists
    html = html.split('\n').map(line => {
      if (line.match(/^\s*[\*\-] (.+)$/)) {
        const content = line.replace(/^\s*[\*\-] (.+)$/, '$1');
        if (!inList) {
          inList = true;
          listItems = ['<li>' + content + '</li>'];
          return '';
        } else {
          listItems.push('<li>' + content + '</li>');
          return '';
        }
      } else if (inList && line.trim() === '') {
        inList = false;
        const list = '<ul>\n' + listItems.join('\n') + '\n</ul>';
        listItems = [];
        return list;
      } else if (inList) {
        // If this is not a list item but we're in a list, close the list
        inList = false;
        const list = '<ul>\n' + listItems.join('\n') + '\n</ul>';
        listItems = [];
        return list + '\n' + line;
      } else {
        return line;
      }
    }).join('\n');
    
    // If we're still in a list at the end of processing, close it
    if (inList) {
      html += '\n<ul>\n' + listItems.join('\n') + '\n</ul>';
    }
    
    // Handle ordered lists (numbered)
    inList = false;
    listItems = [];
    
    // Process ordered lists
    html = html.split('\n').map(line => {
      if (line.match(/^\s*\d+\. (.+)$/)) {
        const content = line.replace(/^\s*\d+\. (.+)$/, '$1');
        if (!inList) {
          inList = true;
          listItems = ['<li>' + content + '</li>'];
          return '';
        } else {
          listItems.push('<li>' + content + '</li>');
          return '';
        }
      } else if (inList && line.trim() === '') {
        inList = false;
        const list = '<ol>\n' + listItems.join('\n') + '\n</ol>';
        listItems = [];
        return list;
      } else if (inList) {
        // If this is not a list item but we're in a list, close the list
        inList = false;
        const list = '<ol>\n' + listItems.join('\n') + '\n</ol>';
        listItems = [];
        return list + '\n' + line;
      } else {
        return line;
      }
    }).join('\n');
    
    // If we're still in a list at the end of processing, close it
    if (inList) {
      html += '\n<ol>\n' + listItems.join('\n') + '\n</ol>';
    }
    
    // Handle bold text
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Handle paragraphs (replace double newlines with paragraph tags)
    html = '<p>' + html.replace(/\n\n+/g, '</p>\n\n<p>') + '</p>';
    
    // Handle single line breaks (replace single newlines with break tags, but not inside code blocks)
    html = html.replace(/<\/p>\n\n<p>/g, '</p><p>');
    html = html.replace(/\n(?!<\/?(p|ul|ol|li|h[1-6]|pre|code)>)/g, '<br />');
    
    // Clean up any empty paragraph tags
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    return html;
  }
  
  // Convert markdown to HTML and add citation links
  const htmlContent = simpleMarkdownToHtml(answer);
  
  // Process to replace citation markers with proper links
  const processedAnswer = htmlContent.replace(/\[Source \d+\]/g, (match: string) => {
    const sourceNumber = match.match(/\d+/)?.[0] || "1";
    const sourceIndex = parseInt(sourceNumber) - 1;
    return `<a href="#source-${sourceIndex + 1}" class="citation-link">${match}</a>`;
  });

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
