import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, RefreshCw, Globe, Shield, Bell, Eye, Search, Palette, Lock } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("•••••••••••••••••••••••••••••••");
  const [saveHistory, setSaveHistory] = useState(true);
  const [regionAutodetect, setRegionAutodetect] = useState(true);
  const [defaultRegion, setDefaultRegion] = useState("AU");
  const [searchMode, setSearchMode] = useState("balanced");
  const [theme, setTheme] = useState("system");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [safeSearch, setSafeSearch] = useState("moderate");

  const handleSaveSettings = (section: string) => {
    toast({
      title: "Settings updated",
      description: `Your ${section} settings have been saved successfully.`,
    });
  };

  const handleResetSettings = () => {
    toast({
      title: "Settings reset",
      description: "All settings have been reset to default values.",
    });
  };

  const handleCopyApiKey = () => {
    toast({
      title: "API key copied",
      description: "Your API key has been copied to the clipboard.",
    });
  };

  const handleRegenerateApiKey = () => {
    toast({
      title: "API key regenerated",
      description: "Your new API key has been generated. Please copy it now.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">Settings</h1>
        <p className="text-[hsl(var(--neutral-muted))]">
          Manage your account preferences and configure your search experience
        </p>
      </div>

      <Tabs defaultValue="search" className="mb-12">
        <TabsList className="mb-8">
          <TabsTrigger value="search" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            <Search className="mr-2 h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="privacy" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            <Shield className="mr-2 h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-white">
            <Lock className="mr-2 h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Search Settings */}
        <TabsContent value="search">
          <Card className="dark:bg-gray-800 border-0 shadow-md mb-8">
            <CardHeader>
              <CardTitle>Search Settings</CardTitle>
              <CardDescription>
                Configure how search results are displayed and processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium dark:text-white">Results Display</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="results-per-page">Results per page</Label>
                    <Select defaultValue="10">
                      <SelectTrigger id="results-per-page">
                        <SelectValue placeholder="Select number" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 results</SelectItem>
                        <SelectItem value="10">10 results</SelectItem>
                        <SelectItem value="15">15 results</SelectItem>
                        <SelectItem value="20">20 results</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default-tab">Default search tab</Label>
                    <Select defaultValue="all">
                      <SelectTrigger id="default-tab">
                        <SelectValue placeholder="Select tab" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Results</SelectItem>
                        <SelectItem value="ai">AI Answer</SelectItem>
                        <SelectItem value="web">Web Results</SelectItem>
                        <SelectItem value="news">News</SelectItem>
                        <SelectItem value="images">Images</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium dark:text-white">Search Mode</h3>
                <RadioGroup value={searchMode} onValueChange={setSearchMode} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="balanced" id="balanced" />
                    <Label htmlFor="balanced">Balanced</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="comprehensive" id="comprehensive" />
                    <Label htmlFor="comprehensive">Comprehensive</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recent" id="recent" />
                    <Label htmlFor="recent">Recent Results</Label>
                  </div>
                </RadioGroup>
                <p className="text-sm text-[hsl(var(--neutral-muted))]">
                  Balanced mode provides a mix of relevance and recency. Comprehensive mode prioritizes thoroughness, while Recent prioritizes the newest content.
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium dark:text-white">Regional Settings</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-region">Auto-detect region</Label>
                    <p className="text-sm text-[hsl(var(--neutral-muted))]">Automatically detect your region for relevant results</p>
                  </div>
                  <Switch
                    id="auto-region"
                    checked={regionAutodetect}
                    onCheckedChange={setRegionAutodetect}
                  />
                </div>
                
                {!regionAutodetect && (
                  <div className="pt-2">
                    <Label htmlFor="default-region">Default region</Label>
                    <Select value={defaultRegion} onValueChange={setDefaultRegion}>
                      <SelectTrigger id="default-region" className="w-full">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="IN">India</SelectItem>
                        <SelectItem value="global">Global (No region)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <Button variant="outline" onClick={handleResetSettings}>Reset</Button>
                <Button onClick={() => handleSaveSettings('search')}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                Notifications
              </CardTitle>
              <CardDescription>
                Configure alerts and notifications for your searches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Search alerts</Label>
                  <p className="text-sm text-[hsl(var(--neutral-muted))]">Enable notifications for saved search alerts</p>
                </div>
                <Switch
                  id="notifications"
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
              
              {notificationsEnabled && (
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email notifications</Label>
                    <p className="text-sm text-[hsl(var(--neutral-muted))]">Receive search alerts via email</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <Button onClick={() => handleSaveSettings('notification')}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card className="dark:bg-gray-800 border-0 shadow-md">
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium dark:text-white">Theme</h3>
                <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light">Light</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark">Dark</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="system" id="system" />
                    <Label htmlFor="system">System</Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium dark:text-white">Font Size</h3>
                <RadioGroup defaultValue="medium" className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="small" id="small" />
                    <Label htmlFor="small">Small</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium">Medium</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="large" id="large" />
                    <Label htmlFor="large">Large</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="x-large" id="x-large" />
                    <Label htmlFor="x-large">Extra Large</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <Button variant="outline" onClick={handleResetSettings}>Reset</Button>
                <Button onClick={() => handleSaveSettings('appearance')}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy">
          <Card className="dark:bg-gray-800 border-0 shadow-md mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                Search Privacy
              </CardTitle>
              <CardDescription>
                Manage how your search data is stored and used
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="save-history">Save search history</Label>
                  <p className="text-sm text-[hsl(var(--neutral-muted))]">Store your search queries for future reference</p>
                </div>
                <Switch
                  id="save-history"
                  checked={saveHistory}
                  onCheckedChange={setSaveHistory}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium dark:text-white">SafeSearch</h3>
                <RadioGroup value={safeSearch} onValueChange={setSafeSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="strict" id="strict" />
                    <Label htmlFor="strict">Strict</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="moderate" id="moderate" />
                    <Label htmlFor="moderate">Moderate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="off" id="off" />
                    <Label htmlFor="off">Off</Label>
                  </div>
                </RadioGroup>
                <p className="text-sm text-[hsl(var(--neutral-muted))]">
                  SafeSearch helps filter out explicit content from your search results
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={() => handleSaveSettings('privacy')}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 border-0 shadow-md">
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Control your personal data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline" className="w-full sm:w-auto">
                  Export My Data
                </Button>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Clear Search History
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account">
          <Card className="dark:bg-gray-800 border-0 shadow-md mb-8">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Update your personal details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={user?.username || 'Guest User'} readOnly={!user} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={user?.email || 'Not signed in'} readOnly={!user} />
                </div>
              </div>
              
              {user ? (
                <div className="pt-4 flex justify-end space-x-2">
                  <Button variant="outline">Change Password</Button>
                  <Button>Update Profile</Button>
                </div>
              ) : (
                <div className="pt-4">
                  <p className="text-[hsl(var(--neutral-muted))] mb-4">Sign in to manage your account settings</p>
                  <Button>Sign In</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                API Access
              </CardTitle>
              <CardDescription>
                Manage API keys for integrating with Lemur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input value={apiKey} readOnly className="font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopyApiKey}>
                  <Clipboard className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleRegenerateApiKey}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-[hsl(var(--neutral-muted))]">
                Your API key allows you to make requests to the Lemur API. Keep it secure and don't share it publicly.
              </p>
              <div className="pt-2">
                <Button variant="outline" onClick={() => window.location.href = '/api'}>
                  View API Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
