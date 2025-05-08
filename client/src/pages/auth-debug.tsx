import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function AuthDebug() {
  const { user, loginMutation, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authResponse, setAuthResponse] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await loginMutation.mutateAsync({ username, password });
      setAuthResponse(response);
      toast({
        title: "Login API Response",
        description: "Check the debug output below",
      });
    } catch (error) {
      setAuthResponse({ error: String(error) });
      toast({
        title: "Login failed",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setAuthResponse(null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  // Test direct API calls
  const testApiUser = async () => {
    try {
      const response = await fetch("/api/user", {
        credentials: "include",
      });
      const data = response.ok ? await response.json() : { status: response.status, statusText: response.statusText };
      setAuthResponse(data);
      toast({
        title: "API Test Response",
        description: response.ok ? "User data fetched" : `Error: ${response.status} ${response.statusText}`,
        variant: response.ok ? "default" : "destructive",
      });
    } catch (error) {
      setAuthResponse({ error: String(error) });
      toast({
        title: "API test failed",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  // Test direct API calls only
  const testAdvancedApiOptions = async () => {
    try {
      // Just a basic test to verify API connectivity
      const response = await fetch("/api/user", {
        credentials: "include",
      });
      const data = response.ok ? await response.json() : { status: response.status, statusText: response.statusText };
      setAuthResponse({
        user: data,
        timestamp: new Date().toISOString(),
        message: "User API test completed successfully"
      });
      toast({
        title: "API Connection",
        description: response.ok ? "Connected to API successfully" : `Error: ${response.status} ${response.statusText}`,
        variant: response.ok ? "default" : "destructive",
      });
    } catch (error) {
      setAuthResponse({ error: String(error) });
      toast({
        title: "API connection test failed",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto mt-10 px-4 max-w-2xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Authentication Debug</CardTitle>
          <CardDescription>
            Test authentication endpoints and troubleshoot login issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
            <h3 className="font-semibold mb-2">Current Auth State:</h3>
            <pre className="whitespace-pre-wrap text-sm">
              {user ? JSON.stringify(user, null, 2) : "Not authenticated"}
            </pre>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div>
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mb-2"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
              <Button type="button" variant="secondary" onClick={testApiUser}>
                Test API/User
              </Button>
              <Button type="button" variant="outline" onClick={testAdvancedApiOptions}>
                Advanced API Test
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col items-start">
          <h3 className="font-semibold mb-2">API Response:</h3>
          <div className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded max-h-64 overflow-auto">
            <pre className="whitespace-pre-wrap text-sm">
              {authResponse ? JSON.stringify(authResponse, null, 2) : "No response yet"}
            </pre>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}