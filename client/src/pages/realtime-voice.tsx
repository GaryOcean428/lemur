import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import VoiceSearch from "@/components/voice/VoiceSearch";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SubscriptionPrompt from "@/components/SubscriptionPrompt";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function RealtimeVoicePage() {
  const { user } = useAuth();
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  
  // Check if user has appropriate subscription for realtime voice
  const canUseVoiceSearch = user && user.subscriptionTier === 'pro';
  
  useEffect(() => {
    // Show subscription prompt if not logged in or not subscribed to Pro
    if (!canUseVoiceSearch) {
      setShowSubscriptionPrompt(true);
    }
  }, [canUseVoiceSearch]);
  
  // Handle voice search results
  const handleSearchComplete = (result: any) => {
    console.log("Voice search complete:", result);
    // Here you could route to search results page with these results
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Real-time Voice Search</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Search with your voice using our advanced real-time voice processing technology. Ask complex questions and get comprehensive answers instantly.
          </p>
          
          {!canUseVoiceSearch && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8 flex items-center max-w-2xl">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 shrink-0" />
              <p className="text-sm">
                Real-time voice search requires a Pro subscription. Upgrade your account to access this premium feature.
              </p>
            </div>
          )}
        </div>
        
        <div className="max-w-2xl mx-auto bg-card rounded-xl border shadow-sm p-6">
          {canUseVoiceSearch ? (
            <VoiceSearch onSearchComplete={handleSearchComplete} />
          ) : (
            <div className="text-center p-8">
              <h3 className="text-xl font-semibold mb-4">Upgrade to Pro</h3>
              <p className="text-muted-foreground mb-6">Get access to real-time voice search and other premium features with a Pro subscription.</p>
              <Button onClick={() => setShowSubscriptionPrompt(true)}>
                Upgrade Now
              </Button>
            </div>
          )}
        </div>
        
        <div className="mt-12 space-y-8">
          <section className="bg-muted/30 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">How Voice Search Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-background rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium mb-2">1. Speak Naturally</h3>
                <p className="text-muted-foreground">Ask questions in your natural voice. Our system understands conversational language.</p>
              </div>
              <div className="bg-background rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium mb-2">2. Instant Processing</h3>
                <p className="text-muted-foreground">Your question is processed in real-time, searching thousands of sources.</p>
              </div>
              <div className="bg-background rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium mb-2">3. Voice Response</h3>
                <p className="text-muted-foreground">Receive a comprehensive answer both in text and voice formats.</p>
              </div>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">Try These Examples</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 hover:bg-accent hover:text-accent-foreground transition-colors">
                <p>"What are the latest developments in AI and their ethical implications?"</p>
              </div>
              <div className="border rounded-lg p-4 hover:bg-accent hover:text-accent-foreground transition-colors">
                <p>"How does climate change affect agriculture in Australia?"</p>
              </div>
              <div className="border rounded-lg p-4 hover:bg-accent hover:text-accent-foreground transition-colors">
                <p>"Explain the current state of quantum computing technology."</p>
              </div>
              <div className="border rounded-lg p-4 hover:bg-accent hover:text-accent-foreground transition-colors">
                <p>"What are the best practices for sustainable urban planning?"</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      <Footer />
      
      <SubscriptionPrompt 
        open={showSubscriptionPrompt} 
        onOpenChange={setShowSubscriptionPrompt}
        message="Upgrade to Pro to access our advanced real-time voice search feature"
        showSignInOption={!user}
      />
    </div>
  );
}
