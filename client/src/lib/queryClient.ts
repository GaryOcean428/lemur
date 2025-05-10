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

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "omit", // 'include' is for cookies, not typically used with Bearer tokens
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

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "omit", // 'include' is for cookies, not typically used with Bearer tokens
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
