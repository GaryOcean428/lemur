import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
// No need to import Header and Footer as they're already in App.tsx

// Types for preferences and topics
interface UserPreferences {
  id: number;
  userId: number;
  defaultRegion: string;
  preferredLanguage: string;
  contentPreferences: Record<string, any>;
  searchFilters: Record<string, any>;
  aiModel: string;
  lastUpdated: string;
}

interface UserTopic {
  id: number;
  userId: number;
  topic: string;
  interestLevel: number;
  createdAt: string;
  updatedAt: string;
}

export default function PreferencesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // State for new topic
  const [newTopic, setNewTopic] = useState("");
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [user, authLoading, setLocation]);
  
  // Fetch user preferences
  const { data: preferences, isLoading: prefsLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    enabled: !!user
  });
  
  // Fetch user topics
  const { data: topics, isLoading: topicsLoading } = useQuery<UserTopic[]>({
    queryKey: ["/api/user/topics"],
    enabled: !!user
  });
  
  // Update preferences mutation
  const updatePrefsMutation = useMutation({
    mutationFn: async (updatedPrefs: Partial<UserPreferences>) => {
      const res = await apiRequest("POST", "/api/user/preferences", updatedPrefs);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Preferences updated",
        description: "Your search preferences have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Add topic mutation
  const addTopicMutation = useMutation({
    mutationFn: async (topic: { topic: string, interestLevel: number }) => {
      const res = await apiRequest("POST", "/api/user/topics", topic);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/topics"] });
      setNewTopic("");
      toast({
        title: "Topic added",
        description: "Your topic of interest has been added.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Adding topic failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update topic mutation
  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, interestLevel }: { id: number, interestLevel: number }) => {
      const res = await apiRequest("PUT", `/api/user/topics/${id}`, { interestLevel });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/topics"] });
      toast({
        title: "Topic updated",
        description: "Your interest level has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete topic mutation
  const deleteTopicMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/user/topics/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/topics"] });
      toast({
        title: "Topic removed",
        description: "The topic has been removed from your interests.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Removal failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle region change
  const handleRegionChange = (value: string) => {
    updatePrefsMutation.mutate({ defaultRegion: value });
  };
  
  // Handle language change
  const handleLanguageChange = (value: string) => {
    updatePrefsMutation.mutate({ preferredLanguage: value });
  };
  
  // Handle AI model preference change
  const handleModelChange = (value: string) => {
    updatePrefsMutation.mutate({ aiModel: value });
  };
  
  // Handle adding a new topic
  const handleAddTopic = () => {
    if (newTopic.trim()) {
      addTopicMutation.mutate({ topic: newTopic.trim(), interestLevel: 3 });
    }
  };
  
  // Handle interest level change
  const handleInterestLevelChange = (id: number, level: number[]) => {
    updateTopicMutation.mutate({ id, interestLevel: level[0] });
  };
  
  // Handle topic deletion
  const handleDeleteTopic = (id: number) => {
    deleteTopicMutation.mutate(id);
  };
  
  if (authLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const isLoading = prefsLoading || topicsLoading;
  
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">User Settings</h1>
          <p className="text-muted-foreground">Customize your search experience on Lemur</p>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="topics">Topics of Interest</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Regional Preferences</CardTitle>
                    <CardDescription>Set your region for more relevant search results</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="region">Default Region</Label>
                        <Select 
                          defaultValue={preferences?.defaultRegion || "global"} 
                          onValueChange={handleRegionChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="global">Global</SelectItem>
                            <SelectItem value="us">United States</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="ca">Canada</SelectItem>
                            <SelectItem value="au">Australia</SelectItem>
                            <SelectItem value="eu">Europe</SelectItem>
                            <SelectItem value="asia">Asia</SelectItem>
                            <SelectItem value="latam">Latin America</SelectItem>
                            <SelectItem value="africa">Africa</SelectItem>
                            <SelectItem value="oceania">Oceania</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="language">Preferred Language</Label>
                        <Select 
                          defaultValue={preferences?.preferredLanguage || "en"}
                          onValueChange={handleLanguageChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                            <SelectItem value="ja">Japanese</SelectItem>
                            <SelectItem value="zh">Chinese</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>AI Model Preferences</CardTitle>
                    <CardDescription>Choose AI models based on your needs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      <Label htmlFor="model">Default AI Model</Label>
                      <Select 
                        defaultValue={preferences?.aiModel || "auto"}
                        onValueChange={handleModelChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select AI model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (Balanced)</SelectItem>
                          <SelectItem value="fast">Fast</SelectItem>
                          <SelectItem value="comprehensive">Comprehensive</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-2">
                        Fast: Optimized for speed, with simplified answers.<br />
                        Comprehensive: Deeper analysis, more detailed answers.<br />
                        Auto: Smart selection based on query complexity.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="topics">
              <Card>
                <CardHeader>
                  <CardTitle>Topics of Interest</CardTitle>
                  <CardDescription>Add topics you're interested in to improve your search results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Enter a topic (e.g., 'AI Research', 'Climate Science')" 
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                      />
                      <Button onClick={handleAddTopic} disabled={!newTopic.trim() || addTopicMutation.isPending}>
                        {addTopicMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Add
                      </Button>
                    </div>
                    
                    {topics && topics.length > 0 ? (
                      <div className="grid gap-4">
                        {topics.map(topic => (
                          <div key={topic.id} className="border rounded-md p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="font-medium">{topic.topic}</h3>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteTopic(topic.id)}
                                disabled={deleteTopicMutation.isPending}
                              >
                                Remove
                              </Button>
                            </div>
                            <div className="grid gap-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Interest Level</span>
                                <Badge variant="outline">
                                  {topic.interestLevel < 2 ? "Low" : topic.interestLevel < 4 ? "Medium" : "High"}
                                </Badge>
                              </div>
                              <Slider
                                defaultValue={[topic.interestLevel]}
                                max={5}
                                min={1}
                                step={1}
                                onValueChange={(value) => handleInterestLevelChange(topic.id, value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No topics added yet. Add topics you're interested in to improve search results.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="advanced">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Search Settings</CardTitle>
                  <CardDescription>Fine-tune your search experience with additional controls</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto-context" className="text-base">Enable Contextual Search</Label>
                        <p className="text-sm text-muted-foreground">Automatically connects follow-up questions to previous searches</p>
                      </div>
                      <Switch
                        id="auto-context"
                        checked={preferences?.contentPreferences?.enableContextualSearch !== false}
                        onCheckedChange={(checked) => {
                          updatePrefsMutation.mutate({
                            contentPreferences: {
                              ...preferences?.contentPreferences,
                              enableContextualSearch: checked
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="citations" className="text-base">Include Citations</Label>
                        <p className="text-sm text-muted-foreground">Show source references in AI answers</p>
                      </div>
                      <Switch
                        id="citations"
                        checked={preferences?.contentPreferences?.showCitations !== false}
                        onCheckedChange={(checked) => {
                          updatePrefsMutation.mutate({
                            contentPreferences: {
                              ...preferences?.contentPreferences,
                              showCitations: checked
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="history" className="text-base">Save Search History</Label>
                        <p className="text-sm text-muted-foreground">Store your search queries for later access</p>
                      </div>
                      <Switch
                        id="history"
                        checked={preferences?.contentPreferences?.saveSearchHistory !== false}
                        onCheckedChange={(checked) => {
                          updatePrefsMutation.mutate({
                            contentPreferences: {
                              ...preferences?.contentPreferences,
                              saveSearchHistory: checked
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
