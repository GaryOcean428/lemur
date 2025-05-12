import express from 'express';
import { authenticateFirebaseToken, startServer } from './index';

const app = express();
const port = process.env.PORT || 3000;

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

// Start the server
startServer(app, port);