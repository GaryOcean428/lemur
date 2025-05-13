# Citation Generator Implementation Guide

**Date:** May 13, 2025

## Overview

This document provides detailed implementation guidance for the Citation Generator feature in Lemur. The feature will allow users to generate properly formatted citations for various source types in multiple citation styles, with special emphasis on the Australian Guide to Legal Citation, 4th edition (AGLC4).

## Recent Improvements

- **Dynamic Citation Style Updates**: Implemented functionality to automatically regenerate existing citations when users switch between citation styles (AGLC4, Chicago, Harvard, etc.)
- **Enhanced Formatting**: Added proper styling with italics for publication names and titles as required by each citation style
- **Live Link Support**: Implemented clickable URL links for website citations
- **Search Import Integration**: Completed the integration with search results to allow direct import of sources
- **Source Type Detection**: Improved automatic detection of source types from URLs and metadata
- **Citation Regeneration**: Fixed issues with citation regeneration to maintain source data when switching styles

## Citation Styles Support

The Citation Generator will support the following citation styles:

1. **APA (American Psychological Association) - 7th Edition**
2. **MLA (Modern Language Association) - 9th Edition**
3. **Chicago - 17th Edition (Notes-Bibliography and Author-Date)**
4. **Harvard**
5. **IEEE**
6. **AGLC4 (Australian Guide to Legal Citation) - 4th Edition**
7. **Vancouver**
8. **AMA (American Medical Association)**

## Architecture

### Component Diagram

```
+----------------------------------------------------------+
|                 Citation Generator Feature                |
+----------------------------------------------------------+
|                                                          |
|  +----------------+          +------------------------+  |
|  |  Input Layer   |          |   Processing Layer     |  |
|  |                |          |                        |  |
|  |  URL Entry     |          |  Metadata Extraction   |  |
|  |  Manual Entry  |--------->|  Citation Formatting   |  |
|  |  Batch Import  |          |  Style Application     |  |
|  |  Search Import |          |  Validation            |  |
|  +----------------+          +------------------------+  |
|                                          |               |
|                                          v               |
|  +----------------+          +------------------------+  |
|  |   Output Layer |<---------|   Management Layer     |  |
|  |                |          |                        |  |
|  |  Formatted     |          |  Citation Storage      |  |
|  |  Citations     |--------->|  Bibliography Creation |  |
|  |  Export Options|          |  Version Control       |  |
|  +----------------+          +------------------------+  |
|           ^                              |               |
|           |                              v               |
|  +----------------+          +------------------------+  |
|  |    UI Layer    |          |    Integration Layer   |  |
|  |                |          |                        |  |
|  |  Style Selector|<---------|  Search Results Link   |  |
|  |  Preview       |--------->|  Research Dashboard    |  |
|  |  Editor        |          |  Export Services       |  |
|  +----------------+          +------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

## AGLC4 Implementation Details

The AGLC4 citation style has specific formatting requirements that differ significantly from other citation styles, especially for legal sources. Based on the provided resources, we will implement comprehensive support for AGLC4.

### AGLC4 Source Types

The Citation Generator will support the following AGLC4 source types:

1. **Cases**
   - Australian cases
   - International cases

2. **Legislation**
   - Acts
   - Bills
   - Regulations and other delegated legislation
   - Constitutional documents

3. **Secondary Sources**
   - Books
   - Journal articles
   - Conference papers
   - Reports
   - Theses
   - Newspapers and magazines
   - Internet materials
   - Interviews and speeches

4. **International Materials**
   - Treaties
   - UN documents
   - International Court decisions

### AGLC4 Formatting Rules

The implementation will adhere to the specific formatting rules of AGLC4, including:

1. **Pinpoint References**: Correct formatting for paragraph, section, and page references
2. **Subsequent References**: Abbreviated form for subsequent citations to the same source
3. **Abbreviations**: Legal publication and court abbreviations
4. **Italicization**: Proper italicization of case names, legislation titles, and publication titles
5. **Punctuation**: Specific punctuation rules for AGLC4
6. **Order of Elements**: Specific order for different citation elements based on source type

## Implementation Details

### 1. Citation Format Definitions

We'll create a modular system for citation formats, with each style having its own definition module:

```typescript
// server/services/citationService/formats/aglc4.ts

