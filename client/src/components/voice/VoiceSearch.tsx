import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Mic, Loader2, Volume2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AudioRecorderPolyfill from "audio-recorder-polyfill";

if (!window.MediaRecorder) {
  window.MediaRecorder = AudioRecorderPolyfill;
}

interface VoiceSearchProps {
  onSearchComplete?: (result: any) => void;
}

const VoiceSearch = ({ onSearchComplete }: VoiceSearchProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError("");
      
      // Check if user is authenticated and has Pro subscription
      if (!user) {
        setError("You must be logged in to use voice search");
        setIsConnecting(false);
        return;
      }
      
      if (user.subscriptionTier !== 'pro') {
        setError("Voice search requires a Pro subscription");
        setIsConnecting(false);
        return;
      }
      
      // Create new session
      const response = await fetch("/api/voice/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create voice session");
      }
      
      const data = await response.json();
      
      // Connect to WebSocket
      const socket = new WebSocket(data.websocket_url);
      
      socket.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setIsConnecting(false);
      };
      
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === "transcription") {
          setTranscript(message.text);
        } else if (message.type === "text_delta") {
          setResponse(prev => prev + message.text);
        } else if (message.type === "audio_frame") {
          // Process audio frames (text to speech)
          processAudioFrame(message.data);
        } else if (message.type === "search_results") {
          // For mock implementation
          setSearchResults(message.data.results || []);
          setResponse(message.data.answer || "");
          if (onSearchComplete) {
            onSearchComplete(message.data);
          }
        } else if (message.type === "error") {
          setError(message.error);
        }
      };
      
      socket.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error");
        setIsConnected(false);
        setIsConnecting(false);
      };
      
      socket.onclose = () => {
        console.log("WebSocket closed");
        setIsConnected(false);
        setIsListening(false);
      };
      
      socketRef.current = socket;
      
      // Initialize audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
      }
      
    } catch (error) {
      console.error("Error starting voice session:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsConnecting(false);
    }
  };
  
  const processAudioFrame = async (audioData: string) => {
    try {
      if (!audioContextRef.current) return;
      
      // Decode the audio data
      const buffer = Buffer.from(audioData, 'base64');
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
      
      // Decode the audio
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Queue or play the audio
      audioQueueRef.current.push(audioBuffer);
      
      // If not currently playing, start playing
      if (!audioSourceRef.current) {
        playNextAudio();
      }
    } catch (error) {
      console.error("Error processing audio frame:", error);
    }
  };
  
  const playNextAudio = () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) return;
    
    const audioBuffer = audioQueueRef.current.shift();
    if (!audioBuffer) return;
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      audioSourceRef.current = null;
      playNextAudio();
    };
    
    audioSourceRef.current = source;
    source.start();
    setIsPlaying(true);
    
    // Set playing status
    source.onended = () => {
      audioSourceRef.current = null;
      setIsPlaying(false);
      playNextAudio();
    };
  };
  
  const startListening = async () => {
    try {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket not connected");
      }
      
      // Reset state
      setTranscript("");
      setResponse("");
      setIsListening(true);
      setSearchResults([]);
      
      // Get microphone access with audio processing constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      });
      
      // Create a more responsive and continuous media recorder
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000 // Lower bitrate for faster processing
      };
      
      // Fall back to other formats if opus not supported
      const recorder = new MediaRecorder(stream, 
        MediaRecorder.isTypeSupported(options.mimeType) ? options : { mimeType: 'audio/webm' }
      );
      
      mediaRecorderRef.current = recorder;
      
      // Initialize transcript accumulation for real-time searching
      let accumulatedTranscript = "";
      let lastSentTime = Date.now();
      let activeSearch = false;
      
      // Handle audio data for continuous streaming
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          // Process audio chunks immediately
          const reader = new FileReader();
          reader.onloadend = () => {
            if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
            
            const base64data = (reader.result as string).split(',')[1];
            
            // Send audio data to server
            socketRef.current.send(JSON.stringify({
              type: 'audio',
              buffer: base64data
            }));
            
            // Handle real-time search based on transcript updates
            const now = Date.now();
            if (!activeSearch && transcript && 
                transcript !== accumulatedTranscript && 
                transcript.length > 8 && // Only trigger search when we have enough text
                now - lastSentTime > 1500) { // Reduced time between searches for responsiveness
              
              activeSearch = true; // Prevent multiple concurrent searches
              accumulatedTranscript = transcript;
              lastSentTime = now;
              
              // Show user that search is in progress
              setResponse("Searching...");
              
              // Send the current transcript for real-time search
              socketRef.current.send(JSON.stringify({
                type: 'search',
                query: transcript,
                isPartial: true // Indicate this is a partial query while user is still speaking
              }));
              
              // Allow new searches after a short delay
              setTimeout(() => {
                activeSearch = false;
              }, 1000);
            }
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      // Log when recording starts
      recorder.onstart = () => {
        console.log('Recording started - sending audio in real-time');
      };
      
      // Handle recording errors
      recorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setError("Error during recording. Please try again.");
      };
      
      // Start recording with small time slices for near real-time transmission
      recorder.start(200); // Capture data every 200ms for a more responsive feel
      
    } catch (error) {
      console.error("Error starting microphone:", error);
      setError(error instanceof Error ? error.message : "An error accessing microphone");
      setIsListening(false);
      toast({
        title: "Microphone Error",
        description: "Failed to access your microphone. Please check your permissions.",
        variant: "destructive"
      });
    }
  };
  
  const stopListening = () => {
    // Stop the media recorder to stop capturing audio
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Get the tracks from the stream and stop them
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // When the user stops speaking, send the final transcript for a comprehensive search
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // Show loading state
        setResponse("Processing your question...");
        
        // Skip if transcript is empty
        if (!transcript || transcript.trim() === '') {
          setResponse("No speech detected. Please try again.");
          setIsListening(false);
          return;
        }
        
        console.log(`Sending final query: "${transcript}"`); 
        
        // Send the complete transcript for full processing
        socketRef.current.send(JSON.stringify({
          type: 'search',
          query: transcript,
          isPartial: false // Indicate this is the final query - use the comprehensive model
        }));
      }
    }
    
    setIsListening(false);
  };
  
  const closeSession = () => {
    // Clean up media recorder and stream tracks
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        
        // Make sure to stop all tracks in the media stream
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => {
            if (track.readyState === 'live') {
              track.stop();
            }
          });
        }
      } catch (e) {
        console.error('Error cleaning up media recorder:', e);
      }
      mediaRecorderRef.current = null;
    }
    
    // Close WebSocket connection
    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN || 
            socketRef.current.readyState === WebSocket.CONNECTING) {
          socketRef.current.close(1000, 'User closed session');
        }
      } catch (e) {
        console.error('Error closing WebSocket:', e);
      }
      socketRef.current = null;
    }
    
    // Stop any playing audio
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        console.error('Error stopping audio source:', e);
      }
      audioSourceRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {
        console.error('Error closing audio context:', e);
      }
      audioContextRef.current = null;
    }
    
    // Clear the audio queue
    audioQueueRef.current = [];
    
    // Reset all state
    setIsConnected(false);
    setIsListening(false);
    setIsConnecting(false);
    setTranscript("");
    setResponse("");
    setSearchResults([]);
    setError("");
    
    console.log('Voice search session closed and resources cleaned up');
  };
  
  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      closeSession();
    };
  }, []);
  
  return (
    <div className="voice-search-container p-5 bg-card rounded-lg border shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Voice Search</h2>
      
      {error && (
        <div className="bg-destructive/10 p-3 rounded-md mb-4">
          <p className="text-destructive">{error}</p>
        </div>
      )}
      
      <div className="controls flex gap-2 mb-6">
        {!isConnected ? (
          <Button
            disabled={isConnecting}
            onClick={startSession}
            variant="default"
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Start Voice Search
              </>
            )}
          </Button>
        ) : (
          <div className="flex flex-col w-full gap-2">
            <div className="flex gap-2">
              {!isListening ? (
                <Button
                  onClick={startListening}
                  variant="default"
                  className="flex-1"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Start Speaking
                </Button>
              ) : (
                <Button
                  onClick={stopListening}
                  variant="destructive"
                  className="flex-1"
                >
                  <span className="animate-pulse">●</span>&nbsp;
                  Stop Recording
                </Button>
              )}
              
              <Button
                onClick={closeSession}
                variant="outline"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {isPlaying && (
              <div className="flex items-center justify-center p-2 rounded-md bg-primary/10">
                <Volume2 className="h-4 w-4 mr-2 animate-pulse text-primary" />
                <span className="text-sm">Playing audio response...</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {isConnected && (
        <div className="conversation">
          {transcript && (
            <div className="transcript p-4 bg-muted/50 rounded-md mb-4 border-l-4 border-primary">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">You said:</h3>
              <p className="font-medium">{transcript}</p>
            </div>
          )}
          
          {response && (
            <div className="response p-4 bg-muted/50 rounded-md mb-4 border-l-4 border-secondary">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Response:</h3>
              <div className="response-content whitespace-pre-line">{response}</div>
            </div>
          )}
          
          {searchResults.length > 0 && (
            <div className="search-results mt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Sources:</h3>
              <ul className="space-y-2">
                {searchResults.slice(0, 3).map((result, index) => (
                  <li key={index} className="p-3 bg-background rounded-md border">
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                      {result.title}
                    </a>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {result.content}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceSearch;
