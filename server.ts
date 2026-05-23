import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// Since we are compiling as commonjs in production and running tsx in dev, 
// let's derive __dirname safely for ESM
let __filename = '';
let __dirname = '';
try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {
  __filename = __filename || '';
  __dirname = __dirname || process.cwd();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use generous JSON limits for base64 image transfers
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Helper to lazily initialize the GoogleGenAI client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set on the server.');
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // --- API Routes ---

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Proxy to Generate Text (with optional JSON Schema formatting)
  app.post('/api/gemini/generate', async (req, res) => {
    try {
      const { prompt, jsonSchema, model = 'gemini-3.5-flash' } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
      }

      const ai = getGeminiClient();
      const geminiConfig: any = {};
      if (jsonSchema) {
        geminiConfig.responseMimeType = 'application/json';
        geminiConfig.responseSchema = jsonSchema;
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: geminiConfig,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Error generating text:', error);
      res.status(500).json({ error: error.message || 'An unknown error occurred on the server.' });
    }
  });

  // Proxy to Multimodal generation
  app.post('/api/gemini/multimodal', async (req, res) => {
    try {
      const { prompt, imagePart, model = 'gemini-2.5-flash-image' } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
      }
      if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
        return res.status(400).json({ error: 'Image part containing base64 data is required.' });
      }

      const ai = getGeminiClient();
      const geminiParts = [
        {
          inlineData: {
            data: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType || 'image/jpeg',
          }
        },
        { text: prompt }
      ];

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: geminiParts }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Error in multimodal generation:', error);
      res.status(500).json({ error: error.message || 'An unknown error occurred on the server.' });
    }
  });

  // Proxy to get trending advice with search grounding
  app.post('/api/gemini/trending', async (req, res) => {
    try {
      const { cropName, region } = req.body;

      if (!cropName || !region) {
        return res.status(400).json({ error: 'Both cropName and region are required.' });
      }

      const ai = getGeminiClient();
      const prompt = `Provide the latest real-time trending planting advice, sowing timelines, regional tips, and gardening discussions/news for growing "${cropName}" in the region "${region}". Focus on the current year's seasonal suggestions. Use markdown.`;

      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      const sources: Array<{ title: string; uri: string }> = [];
      const chunks = geminiResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web && chunk.web.uri && chunk.web.title) {
            sources.push({
              title: chunk.web.title,
              uri: chunk.web.uri,
            });
          }
        });
      }

      res.json({
        text: geminiResponse.text || 'No active trending advice found.',
        sources: sources.length > 0 ? sources : undefined,
      });
    } catch (error: any) {
      console.error('Error in trending advice generation:', error);
      res.status(500).json({ error: error.message || 'An unknown error occurred on the server.' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} under NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start fullstack server:', err);
});