import { CitationStyle, SourceType, FormatRule } from '../types';

export const AGLC4Style: CitationStyle = {
  id: 'aglc4',
  name: 'AGLC4',
  description: 'Australian Guide to Legal Citation (4th Edition)',
  
  // Format rules for different source types
  formatRules: {
    // Cases
    case: {
      format: (source) => {
        // Case name formatting (italicized)
        const caseName = source.caseName ? `*${source.caseName}*` : '';
        
        // Year formatting (in square brackets or parentheses based on report series)
        const yearFormat = source.isLawReport ? `[${source.year}]` : `(${source.year})`;
        
        // Volume and report series
        const reportInfo = source.volume 
          ? `${source.volume} ${source.reportSeries}` 
          : source.reportSeries;
        
        // Starting page
        const startPage = source.startPage ? source.startPage : '';
        
        // Court information (if not a law report)
        const courtInfo = !source.isLawReport && source.court 
          ? ` (${source.court})` 
          : '';
        
        // Pinpoint reference (if any)
        const pinpoint = source.pinpoint 
          ? `, ${source.pinpoint}` 
          : '';
        
        // Assemble the citation
        return `${caseName} ${yearFormat} ${reportInfo} ${startPage}${courtInfo}${pinpoint}.`;
      },
      requiredFields: ['caseName', 'year', 'reportSeries', 'startPage'],
      optionalFields: ['volume', 'court', 'pinpoint', 'isLawReport']
    },
    
    // Legislation (Acts)
    act: {
      format: (source) => {
        // Title of Act (italicized)
        const title = source.title ? `*${source.title}*` : '';
        
        // Year
        const year = source.year ? ` ${source.year}` : '';
        
        // Jurisdiction
        const jurisdiction = source.jurisdiction ? ` (${source.jurisdiction})` : '';
        
        // Section/Subdivision
        const section = source.section ? ` s ${source.section}` : '';
        
        return `${title}${year}${jurisdiction}${section}.`;
      },
      requiredFields: ['title', 'year', 'jurisdiction'],
      optionalFields: ['section']
    },
    
    // Journal Article
    journalArticle: {
      format: (source) => {
        // Author(s)
        const authors = formatAuthors(source.authors);
        
        // Article title (in single quotes)
        const title = source.title ? `'${source.title}'` : '';
        
        // Year formatting
        const year = source.year ? `(${source.year})` : '';
        
        // Journal name (italicized)
        const journalName = source.journalName ? `*${source.journalName}*` : '';
        
        // Volume and issue
        const volume = source.volume ? ` ${source.volume}` : '';
        const issue = source.issue ? `(${source.issue})` : '';
        
        // Starting page
        const startPage = source.startPage ? ` ${source.startPage}` : '';
        
        // Pinpoint
        const pinpoint = source.pinpoint ? `, ${source.pinpoint}` : '';
        
        // DOI
        const doi = source.doi ? ` DOI: ${source.doi}` : '';
        
        return `${authors}, ${title} ${year} ${journalName}${volume}${issue}${startPage}${pinpoint}${doi}.`;
      },
      requiredFields: ['authors', 'title', 'year', 'journalName'],
      optionalFields: ['volume', 'issue', 'startPage', 'pinpoint', 'doi']
    },
    
    // Book
    book: {
      format: (source) => {
        // Author(s)
        const authors = formatAuthors(source.authors);
        
        // Book title (italicized)
        const title = source.title ? `*${source.title}*` : '';
        
        // Edition (if not first)
        const edition = source.edition && source.edition !== '1' ? 
          ` (${formatOrdinal(source.edition)} ed, ` : 
          ' (';
        
        // Publisher
        const publisher = source.publisher ? `${source.publisher}, ` : '';
        
        // Year
        const year = source.year ? `${source.year})` : ')';
        
        // Page/Chapter
        const page = source.page ? ` ${source.page}` : '';
        
        return `${authors}, ${title}${edition}${publisher}${year}${page}.`;
      },
      requiredFields: ['authors', 'title', 'publisher', 'year'],
      optionalFields: ['edition', 'page']
    },
    
    // Website
    website: {
      format: (source) => {
        // Author(s)
        const authors = source.authors ? `${formatAuthors(source.authors)}, ` : '';
        
        // Title (in single quotes)
        const title = source.title ? `'${source.title}'` : '';
        
        // Website name (italicized)
        const websiteName = source.websiteName ? ` *${source.websiteName}*` : '';
        
        // Publication date
        const publicationDate = source.publicationDate ? ` (${formatDate(source.publicationDate)})` : '';
        
        // URL
        const url = source.url ? ` <${source.url}>` : '';
        
        // Access date
        const accessDate = source.accessDate ? ` accessed ${formatDate(source.accessDate)}` : '';
        
        return `${authors}${title}${websiteName}${publicationDate}${url}${accessDate}.`;
      },
      requiredFields: ['title', 'url'],
      optionalFields: ['authors', 'websiteName', 'publicationDate', 'accessDate']
    },
    
    // Add other source types...
  },
  
  // Special formatting helpers for AGLC4
  helpers: {
    formatAuthors,
    formatDate,
    formatOrdinal,
    formatJurisdiction
  }
};

