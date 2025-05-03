# Lemur: Technical Architecture for Python Backend

## System Overview

I'll outline a Python-based architecture for Lemur, focusing on the MCP extension system and multi-modal input support.

```
┌────────────────────────────────────────────────────────┐
│                    Client Applications                  │
│  (Web UI, Mobile Apps, API Consumers)                  │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│                   API Gateway Layer                     │
│  FastAPI with OAuth/JWT Authentication                  │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│               Input Processing Layer                    │
├────────────────┬─────────────────┬────────────────────┤
│  Text Parser   │  Voice-to-Text  │  Image Analyzer    │
└────────────────┴─────────────────┴────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│               Core Search Engine                        │
├────────────────┬─────────────────┬────────────────────┤
│ Query Engine   │  Indexing       │  Results Ranking   │
└────────────────┴─────────────────┴────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│               MCP Integration Layer                     │
├────────────────┬─────────────────┬────────────────────┤
│  Model Router  │  MCP Connector  │  Response Builder  │
└────────────────┴─────────────────┴────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│                 External AI Models                      │
│  (Groq, OpenAI, Anthropic, Custom Models)              │
└────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Python Backend Framework
- **FastAPI** as the main framework
  - High performance, async capabilities
  - Native OpenAPI documentation
  - Type hints with Pydantic
- **SQLAlchemy** for ORM with PostgreSQL
- **Redis** for caching and session management

### 2. Multi-Modal Input Processing
- **Voice Processing**:
  - WebSockets for streaming audio input
  - Integration with Whisper API or local models for STT
  - Audio preprocessing with PyDub/Librosa
- **Image Processing**:
  - FastAPI file upload endpoints
  - Image analysis using Vision models
  - CLIP for image understanding/search

### 3. MCP (Model Context Protocol) Integration

The MCP layer is critical for extensibility:

```python
# Example MCP connector architecture
class MCPConnector:
    def __init__(self, config: dict):
        self.config = config
        self.model_registry = {}
        self._load_models()
    
    def _load_models(self):
        # Load models from config
        for model_config in self.config.get("models", []):
            self.register_model(
                model_config["name"],
                model_config["type"],
                model_config.get("parameters", {})
            )
    
    def register_model(self, name: str, model_type: str, params: dict):
        # Factory pattern to instantiate appropriate model handler
        if model_type == "groq":
            self.model_registry[name] = GroqModelHandler(params)
        elif model_type == "openai":
            self.model_registry[name] = OpenAIModelHandler(params)
        # Add more model types as needed
    
    async def process_query(self, query: dict, model_name: str):
        if model_name not in self.model_registry:
            raise ValueError(f"Model {model_name} not registered")
        
        model = self.model_registry[model_name]
        return await model.process(query)
```

### 4. Modular Plugin System

Create a plugin system for easy extensions:

```python
class LemurPlugin:
    def __init__(self, name: str, version: str):
        self.name = name
        self.version = version
    
    async def initialize(self, app: FastAPI):
        """Initialize the plugin with the FastAPI app"""
        pass
    
    async def process_pre_query(self, query: dict) -> dict:
        """Hook for preprocessing queries"""
        return query
    
    async def process_post_query(self, query: dict, results: dict) -> dict:
        """Hook for postprocessing results"""
        return results

# Plugin manager
class PluginManager:
    def __init__(self):
        self.plugins = []
    
    def register_plugin(self, plugin: LemurPlugin):
        self.plugins.append(plugin)
    
    async def initialize_all(self, app: FastAPI):
        for plugin in self.plugins:
            await plugin.initialize(app)
    
    async def run_pre_query_hooks(self, query: dict) -> dict:
        result = query
        for plugin in self.plugins:
            result = await plugin.process_pre_query(result)
        return result
```

## Key Technical Components

### Voice Input Processing
```python
from fastapi import FastAPI, WebSocket
import asyncio
import whisper

app = FastAPI()
model = whisper.load_model("base")

@app.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    await websocket.accept()
    
    audio_data = b""
    try:
        while True:
            # Receive audio chunks
            chunk = await websocket.receive_bytes()
            if not chunk:
                break
            audio_data += chunk
            
            # Process when we have enough data or on silence detection
            if len(audio_data) > MIN_AUDIO_SIZE:
                # Process with Whisper
                text = process_audio(audio_data)
                await websocket.send_json({"text": text})
                audio_data = b""
    except Exception as e:
        await websocket.send_json({"error": str(e)})
```

### Image Processing Integration
```python
from fastapi import File, UploadFile
from PIL import Image
import io
import clip
import torch

# Load CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

@app.post("/image_search")
async def image_search(file: UploadFile = File(...)):
    # Read and preprocess image
    image_data = await file.read()
    image = Image.open(io.BytesIO(image_data))
    image_input = preprocess(image).unsqueeze(0).to(device)
    
    # Generate image embedding
    with torch.no_grad():
        image_features = model.encode_image(image_input)
        image_features /= image_features.norm(dim=-1, keepdim=True)
    
    # Search for related content using the embedding
    results = search_by_embedding(image_features.cpu().numpy()[0])
    
    return {"results": results}
```

## Database Schema

Create a schema that supports the multi-modal search functionality:

```sql
-- User table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Search history
CREATE TABLE search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    query TEXT NOT NULL,
    query_type VARCHAR(20) NOT NULL, -- 'text', 'voice', 'image'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Search results
CREATE TABLE search_results (
    id SERIAL PRIMARY KEY,
    search_id INTEGER REFERENCES search_history(id),
    result_json JSONB NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MCP models configuration
CREATE TABLE mcp_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    config_json JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment Architecture

For a production-ready deployment:

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/lemur
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./plugins:/app/plugins
  
  db:
    image: postgres:14
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=lemur
  
  redis:
    image: redis:7
    volumes:
      - redis_data:/data

  worker:
    build: ./backend
    command: celery -A app.worker worker --loglevel=info
    depends_on:
      - api
      - redis
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/lemur
      - REDIS_URL=redis://redis:6379/0

volumes:
  postgres_data:
  redis_data:
```

## Next Steps

1. Set up the basic FastAPI application structure
2. Implement the MCP connector system
3. Add voice and image processing capabilities
4. Create the plugin system for extensibility
5. Develop the database schema and ORM models
6. Implement caching and performance optimizations
7. Add comprehensive testing (unit, integration, performance)

Would you like me to elaborate on any specific component or provide more detailed implementation examples?