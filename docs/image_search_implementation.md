# Image Search Implementation Guide

**Date:** May 13, 2025

## Overview

This document provides detailed implementation guidance for the Image Search feature in Lemur. The feature allows users to search by uploading or providing images, leveraging AI models to analyze image content and generate relevant search queries.

## Architecture

### Component Diagram

```
+----------------------------------------------------------+
|                    Image Search Feature                  |
+----------------------------------------------------------+
|                                                          |
|  +-----------------+          +-----------------------+  |
|  |   Input Layer   |          |    Analysis Layer     |  |
|  |                 |          |                       |  |
|  |  Upload         |          |  Pre-processing       |  |
|  |  URL Input      |--------->|  AI Models            |  |
|  |  Camera Capture |          |  Feature Extraction   |  |
|  |  Screenshot     |          |  Text Recognition     |  |
|  +-----------------+          +-----------------------+  |
|                                         |                |
|                                         v                |
|  +-----------------+          +-----------------------+  |
|  |   Search Layer  |<---------|    Processing Layer   |  |
|  |                 |          |                       |  |
|  |  Tavily Search  |          |  Query Generation     |  |
|  |  Result Ranking |--------->|  Search Integration   |  |
|  |  Filtering      |          |  Result Processing    |  |
|  +-----------------+          +-----------------------+  |
|           ^                             |                |
|           |                             v                |
|  +-----------------+          +-----------------------+  |
|  |    UI Layer     |          |    Storage Layer      |  |
|  |                 |          |                       |  |
|  |  Results Display|<---------|  Database Storage     |  |
|  |  User Controls  |--------->|  Caching              |  |
|  |  Visualization  |          |  User Preferences     |  |
|  +-----------------+          +-----------------------+  |
|                                                          |
+----------------------------------------------------------+
```

## Implementation Details

### 1. Input Layer

#### Image Upload Component

```typescript
// client/src/components/tools/image-search/ImageUploader.tsx

import React, { useState, useCallback } from 'react';
import { Upload, UploadIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  onImageURL: (url: string) => void;
}

export function ImageUploader({ onImageSelected, onImageURL }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageSelected(acceptedFiles[0]);
    }
  }, [onImageSelected]);
  
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 10485760, // 10MB
    multiple: false
  });
  
  const handleURLSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onImageURL(urlInput.trim());
      setUrlInput('');
    }
  };
  
  return (
    <div className="space-y-6">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragActive ? 'border-primary bg-primary/10' : 'border-border'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Drag & drop an image here, or click to select
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supported formats: JPEG, PNG, GIF, WebP up to 10MB
        </p>
      </div>
      
      <div className="text-center text-sm text-muted-foreground">OR</div>
      
      <form onSubmit={handleURLSubmit} className="flex space-x-2">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Enter image URL"
          className="flex-1 px-3 py-2 rounded-md border"
        />
        <button 
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          disabled={!urlInput.trim()}
        >
          Search
        </button>
      </form>
    </div>
  );
}
```

### 2. Analysis Layer

#### Image Processing Service

```typescript
// server/services/imageProcessingService.ts

import sharp from 'sharp';
import crypto from 'crypto';

interface ProcessedImage {
  buffer: Buffer;
  hash: string;
  width: number;
  height: number;
  format: string;
  metadata: any;
}

export async function processImage(file: Buffer): Promise<ProcessedImage> {
  try {
    // Get image metadata
    const metadata = await sharp(file).metadata();
    
    // Resize if too large (preserve aspect ratio)
    let processedBuffer = file;
    if (metadata.width && metadata.width > 1200) {
      processedBuffer = await sharp(file)
        .resize({ width: 1200, withoutEnlargement: true })
        .toBuffer();
    }
    
    // Generate hash for deduplication
    const hash = crypto
      .createHash('sha256')
      .update(processedBuffer)
      .digest('hex');
    
    // Convert to standard format if needed
    const standardizedBuffer = await sharp(processedBuffer)
      .toFormat('jpeg', { quality: 85 })
      .toBuffer();
    
    // Get final dimensions
    const finalMetadata = await sharp(standardizedBuffer).metadata();
    
    return {
      buffer: standardizedBuffer,
      hash,
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
      format: finalMetadata.format || 'jpeg',
      metadata: finalMetadata
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

export async function extractBase64(file: Buffer): Promise<string> {
  return file.toString('base64');
}
```

#### Image Analysis Service

