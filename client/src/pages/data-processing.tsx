import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Clock, Server, FileText, BarChart, HardDrive, Layers } from "lucide-react";

export default function DataProcessingPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 text-center dark:text-white">Data Processing</h1>
        <p className="text-[hsl(var(--neutral-muted))] max-w-2xl mx-auto text-center">
          Learn how Lemur processes and handles information
        </p>
      </div>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Data Collection Overview
          </CardTitle>
          <CardDescription>
            Information we collect and process through our services
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>
            Lemur is built on a sophisticated data processing infrastructure that enables us to deliver accurate, helpful search results while respecting user privacy. This page explains how we collect, process, store, and retain various types of data.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Layers className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Data Processing Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-6">
            When you use Lemur, your search query goes through the following processing pipeline:
          </p>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2 flex items-center dark:text-white">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white mr-2 text-sm">1</span>
                Query Processing
              </h3>
              <p className="text-[hsl(var(--neutral-muted))]">Your search query is analyzed for intent, context, and keywords. Query length is limited to 400 characters.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2 flex items-center dark:text-white">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white mr-2 text-sm">2</span>
                Web Search Results
              </h3>
              <p className="text-[hsl(var(--neutral-muted))]">We use the Tavily API to fetch relevant web results, which includes websites, news articles, and other content across the internet.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2 flex items-center dark:text-white">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white mr-2 text-sm">3</span>
                AI Generation
              </h3>
              <p className="text-[hsl(var(--neutral-muted))]">For AI answers, web results are sent as context to Groq's Llama-based models, which generate a comprehensive answer based on those sources.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2 flex items-center dark:text-white">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white mr-2 text-sm">4</span>
                Citation Processing
              </h3>
              <p className="text-[hsl(var(--neutral-muted))]">Sources used in AI answers are tracked and linked as citations, allowing users to verify information from original sources.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2 flex items-center dark:text-white">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white mr-2 text-sm">5</span>
                Data Storage
              </h3>
              <p className="text-[hsl(var(--neutral-muted))]">Search queries and results are stored in our database for users with accounts. Anonymous searches are stored with minimal identifying information.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <HardDrive className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Data Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Types of data processed by Lemur</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Retention Period</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Search Queries</TableCell>
                <TableCell>Text entered into the search box</TableCell>
                <TableCell className="text-right">180 days</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Click Data</TableCell>
                <TableCell>Which search results users click on</TableCell>
                <TableCell className="text-right">90 days</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">User Accounts</TableCell>
                <TableCell>Username, email, settings preferences</TableCell>
                <TableCell className="text-right">Until account deletion</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Saved Searches</TableCell>
                <TableCell>Searches explicitly saved by users</TableCell>
                <TableCell className="text-right">Until user deletes</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Device Information</TableCell>
                <TableCell>Browser type, screen size, operating system</TableCell>
                <TableCell className="text-right">30 days</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">IP Addresses</TableCell>
                <TableCell>Network identifiers used to serve regional content</TableCell>
                <TableCell className="text-right">7 days</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Third-Party Data Processors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-6">
            Lemur uses several third-party services to power our search functionality:
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Tavily Search API</h3>
              <p className="text-[hsl(var(--neutral-muted))]">Provides web search capabilities and fetches results from across the internet. We share search queries with Tavily, which processes this data according to their own privacy policies.</p>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Groq API</h3>
              <p className="text-[hsl(var(--neutral-muted))]">Powers our AI answer generation, using models like Llama 3.3 70B and Llama 4 Scout. We share search queries and web result snippets with Groq for processing.</p>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Database Providers</h3>
              <p className="text-[hsl(var(--neutral-muted))]">We use secure database services to store user data, search history, and analytics information.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Data Retention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-6">
            Our data retention policies are designed to balance service functionality with privacy considerations:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[hsl(var(--neutral-muted))]">
            <li>We keep search history for 180 days by default (for logged-in users)</li>
            <li>Anonymous searches are stored for a limited time with minimal identifying information</li>
            <li>You can clear your search history at any time through your account settings</li>
            <li>Account information is retained until you delete your account</li>
            <li>When data reaches the end of its retention period, it's automatically deleted from our systems</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Analytics & Reporting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-6">
            We use aggregated search data to improve our services in the following ways:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2 dark:text-white">Service Improvements</h3>
              <p className="text-[hsl(var(--neutral-muted))]">Analyzing search patterns and user interactions to enhance search accuracy and relevance.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2 dark:text-white">Performance Monitoring</h3>
              <p className="text-[hsl(var(--neutral-muted))]">Tracking system performance metrics to ensure fast, reliable service.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2 dark:text-white">Bug Detection</h3>
              <p className="text-[hsl(var(--neutral-muted))]">Identifying and fixing technical issues that affect search quality or user experience.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2 dark:text-white">Trend Analysis</h3>
              <p className="text-[hsl(var(--neutral-muted))]">Understanding emerging search topics and user interests to better serve relevant content.</p>
            </div>
          </div>
          <p className="text-[hsl(var(--neutral-muted))] mt-6">
            We only use aggregated, anonymized data for reporting and analytics purposes. Individual search histories are never shared with third parties for advertising or marketing purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
