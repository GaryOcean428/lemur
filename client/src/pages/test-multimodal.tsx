import { useState, useRef } from 'react';
import { Mic, Camera, Loader2, X } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function TestMultimodal() {
  // Voice search states
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [voiceError, setVoiceError] = useState('');
  
  // Image search states
  const [isImageActive, setIsImageActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageSearchId, setImageSearchId] = useState('');
  const [imageSearchResults, setImageSearchResults] = useState<any>(null);
  const [imageSearchError, setImageSearchError] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Voice search functionality
  const startVoiceSearch = () => {
    setIsVoiceActive(true);
    setVoiceError('');
    audioChunksRef.current = [];
    setRecordingProgress(0);

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.addEventListener('dataavailable', event => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        });

        mediaRecorder.addEventListener('stop', async () => {
          setIsRecording(false);
          setRecordingProgress(100);
          
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            await processVoiceRecording(audioBlob);
          } catch (error) {
            console.error('Error processing voice:', error);
            setVoiceError('Failed to process voice recording');
          } finally {
            stream.getTracks().forEach(track => track.stop());
          }
        });

        mediaRecorder.start();
        setIsRecording(true);
        
        const maxDuration = 10000;
        const interval = 100;
        let elapsed = 0;
        
        const updateProgress = setInterval(() => {
          if (elapsed < maxDuration) {
            elapsed += interval;
            setRecordingProgress(Math.min(100, (elapsed / maxDuration) * 100));
          } else {
            clearInterval(updateProgress);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }
        }, interval);

        setTimeout(() => {
          clearInterval(updateProgress);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, maxDuration);
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        setVoiceError('Could not access microphone. Please ensure you have granted permission.');
        setIsVoiceActive(false);
      });
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceSearch = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsVoiceActive(false);
    setVoiceError('');
  };

  const processVoiceRecording = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/voice-transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error transcribing audio: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.text) {
        setTranscription(data.text);
        setIsVoiceActive(false);
      } else {
        setVoiceError('Could not transcribe audio. Please try again.');
      }
    } catch (error) {
      console.error('Error in voice processing:', error);
      setVoiceError('Failed to process voice search. Please try again.');
    }
  };

  // Image search functionality
  const startImageSearch = () => {
    setIsImageActive(true);
    setImageSearchError('');
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setImageSearchId('');
    setImageSearchResults(null);
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
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImagePreviewUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };
  
  const cancelImageSearch = () => {
    setIsImageActive(false);
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setImageSearchError('');
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
        setImageSearchId(data.searchId);
        pollForResults(data.searchId);
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

  const pollForResults = async (searchId: string) => {
    setIsPolling(true);
    let attempts = 0;
    const maxAttempts = 60; // Stop after 60 seconds
    
    const pollInterval = setInterval(async () => {
      try {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(pollInterval);
          setIsPolling(false);
          setImageSearchError('Search processing timed out. Please try again.');
          return;
        }
        
        const response = await fetch(`/api/image-search/${searchId}`);
        if (!response.ok) {
          throw new Error(`Error fetching results: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.status === 'completed' && data.results) {
          setImageSearchResults(data.results);
          setIsPolling(false);
          clearInterval(pollInterval);
        } else if (data.status === 'failed') {
          setImageSearchError(data.error || 'Failed to process search');
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling for results:', error);
        setImageSearchError('Error checking search status');
        setIsPolling(false);
        clearInterval(pollInterval);
      }
    }, 1000); // Check every second
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Multimodal Search Testing</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Voice Search Testing Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Voice Search</h2>
            
            {isVoiceActive ? (
              <div className="p-6 border rounded-lg flex flex-col items-center">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium mb-2">{isRecording ? 'Recording...' : 'Processing...'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isRecording ? 'Speak now. Recording will automatically stop after 10 seconds.' : 'Converting speech to text...'}
                  </p>
                </div>
                
                <div className="relative h-24 w-24 flex items-center justify-center mb-4">
                  <div className={`absolute inset-0 rounded-full ${isRecording ? 'bg-red-500/20 animate-ping' : 'bg-blue-500/20'}`}></div>
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                    {isRecording ? (
                      <Mic className="h-8 w-8" />
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    )}
                  </div>
                </div>
                
                <Progress value={recordingProgress} className="w-full h-2 mb-4" />
                
                <div className="flex gap-2">
                  {isRecording && (
                    <Button 
                      variant="destructive" 
                      onClick={stopVoiceRecording}
                    >
                      Stop Recording
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={cancelVoiceSearch}
                  >
                    Cancel
                  </Button>
                </div>
                
                {voiceError && (
                  <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded">
                    {voiceError}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                <Button 
                  onClick={startVoiceSearch} 
                  className="flex items-center justify-center gap-2"
                >
                  <Mic className="h-5 w-5" />
                  Start Voice Search
                </Button>
                
                {transcription && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Transcription Result:</h3>
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded border dark:border-gray-600">
                      <p className="text-gray-800 dark:text-gray-200">{transcription}</p>
                    </div>
                  </div>
                )}
                
                {voiceError && (
                  <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded">
                    {voiceError}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Image Search Testing Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Image Search</h2>
            
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />
            
            {isImageActive ? (
              <div className="p-6 border rounded-lg">
                {imagePreviewUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="mb-4 relative">
                      <img 
                        src={imagePreviewUrl} 
                        alt="Selected image" 
                        className="max-h-80 rounded-lg object-contain"
                      />
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreviewUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-gray-800/70 text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={submitImageSearch}
                        disabled={isImageUploading || isPolling}
                      >
                        {(isImageUploading || isPolling) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isImageUploading ? 'Uploading...' : isPolling ? 'Processing...' : 'Search with this Image'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={cancelImageSearch}
                        disabled={isImageUploading || isPolling}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-10 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Select an image from your device</p>
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Browse Files
                    </Button>
                  </div>
                )}
                
                {imageSearchError && (
                  <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded">
                    {imageSearchError}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                <Button 
                  onClick={startImageSearch} 
                  className="flex items-center justify-center gap-2"
                >
                  <Camera className="h-5 w-5" />
                  Start Image Search
                </Button>
                
                {imageSearchResults && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Search Results:</h3>
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded border dark:border-gray-600">
                      <p className="font-medium mb-2">Query: {imageSearchResults.query || 'Image search'}</p>
                      
                      <div className="mb-4">
                        <h4 className="font-medium mb-1">AI Answer:</h4>
                        <p className="text-sm whitespace-pre-line">{imageSearchResults.ai?.answer || 'No AI answer generated'}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-1">Web Results:</h4>
                        <p className="text-sm">{imageSearchResults.traditional ? 
                          `Found ${imageSearchResults.traditional.length} results` : 
                          'No web results found'}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {imageSearchError && (
                  <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded">
                    {imageSearchError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
