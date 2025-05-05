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
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Initialize transcript accumulation
      let accumulatedTranscript = "";
      let lastSentTime = Date.now();
      
      // Handle audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current) {
          // Convert blob to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            if (!socketRef.current) return;
            
            const base64data = (reader.result as string).split(',')[1];
            socketRef.current.send(JSON.stringify({
              type: 'audio',
              buffer: base64data
            }));
            
            // Periodically send the accumulated transcript for searching while user is speaking
            // This enables real-time search as the user talks
            const now = Date.now();
            if (transcript && transcript !== accumulatedTranscript && now - lastSentTime > 2000) {
              accumulatedTranscript = transcript;
              lastSentTime = now;
              
              // Send the current transcript for real-time search
              socketRef.current.send(JSON.stringify({
                type: 'search',
                query: transcript,
                isPartial: true // Indicate this is a partial query while user is still speaking
              }));
            }
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      // Start recording
      mediaRecorder.start(250); // Capture data more frequently (250ms) for a more real-time feel
      
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // When the user stops speaking, send the final transcript for a complete search
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'search',
          query: transcript || "example search query", // Fallback for testing
          isPartial: false // Indicate this is the final query
        }));
      }
    }
    
    setIsListening(false);
  };
  
  const closeSession = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsConnected(false);
    setIsListening(false);
    setTranscript("");
    setResponse("");
    setSearchResults([]);
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