// Helper functions for AGLC4 formatting
function formatAuthors(authors: string[]): string {
  if (!authors || authors.length === 0) return '';
  
  if (authors.length === 1) {
    // Extract first name initial and last name
    const parts = authors[0].split(' ');
    const lastName = parts.pop() || '';
    const initials = parts.map(name => `${name.charAt(0)}`).join(' ');
    
    return initials ? `${lastName} ${initials}` : lastName;
  } else if (authors.length === 2) {
    const author1 = formatAuthors([authors[0]]);
    const author2 = formatAuthors([authors[1]]);
    
    return `${author1} and ${author2}`;
  } else {
    const firstAuthor = formatAuthors([authors[0]]);
    return `${firstAuthor} et al`;
  }
}

function formatDate(date: string): string {
  const dateObj = new Date(date);
  
  // Format as day month year (1 January 2025)
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString('en-US', { month: 'long' });
  const year = dateObj.getFullYear();
  
  return `${day} ${month} ${year}`;
}

function formatOrdinal(num: string): string {
  const n = parseInt(num, 10);
  
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  
  return `${n}th`;
}

function formatJurisdiction(jurisdiction: string): string {
  // Abbreviations for Australian jurisdictions
  const jurisdictionMap = {
    'commonwealth': 'Cth',
    'australian capital territory': 'ACT',
    'new south wales': 'NSW',
    'northern territory': 'NT',
    'queensland': 'Qld',
    'south australia': 'SA',
    'tasmania': 'Tas',
    'victoria': 'Vic',
    'western australia': 'WA'
  };
  
  const key = jurisdiction.toLowerCase();
  return jurisdictionMap[key] || jurisdiction;
}
```

### 2. Metadata Extraction Service

```typescript
// server/services/citationService/metadataExtraction.ts

import { SourceMetadata, SourceType } from './types';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export async function extractMetadataFromUrl(url: string): Promise<SourceMetadata> {
  try {
    // Fetch the webpage content
    const response = await fetch(url);
    const html = await response.text();
    
    // Parse with cheerio
    const $ = cheerio.load(html);
    
    // Extract metadata
    const metadata: SourceMetadata = {
      url,
      sourceType: determineSourceType(url, $),
      title: extractTitle($),
      authors: extractAuthors($),
      year: extractYear($),
      // Extract other fields based on source type
    };
    
    // Enhance metadata based on source type
    return enhanceMetadata(metadata, $);
  } catch (error) {
    console.error('Error extracting metadata:', error);
    throw new Error(`Failed to extract metadata: ${error.message}`);
  }
}

