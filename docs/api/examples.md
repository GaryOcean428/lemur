# Lemur API Examples

This document provides examples of how to use the Lemur API for various use cases.

## Authentication

All API requests require authentication. Here's how to authenticate with different methods:

### Bearer Token

```javascript
const response = await fetch('https://your-lemur-deployment.com/search?q=climate+change', {
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN'
  }
});
```

### API Key

```javascript
const response = await fetch('https://your-lemur-deployment.com/search?q=climate+change&api_key=YOUR_API_KEY');
```

## Basic Search

### Simple Search Query

```javascript
async function performSearch(query) {
  const response = await fetch(`https://your-lemur-deployment.com/search?q=${encodeURIComponent(query)}`);
  return await response.json();
}

const results = await performSearch('renewable energy advancements');
console.log(results);
```

### Specifying Result Mode

```javascript
// Get only AI results
const aiResults = await fetch('https://your-lemur-deployment.com/search?q=quantum+computing&mode=ai');

// Get only web results
const webResults = await fetch('https://your-lemur-deployment.com/search?q=quantum+computing&mode=web');

// Get both (default)
const allResults = await fetch('https://your-lemur-deployment.com/search?q=quantum+computing&mode=all');
```

## Advanced Search Parameters

### Regional Search

```javascript
// Get results specific to Australia
const australianResults = await fetch('https://your-lemur-deployment.com/search?q=local+wildlife&region=AU');
```

### Limiting Results

```javascript
// Get only 5 web results
const limitedResults = await fetch('https://your-lemur-deployment.com/search?q=fast+recipes&limit=5');
```

## MCP Protocol Integration

### Tool Discovery

```javascript
// Fetch available MCP tools
const toolsResponse = await fetch('https://your-lemur-deployment.com/.well-known/mcp.json');
const tools = await toolsResponse.json();
```

### WebSocket Connection

```javascript
// Establish WebSocket connection
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//your-lemur-deployment.com/mcp`;
const socket = new WebSocket(wsUrl);

// Handle connection
socket.onopen = () => {
  console.log('Connected to Lemur MCP');
  
  // Send a tool call
  socket.send(JSON.stringify({
    type: 'tool_call',
    data: {
      name: 'search',
      arguments: {
        query: 'latest AI research',
        mode: 'all'
      }
    }
  }));
};

// Handle messages
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## A2A Protocol Integration

### Discover Agent Capabilities

```javascript
async function discoverAgent() {
  const response = await fetch('https://your-lemur-deployment.com/.well-known/agent.json');
  return await response.json();
}

const agentCapabilities = await discoverAgent();
console.log('Agent capabilities:', agentCapabilities);
```

### Create a Task

```javascript
async function createSearchTask(query) {
  const response = await fetch('https://your-lemur-deployment.com/tasks/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN'
    },
    body: JSON.stringify({
      capability: 'search',
      input: {
        query: query,
        mode: 'all'
      }
    })
  });
  
  return await response.json();
}

// Create a search task
const task = await createSearchTask('renewable energy trends');
console.log('Task created:', task);

// Check task status
async function checkTaskStatus(taskId) {
  const response = await fetch(`https://your-lemur-deployment.com/tasks/${taskId}`, {
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    }
  });
  
  return await response.json();
}

// Poll for results
const taskStatus = await checkTaskStatus(task.id);
console.log('Task status:', taskStatus);
```

## Multi-Modal Input

### Image Analysis

```javascript
async function searchWithImage(imageFile, textQuery) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('query', textQuery || '');
  
  const response = await fetch('https://your-lemur-deployment.com/search/image', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    },
    body: formData
  });
  
  return await response.json();
}

// Example usage with file input
document.getElementById('imageInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    const query = document.getElementById('textQuery').value;
    const results = await searchWithImage(file, query);
    console.log('Image search results:', results);
  }
});
```

### Voice-to-Text

```javascript
async function searchWithVoice(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  
  const response = await fetch('https://your-lemur-deployment.com/search/voice', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_TOKEN'
    },
    body: formData
  });
  
  return await response.json();
}

// Example with recording audio
let mediaRecorder;
let audioChunks = [];

document.getElementById('startRecording').addEventListener('click', async () => {
  audioChunks = [];
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  
  mediaRecorder.addEventListener('dataavailable', (event) => {
    audioChunks.push(event.data);
  });
  
  mediaRecorder.start();
});

document.getElementById('stopRecording').addEventListener('click', async () => {
  mediaRecorder.stop();
  
  mediaRecorder.addEventListener('stop', async () => {
    const audioBlob = new Blob(audioChunks);
    const results = await searchWithVoice(audioBlob);
    console.log('Voice search results:', results);
  });
});
```

## Error Handling

```javascript
async function safeFetch(url, options) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please check your API key or token.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please slow down your requests.');
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.message || error.error || `Error ${response.status}`);
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
```

## Additional Resources

- [Complete API Reference](reference.md)
- [Protocol Integration Guide](../protocols/mcp-a2a-integration.md)
- [Developer Guide](../development/developer-guide.md)