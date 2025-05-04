import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, HelpCircle, Settings, User, Lock } from "lucide-react";
import { useState } from "react";

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
    // In a real app, this would search the help content
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 dark:text-white">Help Center</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Find answers to your questions about using Lemur
        </p>
      </div>

      <div className="max-w-xl mx-auto mb-12">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input 
            type="text" 
            placeholder="Search for help topics..." 
            className="flex-grow" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>
      </div>

      <Tabs defaultValue="general" className="mb-12">
        <TabsList className="mb-8 flex-wrap justify-center">
          <TabsTrigger value="general" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <HelpCircle className="h-4 w-4 mr-2" />
            General FAQ
          </TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="privacy" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Lock className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <HelpCircle className="mr-2 h-5 w-5 text-purple-600"/> 
                General Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Basic information about Lemur and its features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="what-is-lemur">
                  <AccordionTrigger className="text-left">What is Lemur?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      Lemur is an AI-powered search engine that provides both traditional web search results and AI-synthesized answers. It uses advanced Llama 3.3 and Llama 4 models from Groq to analyze web content and generate comprehensive, cited answers to your questions.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="how-accurate">
                  <AccordionTrigger className="text-left">How accurate are the AI answers?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      Lemur strives for high accuracy by using the latest AI models and providing proper citations for all information. However, AI systems can make mistakes or have limitations in their knowledge.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="cost">
                  <AccordionTrigger className="text-left">Is Lemur free to use?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      Yes, Lemur's basic search functionality is free for everyone. We offer a free tier with generous daily search limits that should be sufficient for most users.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card className="dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-purple-600"/> 
                Account Management
              </CardTitle>
              <CardDescription>
                Information about accounts, registration, and profile settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This section will contain account-related help topics such as account creation, 
                password reset, account settings, and profile management.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5 text-purple-600"/> 
                Settings & Preferences
              </CardTitle>
              <CardDescription>
                Customizing your Lemur experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This section will contain settings-related help topics such as theme preferences,
                search result display options, and notification settings.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="mr-2 h-5 w-5 text-purple-600"/> 
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Information about data protection and privacy controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This section will contain privacy-related help topics such as managing your search history,
                data collection practices, and security features.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Need More Help?</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
          If you couldn't find what you're looking for, our support team is here to help.
          Contact us for personalized assistance with any questions you may have.
        </p>
        <Button variant="default" className="bg-purple-600 hover:bg-purple-700">
          Contact Support
        </Button>
      </div>
    </div>
  );
}
