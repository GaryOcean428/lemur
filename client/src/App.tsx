import { Router, Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import Home from "@/pages/Home";
import SearchResults from "@/pages/SearchResults";
import DeepResearchPage from "@/pages/DeepResearchPage";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Header />
            <Router>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/search" component={SearchResults} />
                <Route path="/deep-research" component={DeepResearchPage} />
              </Switch>
            </Router>
            <Toaster />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
