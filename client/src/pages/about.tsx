import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Shield, Zap, Globe, Database, Lock, Award, Code } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 relative group flex items-center justify-center">
            <div className="absolute -inset-1.5 bg-purple-500/60 rounded-full blur-md group-hover:blur-lg opacity-70 group-hover:opacity-100 transition-all duration-300 -z-10"></div>
            <span className="text-3xl font-bold relative z-10">L</span>
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4 dark:text-white">About Lemur</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          An AI-powered search engine that combines web results with intelligent answers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <Card className="dark:bg-gray-800 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="mr-2 h-5 w-5 text-purple-600"/> 
              Intelligent Search
            </CardTitle>
            <CardDescription>
              Powerful search that understands your questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Lemur doesn't just match keywords. It understands the intent behind your queries and provides contextually relevant results, combining traditional web search with AI-synthesized answers that directly address your questions.
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5 text-purple-600"/> 
              Advanced AI Models
            </CardTitle>
            <CardDescription>
              Powered by Groq's cutting-edge Llama models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Our search engine leverages Llama 3.3 and Llama 4 Scout models via Groq's API, automatically selecting the most appropriate model based on query complexity to provide accurate, relevant, and detailed answers.
            </p>
            <div className="mt-4 flex gap-2">
              <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30">llama-3.3-70b-versatile</Badge>
              <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30">llama-4-scout-17b-16e-instruct</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-purple-600"/> 
              Trustworthy Results
            </CardTitle>
            <CardDescription>
              Transparent sourcing and citations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Every AI-generated answer is accompanied by proper citations and source references, allowing you to verify information and explore topics in greater depth. We prioritize accuracy and transparency in all results.
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5 text-purple-600"/> 
              Regional Awareness
            </CardTitle>
            <CardDescription>
              Results tailored to your location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Lemur delivers search results with regional awareness, balancing global information with locally relevant content. Searches are optimized for Australian users while maintaining comprehensive global coverage.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6 text-center dark:text-white">Our Technology Stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
            <Database className="h-10 w-10 mx-auto mb-4 text-purple-600"/>
            <h3 className="font-semibold mb-2 dark:text-white">Tavily Search API</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Powers our web search results with comprehensive coverage</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
            <Zap className="h-10 w-10 mx-auto mb-4 text-purple-600"/>
            <h3 className="font-semibold mb-2 dark:text-white">Groq Inference API</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Ultra-fast AI model inference for instant answers</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
            <Code className="h-10 w-10 mx-auto mb-4 text-purple-600"/>
            <h3 className="font-semibold mb-2 dark:text-white">React & Vite</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Modern frontend with responsive design and dark mode</p>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-8 mb-16">
        <h2 className="text-2xl font-bold mb-6 text-center dark:text-white">Our Vision</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl mx-auto text-center leading-relaxed">
          Lemur aims to transform how people find information online by combining the breadth of traditional search with the depth and understanding of advanced AI. We're building a search experience that's more intuitive, more helpful, and more respectful of your time and attention.
        </p>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Meet the Team</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
          Lemur is being developed by a team of search engine experts, AI researchers, and user experience designers dedicated to creating the next generation of search technology.
        </p>
        <div className="flex justify-center space-x-4">
          <Award className="h-6 w-6 text-purple-600"/>
          <Lock className="h-6 w-6 text-purple-600"/>
          <Database className="h-6 w-6 text-purple-600"/>
          <Globe className="h-6 w-6 text-purple-600"/>
        </div>
      </div>
    </div>
  );
}
