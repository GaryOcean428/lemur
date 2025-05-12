import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function WasmCheck() {
  const [wasmSupport, setWasmSupport] = useState<{
    wasmSupported: boolean;
    sharedArrayBufferSupported: boolean;
    crossOriginIsolated: boolean;
  }>({
    wasmSupported: false,
    sharedArrayBufferSupported: false,
    crossOriginIsolated: false
  });

  useEffect(() => {
    // Check if WebAssembly is supported
    const wasmSupported = typeof WebAssembly === 'object' && 
                         typeof WebAssembly.instantiate === 'function';
    
    // Check if SharedArrayBuffer is supported
    const sharedArrayBufferSupported = typeof SharedArrayBuffer === 'function';
    
    // Check if the page is cross-origin isolated
    const isCrossOriginIsolated = typeof window.crossOriginIsolated === 'boolean' ? 
                               window.crossOriginIsolated : false;
    
    setWasmSupport({
      wasmSupported,
      sharedArrayBufferSupported,
      crossOriginIsolated: isCrossOriginIsolated
    });
    
    // Log to console for debugging
    console.log('WebAssembly Support Check:', {
      wasmSupported,
      sharedArrayBufferSupported,
      crossOriginIsolated,
      headers: {
        'Cross-Origin-Embedder-Policy': document.querySelector('meta[http-equiv="Cross-Origin-Embedder-Policy"]')?.getAttribute('content'),
        'Cross-Origin-Opener-Policy': document.querySelector('meta[http-equiv="Cross-Origin-Opener-Policy"]')?.getAttribute('content')
      }
    });
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">WebAssembly Support</CardTitle>
        <CardDescription>Checking browser compatibility for advanced features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard 
            title="WebAssembly" 
            supported={wasmSupport.wasmSupported} 
            description="Required for advanced search features"
          />
          <FeatureCard 
            title="SharedArrayBuffer" 
            supported={wasmSupport.sharedArrayBufferSupported} 
            description="Required for concurrent processing"
          />
          <FeatureCard 
            title="Cross-Origin Isolation" 
            supported={wasmSupport.crossOriginIsolated} 
            description="Required for optimal performance"
          />
        </div>

        {!wasmSupport.wasmSupported && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>WebAssembly Support Issue</AlertTitle>
            <AlertDescription>
              Your browser doesn't fully support WebAssembly features needed for optimal performance.
              Try using the latest version of Chrome, Firefox, or Edge.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureCard({ title, supported, description }: { 
  title: string; 
  supported: boolean; 
  description: string 
}) {
  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2 mb-2">
        {supported ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500" />
        )}
        <h3 className="font-medium">{title}</h3>
      </div>
      <Badge variant={supported ? "default" : "outline"} className="mb-2">
        {supported ? "Supported" : "Not Supported"}
      </Badge>
      <p className="text-xs text-muted-foreground text-center">{description}</p>
    </div>
  );
}