```typescript
// server/services/imageAnalysisService.ts

import { processImage, extractBase64 } from './imageProcessingService';
import { storage } from '../storage';

interface AnalysisOptions {
  analysisType: 'basic' | 'comprehensive';
  selectedRegion?: { x: number, y: number, width: number, height: number };
}

export async function analyzeImage(
  imageBuffer: Buffer,
  userId: number | null,
  options: AnalysisOptions = { analysisType: 'basic' }
) {
  try {
    // Process the image
    const processedImage = await processImage(imageBuffer);
    const base64Image = await extractBase64(processedImage.buffer);
    
    // Select model based on analysis type
    const model = options.analysisType === 'basic' ? 'compound-beta-mini' : 'compound-beta';
    
    // Save to database if user is logged in
    let imageSearchRecord = null;
    if (userId) {
      imageSearchRecord = await storage.createImageSearch({
        userId,
        imageHash: processedImage.hash,
        originalFilename: null,
        mimeType: `image/${processedImage.format}`,
        fileSize: processedImage.buffer.length,
        imageType: 'uploaded'
      });
    }
    
    // Initialize processing status
    if (imageSearchRecord) {
      await storage.updateImageSearchAnalysis(imageSearchRecord.id, {
        processingStatus: 'processing',
        modelUsed: model
      });
    }
    
    // Analyze with Groq Compound model
    const analysisResults = await analyzeImageWithGroq(
      base64Image,
      options.analysisType,
      process.env.VITE_GROQ_API_KEY || ''
    );
    
    // Extract search queries from analysis
    const searchQueries = generateSearchQueries(analysisResults);
    
    // Update record with analysis results
    if (imageSearchRecord) {
      await storage.updateImageSearchAnalysis(imageSearchRecord.id, {
        analysisResults,
        detectedObjects: analysisResults.objects || [],
        extractedText: analysisResults.text || '',
        searchQueries,
        processingStatus: 'completed',
        modelUsed: model
      });
    }
    
    return {
      analysisResults,
      searchQueries,
      imageId: imageSearchRecord?.id,
      metadata: {
        width: processedImage.width,
        height: processedImage.height,
        format: processedImage.format
      }
    };
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw new Error(`Image analysis failed: ${error.message}`);
  }
}

async function analyzeImageWithGroq(
  imageBase64: string, 
  analysisType: 'basic' | 'comprehensive',
  apiKey: string
) {
  const model = analysisType === 'basic' ? 'compound-beta-mini' : 'compound-beta';
  
  try {
    // Prepare the prompt with specific instructions for image analysis
    const systemPrompt = `Analyze this image in detail. Identify:
      1. Main objects and subjects
      2. Text content visible in the image
      3. Context and scene description
      4. Key visual elements for search
      Respond with JSON in this format: { 
        "objects": [{"name": string, "confidence": number}], 
        "text": string, 
        "scene": string, 
        "searchTerms": string[] 
      }`;

    // Construct the request to Groq Compound Beta
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this image for visual search."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  } catch (error) {
    console.error("Error analyzing image with Groq:", error);
    throw new Error(`Groq image analysis failed: ${error.message}`);
  }
}

function generateSearchQueries(analysisResults: any): string[] {
  const queries: string[] = [];
  
  // Add main search term from scene description
  if (analysisResults.scene) {
    queries.push(analysisResults.scene);
  }
  
  // Add objects as search terms
  if (analysisResults.objects && analysisResults.objects.length > 0) {
    // Sort by confidence and take top 3
    const topObjects = [...analysisResults.objects]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(obj => obj.name);
    
    queries.push(...topObjects);
  }
  
  // Add explicit search terms if provided
  if (analysisResults.searchTerms && analysisResults.searchTerms.length > 0) {
    queries.push(...analysisResults.searchTerms);
  }
  
  // Add text content if present
  if (analysisResults.text) {
    queries.push(analysisResults.text);
  }
  
  // Deduplicate and return
  return [...new Set(queries)];
}
```

### 3. Processing and Search Layer

