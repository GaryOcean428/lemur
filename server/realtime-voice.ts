import { WebSocket } from "ws";
import { Express, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { UnifiedSearchService } from "./services/unified-search";

// Define interface for Realtime API session
interface RealtimeSession {
  id: string;
  client: any; // Will be OpenAIRealtimeWS
  socket: WebSocket;
  lastActivity: number;
}

// Active sessions storage
const activeSessions: Map<string, RealtimeSession> = new Map();

// Function to clean up inactive sessions
const cleanupInactiveSessions = () => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes
  
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.lastActivity > timeout) {
      console.log(`Closing inactive session ${id}`);
      try {
        session.client.close();
        session.socket.close();
        activeSessions.delete(id);
      } catch (error) {
        console.error(`Error closing session ${id}:`, error);
      }
    }
  }
};

// Cleanup every minute
setInterval(cleanupInactiveSessions, 60 * 1000);

// Basic search function as fallback
async function performBasicSearch(query: string, apiKey: string): Promise<any[]> {
  try {
    const { tavilySearch } = await import("./routes");
    const searchResults = await tavilySearch(query, apiKey, {
      search_depth: "basic",
      max_results: 5
    });
    
    return searchResults.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      content: result.content.substring(0, 300) + "..."
    }));
  } catch (error) {
    console.error("Error performing search:", error);
    return [];
  }
}

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

  // Set up WebSocket server for real-time voice
  const wss = new WebSocket.Server({ noServer: true });
  
  // Handle WebSocket upgrade requests
  httpServer.on("upgrade", (request: any, socket: any, head: any) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    
    if (pathname.startsWith('/api/voice/ws/')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });
  
  // Handle WebSocket connections
  wss.on('connection', async (ws, request) => {
    try {
      // Extract session ID from URL
      const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
      const sessionId = pathname.split('/').pop();
      
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
      
      const { openaiApiKey, tavilyApiKey, groqApiKey } = sessionData;
      
      // Note: This is where we would initialize OpenAI's Realtime API
      // const realtimeClient = await OpenAIRealtimeWS.createSession({...})
      // 
      // For now, let's create a mock implementation
      const mockRealtimeClient = {
        async sendMessage(message: any) {
          console.log("Mock sending message:", message);
          return true;
        },
        async close() {
          console.log("Mock closing client");
          return true;
        }
      };
      
      console.log(`Realtime session created: ${sessionId}`);
      
      // Store session
      activeSessions.set(sessionId, {
        id: sessionId,
        client: mockRealtimeClient,
        socket: ws,
        lastActivity: Date.now()
      });
      
      // Handle WebSocket messages from client (audio data)
      ws.on('message', async (message) => {
        try {
          // Update last activity timestamp
          const session = activeSessions.get(sessionId);
          if (!session) return;
          
          session.lastActivity = Date.now();
          
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
      ws.on('close', async () => {
        try {
          console.log(`WebSocket closed for session ${sessionId}`);
          
          // Clean up session
          const session = activeSessions.get(sessionId);
          if (session) {
            await session.client.close();
            activeSessions.delete(sessionId);
          }
          
          // Clean up session data
          (request as any).sessionStore?.destroy(sessionId);
        } catch (error) {
          console.error(`Error cleaning up session ${sessionId}:`, error);
        }
      });
      
    } catch (error) {
      console.error("Error establishing WebSocket connection:", error);
      ws.close(1011, "Internal server error");
    }
  });
  
  return wss;
}
