import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function APIPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 dark:text-white">API Documentation</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Integrate Lemur search capabilities into your applications
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

      <Card className="dark:bg-gray-800 border-0 shadow-lg mb-8">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
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
          <CardTitle>API Endpoints</CardTitle>
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
    </div>
  );
}
