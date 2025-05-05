import { WebSocketServer } from 'ws';
import { Express, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { UnifiedSearchService } from "./services/unified-search";

// Create instance of UnifiedSearchService
const unifiedSearchService = new UnifiedSearchService();

// Register realtime voice routes
export async function registerRealtimeVoiceRoutes(app: Express, httpServer: any) {
  // Endpoint to create a new realtime session
  app.post("/api/voice/session", async (req: Request, res: Response) => {
    try {
      // Check if user has proper subscription
      if (req.isAuthenticated()) {
        const userTier = req.user.subscriptionTier;
        if (userTier !== 'pro') {
          return res.status(403).json({
            message: "Realtime voice search requires a Pro subscription"
          });
        }
      } else {
        return res.status(401).json({
          message: "Authentication required for voice search"
        });
      }

      // Get API keys from environment
      const openaiApiKey = process.env.OPENAI_API_KEY;
      const tavilyApiKey = process.env.TAVILY_API_KEY;
      const groqApiKey = process.env.GROQ_API_KEY;
      
      if (!openaiApiKey) {
        return res.status(500).json({ message: "OpenAI API key not configured" });
      }
      
      if (!tavilyApiKey || !groqApiKey) {
        return res.status(500).json({ message: "Search API keys not configured" });
      }

      // Generate a session ID
      const sessionId = `voice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Return session details to client
      res.json({
        session_id: sessionId,
        websocket_url: `ws://${req.headers.host}/api/voice/ws/${sessionId}`
      });
      
      // Store session data (in a production environment, use a more secure approach)
      (req as any).sessionStore?.set(sessionId, {
        openaiApiKey,
        tavilyApiKey,
        groqApiKey,
        userId: req.isAuthenticated() ? req.user.id : null
      });
      
    } catch (error) {
      console.error("Error creating voice session:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An error occurred creating voice session"
      });
    }
  });

  // Set up WebSocket handling
  const wsServer = new WebSocketServer({ noServer: true });
  
  // Handle WebSocket upgrade requests
  httpServer.on("upgrade", (request: any, socket: any, head: any) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    
    if (pathname.startsWith('/api/voice/ws/')) {
      wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit('connection', ws, request);
      });
    }
  });
  
  // Handle WebSocket connections
  wsServer.on('connection', (ws, request) => {
    try {
      // Extract session ID from URL
      const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
      const sessionId = pathname.split('/').pop() || '';
      
      if (!sessionId) {
        ws.close(1008, "Invalid session ID");
        return;
      }
      
      // Get session data
      const sessionData = (request as any).sessionStore?.get(sessionId);
      if (!sessionData) {
        ws.close(1008, "Session not found");
        return;
      }
      
      const { tavilyApiKey, groqApiKey } = sessionData;
      
      console.log(`Realtime session created: ${sessionId}`);
      
            // State for transcription buffering and realtime processing
      let transcriptionBuffer = '';
      let isSearchInProgress = false;
      let lastTranscriptionTime = Date.now();
      let audioChunks: Buffer[] = [];
      let lastSearchQuery = '';
      
      // OpenAI API client
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: sessionData.openaiApiKey });

      // Handle WebSocket messages from client (audio data)
      ws.on('message', async (message) => {
        try {
          // Parse message
          const data = JSON.parse(message.toString());
          
          if (data.type === 'audio') {
            // Handle streaming audio data
            const audioBuffer = Buffer.from(data.buffer, 'base64');
            audioChunks.push(audioBuffer);
            
            // Process audio chunks periodically for real-time transcription
            const now = Date.now();
            if (now - lastTranscriptionTime > 1000) { // Process every second
              lastTranscriptionTime = now;
              
              if (audioChunks.length > 0) {
                try {
                  // Combine audio chunks for transcription
                  const combinedAudio = Buffer.concat(audioChunks);
                  audioChunks = []; // Reset for next batch
                  
                  // Create a temporary file for the audio data
                  const fs = require('fs');
                  const tempFilePath = `/tmp/audio-${Date.now()}.webm`;
                  fs.writeFileSync(tempFilePath, combinedAudio);
                  
                  // Use OpenAI's Whisper API for transcription
                  const transcription = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(tempFilePath),
                    model: "whisper-1",
                  });
                  
                  // Clean up temp file
                  fs.unlinkSync(tempFilePath);
                  
                  if (transcription.text && transcription.text.trim() !== '') {
                    // Append to transcription buffer
                    transcriptionBuffer += ' ' + transcription.text;
                    transcriptionBuffer = transcriptionBuffer.trim();
                    
                    // Send transcription back to client
                    ws.send(JSON.stringify({
                      type: 'transcription',
                      text: transcriptionBuffer
                    }));
                    
                    // If we have enough text and no search is in progress, trigger a search
                    if (transcriptionBuffer.length > 15 && !isSearchInProgress && 
                        transcriptionBuffer !== lastSearchQuery) {
                      // Start a partial search while user is still speaking
                      isSearchInProgress = true;
                      const partialQuery = transcriptionBuffer;
                      
                      try {
                        console.log(`Starting real-time partial search for: "${partialQuery}"`);
                        
                        // Use the unified search service
                        const searchResult = await unifiedSearchService.performDecomposedSearch({
                          initialQuery: partialQuery,
                          maxDepth: 1, // Reduced depth for partial searches
                          tavilyApiKey,
                          groqApiKey,
                          modelPreference: "fast", // Use faster model for real-time responses
                          useRealtimeApi: true
                        });
                        
                        // Send partial results back to client
                        ws.send(JSON.stringify({
                          type: 'search_results',
                          isPartial: true,
                          data: {
                            query: partialQuery,
                            results: searchResult.searchResults.map(r => ({
                              title: r.title,
                              url: r.url,
                              content: r.content.substring(0, 250) + "..."
                            })),
                            answer: searchResult.synthesizedResponse,
                            model: searchResult.modelUsed
                          }
                        }));
                        
                        lastSearchQuery = partialQuery;
                        
                      } catch (error) {
                        console.error(`Error processing partial search:`, error);
                      } finally {
                        isSearchInProgress = false;
                      }
                    }
                  }
                } catch (transcriptionError) {
                  console.error("Error transcribing audio:", transcriptionError);
                }
              }
            }
          } else if (data.type === 'search') {
            // Handle explicit search request (when user stops speaking)
            const query = data.query || transcriptionBuffer;
            const isPartial = !!data.isPartial;
            
            if (!query || query.trim() === '') {
              return;
            }
            
            try {
              isSearchInProgress = true;
              console.log(`Processing ${isPartial ? 'partial' : 'final'} search: "${query}"`);
              
              // Use the unified search service
              const searchResult = await unifiedSearchService.performDecomposedSearch({
                initialQuery: query,
                maxDepth: isPartial ? 1 : 3, // More depth for final searches
                tavilyApiKey,
                groqApiKey,
                modelPreference: isPartial ? "fast" : "comprehensive",
                useRealtimeApi: isPartial
              });
              
              // Send back search results
              ws.send(JSON.stringify({
                type: 'search_results',
                isPartial,
                data: {
                  query,
                  results: searchResult.searchResults.map(r => ({
                    title: r.title,
                    url: r.url,
                    content: r.content.substring(0, 300) + "..."
                  })),
                  answer: searchResult.synthesizedResponse,
                  model: searchResult.modelUsed
                }
              }));
              
              // Only log final searches
              if (!isPartial) {
                // Reset transcription buffer after a final search
                transcriptionBuffer = '';
                
                // Log the search to user's history if authenticated
                const userId = sessionData.userId;
                if (userId) {
                  await storage.createSearchHistory({
                    query,
                    userId
                  });
                }
              }
              
            } catch (error) {
              console.error(`Error processing search for "${query}":`, error);
              ws.send(JSON.stringify({
                type: 'error',
                error: 'Failed to process search'
              }));
            } finally {
              isSearchInProgress = false;
            }
          }
          
        } catch (error) {
          console.error(`Error handling WebSocket message:`, error);
        }
      });
      
      // Handle WebSocket close
      ws.on('close', () => {
        console.log(`WebSocket closed for session ${sessionId}`);
      });
      
    } catch (error) {
      console.error("Error establishing WebSocket connection:", error);
      ws.close(1011, "Internal server error");
    }
  });
  
  return wsServer;
}