function determineSourceType(url: string, $: cheerio.Root): SourceType {
  // Check domain patterns to determine source type
  if (url.includes('auslit.edu.au') || url.includes('jade.io')) {
    return 'case';
  }
  
  if (url.includes('legislation.gov.au')) {
    return 'act';
  }
  
  // Check for journal article indicators
  if (
    url.includes('doi.org') || 
    url.includes('jstor.org') ||
    $('meta[name="citation_journal_title"]').length
  ) {
    return 'journalArticle';
  }
  
  // Default to website if can't determine
  return 'website';
}

function extractTitle($: cheerio.Root): string {
  // Try various metadata sources for title
  return (
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="citation_title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    ''
  );
}

function extractAuthors($: cheerio.Root): string[] {
  // Try various metadata sources for authors
  const metaAuthors = $('meta[name="citation_author"]')
    .map((_, el) => $(el).attr('content'))
    .get();
  
  if (metaAuthors.length) {
    return metaAuthors;
  }
  
  // Fallback to other sources
  const authorContent = 
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content');
  
  if (authorContent) {
    return [authorContent];
  }
  
  return [];
}

function extractYear($: cheerio.Root): string {
  // Try various metadata sources for publication year
  const dateContent =
    $('meta[name="citation_publication_date"]').attr('content') ||
    $('meta[name="publication_date"]').attr('content') ||
    $('meta[property="article:published_time"]').attr('content');
  
  if (dateContent) {
    const date = new Date(dateContent);
    return date.getFullYear().toString();
  }
  
  // Try to find a year pattern in the content
  const pageText = $('body').text();
  const yearMatch = pageText.match(/©\s*(\d{4})/);
  
  if (yearMatch) {
    return yearMatch[1];
  }
  
  return '';
}

function enhanceMetadata(metadata: SourceMetadata, $: cheerio.Root): SourceMetadata {
  // Add source-type specific metadata
  switch (metadata.sourceType) {
    case 'case':
      return enhanceCaseMetadata(metadata, $);
    case 'act':
      return enhanceActMetadata(metadata, $);
    case 'journalArticle':
      return enhanceJournalMetadata(metadata, $);
    // Add other source types
    default:
      return metadata;
  }
}

function enhanceCaseMetadata(metadata: SourceMetadata, $: cheerio.Root): SourceMetadata {
  // Extract case-specific metadata like court, report series, etc.
  return {
    ...metadata,
    court: extractCourt($),
    reportSeries: extractReportSeries($),
    startPage: extractStartPage($),
    isLawReport: determineIfLawReport($)
  };
}

function enhanceActMetadata(metadata: SourceMetadata, $: cheerio.Root): SourceMetadata {
  // Extract legislation-specific metadata
  return {
    ...metadata,
    jurisdiction: extractJurisdiction($)
  };
}

function enhanceJournalMetadata(metadata: SourceMetadata, $: cheerio.Root): SourceMetadata {
  // Extract journal-specific metadata
  return {
    ...metadata,
    journalName: $('meta[name="citation_journal_title"]').attr('content') || '',
    volume: $('meta[name="citation_volume"]').attr('content') || '',
    issue: $('meta[name="citation_issue"]').attr('content') || '',
    startPage: $('meta[name="citation_firstpage"]').attr('content') || '',
    doi: $('meta[name="citation_doi"]').attr('content') || ''
  };
}

// Helper functions for specific metadata extraction
function extractCourt($: cheerio.Root): string {
  // Logic to extract court information
  return '';
}

function extractReportSeries($: cheerio.Root): string {
  // Logic to extract report series
  return '';
}

function extractStartPage($: cheerio.Root): string {
  // Logic to extract starting page
  return '';
}

function determineIfLawReport($: cheerio.Root): boolean {
  // Logic to determine if this is a law report
  return false;
}

