import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Cookie, InfoIcon, Settings, Clock, Lock } from "lucide-react";

export default function CookiesPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 text-center dark:text-white">Cookie Policy</h1>
        <p className="text-[hsl(var(--neutral-muted))] max-w-2xl mx-auto text-center">
          Last updated: May 1, 2025
        </p>
      </div>

      <Alert className="mb-8 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-300">About Our Cookie Policy</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-400">
          This Cookie Policy explains how Lemur uses cookies and similar technologies to recognize, understand and remember you when you visit our service. This is a demonstration policy for an example search application.
        </AlertDescription>
      </Alert>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Cookie className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            What Are Cookies?
          </CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>
            Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.
          </p>
          <p>
            Cookies set by the website owner (in this case, Lemur) are called "first-party cookies". Cookies set by parties other than the website owner are called "third-party cookies". Third-party cookies enable third-party features or functionality to be provided on or through the website (such as analytics, advertising, and chat services).
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Types of Cookies We Use
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Essential Cookies</h3>
              <p className="text-[hsl(var(--neutral-muted))]">These cookies are necessary for the website to function properly and cannot be switched off in our systems. They are usually only set in response to actions made by you which amount to a request for services, such as setting your privacy preferences, logging in, or filling in forms.</p>
              <div className="mt-2 bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                <p className="text-sm text-[hsl(var(--neutral-muted))] italic">Examples: session cookies, authentication cookies</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Preference Cookies</h3>
              <p className="text-[hsl(var(--neutral-muted))]">These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.</p>
              <div className="mt-2 bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                <p className="text-sm text-[hsl(var(--neutral-muted))] italic">Examples: language preference cookies, theme preference cookies</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Analytics Cookies</h3>
              <p className="text-[hsl(var(--neutral-muted))]">These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site.</p>
              <div className="mt-2 bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                <p className="text-sm text-[hsl(var(--neutral-muted))] italic">Examples: usage statistics cookies, performance measurement cookies</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 dark:text-white">Functionality Cookies</h3>
              <p className="text-[hsl(var(--neutral-muted))]">These cookies enable the website to remember choices you make (such as your user name, language or the region you are in) and provide enhanced, more personal features.</p>
              <div className="mt-2 bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                <p className="text-sm text-[hsl(var(--neutral-muted))] italic">Examples: search history cookies, personalization cookies</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            How Long Cookies Stay On Your Device
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-6">
            The length of time a cookie will remain on your device depends on whether it is a "persistent" or "session" cookie. Session cookies will remain on your device until you stop browsing. Persistent cookies remain on your device until they expire or are deleted.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2 dark:text-white">Session Cookies</h3>
              <p className="text-[hsl(var(--neutral-muted))]">These cookies are temporary and expire once you close your browser (or once your session ends).</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2 dark:text-white">Persistent Cookies</h3>
              <p className="text-[hsl(var(--neutral-muted))]">These cookies remain on your hard drive until you erase them or they expire. How long a persistent cookie remains on your device varies from cookie to cookie.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
            Controlling Cookies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))] mb-4">
            Most web browsers allow some control of most cookies through the browser settings. You can usually find these settings in the 'options' or 'preferences' menu of your browser. To understand these settings, the following links may be helpful:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-[hsl(var(--neutral-muted))]">
            <li>
              <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline">Cookie settings in Chrome</a>
            </li>
            <li>
              <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline">Cookie settings in Firefox</a>
            </li>
            <li>
              <a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline">Cookie settings in Safari</a>
            </li>
            <li>
              <a href="https://support.microsoft.com/en-us/help/17442/windows-internet-explorer-delete-manage-cookies" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline">Cookie settings in Internet Explorer/Edge</a>
            </li>
          </ul>
          <p className="text-[hsl(var(--neutral-muted))] mt-4">
            If you disable cookies, please be aware that some of the features of our service may not function correctly.
          </p>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 border-0 shadow-md">
        <CardHeader>
          <CardTitle>Changes to This Cookie Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[hsl(var(--neutral-muted))]">
            We may update our Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie Policy on this page and updating the "Last updated" date at the top of this page. You are advised to review this Cookie Policy periodically for any changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
