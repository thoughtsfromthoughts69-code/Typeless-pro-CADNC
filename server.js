import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test Gemini API connection
app.get('/api/test-connection', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      message: 'No GEMINI_API_KEY configured in environment or request header.'
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond with OK',
    });
    return res.json({
      success: true,
      message: 'Connection successful to Gemini API.',
      text: response.text
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error connecting to Gemini API.'
    });
  }
});

// Gemini CAD synthesis proxy endpoint
app.post('/api/generate', async (req, res) => {
  const { prompt, model = 'gemini-2.5-flash', systemInstruction } = req.body;
  const apiKey = req.headers['x-api-key'] || req.body.apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt parameter' });
  }

  if (!apiKey) {
    return res.status(400).json({
      error: 'GEMINI_API_KEY not found. Please provide an API key in the environment or Settings tab.'
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error('Gemini generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate content from Gemini API'
    });
  }
});

// Static files
app.use(express.static(__dirname));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Typeless CAD-CNC running on http://${HOST}:${PORT}`);
});
