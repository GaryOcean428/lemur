import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Mic, Camera, Search, X, Loader2 } from "lucide-react";
import { fetchSearchSuggestions } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import SubscriptionPrompt from "./SubscriptionPrompt";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface SearchFormProps {
  initialQuery?: string;
}

export default function SearchForm({ initialQuery = "" }: SearchFormProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const [subscriptionPromptMessage, setSubscriptionPromptMessage] = useState("");
  
  // Voice search states
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [voiceSearchError, setVoiceSearchError] = useState<string | null>(null);
  
  // Image search states
  const [isImageSearchActive, setIsImageSearchActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);
  
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Fetch suggestions when the search query changes
  useEffect(() => {
    async function fetchSuggestions() {
      if (searchQuery.length >= 2) {
        try {
          const results = await fetchSearchSuggestions(searchQuery);
          setSuggestions(results);
          if (results.length > 0) {
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
    
    // Use our custom debounce by wrapping the function call
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);
  
  // Handle clicks outside the form to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    
    setShowSuggestions(false);
    
    // Check search limits for non-authenticated users
    if (!user) {
      // For anonymous users, we'll check if they've already performed a search
      // This is a client-side check; the server will also enforce this limit
      const anonymousSearchCount = localStorage.getItem('anonymousSearchCount');
      if (anonymousSearchCount && parseInt(anonymousSearchCount) >= 1) {
        setSubscriptionPromptMessage("You've reached the limit for anonymous searches. Create a free account to continue.");
        setShowSubscriptionPrompt(true);
        return;
      } else {
        // Increment local storage counter (server will also track this)
        localStorage.setItem('anonymousSearchCount', '1');
      }
    } else if (user.subscriptionTier === 'free' && user.searchCount >= 5) {
      // For free tier users, we'll check their search count
      setSubscriptionPromptMessage("You've reached your limit of free searches. Upgrade to continue searching with Lemur.");
      setShowSubscriptionPrompt(true);
      return;
    }
    
    // Proceed with search
    setLocation(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    
    // We'll reuse the same limit checking logic from handleSubmit
    if (!user) {
      const anonymousSearchCount = localStorage.getItem('anonymousSearchCount');
      if (anonymousSearchCount && parseInt(anonymousSearchCount) >= 1) {
        setSubscriptionPromptMessage("You've reached the limit for anonymous searches. Create a free account to continue.");
        setShowSubscriptionPrompt(true);
        return;
      } else {
        localStorage.setItem('anonymousSearchCount', '1');
      }
    } else if (user.subscriptionTier === 'free' && user.searchCount >= 5) {
      setSubscriptionPromptMessage("You've reached your limit of free searches. Upgrade to continue searching with Lemur.");
      setShowSubscriptionPrompt(true);
      return;
    }
    
    // Proceed with search
    setLocation(`/search?q=${encodeURIComponent(suggestion)}`);
  };
  
  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Voice search functionality
  const startVoiceSearch = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceSearchError("Voice recording is not supported in your browser");
      return;
    }

    setIsVoiceSearchActive(true);
    setVoiceSearchError(null);
    audioChunksRef.current = [];
    setRecordingProgress(0);

    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        // Set up recording event listeners
        mediaRecorder.addEventListener('dataavailable', event => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        });

        // When recording stops
        mediaRecorder.addEventListener('stop', async () => {
          setIsRecording(false);
          setRecordingProgress(100);
          
          try {
            // Process the audio for transcription
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            await processVoiceSearch(audioBlob);
          } catch (error) {
            console.error('Error processing voice search:', error);
            setVoiceSearchError('Failed to process voice recording');
          } finally {
            // Close the media stream tracks
            stream.getTracks().forEach(track => track.stop());
          }
        });

        // Start recording
        mediaRecorder.start();
        setIsRecording(true);
        
        // Set a maximum recording duration (10 seconds)
        const maxRecordingDuration = 10000;
        const progressInterval = 100;
        let elapsedTime = 0;
        
        const updateProgress = setInterval(() => {
          if (elapsedTime < maxRecordingDuration) {
            elapsedTime += progressInterval;
            setRecordingProgress(Math.min(100, (elapsedTime / maxRecordingDuration) * 100));
          } else {
            clearInterval(updateProgress);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }
        }, progressInterval);

        // Automatically stop after max duration
        setTimeout(() => {
          clearInterval(updateProgress);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, maxRecordingDuration);
        
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        setVoiceSearchError('Could not access microphone. Please ensure you have granted permission.');
        setIsVoiceSearchActive(false);
      });
  };

  const stopVoiceSearch = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceSearch = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsVoiceSearchActive(false);
    setVoiceSearchError(null);
  };

  // Process the voice recording to transcribe and search
  const processVoiceSearch = async (audioBlob: Blob) => {
    try {
      // Create a FormData object to send the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Send to the transcription endpoint
      const response = await fetch('/api/voice-transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error transcribing audio: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.text) {
        // Set the search query to the transcribed text and close the voice search dialog
        setSearchQuery(data.text);
        setIsVoiceSearchActive(false);
        
        // If we have a valid transcription, proceed with search
        if (data.text.trim()) {
          setLocation(`/search?q=${encodeURIComponent(data.text.trim())}`);
        }
      } else {
        setVoiceSearchError('Could not transcribe audio. Please try again.');
      }
    } catch (error) {
      console.error('Error in voice search processing:', error);
      setVoiceSearchError('Failed to process voice search. Please try again.');
    }
  };

  // Image search functionality
  const startImageSearch = () => {
    setIsImageSearchActive(true);
    setImageSearchError(null);
    setSelectedImage(null);
    setImagePreviewUrl(null);
    // Trigger the hidden file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setImageSearchError('Please select a valid image file');
      return;
    }
    
    setSelectedImage(file);
    
    // Create a preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImagePreviewUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };
  
  const cancelImageSearch = () => {
    setIsImageSearchActive(false);
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setImageSearchError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const submitImageSearch = async () => {
    if (!selectedImage) {
      setImageSearchError('Please select an image to search');
      return;
    }
    
    setIsImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      
      const response = await fetch('/api/image-search', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Error in image search: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.searchId) {
        // Redirect to the image search results page
        setIsImageSearchActive(false);
        setLocation(`/search/image/${data.searchId}`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error in image search:', error);
      setImageSearchError('Failed to process image search. Please try again.');
    } finally {
      setIsImageUploading(false);
    }
  };

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="w-full relative">
        <div className="relative flex items-center rounded-full border shadow-sm overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10"></div>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search for anything..." 
            className="flex-grow px-5 py-4 outline-none text-base w-full bg-transparent relative z-10 dark:text-white dark:placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          />
          <div className="flex items-center px-2 absolute right-0 z-10">
            {searchQuery ? (
              <button 
                type="button" 
                onClick={clearSearch}
                className="p-2 text-gray-400 hover:text-[hsl(var(--primary))] dark:hover:text-primary-light transition-colors" 
                aria-label="Clear Search" 
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
            <button 
              type="button" 
              className="p-2 text-gray-400 hover:text-[hsl(var(--primary))] dark:hover:text-primary-light transition-colors" 
              aria-label="Voice Search" 
              onClick={startVoiceSearch}
            >
              <Mic className="h-5 w-5" />
            </button>
            <button 
              type="button" 
              className="p-2 text-gray-400 hover:text-[hsl(var(--primary))] dark:hover:text-primary-light transition-colors" 
              aria-label="Image Search" 
              onClick={startImageSearch}
            >
              <Camera className="h-5 w-5" />
            </button>
            <button 
              type="submit" 
              className="ml-1 bg-[hsl(var(--primary))] text-white font-medium px-6 py-2 rounded-full relative overflow-hidden group"
              aria-label="Search"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
              <span className="flex items-center">
                <Search className="h-4 w-4 mr-1" />
                Search
              </span>
            </button>
          </div>
        </div>
        
        {/* Search suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden z-50 border dark:border-gray-700">
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Search className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="text-gray-800 dark:text-gray-200">{suggestion}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Hidden file input for image search */}
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={handleImageFileChange} 
        />
      </form>
      
      {/* Voice Search Dialog */}
      <Dialog open={isVoiceSearchActive} onOpenChange={setIsVoiceSearchActive}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Search</DialogTitle>
            <DialogDescription>
              Speak clearly into your microphone. Your voice will be automatically converted to text.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            {voiceSearchError ? (
              <div className="text-red-500 text-center">
                <p>{voiceSearchError}</p>
              </div>
            ) : isRecording ? (
              <>
                <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full animate-pulse bg-primary/20"></div>
                  <Mic className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <Progress value={recordingProgress} className="w-full h-2" />
                <p className="text-sm text-gray-500">Listening...</p>
              </>
            ) : recordingProgress === 100 ? (
              <>
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                </div>
                <p className="text-sm text-gray-500">Processing your voice...</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="h-10 w-10 text-primary" />
                </div>
                <p className="text-sm text-gray-500">Click Start to begin recording</p>
              </>
            )}
          </div>
          <div className="flex justify-between gap-4">
            <Button variant="outline" onClick={cancelVoiceSearch} disabled={recordingProgress === 100}>
              Cancel
            </Button>
            {isRecording ? (
              <Button onClick={stopVoiceSearch} className="bg-red-500 hover:bg-red-600 text-white">
                Stop Recording
              </Button>
            ) : recordingProgress === 0 ? (
              <Button onClick={startVoiceSearch}>
                Start Recording
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Image Search Dialog */}
      <Dialog open={isImageSearchActive} onOpenChange={setIsImageSearchActive}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search with Image</DialogTitle>
            <DialogDescription>
              Upload an image to search for similar content or get information about what's in the picture.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            {imageSearchError && (
              <div className="text-red-500 text-center">
                <p>{imageSearchError}</p>
              </div>
            )}
            {imagePreviewUrl ? (
              <div className="relative w-full max-h-60 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                <img 
                  src={imagePreviewUrl} 
                  alt="Selected image for search" 
                  className="w-full h-auto object-contain"
                />
                <button 
                  className="absolute top-2 right-2 p-1 bg-white/80 dark:bg-black/50 rounded-full"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreviewUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Click to select an image or drag and drop</p>
              </div>
            )}
          </div>
          <div className="flex justify-between gap-4">
            <Button variant="outline" onClick={cancelImageSearch} disabled={isImageUploading}>
              Cancel
            </Button>
            <Button 
              onClick={submitImageSearch} 
              disabled={!selectedImage || isImageUploading}
              className="relative"
            >
              {isImageUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : 'Search with this Image'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Subscription prompt dialog */}
      <SubscriptionPrompt 
        open={showSubscriptionPrompt} 
        onOpenChange={setShowSubscriptionPrompt} 
        message={subscriptionPromptMessage}
        showSignInOption={!user}
      />
    </>
  );
}
