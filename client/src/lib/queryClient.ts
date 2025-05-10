import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "@/firebaseConfig"; // Corrected import path
import { getIdToken } from "firebase/auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  if (auth.currentUser) {
    try {
      const token = await getIdToken(auth.currentUser);
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting ID token:", error);
      // Optionally handle token error, e.g., by redirecting to login
    }
  }

  // Handle API base URL
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  // If the URL is a relative API path and we have a base URL, prepend it
  let fullUrl = url;
  if (url.startsWith('/api/') && apiBaseUrl) {
    // Remove the /api prefix as the base URL may already include it
    const apiPath = url.substring(5);
    fullUrl = `${apiBaseUrl}/${apiPath}`;
    console.log(`Rewriting API URL from ${url} to ${fullUrl}`);
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Changed to include credentials for cross-origin requests
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: HeadersInit = {};
    if (auth.currentUser) {
      try {
        const token = await getIdToken(auth.currentUser);
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error("Error getting ID token for queryFn:", error);
      }
    }

    // Handle API base URL like in the apiRequest function
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
    let url = queryKey[0] as string;
    
    // If the URL is a relative API path and we have a base URL, prepend it
    if (url.startsWith('/api/') && apiBaseUrl) {
      // Remove the /api prefix as the base URL may already include it
      const apiPath = url.substring(5);
      url = `${apiBaseUrl}/${apiPath}`;
      console.log(`Rewriting API URL from ${queryKey[0]} to ${url}`);
    }

    const res = await fetch(url, {
      headers,
      credentials: "include", // Changed to match apiRequest for cross-origin requests
    });

    if (res.status === 401) {
      // Don't log 401 errors for API endpoints that are expected to return 401 when not logged in
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
