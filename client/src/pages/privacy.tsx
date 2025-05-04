import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Shield, AlertTriangle, Eye, Lock, Server, Database } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 text-center dark:text-white">Privacy Policy</h1>
        <p className="text-[hsl(var(--neutral-muted))] max-w-2xl mx-auto text-center">
          Last updated: May 1, 2025
        </p>
      </div>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Introduction
          </CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>
            At Lemur, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our search engine and related services.
          </p>
          <p>
            By using our service, you consent to the data practices described in this policy. We may update this policy periodically, and we'll notify you of any material changes by posting the new policy on this page.
          </p>
        </CardContent>
      </Card>

      <Alert className="mb-8 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900">
        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        <AlertTitle className="text-orange-800 dark:text-orange-300">Important Notice</AlertTitle>
        <AlertDescription className="text-orange-700 dark:text-orange-400">
          This is a demonstration privacy policy for an example search application. If this were a real service, this document would contain complete and legally-binding information about data handling practices.
        </AlertDescription>
      </Alert>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Information We Collect
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Personal Information</h3>
              <p className="text-[hsl(var(--neutral-muted))] mb-4">
                We may collect personally identifiable information, such as:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-[hsl(var(--neutral-muted))]">
                <li>Email address (if you create an account)</li>
                <li>Username</li>
                <li>IP address</li>
                <li>Browser type and settings</li>
                <li>Device information</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Search Data</h3>
              <p className="text-[hsl(var(--neutral-muted))] mb-4">
                When you use our search engine, we collect:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-[hsl(var(--neutral-muted))]">
                <li>Search queries</li>
                <li>Results clicked</li>
                <li>Time spent on search results</li>
                <li>Search preferences and settings</li>
                <li>AI answer interactions</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Cookies and Similar Technologies</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                We use cookies and similar tracking technologies to track activity on our service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            How We Use Your Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-6">
            We use the information we collect for various purposes, including:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium dark:text-white">Service Provision</h3>
              <ul className="list-disc pl-6 space-y-1 text-[hsl(var(--neutral-muted))]">
                <li>Provide and maintain our service</li>
                <li>Improve search results relevance</li>
                <li>Personalize your experience</li>
                <li>Process transactions</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium dark:text-white">Communication</h3>
              <ul className="list-disc pl-6 space-y-1 text-[hsl(var(--neutral-muted))]">
                <li>Email notifications (if enabled)</li>
                <li>Customer service responses</li>
                <li>Updates about the service</li>
                <li>Marketing communications (with consent)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium dark:text-white">Analysis & Improvement</h3>
              <ul className="list-disc pl-6 space-y-1 text-[hsl(var(--neutral-muted))]">
                <li>Monitor usage patterns</li>
                <li>Detect and prevent technical issues</li>
                <li>Improve AI answer quality</li>
                <li>Conduct research and analysis</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium dark:text-white">Legal Compliance</h3>
              <ul className="list-disc pl-6 space-y-1 text-[hsl(var(--neutral-muted))]">
                <li>Comply with legal obligations</li>
                <li>Enforce our terms of service</li>
                <li>Protect against misuse</li>
                <li>Respond to legal requests</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Information Sharing and Disclosure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-6">
            We may share your information with:
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Service Providers</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                Third-party companies and individuals that facilitate our service, including API providers (Groq, Tavily), hosting services, and analytics providers. These providers have access to your information only to perform tasks on our behalf and are obligated not to disclose or use it for other purposes.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Legal Requirements</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                We may disclose your information if required by law, such as to comply with a subpoena, legal proceedings, or government request.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Business Transfers</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                If we are involved in a merger, acquisition, or asset sale, your information may be transferred as a business asset. We will notify you before your information is transferred and becomes subject to a different privacy policy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Data Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-6">
            We implement appropriate security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. These measures include:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[hsl(var(--neutral-muted))]">
            <li>Encryption of sensitive data</li>
            <li>Regular security audits</li>
            <li>Secure infrastructure with firewalls and intrusion detection systems</li>
            <li>Access controls for our employees and contractors</li>
            <li>Regular backups of system data</li>
          </ul>
          <p className="text-[hsl(var(--neutral-muted))] mt-6">
            However, please be aware that no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle>Your Privacy Rights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-6">
            Depending on your location, you may have certain rights regarding your personal information:
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Access and Portability</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                You can request a copy of your personal data in a structured, commonly used, and machine-readable format.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Correction</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                You can request that we correct inaccurate or incomplete information about you.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Deletion</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                You can request that we delete your personal information in certain circumstances.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Restriction and Objection</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                You can request that we restrict processing of your information or object to our processing in certain circumstances.
              </p>
            </div>
          </div>
          <p className="text-[hsl(var(--neutral-muted))] mt-6">
            To exercise these rights, please contact us at privacy@lemur-search.com. We will respond to your request within a reasonable timeframe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
