import React, { useState, useEffect } from 'react';
import { Quote, Link as LinkIcon, ExternalLink, Clipboard, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Citation styles
const citationStyles = [
  { id: 'aglc4', name: 'AGLC4 (Australian Guide to Legal Citation)' },
  { id: 'apa', name: 'APA (7th Edition)' },
  { id: 'mla', name: 'MLA (9th Edition)' },
  { id: 'chicago', name: 'Chicago (17th Edition)' },
  { id: 'harvard', name: 'Harvard' },
  { id: 'ieee', name: 'IEEE' },
  { id: 'vancouver', name: 'Vancouver' },
  { id: 'ama', name: 'AMA' },
];

// Source types
const sourceTypes = [
  { id: 'website', name: 'Website', availableIn: ['aglc4', 'apa', 'mla', 'chicago', 'harvard', 'ieee'] },
  { id: 'book', name: 'Book', availableIn: ['aglc4', 'apa', 'mla', 'chicago', 'harvard', 'ieee', 'vancouver', 'ama'] },
  { id: 'journalArticle', name: 'Journal Article', availableIn: ['aglc4', 'apa', 'mla', 'chicago', 'harvard', 'ieee', 'vancouver', 'ama'] },
  { id: 'case', name: 'Case (AGLC4)', availableIn: ['aglc4'] },
  { id: 'legislation', name: 'Legislation (AGLC4)', availableIn: ['aglc4'] },
  { id: 'newspaperArticle', name: 'Newspaper Article', availableIn: ['aglc4', 'apa', 'mla', 'chicago', 'harvard'] },
  { id: 'conferenceProceeding', name: 'Conference Proceeding', availableIn: ['aglc4', 'apa', 'ieee', 'harvard'] },
  { id: 'report', name: 'Report', availableIn: ['aglc4', 'apa', 'chicago', 'harvard'] },
  { id: 'thesis', name: 'Thesis', availableIn: ['aglc4', 'apa', 'mla', 'chicago', 'harvard'] },
];

// Mock API call for metadata extraction
const extractMetadata = async (url: string): Promise<any> => {
  // This would be an actual API call in production
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate API response
      const metadata = {
        title: 'Sample Article Title',
        authors: ['Jane Smith'],
        year: '2025',
        sourceType: 'journalArticle',
        journalName: 'Journal of Research Studies',
        volume: '42',
        issue: '3',
        pages: '256-278',
        doi: '10.1234/sample.5678',
        url: url,
      };
      
      resolve(metadata);
    }, 1500); // Simulate network delay
  });
};