```typescript
// server/routes/image-search.ts

import { Router } from 'express';
import multer from 'multer';
import { analyzeImage } from '../services/imageAnalysisService';
import { tavilySearch } from '../tavilySearch';
import { storage } from '../storage';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload image for search
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    const analysisType = req.body.analysisType || 'basic';
    const userId = req.user?.id || null;
    
    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Analyze image
    const analysis = await analyzeImage(file.buffer, userId, { 
      analysisType: analysisType as 'basic' | 'comprehensive' 
    });
    
    // Perform search with the generated queries
    const searchPromises = analysis.searchQueries.slice(0, 3).map(query => 
      tavilySearch(query, process.env.TAVILY_API_KEY || '')
    );
    const searchResults = await Promise.all(searchPromises);
    
    // Merge and rank results
    const mergedResults = mergeSearchResults(searchResults, analysis);
    
    // Update database record if available
    if (analysis.imageId) {
      await storage.updateImageSearchAnalysis(analysis.imageId, {
        searchResults: mergedResults,
        processingStatus: 'completed',
        modelUsed: analysisType === 'basic' ? 'compound-beta-mini' : 'compound-beta'
      });
    }
    
    res.json({
      analysis: analysis.analysisResults,
      searchResults: mergedResults,
      metadata: analysis.metadata,
      imageId: analysis.imageId
    });
  } catch (error) {
    console.error('Error processing image search:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search by image URL
router.post('/url', async (req, res) => {
  try {
    const { url, analysisType } = req.body;
    const userId = req.user?.id || null;
    
    if (!url) {
      return res.status(400).json({ error: 'No image URL provided' });
    }
    
    // Fetch image from URL
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch image from URL' });
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Process same as upload
    const analysis = await analyzeImage(imageBuffer, userId, { 
      analysisType: analysisType || 'basic' 
    });
    
    // Rest of processing identical to upload route...
    // (Search with Tavily, merge results, update database)
    
    res.json({
      analysis: analysis.analysisResults,
      // Additional processing results...
    });
  } catch (error) {
    console.error('Error processing image URL search:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent image searches for user
router.get('/recent', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const recentSearches = await storage.getUserImageSearches(userId);
    res.json({ searches: recentSearches });
  } catch (error) {
    console.error('Error fetching recent image searches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to merge search results from multiple queries
function mergeSearchResults(searchResults: any[], analysis: any) {
  // Flatten all results
  const allResults = searchResults.flatMap(result => result.results || []);
  
  // Score and deduplicate results
  const seenUrls = new Set();
  const scoredResults = allResults
    .map(result => {
      // Skip if URL has been seen
      if (seenUrls.has(result.url)) return null;
      seenUrls.add(result.url);
      
      // Calculate relevance score
      let relevanceScore = result.score || 0;
      
      // Check for keyword matches with objects in image
      if (analysis.analysisResults.objects) {
        analysis.analysisResults.objects.forEach((obj: any) => {
          if (
            result.title.toLowerCase().includes(obj.name.toLowerCase()) || 
            result.content.toLowerCase().includes(obj.name.toLowerCase())
          ) {
            relevanceScore += obj.confidence * 0.5; // Weighted boost
          }
        });
      }
      
      // Prioritize results that match the scene description
      if (
        analysis.analysisResults.scene && 
        (result.title.toLowerCase().includes(analysis.analysisResults.scene.toLowerCase()) || 
         result.content.toLowerCase().includes(analysis.analysisResults.scene.toLowerCase()))
      ) {
        relevanceScore += 0.5;
      }
      
      return {
        ...result,
        calculatedScore: relevanceScore
      };
    })
    .filter(Boolean) // Remove nulls
    .sort((a, b) => b.calculatedScore - a.calculatedScore);
  
  return scoredResults;
}

export default router;
```

### 4. Frontend Implementation

#### Main Page Component

```typescript
// client/src/pages/tools/ImageSearch.tsx

import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from '@/components/tools/image-search/ImageUploader';
import { ImageAnalysisResult } from '@/components/tools/image-search/ImageAnalysisResult';
import { ImageSearchResults } from '@/components/tools/image-search/ImageSearchResults';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from '@/hooks/use-auth';

export default function ImageSearchPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  
  const handleImageSelected = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      // Default to basic for free users, comprehensive for paid
      const analysisType = user?.tier === 'free' ? 'basic' : 'comprehensive';
      formData.append('analysisType', analysisType);
      
      const response = await fetch('/api/tools/image-search/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error processing image');
      }
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageURL = async (url: string) => {
    setLoading(true);
    try {
      const analysisType = user?.tier === 'free' ? 'basic' : 'comprehensive';
      
      const response = await fetch('/api/tools/image-search/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          analysisType
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error processing image URL');
      }
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegionSelect = (region: any) => {
    setSelectedRegion(region);
    // Additional logic for region-specific analysis
  };
  
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Image Search</h1>
      
      {!results && (
        <div className="max-w-2xl mx-auto">
          <ImageUploader 
            onImageSelected={handleImageSelected}
            onImageURL={handleImageURL}
          />
        </div>
      )}
      
      {loading && (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-[300px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
          </div>
        </div>
      )}
      
      {results && !loading && (
        <div className="mt-8">
          <Tabs defaultValue="combined" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="combined">Combined View</TabsTrigger>
              <TabsTrigger value="analysis">Image Analysis</TabsTrigger>
              <TabsTrigger value="results">Search Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="combined">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ImageAnalysisResult 
                  analysis={results.analysis}
                  metadata={results.metadata}
                  onRegionSelect={handleRegionSelect}
                />
                <ImageSearchResults 
                  results={results.searchResults}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="analysis">
              <ImageAnalysisResult 
                analysis={results.analysis}
                metadata={results.metadata}
                onRegionSelect={handleRegionSelect}
                fullWidth
              />
            </TabsContent>
            
            <TabsContent value="results">
              <ImageSearchResults 
                results={results.searchResults}
                fullWidth
              />
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 flex justify-between">
            <button 
              onClick={() => setResults(null)}
              className="px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              New Search
            </button>
            
            {user && (
              <button 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                onClick={() => {
                  // Save to research dashboard logic
                }}
              >
                Save to Research Dashboard
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 5. Route Registration

```typescript
// server/routes.ts (addition to existing file)