function extractJurisdiction($: cheerio.Root): string {
  // Logic to extract jurisdiction
  return '';
}
```

### 3. Citation Generator API

```typescript
// server/routes/citation-generator.ts

import { Router } from 'express';
import { extractMetadataFromUrl } from '../services/citationService/metadataExtraction';
import { generateCitation } from '../services/citationService/citationGenerator';
import { storage } from '../storage';

const router = Router();

// Generate citation from URL
router.post('/generate-from-url', async (req, res) => {
  try {
    const { url, style = 'aglc4' } = req.body;
    const userId = req.user?.id || null;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Extract metadata from URL
    const metadata = await extractMetadataFromUrl(url);
    
    // Generate citation in requested style
    const citation = generateCitation(metadata, style);
    
    // Save to database if user is logged in
    let savedCitation = null;
    if (userId) {
      savedCitation = await storage.createGeneratedCitation({
        userId,
        sourceUrl: url,
        sourceMetadata: metadata,
        styles: { [style]: citation }
      });
    }
    
    res.json({
      citation,
      metadata,
      savedId: savedCitation?.id
    });
  } catch (error) {
    console.error('Error generating citation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate citation from manual input
router.post('/generate-manual', async (req, res) => {
  try {
    const { metadata, style = 'aglc4' } = req.body;
    const userId = req.user?.id || null;
    
    if (!metadata || !metadata.sourceType) {
      return res.status(400).json({ error: 'Source metadata is required' });
    }
    
    // Generate citation in requested style
    const citation = generateCitation(metadata, style);
    
    // Save to database if user is logged in
    let savedCitation = null;
    if (userId) {
      savedCitation = await storage.createGeneratedCitation({
        userId,
        sourceUrl: metadata.url || null,
        sourceMetadata: metadata,
        styles: { [style]: citation }
      });
    }
    
    res.json({
      citation,
      savedId: savedCitation?.id
    });
  } catch (error) {
    console.error('Error generating citation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's saved citations
router.get('/saved', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const citations = await storage.getUserCitations(userId);
    res.json({ citations });
  } catch (error) {
    console.error('Error fetching saved citations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate citation for search result
router.post('/from-search', async (req, res) => {
  try {
    const { searchResultId, style = 'aglc4' } = req.body;
    const userId = req.user?.id || null;
    
    if (!searchResultId) {
      return res.status(400).json({ error: 'Search result ID is required' });
    }
    
    // Get search result
    const searchResult = await storage.getSearchResultById(searchResultId);
    
    if (!searchResult) {
      return res.status(404).json({ error: 'Search result not found' });
    }
    
    // Extract metadata from result
    const metadata = {
      sourceType: 'website',
      title: searchResult.title,
      url: searchResult.url,
      authors: [], // Need to extract or infer
      accessDate: new Date().toISOString()
    };
    
    // Generate citation
    const citation = generateCitation(metadata, style);
    
    // Save if user is logged in
    let savedCitation = null;
    if (userId) {
      savedCitation = await storage.createGeneratedCitation({
        userId,
        sourceUrl: metadata.url,
        sourceMetadata: metadata,
        styles: { [style]: citation }
      });
    }
    
    res.json({
      citation,
      metadata,
      savedId: savedCitation?.id
    });
  } catch (error) {
    console.error('Error generating citation from search result:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 4. Citation Generator Frontend Component

```typescript
// client/src/components/tools/citation-generator/CitationGenerator.tsx

import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clipboard, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const citationStyles = [
  { id: 'aglc4', name: 'AGLC4 (Australian Guide to Legal Citation)' },
  { id: 'apa', name: 'APA (7th Edition)' },
  { id: 'mla', name: 'MLA (9th Edition)' },
  { id: 'chicago', name: 'Chicago (17th Edition)' },
  { id: 'harvard', name: 'Harvard' },
  { id: 'ieee', name: 'IEEE' },
  { id: 'vancouver', name: 'Vancouver' },
  { id: 'ama', name: 'AMA (American Medical Association)' }
];

export default function CitationGenerator() {
  const [url, setUrl] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('aglc4');
  const [loading, setLoading] = useState(false);
  const [citation, setCitation] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [activeTab, setActiveTab] = useState('url');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to generate a citation",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/tools/citation-generator/generate-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url.trim(),
          style: selectedStyle
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate citation');
      }
      
      const data = await response.json();
      setCitation(data.citation);
      setMetadata(data.metadata);
      
      toast({
        title: "Citation Generated",
        description: "Your citation has been successfully generated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCitationCopy = () => {
    navigator.clipboard.writeText(citation);
    toast({
      title: "Copied",
      description: "Citation copied to clipboard"
    });
  };
  
  const renderAdvancedFields = () => {
    if (!metadata) return null;
    
    // Render different fields based on source type
    switch (metadata.sourceType) {
      case 'case':
        return renderCaseFields();
      case 'act':
        return renderActFields();
      case 'journalArticle':
        return renderJournalFields();
      default:
        return renderWebsiteFields();
    }
  };
  
  const renderCaseFields = () => {
    // Render case-specific fields (court, report series, etc.)
    return (
      <div className="space-y-4">
        {/* Case-specific fields */}
      </div>
    );
  };
  
  const renderActFields = () => {
    // Render legislation-specific fields
    return (
      <div className="space-y-4">
        {/* Act-specific fields */}
      </div>
    );
  };
  
  const renderJournalFields = () => {
    // Render journal-specific fields
    return (
      <div className="space-y-4">
        {/* Journal-specific fields */}
      </div>
    );
  };
  
  const renderWebsiteFields = () => {
    // Render website-specific fields
    return (
      <div className="space-y-4">
        {/* Website-specific fields */}
      </div>
    );
  };
  
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Citation Generator</h1>
      
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Generate Citation</CardTitle>
            <CardDescription>
              Create properly formatted citations in various styles, including AGLC4.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="url" onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="url">URL Input</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>
              
              <TabsContent value="url">
                <form onSubmit={handleUrlSubmit} className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Enter URL (e.g., https://example.com/article)"
                      className="flex-1"
                    />
                    
                    <Button type="submit" disabled={loading}>
                      {loading ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                  
                  <div>
                    <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                      <SelectTrigger>
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
                </form>
              </TabsContent>
              
              <TabsContent value="manual">
                {/* Manual entry form will go here */}
                <p className="text-muted-foreground">
                  Manual entry form for {selectedStyle} will be implemented in the next phase.
                </p>
              </TabsContent>
              
              {citation && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 border rounded-md">
                    <div className="flex justify-between">
                      <h3 className="font-medium">Generated Citation:</h3>
                      <Button variant="ghost" size="sm" onClick={handleCitationCopy}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: citation }} />
                  </div>
                  
                  {metadata && (
                    <div>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full justify-between"
                      >
                        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      
                      {showAdvanced && (
                        <div className="mt-4 p-4 border rounded-md">
                          <h3 className="font-medium mb-4">Edit Metadata:</h3>
                          {renderAdvancedFields()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {user && (
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline">
                        Save Citation
                      </Button>
                      <Button>
                        Add to Bibliography
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 5. AGLC4 Documentation Component

```typescript
// client/src/components/tools/citation-generator/AGLC4Guide.tsx

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function AGLC4Guide() {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">AGLC4 Citation Guide</h2>
      
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
}
```

## Integration with Other Features

### 1. Research Dashboard Integration

```typescript
// client/src/components/tools/research-dashboard/CitationPanel.tsx

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CitationPanelProps {
  projectId: number;
}

export function CitationPanel({ projectId }: CitationPanelProps) {
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchProjectCitations();
  }, [projectId]);
  
  const fetchProjectCitations = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/projects/${projectId}/citations`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch project citations');
      }
      
      const data = await response.json();
      setCitations(data.citations || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleExportBibliography = async () => {
    // Logic to export bibliography
  };
  
  // Component rendering logic...
}
```

### 2. Search Results Integration

```typescript
// client/src/components/SearchResults.tsx (addition to existing component)

// Add citation functionality to search results
const handleGenerateCitation = async (result) => {
  try {
    const response = await fetch('/api/tools/citation-generator/from-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        searchResultId: result.id,
        style: 'aglc4' // Default to AGLC4
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate citation');
    }
    
    const data = await response.json();
    
    // Show citation in a toast or modal
    toast({
      title: "Citation Generated",
      description: (
        <div>
          <p className="mb-2">Citation copied to clipboard</p>
          <div className="bg-background p-2 rounded text-sm">
            <span dangerouslySetInnerHTML={{ __html: data.citation }} />
          </div>
        </div>
      ),
      duration: 5000
    });
    
    // Copy to clipboard
    navigator.clipboard.writeText(data.citation.replace(/<[^>]*>/g, ''));
  } catch (error) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive"
    });
  }
};

// Add citation button to each search result
<Button 
  size="sm" 
  variant="ghost" 
  onClick={() => handleGenerateCitation(result)}
>
  <Clipboard className="h-4 w-4 mr-1" />
  Cite
</Button>
```

## AGLC4 Special Considerations

### 1. Pinpoint References

AGLC4 has specific rules for pinpoint references which will be implemented in our formatting logic:

1. **Multiple Pages**: Use an en-dash (pp 45–8)
2. **Paragraphs**: Use square brackets [10]–[12]
3. **Combined**: Page and paragraph references (p 51 [24])

### 2. Subsequent References

AGLC4 uses different formats for subsequent references to the same source:

1. **Cases**: Case Name (n Footnote Number)
2. **Legislation**: Act Name (n Footnote Number) Section
3. **Secondary Sources**: Author (n Footnote Number) Pinpoint

### 3. AGLC4 Syntax Highlighting

For better visual representation, we'll implement basic syntax highlighting:

```typescript
// client/src/utils/aglc4Highlighting.ts

export function highlightAGLC4(citation: string): string {
  // Replace italicized elements with HTML
  citation = citation.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Highlight pinpoint references
  citation = citation.replace(/(\[\d+\](?:-\[\d+\])?)/g, '<span class="text-blue-500">$1</span>');
  
  // Add small caps for jurisdictions
  citation = citation.replace(/\((Cth|NSW|Vic|Qld|SA|WA|Tas|ACT|NT)\)/g, '(<span class="uppercase text-sm">$1</span>)');
  
  return citation;
}
```

## Implementation Phases

### Phase 1: Core Functionality (2 weeks)

1. Set up basic Citation Generator UI
2. Implement URL metadata extraction
3. Create AGLC4 citation formatting
4. Add basic citation storage

### Phase 2: Enhanced Features (2 weeks)

1. Add manual entry forms for different source types
2. Implement additional citation styles
3. Create bibliography generation
4. Add search results citation integration

### Phase 3: Advanced Integration (2 weeks)

1. Implement Research Dashboard integration
2. Add batch citation processing
3. Create export functionality for different formats
4. Enhance metadata extraction for legal sources

## Security and Performance

### Security Considerations

1. **URL Validation**:
   - Validate and sanitize all URLs
   - Set proper timeout for URL fetching
   - Implement rate limiting

2. **Input Sanitization**:
   - Sanitize all user inputs
   - Validate metadata fields
   - Prevent HTML injection in citations

### Performance Optimization

1. **Caching**:
   - Cache metadata for frequently accessed URLs
   - Store generated citations by URL and style
   - Implement efficient lookup for citations

2. **Asynchronous Processing**:
   - Process complex metadata extraction asynchronously
   - Use worker threads for batch processing
   - Implement proper timeout handling

## Conclusion

This implementation plan provides a comprehensive approach to developing the Citation Generator feature with robust AGLC4 support. By following a modular design and focusing on extensibility, we can efficiently deliver a powerful citation tool that integrates with other Lemur features while maintaining high-quality legal citation formatting.