// Mock API call for citation generation
const generateCitation = async (
  metadata: any,
  style: string
): Promise<{ citation: string; style: string }> => {
  // This would be an actual API call in production
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate API response based on style
      let citation = '';
      
      if (style === 'aglc4') {
        switch (metadata.sourceType) {
          case 'journalArticle':
            citation = `${metadata.authors[0]}, '${metadata.title}' (${metadata.year}) ${metadata.volume}(${metadata.issue}) <em>${metadata.journalName}</em> ${metadata.pages}.`;
            break;
          case 'case':
            citation = `<em>${metadata.caseName}</em> (${metadata.year}) ${metadata.volume} ${metadata.reportSeries} ${metadata.startPage}.`;
            break;
          case 'legislation':
            citation = `<em>${metadata.title}</em> ${metadata.year} (${metadata.jurisdiction})${metadata.section ? ` s ${metadata.section}` : ''}.`;
            break;
          case 'website':
            citation = `${metadata.authors ? metadata.authors[0] + ', ' : ''}'${metadata.title}' <em>${metadata.websiteName || ''}</em> (${metadata.publicationDate || metadata.year || ''}) &lt;${metadata.url}&gt; accessed ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
            break;
          case 'book':
            citation = `${metadata.authors[0]}, <em>${metadata.title}</em> (${metadata.edition ? metadata.edition + ' ed, ' : ''}${metadata.publisher}, ${metadata.year})${metadata.pages ? ' ' + metadata.pages : ''}.`;
            break;
          default:
            citation = `${metadata.authors ? metadata.authors[0] + ', ' : ''}'${metadata.title}' (${metadata.year}).`;
        }
      } else if (style === 'apa') {
        citation = `${metadata.authors ? metadata.authors[0] : ''} (${metadata.year}). ${metadata.title}. <em>${metadata.journalName || ''}</em>, ${metadata.volume ? metadata.volume + (metadata.issue ? `(${metadata.issue})` : '') : ''}, ${metadata.pages || ''}.${metadata.doi ? ` https://doi.org/${metadata.doi}` : ''}`;
      } else if (style === 'mla') {
        citation = `${metadata.authors ? metadata.authors[0] + '. ' : ''}"${metadata.title}." <em>${metadata.journalName || ''}</em>, vol. ${metadata.volume || ''}, no. ${metadata.issue || ''}, ${metadata.year}, pp. ${metadata.pages || ''}.`;
      } else if (style === 'chicago') {
        citation = `${metadata.authors ? metadata.authors[0] + '. ' : ''}"${metadata.title}." <em>${metadata.journalName || ''}</em> ${metadata.volume || ''}, no. ${metadata.issue || ''} (${metadata.year}): ${metadata.pages || ''}.`;
      } else {
        citation = `Citation would be generated in ${style} format.`;
      }
      
      resolve({ citation, style });
    }, 1000); // Simulate network delay
  });
};

// Form field component for different source types
const SourceTypeFields = ({ 
  sourceType, 
  formData, 
  handleChange 
}: { 
  sourceType: string; 
  formData: Record<string, any>; 
  handleChange: (field: string, value: any) => void 
}) => {
  switch (sourceType) {
    case 'case':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="caseName">Case Name</Label>
            <Input
              id="caseName"
              value={formData.caseName || ''}
              onChange={(e) => handleChange('caseName', e.target.value)}
              placeholder="Mabo v Queensland"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                value={formData.year || ''}
                onChange={(e) => handleChange('year', e.target.value)}
                placeholder="1992"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume">Volume</Label>
              <Input
                id="volume"
                value={formData.volume || ''}
                onChange={(e) => handleChange('volume', e.target.value)}
                placeholder="175"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportSeries">Report Series</Label>
              <Input
                id="reportSeries"
                value={formData.reportSeries || ''}
                onChange={(e) => handleChange('reportSeries', e.target.value)}
                placeholder="CLR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startPage">Start Page</Label>
              <Input
                id="startPage"
                value={formData.startPage || ''}
                onChange={(e) => handleChange('startPage', e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="court">Court</Label>
            <Input
              id="court"
              value={formData.court || ''}
              onChange={(e) => handleChange('court', e.target.value)}
              placeholder="High Court of Australia"
            />
          </div>
        </>
      );
      
    case 'legislation':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="title">Title of Act</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Criminal Code Act"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                value={formData.year || ''}
                onChange={(e) => handleChange('year', e.target.value)}
                placeholder="1995"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Select
                value={formData.jurisdiction || ''}
                onValueChange={(value) => handleChange('jurisdiction', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select jurisdiction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cth">Commonwealth (Cth)</SelectItem>
                  <SelectItem value="ACT">Australian Capital Territory (ACT)</SelectItem>
                  <SelectItem value="NSW">New South Wales (NSW)</SelectItem>
                  <SelectItem value="NT">Northern Territory (NT)</SelectItem>
                  <SelectItem value="Qld">Queensland (Qld)</SelectItem>
                  <SelectItem value="SA">South Australia (SA)</SelectItem>
                  <SelectItem value="Tas">Tasmania (Tas)</SelectItem>
                  <SelectItem value="Vic">Victoria (Vic)</SelectItem>
                  <SelectItem value="WA">Western Australia (WA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="section">Section (optional)</Label>
            <Input
              id="section"
              value={formData.section || ''}
              onChange={(e) => handleChange('section', e.target.value)}
              placeholder="32"
            />
          </div>
        </>
      );
      
    case 'journalArticle':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="title">Article Title</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="The Impact of Legal Reforms"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authors">Authors</Label>
            <Input
              id="authors"
              value={formData.authors ? formData.authors.join(', ') : ''}
              onChange={(e) => handleChange('authors', e.target.value.split(', '))}
              placeholder="Jane Smith, John Doe"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="journalName">Journal Name</Label>
              <Input
                id="journalName"
                value={formData.journalName || ''}
                onChange={(e) => handleChange('journalName', e.target.value)}
                placeholder="Journal of Legal Studies"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                value={formData.year || ''}
                onChange={(e) => handleChange('year', e.target.value)}
                placeholder="2025"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="volume">Volume</Label>
              <Input
                id="volume"
                value={formData.volume || ''}
                onChange={(e) => handleChange('volume', e.target.value)}
                placeholder="42"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue">Issue</Label>
              <Input
                id="issue"
                value={formData.issue || ''}
                onChange={(e) => handleChange('issue', e.target.value)}
                placeholder="3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pages">Pages</Label>
              <Input
                id="pages"
                value={formData.pages || ''}
                onChange={(e) => handleChange('pages', e.target.value)}
                placeholder="256-278"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doi">DOI (optional)</Label>
            <Input
              id="doi"
              value={formData.doi || ''}
              onChange={(e) => handleChange('doi', e.target.value)}
              placeholder="10.1234/journal.5678"
            />
          </div>
        </>
      );
      
    case 'website':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="title">Page Title</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Website Page Title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authors">Authors (optional)</Label>
            <Input
              id="authors"
              value={formData.authors ? formData.authors.join(', ') : ''}
              onChange={(e) => handleChange('authors', e.target.value ? e.target.value.split(', ') : [])}
              placeholder="Jane Smith, John Doe"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="websiteName">Website Name</Label>
              <Input
                id="websiteName"
                value={formData.websiteName || ''}
                onChange={(e) => handleChange('websiteName', e.target.value)}
                placeholder="Example Organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publicationDate">Publication Date</Label>
              <Input
                id="publicationDate"
                type="date"
                value={formData.publicationDate || ''}
                onChange={(e) => handleChange('publicationDate', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={formData.url || ''}
              onChange={(e) => handleChange('url', e.target.value)}
              placeholder="https://example.com/page"
            />
          </div>
        </>
      );
      
    case 'book':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="title">Book Title</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="The Complete Guide to Legal Research"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authors">Authors</Label>
            <Input
              id="authors"
              value={formData.authors ? formData.authors.join(', ') : ''}
              onChange={(e) => handleChange('authors', e.target.value.split(', '))}
              placeholder="Jane Smith, John Doe"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                value={formData.publisher || ''}
                onChange={(e) => handleChange('publisher', e.target.value)}
                placeholder="Oxford University Press"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                value={formData.year || ''}
                onChange={(e) => handleChange('year', e.target.value)}
                placeholder="2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edition">Edition</Label>
              <Input
                id="edition"
                value={formData.edition || ''}
                onChange={(e) => handleChange('edition', e.target.value)}
                placeholder="3rd"
              />
            </div>
          </div>
        </>
      );
      
    default:
      return (
        <div className="text-muted-foreground text-center py-4">
          Select a source type to see specific fields
        </div>
      );
  }
};

// AGLC4 Citation Guide component
const AGLC4Guide = () => {
  return (
    <div className="mt-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="cases">
          <AccordionTrigger>Cases</AccordionTrigger>
          <AccordionContent>
            <h3 className="font-semibold mb-2">Format:</h3>
            <p className="mb-2">
              <em>Case Name</em> [Year] Volume Report Series Starting Page, Pinpoint.
            </p>
            
            <h3 className="font-semibold mt-4 mb-2">Examples:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <em>Mabo v Queensland (No 2)</em> (1992) 175 CLR 1.
              </li>
              <li>
                <em>Plaintiff S157/2002 v Commonwealth</em> (2003) 211 CLR 476, 513–14 [102]–[104].
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="legislation">
          <AccordionTrigger>Legislation</AccordionTrigger>
          <AccordionContent>
            <h3 className="font-semibold mb-2">Format:</h3>
            <p className="mb-2">
              <em>Title of Act</em> Year (Jurisdiction) Section.
            </p>
            
            <h3 className="font-semibold mt-4 mb-2">Examples:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <em>Criminal Code Act</em> 1995 (Cth).
              </li>
              <li>
                <em>Charter of Human Rights and Responsibilities Act</em> 2006 (Vic) s 32.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="articles">
          <AccordionTrigger>Journal Articles</AccordionTrigger>
          <AccordionContent>
            <h3 className="font-semibold mb-2">Format:</h3>
            <p className="mb-2">
              Author, 'Title' (Year) Volume(Issue) <em>Journal Name</em> Starting Page, Pinpoint.
            </p>
            
            <h3 className="font-semibold mt-4 mb-2">Examples:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Margaret Thornton, 'The Law School, the Market and the New Knowledge Economy' (2007) 17(1–2) <em>Legal Education Review</em> 1, 19.
              </li>
              <li>
                Michael Kirby, 'The Growing Impact of International Law on the Common Law' (2012) 33 <em>Adelaide Law Review</em> 7, 12.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="books">
          <AccordionTrigger>Books</AccordionTrigger>
          <AccordionContent>
            <h3 className="font-semibold mb-2">Format:</h3>
            <p className="mb-2">
              Author, <em>Title</em> (Edition, Publisher, Year) Page.
            </p>
            
            <h3 className="font-semibold mt-4 mb-2">Examples:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Peter Butt, <em>Land Law</em> (7th ed, Thomson Reuters, 2017) 100.
              </li>
              <li>
                Pamela O'Connor, <em>The Changing Paradigm of Property and the Framing of Regulation as a Taking</em> (Federation Press, 2010).
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="websites">
          <AccordionTrigger>Websites</AccordionTrigger>
          <AccordionContent>
            <h3 className="font-semibold mb-2">Format:</h3>
            <p className="mb-2">
              Author, 'Title' <em>Website Name</em> (Publication Date) &lt;URL&gt; accessed Access Date.
            </p>
            
            <h3 className="font-semibold mt-4 mb-2">Examples:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Australian Law Reform Commission, 'Traditional Rights and Freedoms — Encroachments by Commonwealth Laws' <em>ALRC</em> (2 March 2016) &lt;https://www.alrc.gov.au/publication/traditional-rights-and-freedoms-encroachments-by-commonwealth-laws-alrc-report-129/&gt; accessed 15 May 2025.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default function CitationGenerator() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [inputTab, setInputTab] = useState('url');
  const [selectedStyle, setSelectedStyle] = useState('aglc4');
  const [selectedSourceType, setSelectedSourceType] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [citation, setCitation] = useState<{ text: string; style: string } | null>(null);
  const [showAGLC4Guide, setShowAGLC4Guide] = useState(false);
  const [searchSources, setSearchSources] = useState<any[]>([]);
  const [selectedSearchSourceIndex, setSelectedSearchSourceIndex] = useState<number>(-1);
  
  // Handle sources from search results and auto-generate citations
  useEffect(() => {
    // Try to get sources from localStorage (set by AIAnswer component)
    const sourcesJson = localStorage.getItem('sourceForCitation');
    if (sourcesJson) {
      try {
        const sources = JSON.parse(sourcesJson);
        setSearchSources(sources);
        
        // Get the source index from URL if provided
        const urlParams = new URLSearchParams(window.location.search);
        const sourceIndex = urlParams.get('index');
        const fromSearch = urlParams.get('from') === 'search';
        
        // Auto-generate citations for all sources if coming from search results
        if (fromSearch) {
          // Use a timeout to ensure state updates have completed
          setTimeout(() => {
            // If a specific source is selected, generate just that one
            if (sourceIndex !== null) {
              const index = parseInt(sourceIndex, 10);
              setSelectedSearchSourceIndex(index);
              
              if (sources[0]) {
                const source = sources[0];
                setLoading(true);
                
                // Automatically detect source type based on URL and content
                const detectedType = detectSourceType(source);
                setSelectedSourceType(detectedType);
                
                // Auto-populate form with the detected source type
                const formattedData = formatSourceData(source, detectedType);
                setFormData(formattedData);
                
                // Auto-generate the citation
                generateCitationForSource(source, detectedType, selectedStyle)
                  .then(result => {
                    setCitation(result);
                    setLoading(false);
                  })
                  .catch(err => {
                    console.error('Error generating citation:', err);
                    setLoading(false);
                    toast({
                      title: "Error generating citation",
                      description: "An error occurred while generating the citation. Please try again.",
                      variant: "destructive"
                    });
                  });
              }
            } else if (sources.length > 0) {
              // Generate citations for all sources
              const promises = sources.map((source: any) => {
                const detectedType = detectSourceType(source);
                return generateCitationForSource(source, detectedType, selectedStyle);
              });
              
              setLoading(true);
              
              Promise.all(promises)
                .then(results => {
                  // Combine all citations
                  const combinedCitation = {
                    text: results.map(r => r.text).join('\n\n'),
                    style: selectedStyle
                  };
                  setCitation(combinedCitation);
                  setLoading(false);
                })
                .catch(err => {
                  console.error('Error generating multiple citations:', err);
                  setLoading(false);
                  toast({
                    title: "Error generating citations",
                    description: "An error occurred while generating citations. Please try again.",
                    variant: "destructive"
                  });
                });
            }
          }, 100);
        }
        
        // Clear localStorage to prevent future interference
        localStorage.removeItem('sourceForCitation');
      } catch (e) {
        console.error('Error parsing sources from localStorage:', e);
      }
    }
  }, [selectedStyle]);
  
  // Helper function to detect source type based on URL and content
  const detectSourceType = (source: any): string => {
    const url = source.url || '';
    const domain = source.domain || '';
    const title = source.title || '';
    
    // Check if it's likely a journal article
    if (
      url.includes('doi.org') || 
      url.includes('jstor.org') || 
      url.includes('pubmed') ||
      url.includes('academia.edu') ||
      url.includes('researchgate') ||
      url.includes('journal') ||
      title.includes('Study') ||
      title.includes('Research') ||
      title.includes('Journal')
    ) {
      return 'journalArticle';
    }
    
    // Check if it's likely a news article
    if (
      domain.includes('news') ||
      domain.includes('bbc') ||
      domain.includes('cnn') ||
      domain.includes('nytimes') ||
      domain.includes('guardian') ||
      domain.includes('reuters') ||
      domain.includes('abc.net.au') ||
      domain.includes('smh.com.au') ||
      title.includes('News') ||
      url.includes('article')
    ) {
      return 'newspaperArticle';
    }
    
    // Default to website for all other cases
    return 'website';
  };
  
  // Helper function to format source data based on detected type
  const formatSourceData = (source: any, sourceType: string): Record<string, any> => {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Base data common for all types
    const baseData = {
      title: source.title || '',
      url: source.url || '',
      publicationDate: currentDate,
      authors: []
    };
    
    // Add type-specific fields
    switch (sourceType) {
      case 'journalArticle':
        return {
          ...baseData,
          journalName: source.domain || extractDomainName(source.url || ''),
          volume: '',
          issue: '',
          pages: '',
          doi: extractDOI(source.url || '')
        };
      case 'newspaperArticle':
        return {
          ...baseData,
          newspaperName: source.domain || extractDomainName(source.url || ''),
          section: ''
        };
      case 'website':
      default:
        return {
          ...baseData,
          websiteName: source.domain || extractDomainName(source.url || '')
        };
    }
  };
  
  // Extract domain name from URL
  const extractDomainName = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch (e) {
      return '';
    }
  };
  
  // Extract DOI from URL if available
  const extractDOI = (url: string): string => {
    if (url.includes('doi.org')) {
      const match = url.match(/doi\.org\/(.+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return '';
  };
  
  // Generate citation for a specific source
  const generateCitationForSource = async (
    source: any, 
    sourceType: string, 
    citationStyle: string
  ): Promise<{ text: string; style: string }> => {
    return new Promise((resolve) => {
      const formattedData = formatSourceData(source, sourceType);
      
      // This is where you would connect to your real citation API
      // For now, we'll generate a simple citation based on style and source type
      let citationText = '';
      
      if (citationStyle === 'aglc4') {
        switch (sourceType) {
          case 'journalArticle':
            citationText = `Author(s), '<i>${formattedData.title}</i>' (${new Date().getFullYear()}) <i>${formattedData.journalName}</i>`;
            break;
          case 'newspaperArticle':
            citationText = `Author(s), '<i>${formattedData.title}</i>', <i>${formattedData.newspaperName}</i> (online, ${new Date().toLocaleDateString('en-AU')}) &lt;<a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a>&gt;`;
            break;
          case 'website':
          default:
            citationText = `<i>${formattedData.websiteName}</i>, <i>${formattedData.title}</i> (Web Page, ${new Date().toLocaleDateString('en-AU')}) &lt;<a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a>&gt;`;
            break;
        }
      } else if (citationStyle === 'apa') {
        const year = new Date().getFullYear();
        switch (sourceType) {
          case 'journalArticle':
            citationText = `(${year}). ${formattedData.title}. <i>${formattedData.journalName}</i>. <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a>`;
            break;
          case 'newspaperArticle':
            citationText = `(${year}, ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}). ${formattedData.title}. <i>${formattedData.newspaperName}</i>. <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a>`;
            break;
          case 'website':
          default:
            citationText = `(${year}). ${formattedData.title}. <i>${formattedData.websiteName}</i>. Retrieved from <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a>`;
            break;
        }
      } else if (citationStyle === 'mla') {
        switch (sourceType) {
          case 'journalArticle':
            citationText = `"${formattedData.title}." <i>${formattedData.journalName}</i>, ${new Date().getFullYear()}. Web. ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}.`;
            break;
          case 'newspaperArticle':
            citationText = `"${formattedData.title}." <i>${formattedData.newspaperName}</i>, ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}. Web. <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a>`;
            break;
          case 'website':
          default:
            citationText = `"${formattedData.title}." <i>${formattedData.websiteName}</i>, ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}. Web. <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a>`;
            break;
        }
      } else if (citationStyle === 'chicago') {
        switch (sourceType) {
          case 'journalArticle':
            citationText = `Author(s). "${formattedData.title}." <i>${formattedData.journalName}</i> ${new Date().getFullYear()}. <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a>.`;
            break;
          case 'newspaperArticle':
            citationText = `Author(s). "${formattedData.title}." <i>${formattedData.newspaperName}</i>, ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a>.`;
            break;
          case 'website':
          default:
            citationText = `"${formattedData.title}." <i>${formattedData.websiteName}</i>. Accessed ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a>.`;
            break;
        }
      } else if (citationStyle === 'harvard') {
        switch (sourceType) {
          case 'journalArticle':
            citationText = `Author(s) (${new Date().getFullYear()}) '${formattedData.title}', <i>${formattedData.journalName}</i>. Available at: <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a> (Accessed: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}).`;
            break;
          case 'newspaperArticle':
            citationText = `Author(s) (${new Date().getFullYear()}) '${formattedData.title}', <i>${formattedData.newspaperName}</i>, ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}. Available at: <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a> (Accessed: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}).`;
            break;
          case 'website':
          default:
            citationText = `${formattedData.websiteName} (${new Date().getFullYear()}) <i>${formattedData.title}</i>. Available at: <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a> (Accessed: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}).`;
            break;
        }
      } else {
        // Default format for other citation styles
        citationText = `${formattedData.title}. (${new Date().getFullYear()}). Retrieved from <a href="${formattedData.url}" target="_blank" rel="noopener noreferrer">${formattedData.url}</a>`;
      }
      
      setTimeout(() => {
        resolve({
          text: citationText,
          style: citationStyle
        });
      }, 500); // Simulate API delay
    });
  };
  
  // Filter source types based on selected citation style
  const filteredSourceTypes = sourceTypes.filter(
    type => type.availableIn.includes(selectedStyle)
  );
  
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter a valid URL to generate a citation",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Extract metadata from URL
      const metadata = await extractMetadata(url.trim());
      
      // Update form data with extracted metadata
      setFormData(metadata);
      setSelectedSourceType(metadata.sourceType);
      
      // Generate citation
      const result = await generateCitation(metadata, selectedStyle);
      
      setCitation({
        text: result.citation,
        style: result.style
      });
      
      toast({
        title: "Citation Generated",
        description: "Your citation has been successfully generated"
      });
    } catch (error) {
      console.error('Error generating citation:', error);
      toast({
        title: "Citation Generation Failed",
        description: "There was an error generating your citation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSourceType) {
      toast({
        title: "Missing Source Type",
        description: "Please select a source type",
        variant: "destructive"
      });
      return;
    }
    
    // Check required fields based on source type
    let missingFields = false;
    let missingFieldName = '';
    
    switch (selectedSourceType) {
      case 'journalArticle':
        if (!formData.title) { missingFields = true; missingFieldName = 'Article Title'; }
        else if (!formData.authors || formData.authors.length === 0) { missingFields = true; missingFieldName = 'Authors'; }
        else if (!formData.journalName) { missingFields = true; missingFieldName = 'Journal Name'; }
        else if (!formData.year) { missingFields = true; missingFieldName = 'Year'; }
        break;
      case 'case':
        if (!formData.caseName) { missingFields = true; missingFieldName = 'Case Name'; }
        else if (!formData.year) { missingFields = true; missingFieldName = 'Year'; }
        else if (!formData.reportSeries) { missingFields = true; missingFieldName = 'Report Series'; }
        break;
      case 'legislation':
        if (!formData.title) { missingFields = true; missingFieldName = 'Title of Act'; }
        else if (!formData.year) { missingFields = true; missingFieldName = 'Year'; }
        else if (!formData.jurisdiction) { missingFields = true; missingFieldName = 'Jurisdiction'; }
        break;
      case 'website':
        if (!formData.title) { missingFields = true; missingFieldName = 'Page Title'; }
        else if (!formData.url) { missingFields = true; missingFieldName = 'URL'; }
        break;
      case 'book':
        if (!formData.title) { missingFields = true; missingFieldName = 'Book Title'; }
        else if (!formData.authors || formData.authors.length === 0) { missingFields = true; missingFieldName = 'Authors'; }
        else if (!formData.publisher) { missingFields = true; missingFieldName = 'Publisher'; }
        else if (!formData.year) { missingFields = true; missingFieldName = 'Year'; }
        break;
    }
    
    if (missingFields) {
      toast({
        title: "Missing Required Field",
        description: `Please enter a value for ${missingFieldName}`,
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Generate citation
      const result = await generateCitation({
        ...formData,
        sourceType: selectedSourceType
      }, selectedStyle);
      
      setCitation({
        text: result.citation,
        style: result.style
      });
      
      toast({
        title: "Citation Generated",
        description: "Your citation has been successfully generated"
      });
    } catch (error) {
      console.error('Error generating citation:', error);
      toast({
        title: "Citation Generation Failed",
        description: "There was an error generating your citation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleReset = () => {
    setUrl('');
    setFormData({});
    setSelectedSourceType('');
    setCitation(null);
  };
  
  const handleCopy = () => {
    if (citation) {
      // Strip HTML tags for plain text
      const plainText = citation.text.replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(plainText);
      toast({
        title: "Copied",
        description: "Citation copied to clipboard"
      });
    }
  };
  
  const toggleAGLC4Guide = () => {
    setShowAGLC4Guide(!showAGLC4Guide);
  };
  
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">Citation Generator</h1>
        {selectedStyle === 'aglc4' && (
          <Button variant="outline" onClick={toggleAGLC4Guide}>
            {showAGLC4Guide ? 'Hide AGLC4 Guide' : 'Show AGLC4 Guide'}
          </Button>
        )}
      </div>
      <p className="text-muted-foreground mb-6">
        Generate properly formatted citations for various source types
      </p>
      
      {showAGLC4Guide && <AGLC4Guide />}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Input Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Generate Citation</CardTitle>
              <CardDescription>
                Enter a URL or manually input source details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="citation-style">Citation Style</Label>
                <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                  <SelectTrigger id="citation-style">
                    <SelectValue placeholder="Select citation style" />
                  </SelectTrigger>
                  <SelectContent>
                    {citationStyles.map(style => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* If we have sources from search results, show them */}
              {searchSources.length > 0 && (
                <div className="mb-4 p-3 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search mr-2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.3-4.3"/>
                    </svg>
                    Sources from Search Results
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {searchSources.map((source, index) => (
                      <div 
                        key={index}
                        className={`p-2 text-sm rounded cursor-pointer transition-colors ${selectedSearchSourceIndex === index ? 'bg-blue-200 dark:bg-blue-800' : 'hover:bg-blue-100 dark:hover:bg-blue-800/50'}`}
                        onClick={() => {
                          setSelectedSearchSourceIndex(index);
                          setInputTab('manual');
                          setSelectedSourceType('website');
                          
                          setFormData({
                            title: source.title || '',
                            url: source.url || '',
                            websiteName: source.domain || '',
                            publicationDate: new Date().toISOString().split('T')[0], // Default to today
                            authors: []
                          });
                        }}
                      >
                        <div className="font-medium text-blue-700 dark:text-blue-300">{source.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{source.url}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Tabs value={inputTab} onValueChange={setInputTab} className="w-full">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="url">URL</TabsTrigger>
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                </TabsList>
                
                <TabsContent value="url">
                  <form onSubmit={handleUrlSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="url-input">Source URL</Label>
                      <div className="flex">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="url-input"
                            placeholder="https://example.com/article"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                        {url && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="ml-2"
                            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          'Generate Citation'
                        )}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
                
                <TabsContent value="manual">
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="source-type">Source Type</Label>
                      <Select value={selectedSourceType} onValueChange={setSelectedSourceType}>
                        <SelectTrigger id="source-type">
                          <SelectValue placeholder="Select source type" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSourceTypes.map(type => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedSourceType && (
                      <div className="space-y-4 border rounded-md p-4">
                        <SourceTypeFields 
                          sourceType={selectedSourceType}
                          formData={formData}
                          handleChange={handleFieldChange}
                        />
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button"
                        variant="secondary"
                        onClick={handleReset}
                        disabled={loading}
                      >
                        Reset
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={loading || !selectedSourceType}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          'Generate Citation'
                        )}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Usage limitations based on user tier */}
          <div className="mt-4">
            <Alert>
              <Quote className="h-4 w-4" />
              <AlertTitle>Usage Information</AlertTitle>
              <AlertDescription>
                {!user ? (
                  "Sign in to save your citations and create bibliographies."
                ) : user.subscriptionTier === "free" ? (
                  "Free tier includes basic citation styles. Upgrade for advanced styles and features."
                ) : user.subscriptionTier === "basic" ? (
                  "Basic tier includes all citation styles including AGLC4."
                ) : (
                  "Pro tier includes all citation styles and unlimited bibliographies."
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
        
        {/* Output Section */}
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Citation</CardTitle>
              <CardDescription>
                {citation ? `Generated in ${citationStyles.find(s => s.id === citation.style)?.name || citation.style} format` : "Generated citation will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-4 w-full mt-4" />
                  <Skeleton className="h-4 w-[70%]" />
                </div>
              ) : citation ? (
                <div className="p-4 border rounded-md">
                  <div className="mb-2 flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-primary">
                        {citationStyles.find(s => s.id === citation.style)?.name || citation.style}
                      </span>
                      {citation.text.includes('\n\n') && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                          {citation.text.split('\n\n').length} citations
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {citation.text.includes('\n\n') ? (
                    <div className="space-y-3 font-mono text-sm">
                      {citation.text.split('\n\n').map((citationItem, index) => (
                        <div key={index} className="p-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <div className="inline-flex items-center justify-center w-5 h-5 bg-primary/10 text-primary rounded-full text-xs font-medium mr-2">
                                {index + 1}
                              </div>
                              <span dangerouslySetInnerHTML={{ __html: citationItem }}></span>
                            </div>
                            <Button 
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(citationItem);
                                toast({
                                  description: `Citation ${index + 1} copied to clipboard`,
                                });
                              }}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-primary"
                            >
                              <Clipboard className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="font-mono text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: citation.text }}></div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <div className="text-muted-foreground">
                    <Quote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter source information and click "Generate Citation" to create a citation</p>
                  </div>
                </div>
              )}
            </CardContent>
            {citation && (
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleCopy}>
                  <Clipboard className="h-4 w-4 mr-2" />
                  Copy Citation
                </Button>
                {user && (
                  <Button variant="secondary">
                    Save to Bibliography
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}