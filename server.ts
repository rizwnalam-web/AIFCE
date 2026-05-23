import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import prisma, { testConnection, disconnectPrisma } from './server/db';
import appStateRoutes from './server/routes/appStateRoutes';
import llmRoutes from './server/routes/llmRoutes';
import authRoutes from './server/routes/authRoutes';

// Load environment variables from .env file
dotenv.config();

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
  // Test database connection on startup
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Make sure PostgreSQL is running and DATABASE_URL is correct.');
    process.exit(1);
  }

  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
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

  // Database health check
  app.get('/api/db-health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'connected', message: 'Database is healthy' });
    } catch (error) {
      res.status(500).json({ status: 'disconnected', error: 'Database connection failed' });
    }
  });

  // Mount auth routes
  app.use('/api/auth', authRoutes);

  // Mount app state routes
  app.use('/api/app-state', appStateRoutes);

  // Mount LLM routes
  app.use('/api/llm', llmRoutes);

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

  app.listen(PORT, 'localhost', () => {
    console.log(`Server running on http://localhost:${PORT} under NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await disconnectPrisma();
    process.exit(0);
  });
}

startServer().catch((err) => {
  console.error('Failed to start fullstack server:', err);
  process.exit(1);
});