import imageSearchRouter from './routes/image-search';

// Inside registerRoutes function:
app.use('/api/tools/image-search', imageSearchRouter);
```

## Integration with Other Tools

### 1. Research Dashboard Integration

```typescript
// client/src/components/tools/research-dashboard/AddImageSearch.tsx

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AddImageSearchProps {
  projectId: number;
  onAdd: () => void;
}

export function AddImageSearch({ projectId, onAdd }: AddImageSearchProps) {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchRecentSearches();
  }, []);
  
  const fetchRecentSearches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tools/image-search/recent');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent image searches');
      }
      
      const data = await response.json();
      setSearches(data.searches || []);
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
  
  const handleAddToProject = async () => {
    if (!selectedId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemType: 'image-search',
          itemId: selectedId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add image search to project');
      }
      
      toast({
        title: "Success",
        description: "Image search added to project"
      });
      
      onAdd();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  // Component rendering logic...
}
```

### 2. Citation Generator Integration

```typescript
// client/src/components/tools/citation-generator/ImageSourceCitation.tsx

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ImageSourceCitationProps {
  imageId: number;
  onGenerate: (citation: any) => void;
}

export function ImageSourceCitation({ imageId, onGenerate }: ImageSourceCitationProps) {
  const [style, setStyle] = useState('apa');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const generateCitation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tools/citation-generator/image-source`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageSearchId: imageId,
          style
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate citation');
      }
      
      const data = await response.json();
      onGenerate(data.citation);
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
  
  // Component rendering logic...
}
```

## Security Considerations

1. **Image Validation**:
   - Strict MIME type checking
   - File size limits (10MB)
   - Image sanitization to prevent attacks

2. **Request Limitations**:
   - Rate limiting by user tier
   - Processing queue for multiple requests
   - Timeouts for external API calls

3. **Data Storage**:
   - Store image hashes, not raw images
   - Proper user access control for stored results
   - Automatic data expiration for inactive users

## Performance Optimization

1. **Image Processing**:
   - Client-side image resizing before upload
   - Server-side optimizations for large images
   - Caching of processed images by hash

2. **API Interaction**:
   - Parallel processing for multiple search queries
   - Debounced user interactions
   - Progressive loading of complex results

3. **UI Performance**:
   - Lazy loading of components
   - Skeleton loaders during processing
   - Virtual scrolling for large result sets

## Testing Plan

1. **Unit Tests**:
   - Image processing functions
   - Search query generation
   - Result ranking algorithms

2. **Integration Tests**:
   - API endpoint functionality
   - Database interactions
   - External service integration

3. **User Testing**:
   - Upload functionality across devices
   - Result quality and relevance
   - Performance with various image types

## Implementation Phases

### Phase 1: Core Framework (Weeks 1-2)

1. Implement basic image upload and URL input
2. Create image processing service
3. Integrate with Compound Beta Mini for basic analysis
4. Implement simple search using generated terms
5. Create basic results display

### Phase 2: Enhanced Functionality (Weeks 3-4)

1. Add comprehensive analysis with Compound Beta
2. Implement region selection functionality
3. Enhance result ranking and relevance scoring
4. Add user history and saved searches

### Phase 3: Advanced Features (Weeks 5-6)

1. Integrate with Research Dashboard and Citation Generator
2. Implement advanced filtering and categorization
3. Add performance optimizations
4. Enhance error handling and edge cases

## Conclusion

The Image Search feature will provide users with a powerful way to search using visual inputs, leveraging our AI models to extract meaningful information from images and generate relevant search queries. This implementation plan provides a comprehensive approach to developing the feature, with a focus on performance, user experience, and integration with other Lemur tools.