import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Bookmark, 
  Clock, 
  Search, 
  ArrowUpRight, 
  FolderOpen, 
  Tag, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  MoreVertical, 
  RefreshCw,
  PlusCircle,
  FolderPlus,
  FileText,
  Copy
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Mock API call to fetch saved searches
const fetchSavedSearches = async (): Promise<any[]> => {
  // This would be an actual API call in production
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate API response
      const searches = [
        {
          id: 1,
          query: "climate change impacts on agriculture",
          savedAt: "2025-05-08T15:30:00Z",
          folder: "Research",
          tags: ["climate", "agriculture", "research"],
          notes: "Important study for my thesis on sustainable farming",
          results: [
            { 
              title: "Climate Change Impacts on Global Agriculture",
              url: "https://example.com/climate-agriculture",
              snippet: "This study examines the various impacts of climate change on agricultural productivity worldwide, with a focus on crop yields and adaptation strategies."
            },
            { 
              title: "Sustainable Farming Methods in Changing Climate",
              url: "https://example.org/sustainable-agriculture",
              snippet: "A comprehensive review of sustainable farming techniques that can help mitigate the impacts of climate change while maintaining agricultural productivity."
            }
          ],
          aiAnswer: {
            content: "Climate change significantly impacts agriculture through several mechanisms: increased temperatures, changing precipitation patterns, extreme weather events, and elevated CO2 levels. Crop yields are projected to decrease in many regions, especially in tropical and subtropical areas...",
            sources: [
              { title: "IPCC Special Report on Climate Change and Land", url: "https://example.com/ipcc-report" },
              { title: "FAO Climate Change Impact Assessment", url: "https://example.org/fao-assessment" }
            ]
          }
        },
        {
          id: 2,
          query: "artificial intelligence ethics guidelines",
          savedAt: "2025-05-10T09:15:00Z",
          folder: "Technology",
          tags: ["AI", "ethics", "technology"],
          notes: "Reference for company policy development",
          results: [
            { 
              title: "Ethical Guidelines for AI Development",
              url: "https://example.com/ai-ethics",
              snippet: "A framework for ethical considerations in artificial intelligence development and deployment, focusing on transparency, fairness, and accountability."
            }
          ],
          aiAnswer: {
            content: "Ethical guidelines for artificial intelligence typically cover several key areas: transparency, fairness and non-discrimination, privacy and security, accountability, safety and reliability, and human oversight...",
            sources: [
              { title: "IEEE Ethically Aligned Design", url: "https://example.com/ieee-ethics" },
              { title: "EU Ethics Guidelines for Trustworthy AI", url: "https://example.org/eu-guidelines" }
            ]
          }
        },
        {
          id: 3,
          query: "effective remote team management strategies",
          savedAt: "2025-05-12T14:45:00Z",
          folder: "Work",
          tags: ["management", "remote-work", "teams"],
          notes: "",
          results: [
            { 
              title: "Best Practices for Remote Team Management",
              url: "https://example.com/remote-management",
              snippet: "Evidence-based strategies for effectively managing remote teams, including communication protocols, performance tracking, and team building activities."
            }
          ],
          aiAnswer: {
            content: "Effective remote team management relies on clear communication, established processes, appropriate technology, regular check-ins, and intentional team building...",
            sources: [
              { title: "Harvard Business Review: Leading Remote Teams", url: "https://example.com/hbr-remote" }
            ]
          }
        }
      ];
      
      resolve(searches);
    }, 1000); // Simulate network delay
  });
};

// Mock API call to delete a saved search
const deleteSavedSearch = async (id: number): Promise<boolean> => {
  // This would be an actual API call in production
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate successful deletion
      resolve(true);
    }, 500);
  });
};

// Mock API call to save notes for a search
const updateSavedSearch = async (id: number, updates: any): Promise<boolean> => {
  // This would be an actual API call in production
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate successful update
      resolve(true);
    }, 500);
  });
};

// Mock API call to create a new folder
const createFolder = async (name: string): Promise<boolean> => {
  // This would be an actual API call in production
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate successful creation
      resolve(true);
    }, 500);
  });
};

