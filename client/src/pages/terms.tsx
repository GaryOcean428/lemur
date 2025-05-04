import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollText, Shield, AlertTriangle, Ban, FileText, Scale } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 text-center dark:text-white">Terms of Service</h1>
        <p className="text-[hsl(var(--neutral-muted))] max-w-2xl mx-auto text-center">
          Last updated: May 1, 2025
        </p>
      </div>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ScrollText className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Agreement Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>
            These Terms of Service ("Terms") govern your access to and use of the Lemur search engine and related services (the "Service"). By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
          </p>
          <p>
            This is a demonstration terms document for an example search application. If this were a real service, this document would contain complete and legally-binding terms.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Service Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-4">
            Lemur is an AI-powered search engine that provides two main types of search results:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[hsl(var(--neutral-muted))]">
            <li>
              <span className="font-medium">Traditional web search results:</span> Links to websites and content across the internet
            </li>
            <li>
              <span className="font-medium">AI-synthesized answers:</span> Computer-generated responses to queries, based on information from various web sources
            </li>
          </ul>
          <p className="text-[hsl(var(--neutral-muted))] mt-4">
            The Service may also provide additional features such as image search, news aggregation, and content summarization. Some features may require you to create an account and/or pay for access.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            User Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-4">
            When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Account Security</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                You are responsible for safeguarding the password used to access the Service and for any activities or actions under your password. We encourage you to use strong passwords (with a combination of upper and lower case letters, numbers, and symbols) with your account.
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Account Termination</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Ban className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Prohibited Uses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-6">
            You agree not to use the Service:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[hsl(var(--neutral-muted))]">
            <li>In any way that violates any applicable national or international law or regulation</li>
            <li>To impersonate or attempt to impersonate our company, an employee, another user, or any other person or entity</li>
            <li>To engage in any activity that interferes with or disrupts the Service or servers and networks connected to the Service</li>
            <li>To attempt to access any parts of the Service, computer systems, or networks connected to the Service through hacking, password mining, or any other means</li>
            <li>To search for, retrieve, index, or download content that is illegal, harmful, abusive, racially or ethnically offensive, vulgar, sexually explicit, defamatory, or otherwise objectionable</li>
            <li>To use data mining, robots, screen scraping, or similar data gathering and extraction tools on the Service</li>
            <li>To circumvent, disable, or otherwise interfere with security-related features of the Service</li>
            <li>To reproduce, duplicate, copy, sell, resell, or exploit any portion of the Service without express written permission from us</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Disclaimers and Limitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">AI-Generated Content Disclaimer</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                The AI-generated answers provided by our Service are created through automated processes and should not be considered authoritative or infallible. While we strive for accuracy, AI responses may contain errors, biases, or outdated information. You should independently verify important information from reliable sources before making decisions based on our AI-generated content.
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Search Results Disclaimer</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                Our Service acts as an index to third-party websites and content. We do not create, control, or endorse the content of these websites. The inclusion of a website in our search results does not imply our endorsement of that website or its content. You access third-party websites at your own risk.
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Limitation of Liability</h3>
              <p className="text-[hsl(var(--neutral-muted))]">
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your access to or use of or inability to access or use the Service.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Scale className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Governing Law
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))]">
            These Terms shall be governed and construed in accordance with the laws of Australia, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.
          </p>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle>Changes to Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))]">
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
