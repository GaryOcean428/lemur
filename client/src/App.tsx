import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import SearchResults from "@/pages/SearchResults";
import AuthPage from "@/pages/auth-page";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/hooks/use-auth";
import { SettingsProvider } from "@/hooks/use-settings";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "@/components/theme-provider";

// Import all the new pages
import AboutPage from "@/pages/about";
import ToolsPage from "@/pages/Tools";
import SettingsPage from "@/pages/settings";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import CookiesPage from "@/pages/cookies";
import DataProcessingPage from "@/pages/data-processing";
import ContactPage from "@/pages/contact";
import HelpPage from "@/pages/help";
import APIPage from "@/pages/api";
import PreferencesPage from "@/pages/preferences";
import SubscriptionPage from "@/pages/subscription";
import SubscriptionSuccessPage from "@/pages/subscription/success";
import ManageSubscriptionPage from "@/pages/manage-subscription";
import AgenticResearchDebug from "@/components/AgenticResearchDebug";
import AuthDebug from "@/pages/auth-debug";
import SearchDebug from "@/pages/search-debug";

function Router() {
  return (
    <Switch>
      {/* Main pages */}
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchResults} />
      
      {/* Auth pages */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/signin" component={AuthPage} />
      
      {/* Info pages */}
      <Route path="/about" component={AboutPage} />
      <Route path="/tools/:tool?" component={ToolsPage} />
      <Route path="/settings" component={SettingsPage} />
      
      {/* User pages */}
      <Route path="/preferences">
        <ProtectedRoute path="/preferences" component={PreferencesPage} />
      </Route>
      
      {/* Legal pages */}
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/cookies" component={CookiesPage} />
      <Route path="/data-processing" component={DataProcessingPage} />
      
      {/* Support pages */}
      <Route path="/contact" component={ContactPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/api" component={APIPage} />
      
      {/* Subscription pages */}
      <Route path="/subscription">
        <ProtectedRoute path="/subscription" component={SubscriptionPage} />
      </Route>
      <Route path="/subscription/success">
        <ProtectedRoute path="/subscription/success" component={SubscriptionSuccessPage} />
      </Route>
      <Route path="/manage-subscription">
        <ProtectedRoute path="/manage-subscription" component={ManageSubscriptionPage} />
      </Route>
      
      {/* Removed Deep Research page - using toggle only */}
      
      {/* Debug pages */}
      <Route path="/debug/agentic-research">
        <ProtectedRoute path="/debug/agentic-research" component={AgenticResearchDebug} />
      </Route>
      <Route path="/debug/auth" component={AuthDebug} />
      <Route path="/debug/search" component={SearchDebug} />
      
      {/* 404 page - must be last */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            <TooltipProvider>
              <Toaster />
              <HotToaster position="top-right" />
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow">
                  <Router />
                </main>
                <Footer />
              </div>
            </TooltipProvider>
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
