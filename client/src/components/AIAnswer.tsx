import { Source } from "@/lib/types";
import DOMPurify from 'dompurify';
import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { MessageCircleMore, LogIn, ArrowUpCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Chart, Bar, Line } from 'react-chartjs-2';
import { marked } from 'marked';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AIAnswerProps {
  answer: string;
  sources: Source[];
  model: string;
  contextual?: boolean; // Indicates if this is a contextual follow-up answer
  authRequired?: boolean; // Indicates if authentication is required (for limit reached scenarios)
  className?: string; // Additional CSS class for styling or identifying deep research
}

export default function AIAnswer({ 
  answer, 
  sources, 
  model, 
  contextual = false, 
  authRequired = false,
  className = ''
}: AIAnswerProps) {
  const [, setLocation] = useLocation();
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [showFollowUpInput, setShowFollowUpInput] = useState(false);
  const { user } = useAuth();
  
  // Check if this is a limit reached message
  const isLimitReached = model === 'limit-reached';
  
  // Enhanced markdown rendering function with citation handling
  function renderMarkdown(text: string): string {
    // Step 1: Process citations to make them clickable
    let processedText = text
      // Handle [Source X] pattern
      .replace(/\[Source (\d+)\]/g, (match, sourceNumber) => {
        const sourceIndex = parseInt(sourceNumber) - 1;
        if (sourceIndex >= 0 && sourceIndex < sources.length) {
          return `<a href="#source-${sourceIndex + 1}" class="citation-link" title="${sources[sourceIndex].title}">[Source ${sourceIndex + 1}]</a>`;
        }
        return match;
      })
      // Handle [X] pattern
      .replace(/\[(\d+)\](?!\()/g, (match, sourceNumber) => {
        const sourceIndex = parseInt(sourceNumber) - 1;
        if (sourceIndex >= 0 && sourceIndex < sources.length) {
          return `<a href="#source-${sourceIndex + 1}" class="citation-link" title="${sources[sourceIndex].title}">[${sourceIndex + 1}]</a>`;
        }
        return match;
      });
    
    // Step 2: Convert markdown to HTML manually for simple markdown features
    // Headers
    processedText = processedText
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Bold and italic
    processedText = processedText
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    processedText = processedText.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Code blocks
    processedText = processedText.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    processedText = processedText.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Lists (basic implementation)
    // Convert unordered lists
    const unorderedListItems = processedText.match(/^[-*] (.+)$/gm);
    if (unorderedListItems) {
      let listHtml = '<ul>';
      for (const item of unorderedListItems) {
        listHtml += `<li>${item.replace(/^[-*] /, '')}</li>`;
      }
      listHtml += '</ul>';
      processedText = processedText.replace(/^[-*] (.+)$/gm, ''); // Remove original list items
      processedText += listHtml;
    }
    
    // Convert ordered lists
    const orderedListItems = processedText.match(/^\d+\. (.+)$/gm);
    if (orderedListItems) {
      let listHtml = '<ol>';
      for (const item of orderedListItems) {
        listHtml += `<li>${item.replace(/^\d+\. /, '')}</li>`;
      }
      listHtml += '</ol>';
      processedText = processedText.replace(/^\d+\. (.+)$/gm, ''); // Remove original list items
      processedText += listHtml;
    }
    
    // Paragraphs (wrap text in p tags if not already in a block-level element)
    processedText = processedText
      .split('\n\n')
      .map(para => {
        if (para.trim() && 
            !para.trim().startsWith('<h') && 
            !para.trim().startsWith('<ul') && 
            !para.trim().startsWith('<ol') && 
            !para.trim().startsWith('<pre')) {
          return `<p>${para.trim()}</p>`;
        }
        return para;
      })
      .join('\n');
    
    // Add styling for citations
    const styleBlock = `
      <style>
        .citation-link {
          background-color: rgba(168, 85, 247, 0.1);
          color: #6d28d9;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
          text-decoration: none !important;
          transition: all 0.2s ease-in-out;
        }
        .dark .citation-link {
          background-color: rgba(168, 85, 247, 0.2);
          color: #a78bfa;
        }
        .citation-link:hover {
          background-color: rgba(168, 85, 247, 0.2);
          text-decoration: none !important;
        }
        .dark .citation-link:hover {
          background-color: rgba(168, 85, 247, 0.3);
        }
      </style>
    `;
    
    // Sanitize the final HTML
    return DOMPurify.sanitize(styleBlock + processedText, {
      ADD_TAGS: ['style'],
      ADD_ATTR: ['target', 'rel']
    });
  }

  // Function to format citations according to different standards
  function formatCitation(style: string, citation: string): string {
    switch (style) {
      case 'MLA':
        return `<em>${citation}</em>`;
      case 'Chicago':
        return `<strong>${citation}</strong>`;
      case 'AGLC':
        return `<u>${citation}</u>`;
      default:
        return citation;
    }
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
    
    // Log the action for debugging
    console.log(`Submitting follow-up question: ${followUpQuery}`);
    
    // Determine if this is a deep research question from the className prop
    const isDeepResearch = className?.includes('deep-research') || false;
    
    // Build URL with parameters that preserve the current search mode
    let searchUrl = `/search?q=${encodeURIComponent(followUpQuery)}`;
    
    // Always set isFollowUp=true to maintain conversation context
    searchUrl += '&isFollowUp=true';
    
    // If this was a deep research answer, maintain those parameters for the follow-up
    if (isDeepResearch) {
      searchUrl += '&deepResearch=true&maxIterations=3&includeReasoning=true&deepDive=true';
    }
    
    // Use the router's setLocation instead of window.location.href to maintain session
    setLocation(searchUrl);
  };

  // Function to render charts and graphs
  const renderChart = (chartData: any) => {
    if (!chartData || !chartData.type || !chartData.data) {
      return null;
    }
    
    return (
      <div className="chart-container my-4 p-2 border rounded-md bg-gray-50 dark:bg-gray-900">
        <h4 className="text-sm font-medium mb-2 text-center">{chartData.title || 'Chart Data'}</h4>
        <div className="h-64">
          {chartData.type === 'bar' ? (
            <Bar
              data={chartData.data}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                ...chartData.options,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      boxWidth: 10,
                      font: {
                        size: 11
                      }
                    }
                  },
                  tooltip: {
                    enabled: true,
                    mode: 'index' as const,
                    intersect: false
                  },
                  ...chartData.options?.plugins
                }
              }}
            />
          ) : (
            <Line
              data={chartData.data}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                ...chartData.options,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      boxWidth: 10,
                      font: {
                        size: 11
                      }
                    }
                  },
                  tooltip: {
                    enabled: true,
                    mode: 'index' as const,
                    intersect: false
                  },
                  ...chartData.options?.plugins
                }
              }}
            />
          )}
        </div>
      </div>
    );
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
            <div className="flex items-center gap-2">
              <div className="text-xs px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium border border-green-200 dark:border-green-800">
                {sources.length} citations used
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="text-xs h-7 px-2 flex items-center gap-1"
                onClick={() => {
                  localStorage.setItem('sourceForCitation', JSON.stringify(sources));
                  setLocation('/tools/citation-generator?from=search');
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-quote">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                </svg>
                Create Citations
              </Button>
              
              {!contextual && !className?.includes('deep-research') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-7 px-2 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-800/50"
                  onClick={() => {
                    const currentQuery = new URLSearchParams(window.location.search).get('q');
                    if (currentQuery) {
                      setLocation(`/search?q=${encodeURIComponent(currentQuery)}&deep=true`);
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-4-4-3z"/>
                    <path d="M12 19h7"/>
                    <path d="M7 19h1"/>
                    <path d="M11 19h1"/>
                  </svg>
                  Deep Research
                </Button>
              )}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <ol className="text-sm space-y-3">
              {sources.map((source, index) => {
                // Count how many times this source is referenced in the answer
                // This is a quick approximation based on domain and title occurrences
                const titleMatches = (answer.match(new RegExp(source.title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi')) || []).length;
                const domainMatches = source.domain ? (answer.match(new RegExp(source.domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi')) || []).length : 0;
                const bracketMatches = (answer.match(new RegExp(`\\[${index + 1}\\]`, 'g')) || []).length;
                
                // Calculate citation importance based on various matching methods
                const citationCount = bracketMatches + Math.min(titleMatches, 3) + Math.min(domainMatches, 2);
                
                // Determine importance level for visual cues
                const importanceLevel = citationCount === 0 ? 'low' : 
                                      citationCount === 1 ? 'medium' : 'high';
                
                // Set color and style based on importance level
                const importanceStyle = {
                  low: "bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400",
                  medium: "bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300",
                  high: "bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300 ring-2 ring-purple-200 dark:ring-purple-800/50"
                };
                
                return (
                  <li key={index} className="pb-2 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div 
                        className={`source-citation-${index + 1} flex justify-center items-center w-6 h-6 rounded-full ${importanceStyle[importanceLevel]} text-xs font-semibold transition-all duration-200`}
                        onMouseOver={() => {
                          document.querySelectorAll(`.source-citation-${index + 1}`).forEach(el => 
                            el.classList.add('citation-highlight'))
                        }}
                        onMouseOut={() => {
                          document.querySelectorAll(`.source-citation-${index + 1}`).forEach(el => 
                            el.classList.remove('citation-highlight'))
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <a 
                            id={`source-${index + 1}`}
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`source-citation-${index + 1} font-medium text-primary dark:text-primary-light hover:underline`}
                            onMouseOver={() => {
                              document.querySelectorAll(`.source-citation-${index + 1}`).forEach(el => 
                                el.classList.add('citation-highlight'))
                            }}
                            onMouseOut={() => {
                              document.querySelectorAll(`.source-citation-${index + 1}`).forEach(el => 
                                el.classList.remove('citation-highlight'))
                            }}
                          >
                            {source.title}
                          </a>
                          <div className="flex items-center gap-1">
                            {citationCount > 0 && (
                              <span 
                                className={`source-citation-${index + 1} text-xs px-1.5 py-0.5 rounded-full ${importanceStyle[importanceLevel]} font-medium ml-2 transition-all duration-200`}
                                onMouseOver={() => {
                                  document.querySelectorAll(`.source-citation-${index + 1}`).forEach(el => 
                                    el.classList.add('citation-highlight'))
                                }}
                                onMouseOut={() => {
                                  document.querySelectorAll(`.source-citation-${index + 1}`).forEach(el => 
                                    el.classList.remove('citation-highlight'))
                                }}
                              >
                                {citationCount === 1 ? '1 citation' : `${citationCount} citations`}
                              </span>
                            )}
                            <button
                              className="text-xs ml-1 text-gray-400 hover:text-primary px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => {
                                // Store this specific source in localStorage and redirect to citation generator
                                localStorage.setItem('sourceForCitation', JSON.stringify([source]));
                                setLocation('/tools/citation-generator?from=search&index=' + index);
                              }}
                              title="Create citation for this source"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-quote">
                                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {source.domain && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                            <span className="inline-block w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 mr-1.5"></span>
                            {source.domain}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
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
              onClick={() => handleFeedback('like')}
              className="text-xs text-gray-500 hover:text-primary rounded-full px-2 py-1 hover:bg-primary/5 transition-colors"
              aria-label="Helpful"
            >
              👍 Helpful
            </button>
            <button 
              onClick={() => handleFeedback('dislike')}
              className="text-xs text-gray-500 hover:text-red-500 rounded-full px-2 py-1 hover:bg-red-500/5 transition-colors"
              aria-label="Not Helpful"
            >
              👎 Not helpful
            </button>
          </div>
        )}
      </div>
    </div>
  );
}