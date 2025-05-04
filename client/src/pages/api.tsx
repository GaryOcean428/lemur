import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, ServerIcon, GlobeIcon, PlugIcon, ShieldIcon } from "lucide-react";

export default function APIPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 dark:text-white">API & Protocol Documentation</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Integrate Lemur search capabilities into your applications through our API, MCP, and A2A protocols
        </p>
      </div>

      <Alert className="mb-8 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-300">Documentation</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-400">
          This is a demonstration API documentation page. In a production environment, 
          this would contain complete API references and examples.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="rest" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="rest" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            REST API
          </TabsTrigger>
          <TabsTrigger value="mcp" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            MCP Protocol
          </TabsTrigger>
          <TabsTrigger value="a2a" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            A2A Protocol
          </TabsTrigger>
        </TabsList>

        {/* REST API Tab */}
        <TabsContent value="rest">
          <Card className="dark:bg-gray-800 border-0 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ServerIcon className="mr-2 h-5 w-5 text-purple-600"/> 
                Getting Started with REST API
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The Lemur API gives you programmatic access to search functionality.
                You need an API key to authenticate requests.
              </p>
              <h3 className="text-lg font-semibold mb-2 dark:text-white">Base URL</h3>
              <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded mb-4">
                <code>https://api.lemur-search.com/v1</code>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <GlobeIcon className="mr-2 h-5 w-5 text-purple-600"/> 
                API Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2 dark:text-white">GET /search</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Perform a search with both AI answers and traditional web results.
              </p>
              <h4 className="font-medium mb-2 dark:text-white">Query Parameters</h4>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 dark:text-gray-400">
                <li><strong>q</strong> (string, required): The search query</li>
                <li><strong>mode</strong> (string, optional): Result mode: "all" (default), "ai", or "web"</li>
                <li><strong>limit</strong> (integer, optional): Number of web results to return (1-20, default: 10)</li>
                <li><strong>region</strong> (string, optional): ISO country code for regional results</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MCP Protocol Tab */}
        <TabsContent value="mcp">
          <Card className="dark:bg-gray-800 border-0 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PlugIcon className="mr-2 h-5 w-5 text-purple-600"/> 
                Model Context Protocol (MCP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Bidirectional</Badge>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Open Standard</Badge>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Tool Integration</Badge>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                MCP enables Lemur to connect to diverse data sources and tools while allowing external clients to access Lemur's capabilities. This open standard connects AI assistants to systems where data lives, including content repositories, tools, and development environments.
              </p>

              <h3 className="text-lg font-semibold mb-2 dark:text-white">MCP Server (Being Connected To)</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Lemur exposes the following endpoints for MCP clients:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 dark:text-gray-400 mb-4">
                <li><strong>Tool Discovery</strong>: <code>/.well-known/mcp.json</code></li>
                <li><strong>WebSocket/SSE</strong>: <code>/mcp</code></li>
              </ul>

              <h3 className="text-lg font-semibold mb-2 dark:text-white">Available Tools</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 dark:text-gray-400">
                <li><strong>search</strong>: Core search functionality</li>
                <li><strong>voice_to_text</strong>: Convert audio queries to text</li>
                <li><strong>image_analysis</strong>: Analyze image content for search</li>
                <li><strong>result_formatter</strong>: Format search results</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldIcon className="mr-2 h-5 w-5 text-purple-600"/> 
                MCP Authentication & Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2 dark:text-white">Authentication Methods</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Lemur's MCP implementation supports:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 dark:text-gray-400 mb-4">
                <li><strong>Bearer Token</strong>: OAuth 2.0 tokens</li>
                <li><strong>API Key</strong>: For server-to-server communication</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2 dark:text-white">Security Features</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 dark:text-gray-400">
                <li><strong>Token-based Authentication</strong>: Secure access control</li>
                <li><strong>Tool-level Access Control</strong>: Fine-grained permissions</li>
                <li><strong>Request Validation</strong>: Input validation and sanitization</li>
                <li><strong>Rate Limiting</strong>: Prevent abuse</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* A2A Protocol Tab */}
        <TabsContent value="a2a">
          <Card className="dark:bg-gray-800 border-0 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PlugIcon className="mr-2 h-5 w-5 text-purple-600"/> 
                Agent-to-Agent (A2A) Protocol
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Enterprise-grade</Badge>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Capability Discovery</Badge>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Secure Collaboration</Badge>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                A2A is an open protocol enabling communication between opaque agentic applications, providing enterprise-grade agent ecosystems with capability discovery, user experience negotiation, and secure collaboration.
              </p>

              <h3 className="text-lg font-semibold mb-2 dark:text-white">A2A Agent Details</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Lemur's AgentCard is available at:
              </p>
              <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded mb-4">
                <code>https://api.lemur-search.com/.well-known/agent.json</code>
              </div>

              <h3 className="text-lg font-semibold mb-2 dark:text-white">Capabilities</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 dark:text-gray-400">
                <li><strong>search</strong>: Search the web and synthesize results</li>
                <li><strong>multimodal_input</strong>: Process voice and image inputs</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <GlobeIcon className="mr-2 h-5 w-5 text-purple-600"/> 
                A2A Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2 dark:text-white">AgentCard</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                <code>GET /.well-known/agent.json</code> - Get agent capabilities and metadata
              </p>

              <h3 className="text-lg font-semibold mb-2 dark:text-white">Task Management</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 dark:text-gray-400">
                <li><code>POST /tasks/send</code> - Create a new task</li>
                <li><code>GET /tasks/{'{task_id}'}</code> - Get task status and results</li>
              </ul>
              
              <h3 className="text-lg font-semibold mt-4 mb-2 dark:text-white">Message Format</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                A2A messages support multiple content types including text, images, and audio.  
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
