import { useState } from "react";
import { useSearchStore, SearchFilters } from "@/store/searchStore";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sliders, RefreshCw } from "lucide-react";

export default function SearchFiltersPanel() {
  const { filters, setFilters, resetFilters, isFilterPanelVisible, toggleFilterPanel } = useSearchStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleSourceChange = (source: keyof SearchFilters["sources"], checked: boolean) => {
    setFilters({
      sources: { 
        ...filters.sources,
        [source]: checked 
      }
    });
  };

  const handleContentTypeChange = (type: keyof SearchFilters["contentType"], checked: boolean) => {
    setFilters({
      contentType: { 
        ...filters.contentType,
        [type]: checked 
      }
    });
  };

  const handleTimeRangeChange = (value: SearchFilters["timeRange"]) => {
    setFilters({ timeRange: value });
  };

  const handleRegionChange = (value: SearchFilters["region"]) => {
    setFilters({ region: value });
  };

  const handleAIModelChange = (value: SearchFilters["aiPreferences"]["model"]) => {
    setFilters({
      aiPreferences: { 
        ...filters.aiPreferences,
        model: value 
      }
    });
  };

  const handleDetailLevelChange = (value: SearchFilters["aiPreferences"]["detailLevel"]) => {
    setFilters({
      aiPreferences: { 
        ...filters.aiPreferences,
        detailLevel: value 
      }
    });
  };

  const handleCitationStyleChange = (value: SearchFilters["aiPreferences"]["citationStyle"]) => {
    setFilters({
      aiPreferences: { 
        ...filters.aiPreferences,
        citationStyle: value 
      }
    });
  };

  const handleSortChange = (value: string) => {
    setFilters({ sort: value });
  };

  const handleUserPreferenceChange = (preference: string, value: boolean) => {
    setFilters({
      userPreferences: {
        ...filters.userPreferences,
        [preference]: value
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Sliders className="h-4 w-4" />
          <span>Filters</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[300px] sm:w-[400px] md:w-[500px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Advanced Search Filters</SheetTitle>
          <SheetDescription>
            Customize your search experience with advanced filters.
          </SheetDescription>
        </SheetHeader>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-1 mb-4"
          onClick={resetFilters}
        >
          <RefreshCw className="h-3 w-3" />
          <span>Reset All Filters</span>
        </Button>

        <Accordion type="multiple" className="w-full" defaultValue={["time", "sources", "region", "content", "ai", "sort", "userPreferences"]}>
          {/* Time Range */}
          <AccordionItem value="time">
            <AccordionTrigger>Time Range</AccordionTrigger>
            <AccordionContent>
              <RadioGroup value={filters.timeRange} onValueChange={handleTimeRangeChange} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="time-any" />
                  <Label htmlFor="time-any">Any time</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="past24h" id="time-24h" />
                  <Label htmlFor="time-24h">Past 24 hours</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pastWeek" id="time-week" />
                  <Label htmlFor="time-week">Past week</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pastMonth" id="time-month" />
                  <Label htmlFor="time-month">Past month</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pastYear" id="time-year" />
                  <Label htmlFor="time-year">Past year</Label>
                </div>
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>

          {/* Source Filters */}
          <AccordionItem value="sources">
            <AccordionTrigger>Sources</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="source-news" 
                    checked={filters.sources.news}
                    onCheckedChange={(checked) => handleSourceChange("news", checked === true)}
                  />
                  <Label htmlFor="source-news">News outlets</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="source-blogs" 
                    checked={filters.sources.blogs}
                    onCheckedChange={(checked) => handleSourceChange("blogs", checked === true)}
                  />
                  <Label htmlFor="source-blogs">Blogs</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="source-academic" 
                    checked={filters.sources.academic}
                    onCheckedChange={(checked) => handleSourceChange("academic", checked === true)}
                  />
                  <Label htmlFor="source-academic">Academic sources</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="source-social" 
                    checked={filters.sources.social}
                    onCheckedChange={(checked) => handleSourceChange("social", checked === true)}
                  />
                  <Label htmlFor="source-social">Social media</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="source-commercial" 
                    checked={filters.sources.commercial}
                    onCheckedChange={(checked) => handleSourceChange("commercial", checked === true)}
                  />
                  <Label htmlFor="source-commercial">Commercial sites</Label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Region/Location */}
          <AccordionItem value="region">
            <AccordionTrigger>Region</AccordionTrigger>
            <AccordionContent>
              <RadioGroup value={filters.region} onValueChange={handleRegionChange} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="global" id="region-global" />
                  <Label htmlFor="region-global">Global results</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="local" id="region-local" />
                  <Label htmlFor="region-local">Local results</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="AU" id="region-au" />
                  <Label htmlFor="region-au">Australia</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="US" id="region-us" />
                  <Label htmlFor="region-us">United States</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="UK" id="region-uk" />
                  <Label htmlFor="region-uk">United Kingdom</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CA" id="region-ca" />
                  <Label htmlFor="region-ca">Canada</Label>
                </div>
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>

          {/* Content Type */}
          <AccordionItem value="content">
            <AccordionTrigger>Content Type</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="content-text" 
                    checked={filters.contentType.text}
                    onCheckedChange={(checked) => handleContentTypeChange("text", checked === true)}
                  />
                  <Label htmlFor="content-text">Text/Articles</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="content-images" 
                    checked={filters.contentType.images}
                    onCheckedChange={(checked) => handleContentTypeChange("images", checked === true)}
                  />
                  <Label htmlFor="content-images">Images</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="content-videos" 
                    checked={filters.contentType.videos}
                    onCheckedChange={(checked) => handleContentTypeChange("videos", checked === true)}
                  />
                  <Label htmlFor="content-videos">Videos</Label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* AI Preferences */}
          <AccordionItem value="ai">
            <AccordionTrigger>AI Answer Preferences</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                {/* Model Selection */}
                <div className="space-y-2">
                  <Label htmlFor="ai-model">Model</Label>
                  <Select 
                    value={filters.aiPreferences.model} 
                    onValueChange={handleAIModelChange}
                  >
                    <SelectTrigger id="ai-model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-select (Recommended)</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive (Compound Beta)</SelectItem>
                      <SelectItem value="fast">Fast (Compound Beta Mini)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Detail Level */}
                <div className="space-y-2">
                  <Label htmlFor="detail-level">Detail Level</Label>
                  <Select 
                    value={filters.aiPreferences.detailLevel} 
                    onValueChange={handleDetailLevelChange}
                  >
                    <SelectTrigger id="detail-level">
                      <SelectValue placeholder="Select detail level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="detailed">Detailed (Recommended)</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Citation Style */}
                <div className="space-y-2">
                  <Label htmlFor="citation-style">Citation Style</Label>
                  <Select 
                    value={filters.aiPreferences.citationStyle} 
                    onValueChange={handleCitationStyleChange}
                  >
                    <SelectTrigger id="citation-style">
                      <SelectValue placeholder="Select citation style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inline">Inline [Source X]</SelectItem>
                      <SelectItem value="endnotes">Endnotes</SelectItem>
                      <SelectItem value="academic">Academic (APA-style)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sorting Options */}
          <AccordionItem value="sort">
            <AccordionTrigger>Sort By</AccordionTrigger>
            <AccordionContent>
              <RadioGroup value={filters.sort} onValueChange={handleSortChange} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="relevance" id="sort-relevance" />
                  <Label htmlFor="sort-relevance">Relevance</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="date" id="sort-date" />
                  <Label htmlFor="sort-date">Date</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="popularity" id="sort-popularity" />
                  <Label htmlFor="sort-popularity">Popularity</Label>
                </div>
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>

          {/* User Preferences */}
          <AccordionItem value="userPreferences">
            <AccordionTrigger>User Preferences</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="preference-personalized" 
                    checked={filters.userPreferences.personalized}
                    onCheckedChange={(checked) => handleUserPreferenceChange("personalized", checked === true)}
                  />
                  <Label htmlFor="preference-personalized">Personalized Results</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="preference-safeSearch" 
                    checked={filters.userPreferences.safeSearch}
                    onCheckedChange={(checked) => handleUserPreferenceChange("safeSearch", checked === true)}
                  />
                  <Label htmlFor="preference-safeSearch">Safe Search</Label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SheetContent>
    </Sheet>
  );
}