// Saved search card component
const SavedSearchCard = ({ 
  search, 
  onDelete, 
  onUpdate, 
  onRunAgain 
}: { 
  search: any; 
  onDelete: (id: number) => void; 
  onUpdate: (id: number, updates: any) => void;
  onRunAgain: (query: string) => void;
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(search.notes);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tags, setTags] = useState(search.tags.join(', '));
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleNotesSubmit = () => {
    onUpdate(search.id, { notes });
    setIsEditingNotes(false);
  };
  
  const handleTagsSubmit = () => {
    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
    
    onUpdate(search.id, { tags: tagsArray });
    setIsEditingTags(false);
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              <a 
                href={`/search?q=${encodeURIComponent(search.query)}`}
                className="hover:underline flex items-center gap-1"
                onClick={(e) => {
                  e.preventDefault();
                  onRunAgain(search.query);
                }}
              >
                {search.query}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </CardTitle>
            <CardDescription className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatDate(search.savedAt)}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRunAgain(search.query)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run search again
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditingNotes(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit notes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditingTags(true)}>
                <Tag className="h-4 w-4 mr-2" />
                Edit tags
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(search.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-2">
        {/* Folder and tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {search.folder && (
            <Badge variant="outline" className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {search.folder}
            </Badge>
          )}
          
          {search.tags.map((tag: string, index: number) => (
            <Badge key={index} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        
        {/* Notes section */}
        {isEditingNotes ? (
          <div className="space-y-2 mb-3">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this search..."
              className="h-20"
            />
            <div className="flex justify-end space-x-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setNotes(search.notes);
                  setIsEditingNotes(false);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleNotesSubmit}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : notes ? (
          <div className="mb-3">
            <div className="text-sm font-medium mb-1">Notes:</div>
            <div className="text-sm text-muted-foreground">{notes}</div>
          </div>
        ) : null}
        
        {/* Tags editing section */}
        {isEditingTags ? (
          <div className="space-y-2 mb-3">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
            <div className="flex justify-end space-x-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setTags(search.tags.join(', '));
                  setIsEditingTags(false);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleTagsSubmit}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : null}
        
        {/* Preview of results */}
        <div className="text-sm font-medium mb-1">Results preview:</div>
        <ScrollArea className="h-24 rounded-md border p-2">
          {search.results.map((result: any, index: number) => (
            <div key={index} className="mb-2">
              <a 
                href={result.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline text-primary"
              >
                {result.title}
              </a>
              <p className="text-xs text-muted-foreground truncate">{result.snippet}</p>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="pt-2">
        <div className="w-full flex justify-between items-center">
          <a 
            href={`/search?q=${encodeURIComponent(search.query)}`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
            onClick={(e) => {
              e.preventDefault();
              onRunAgain(search.query);
            }}
          >
            <Search className="h-3 w-3" />
            Run again
          </a>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy AI answer</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
};

export default function SavedSearches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [searches, setSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [folders, setFolders] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  useEffect(() => {
    if (!user) {
      // Redirect to login if not authenticated
      setLocation('/auth?redirect=/tools/saved-searches');
      return;
    }
    
    loadSavedSearches();
  }, [user]);
  
  const loadSavedSearches = async () => {
    setLoading(true);
    try {
      const data = await fetchSavedSearches();
      setSearches(data);
      
      // Extract unique folders and tags
      const uniqueFolders = Array.from(new Set(data.map(item => item.folder).filter(Boolean)));
      setFolders(uniqueFolders);
      
      const allTags = data.flatMap(item => item.tags);
      const uniqueTags = Array.from(new Set(allTags));
      setTags(uniqueTags);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
      toast({
        title: "Error",
        description: "Failed to load saved searches. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id: number) => {
    try {
      await deleteSavedSearch(id);
      setSearches(searches.filter(search => search.id !== id));
      toast({
        title: "Deleted",
        description: "Search has been successfully deleted"
      });
    } catch (error) {
      console.error('Error deleting saved search:', error);
      toast({
        title: "Error",
        description: "Failed to delete saved search. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleUpdate = async (id: number, updates: any) => {
    try {
      await updateSavedSearch(id, updates);
      
      // Update local state
      setSearches(searches.map(search => 
        search.id === id 
          ? { ...search, ...updates } 
          : search
      ));
      
      // Re-extract folders and tags if those were updated
      if (updates.folder || updates.tags) {
        const updatedSearches = searches.map(search => 
          search.id === id 
            ? { ...search, ...updates } 
            : search
        );
        
        if (updates.folder) {
          const uniqueFolders = Array.from(new Set(updatedSearches.map(item => item.folder).filter(Boolean)));
          setFolders(uniqueFolders);
        }
        
        if (updates.tags) {
          const allTags = updatedSearches.flatMap(item => item.tags);
          const uniqueTags = Array.from(new Set(allTags));
          setTags(uniqueTags);
        }
      }
      
      toast({
        title: "Updated",
        description: "Search has been successfully updated"
      });
    } catch (error) {
      console.error('Error updating saved search:', error);
      toast({
        title: "Error",
        description: "Failed to update saved search. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleRunAgain = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };
  
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Folder name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await createFolder(newFolderName.trim());
      
      // Add to folders list
      setFolders([...folders, newFolderName.trim()]);
      
      toast({
        title: "Success",
        description: `Folder "${newFolderName.trim()}" created successfully`
      });
      
      setNewFolderName("");
      setIsCreateFolderOpen(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Error",
        description: "Failed to create folder. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Filter searches based on active tab and search term
  const filteredSearches = searches.filter(search => {
    // First filter by tab
    if (activeTab === "all") {
      // No filter for "all"
    } else if (activeTab === "unorganized") {
      if (search.folder) return false;
    } else if (activeTab.startsWith("folder:")) {
      const folder = activeTab.replace("folder:", "");
      if (search.folder !== folder) return false;
    } else if (activeTab.startsWith("tag:")) {
      const tag = activeTab.replace("tag:", "");
      if (!search.tags.includes(tag)) return false;
    }
    
    // Then filter by search term if present
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        search.query.toLowerCase().includes(term) ||
        search.notes?.toLowerCase().includes(term) ||
        search.tags.some((tag: string) => tag.toLowerCase().includes(term))
      );
    }
    
    return true;
  });
  
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-2">Saved Searches</h1>
      <p className="text-muted-foreground mb-6">
        Access, organize, and revisit your saved search results
      </p>
      
      {!user ? (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
          <Bookmark className="h-16 w-16 mb-6 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Sign In to View Saved Searches</h2>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            You need to be signed in to save and access your searches.
          </p>
          <Button onClick={() => setLocation('/auth?redirect=/tools/saved-searches')}>
            Sign In
          </Button>
        </div>
      ) : (
        <>
          {/* Search and controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search saved items..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>
                      Enter a name for your new folder. Folders help you organize your saved searches.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="folder-name">Folder Name</Label>
                      <Input
                        id="folder-name"
                        placeholder="Research, Work, Personal, etc."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateFolder}>
                      Create Folder
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Tabs for filtering */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="overflow-auto">
              <TabsList className="inline-flex w-auto h-auto justify-start p-1">
                <TabsTrigger value="all" className="rounded-md">
                  All Searches
                </TabsTrigger>
                <TabsTrigger value="unorganized" className="rounded-md">
                  Unorganized
                </TabsTrigger>
                
                {/* Add tabs for each folder */}
                {folders.map((folder) => (
                  <TabsTrigger 
                    key={`folder:${folder}`} 
                    value={`folder:${folder}`}
                    className="rounded-md"
                  >
                    <FolderOpen className="h-4 w-4 mr-1" />
                    {folder}
                  </TabsTrigger>
                ))}
                
                {/* Add tabs for popular tags */}
                {tags.slice(0, 5).map((tag) => (
                  <TabsTrigger 
                    key={`tag:${tag}`} 
                    value={`tag:${tag}`}
                    className="rounded-md"
                  >
                    <Tag className="h-4 w-4 mr-1" />
                    {tag}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                // Loading state
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="h-[300px] flex flex-col">
                      <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/4" />
                      </CardHeader>
                      <CardContent className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-4 w-20" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : filteredSearches.length === 0 ? (
                // No results state
                <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
                  <FileText className="h-16 w-16 mb-6 text-muted-foreground" />
                  {searchTerm ? (
                    <>
                      <h2 className="text-xl font-semibold mb-2">No matching searches found</h2>
                      <p className="text-muted-foreground mb-4 text-center max-w-md">
                        Try adjusting your search term or filter
                      </p>
                      <Button variant="outline" onClick={() => setSearchTerm("")}>
                        Clear Search
                      </Button>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-semibold mb-2">No saved searches yet</h2>
                      <p className="text-muted-foreground mb-4 text-center max-w-md">
                        When you save searches, they will appear here for easy access
                      </p>
                      <Button onClick={() => setLocation('/')}>
                        Start Searching
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                // Search results grid
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSearches.map((search) => (
                    <SavedSearchCard
                      key={search.id}
                      search={search}
                      onDelete={handleDelete}
                      onUpdate={handleUpdate}
                      onRunAgain={handleRunAgain}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          {/* Usage information */}
          <div className="mt-8">
            <Alert variant="outline">
              <Bookmark className="h-4 w-4" />
              <AlertTitle>Usage Information</AlertTitle>
              <AlertDescription>
                {user.subscriptionTier === "free" ? (
                  "Free tier includes 10 saved searches. Upgrade for unlimited saved searches and advanced organization features."
                ) : user.subscriptionTier === "basic" ? (
                  "Basic tier includes 50 saved searches with organization features."
                ) : (
                  "Pro tier includes unlimited saved searches with advanced organization and sharing capabilities."
                )}
              </AlertDescription>
            </Alert>
          </div>
        </>
      )}
    </div>
  );
}