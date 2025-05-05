import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { storage } from "./storage";
import { TavilySearchResult } from "./routes";

// Initialize OpenAI API client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer for file uploads - using import.meta.url instead of __dirname for ES modules
const currentDir = path.dirname(new URL(import.meta.url).pathname);
const uploadsDir = path.join(currentDir, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    // Create separate directories for audio and image uploads
    const fileType = file.fieldname === 'audio' ? 'audio' : 'images';
    const destDir = path.join(uploadsDir, fileType);
    
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    cb(null, destDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename with original extension
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    cb(null, uniqueFilename);
  }
});

export const upload = multer({ 
  storage: storage_multer,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB limit
  }
});

// Set up interface for image search results stored in memory
export interface ImageSearchResult {
  id: string;
  query: string;
  timestamp: Date;
  userId?: number;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  results?: any;
}

// In-memory storage for image search results (temporary solution)
export const imageSearchResults = new Map<string, ImageSearchResult>();

// Function to handle voice transcription requests
export async function handleVoiceTranscription(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }
    
    console.log("Received audio file for transcription:", req.file.path);
    
    // Access to file is via req.file.path
    const audioFilePath = req.file.path;
    
    // Use OpenAI's Whisper model for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: "whisper-1",
      language: "en", // Specify English for better accuracy
      response_format: "json"
    });
    
    console.log("Transcription result:", transcription.text);
    
    // Save the transcription to search history if user is authenticated
    if (req.isAuthenticated() && transcription.text.trim()) {
      try {
        await storage.createSearchHistory({
          query: transcription.text,
          userId: req.user.id
        });
      } catch (historyError) {
        console.error("Error saving voice search to history:", historyError);
        // Continue anyway - this is non-critical
      }
    }
    
    // Return the transcribed text
    res.json({ 
      text: transcription.text,
      confidence: 0.9 // Default confidence value since Whisper doesn't provide one
    });
    
    // Clean up the uploaded file to save disk space
    try {
      fs.unlinkSync(audioFilePath);
    } catch (unlinkError) {
      console.error("Error deleting audio file:", unlinkError);
    }
    
  } catch (error) {
    console.error("Error transcribing audio:", error);
    res.status(500).json({ 
      error: "Failed to transcribe audio", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}

// Function to handle image search requests
export async function handleImageSearch(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    
    console.log("Received image file for search:", req.file.path);
    
    // Generate a unique ID for this image search
    const searchId = uuidv4();
    
    // Create a record of this search request
    const searchResult: ImageSearchResult = {
      id: searchId,
      query: "image search", // Default query for image search
      timestamp: new Date(),
      userId: req.isAuthenticated() ? req.user.id : undefined,
      status: 'processing'
    };
    
    // Store in memory for now
    imageSearchResults.set(searchId, searchResult);
    
    // Start processing the image asynchronously
    processImageSearch(searchId, req.file.path, req.isAuthenticated() ? req.user : null)
      .catch(error => {
        console.error(`Error processing image search ${searchId}:`, error);
        const result = imageSearchResults.get(searchId);
        if (result) {
          result.status = 'failed';
          result.error = error instanceof Error ? error.message : 'Unknown error';
          imageSearchResults.set(searchId, result);
        }
      });
    
    // Return immediately with the search ID
    res.status(202).json({ 
      searchId,
      message: "Image search processing has started" 
    });
    
  } catch (error) {
    console.error("Error starting image search:", error);
    res.status(500).json({ 
      error: "Failed to process image search", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}

// Function to get image search results
export async function getImageSearchResults(req: Request, res: Response) {
  try {
    const searchId = req.params.searchId;
    const searchResult = imageSearchResults.get(searchId);
    
    if (!searchResult) {
      return res.status(404).json({ error: "Image search not found" });
    }
    
    // Return the current status and results if available
    res.json(searchResult);
    
  } catch (error) {
    console.error("Error retrieving image search results:", error);
    res.status(500).json({ 
      error: "Failed to retrieve image search results", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}

// Helper function to process image search asynchronously
async function processImageSearch(searchId: string, imagePath: string, user: any) {
  try {
    // 1. Analyze the image with OpenAI Vision API to generate a text description
    const imageB64 = fs.readFileSync(imagePath).toString('base64');
    
    const imageAnalysis = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that analyzes images and converts them into detailed search queries."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "What's in this image? Generate a detailed search query that would help find information about the main subject. Be specific and descriptive." },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageB64}` }
            }
          ]
        }
      ],
      max_tokens: 300
    });
    
    const generatedQuery = imageAnalysis.choices[0].message.content;
    console.log(`Generated search query from image: ${generatedQuery}`);
    
    // Update the search record with the generated query
    const searchResult = imageSearchResults.get(searchId);
    if (searchResult) {
      searchResult.query = generatedQuery || 'Image analysis';
      imageSearchResults.set(searchId, searchResult);
    }
    
    // 2. Import tavilySearch and groqSearch
    // These are imported at runtime to avoid circular dependencies
    const { tavilySearch, groqSearch } = await import('./routes');
    
    // 3. Perform a search using Tavily API for web results
    if (!process.env.TAVILY_API_KEY) {
      throw new Error("Missing Tavily API key for image search");
    }
    
    const tavilyResponse = await tavilySearch(
      generatedQuery || 'Image analysis', 
      process.env.TAVILY_API_KEY,
      { search_depth: "advanced", max_results: 15, include_images: true }
    );
    
    // 4. Process the results with Groq
    let aiAnswer = "";
    let modelUsed = "";
    
    if (process.env.GROQ_API_KEY) {
      const groqResponse = await groqSearch(
        generatedQuery || 'Image analysis',
        tavilyResponse.results,
        process.env.GROQ_API_KEY,
        "comprehensive" // Always use the comprehensive model for image searches
      );
      
      aiAnswer = groqResponse.answer;
      modelUsed = groqResponse.model;
    } else {
      aiAnswer = `Based on the image, I searched for "${generatedQuery || 'the image content'}". Here are the results...

Note: AI answer is limited because Groq API key is missing.`;
      modelUsed = "unavailable";
    }
    
    // 5. Update the search results
    if (searchResult) {
      searchResult.status = 'completed';
      searchResult.results = {
        traditional: tavilyResponse.results,
        ai: {
          answer: aiAnswer,
          sources: tavilyResponse.results.map((result: TavilySearchResult, index: number) => ({
            title: result.title,
            url: result.url,
            domain: new URL(result.url).hostname
          })),
          model: modelUsed
        }
      };
      imageSearchResults.set(searchId, searchResult);
    }
    
    // 4. Save to user's search history if authenticated
    if (user && user.id) {
      try {
        await storage.createSearchHistory({
          query: generatedQuery || 'Image analysis',
          userId: user.id
        });
      } catch (historyError) {
        console.error("Error saving image search to history:", historyError);
        // Continue anyway - this is non-critical
      }
    }
    
    // Clean up the uploaded file to save disk space
    try {
      fs.unlinkSync(imagePath);
    } catch (unlinkError) {
      console.error("Error deleting image file:", unlinkError);
    }
    
    console.log(`Image search ${searchId} processing completed successfully`);
    
  } catch (error) {
    console.error(`Error processing image search ${searchId}:`, error);
    
    // Update the search record with error information
    const searchResult = imageSearchResults.get(searchId);
    if (searchResult) {
      searchResult.status = 'failed';
      searchResult.error = error instanceof Error ? error.message : 'Unknown error';
      imageSearchResults.set(searchId, searchResult);
    }
    
    // Re-throw so the caller can handle it
    throw error;
  }
}
