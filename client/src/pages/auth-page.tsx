import { useEffect } from "react";
import { useLocation } from "wouter";
import { AuthForm } from "@/components/AuthForm"; // Import the new AuthForm
import { useAuth } from "@/hooks/use-auth";
import lemurLogo from "../assets/images/Lemur6.png";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";


const AuthPage = () => {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth(); // isLoading from useAuth can be used

  useEffect(() => {
    if (user && !isLoading) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const handleAuthSuccess = () => {
    navigate("/"); // Navigate to home on successful auth
  };

  // If loading or user is already defined (and redirect is about to happen),
  // you might want to show a loader or null to prevent form flash.
  if (isLoading || user) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <p>Loading...</p> {/* Or a spinner component */}
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10 flex justify-center items-center min-h-[calc(100vh-200px)]">
      {/* The AuthForm component will be rendered as a modal overlay by its own definition */}
      {/* We can keep the surrounding page structure if desired, or simplify */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start max-w-4xl w-full">
        {/* Left Column: Auth Forms (now handled by modal AuthForm) */}
        {/* We can keep the welcome card here or integrate it into a layout where AuthForm is modal */}
        <Card className="w-full lg:col-span-2"> {/* Make card span full width if AuthForm is modal */}
          <CardHeader className="flex flex-col items-center text-center">
            <div className="w-10 h-10 mb-2 relative group">
              <div className="absolute -inset-2 bg-[hsl(var(--glow-neon))] rounded-full blur-md group-hover:blur-lg opacity-70 group-hover:opacity-100 transition-all duration-300 -z-10"></div>
              <img src={lemurLogo} alt="Lemur logo" className="w-full h-full relative z-10 object-contain" />
            </div>
            <CardTitle>Welcome to Lemur</CardTitle>
            <CardDescription>
              Sign in or create an account to unlock the full power of Lemur.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {/* Button to trigger modal, or AuthForm can be directly embedded if not modal */}
            {/* For now, assuming AuthForm is modal and might be triggered by a header button or similar */}
            {/* If AuthForm is not modal, it would be placed here. */}
            {/* Since AuthForm itself creates a modal overlay, we might not need to render it here explicitly if it's triggered elsewhere (e.g. Header) */}
            {/* However, if this IS the dedicated auth page, we render it here. */}
            {/* The provided AuthForm is a modal, so it will overlay. */}
            {/* We need a way to show/hide it. Let's assume it's always shown on this page for now. */}
            <AuthForm onSuccess={handleAuthSuccess} />
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-6">
            <p className="text-sm text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>

        {/* Right Column: Hero Section (Optional, can be removed if page is just the modal trigger) */}
        <div className="flex flex-col justify-center h-full">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">Unlock the power of Lemur</h1>
            <p className="text-lg text-gray-700">
              With a Lemur account, you can:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <svg className="h-6 w-6 mr-2 text-[hsl(var(--primary))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Save your search history</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 mr-2 text-[hsl(var(--primary))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Bookmark your favorite AI answers</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 mr-2 text-[hsl(var(--primary))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Get personalized search recommendations</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 mr-2 text-[hsl(var(--primary))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Access your search data across devices</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
