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
      
      // Handle WebSocket messages from client (audio data)
      ws.on('message', async (message) => {
        try {
          // Parse message
          const data = JSON.parse(message.toString());
          
          if (data.type === 'search') {
            // Handle search request
            const query = data.query;
            
            try {
              // Use the unified search service
              const searchResult = await unifiedSearchService.performDecomposedSearch({
                initialQuery: query,
                maxDepth: 3,
                tavilyApiKey,
                groqApiKey,
                modelPreference: "comprehensive",
                useRealtimeApi: false
              });
              
              // Send back search results
              ws.send(JSON.stringify({
                type: 'search_results',
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
              
              // Log the search to user's history if authenticated
              const userId = sessionData.userId;
              if (userId) {
                await storage.createSearchHistory({
                  query,
                  userId
                });
              }
              
            } catch (error) {
              console.error(`Error processing search for "${query}":`, error);
              ws.send(JSON.stringify({
                type: 'error',
                error: 'Failed to process search'
              }));
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
