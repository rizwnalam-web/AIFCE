import { GoogleGenAI, Type } from '@google/genai';
import prisma from './db';

// Initialize Gemini client on server
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

// Log LLM requests to database
export const logLLMRequest = async (
  userId: string | undefined,
  provider: string,
  endpoint: string,
  requestType: string,
  responseTime: number,
  status: string,
  inputTokens?: number,
  outputTokens?: number,
  errorMessage?: string
) => {
  try {
    await prisma.lLMRequestLog.create({
      data: {
        userId,
        provider,
        endpoint,
        requestType,
        responseTime,
        status,
        inputTokens,
        outputTokens,
        errorMessage,
      },
    });
  } catch (error) {
    console.error('Failed to log LLM request:', error);
  }
};

// Generate weather analysis
export const generateWeatherAnalysis = async (
  location: string,
  weatherData: string,
  userId?: string
): Promise<string> => {
  const startTime = Date.now();
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analyze this weather data for farming purposes: ${weatherData}\nLocation: ${location}\n\nProvide practical farming advice based on the weather.`,
            },
          ],
        },
      ],
    });

    const responseTime = Date.now() - startTime;
    const content = response.candidates?.[0]?.content?.parts?.[0];

    if (content && 'text' in content) {
      await logLLMRequest(
        userId,
        'gemini',
        '/api/llm/weather-analysis',
        'weather',
        responseTime,
        'success'
      );
      return content.text;
    }

    throw new Error('Invalid response from Gemini API');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logLLMRequest(
      userId,
      'gemini',
      '/api/llm/weather-analysis',
      'weather',
      responseTime,
      'error',
      undefined,
      undefined,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

// Analyze crop health
export const analyzeCropHealth = async (
  cropType: string,
  description: string,
  imageBase64?: string,
  userId?: string
): Promise<string> => {
  const startTime = Date.now();
  try {
    const client = getGeminiClient();

    const parts: any[] = [
      {
        text: `Analyze the health of this ${cropType} plant. Description: ${description}\n\nProvide a detailed assessment and treatment plan.`,
      },
    ];

    if (imageBase64) {
      parts.unshift({
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg',
        },
      });
    }

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: parts,
        },
      ],
    });

    const responseTime = Date.now() - startTime;
    const content = response.candidates?.[0]?.content?.parts?.[0];

    if (content && 'text' in content) {
      await logLLMRequest(
        userId,
        'gemini',
        '/api/llm/crop-health',
        'crop_analysis',
        responseTime,
        'success'
      );
      return content.text;
    }

    throw new Error('Invalid response from Gemini API');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logLLMRequest(
      userId,
      'gemini',
      '/api/llm/crop-health',
      'crop_analysis',
      responseTime,
      'error',
      undefined,
      undefined,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

// Generate watering recommendations
export const generateWateringRecommendations = async (
  cropType: string,
  location: string,
  weatherData: string,
  userId?: string
): Promise<string> => {
  const startTime = Date.now();
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Generate watering recommendations for ${cropType} in ${location}. Weather: ${weatherData}\n\nProvide specific watering schedule and best practices.`,
            },
          ],
        },
      ],
    });

    const responseTime = Date.now() - startTime;
    const content = response.candidates?.[0]?.content?.parts?.[0];

    if (content && 'text' in content) {
      await logLLMRequest(
        userId,
        'gemini',
        '/api/llm/watering-recommendations',
        'watering',
        responseTime,
        'success'
      );
      return content.text;
    }

    throw new Error('Invalid response from Gemini API');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logLLMRequest(
      userId,
      'gemini',
      '/api/llm/watering-recommendations',
      'watering',
      responseTime,
      'error',
      undefined,
      undefined,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

// Generate fertilization plan
export const generateFertilizationPlan = async (
  cropType: string,
  soilData: string,
  weatherData: string,
  userId?: string
): Promise<string> => {
  const startTime = Date.now();
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Create a fertilization plan for ${cropType}. Soil data: ${soilData}\nWeather: ${weatherData}\n\nProvide detailed fertilization schedule with product recommendations.`,
            },
          ],
        },
      ],
    });

    const responseTime = Date.now() - startTime;
    const content = response.candidates?.[0]?.content?.parts?.[0];

    if (content && 'text' in content) {
      await logLLMRequest(
        userId,
        'gemini',
        '/api/llm/fertilization',
        'fertilization',
        responseTime,
        'success'
      );
      return content.text;
    }

    throw new Error('Invalid response from Gemini API');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logLLMRequest(
      userId,
      'gemini',
      '/api/llm/fertilization',
      'fertilization',
      responseTime,
      'error',
      undefined,
      undefined,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

// Check for weather alerts
export const checkForWeatherAlerts = async (
  location: string,
  weatherData: string,
  userId?: string
): Promise<string[]> => {
  const startTime = Date.now();
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Check weather data for ${location} and identify any farming alerts or warnings: ${weatherData}\n\nReturn a JSON array of alert strings. If no alerts, return an empty array. Return ONLY valid JSON.`,
            },
          ],
        },
      ],
    });

    const responseTime = Date.now() - startTime;
    const content = response.candidates?.[0]?.content?.parts?.[0];

    if (content && 'text' in content) {
      const alerts = JSON.parse(content.text);
      await logLLMRequest(
        userId,
        'gemini',
        '/api/llm/weather-alerts',
        'alerts',
        responseTime,
        'success'
      );
      return Array.isArray(alerts) ? alerts : [];
    }

    throw new Error('Invalid response from Gemini API');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logLLMRequest(
      userId,
      'gemini',
      '/api/llm/weather-alerts',
      'alerts',
      responseTime,
      'error',
      undefined,
      undefined,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

// Compare crops
export const compareCrops = async (
  cropNames: string[],
  userId?: string
): Promise<string> => {
  const startTime = Date.now();
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Compare the following crops: ${cropNames.join(', ')}\n\nProvide comparison in sunlight, soil, water requirements, harvest time, and common pests. Format as JSON.`,
            },
          ],
        },
      ],
    });

    const responseTime = Date.now() - startTime;
    const content = response.candidates?.[0]?.content?.parts?.[0];

    if (content && 'text' in content) {
      await logLLMRequest(
        userId,
        'gemini',
        '/api/llm/crop-comparison',
        'comparison',
        responseTime,
        'success'
      );
      return content.text;
    }

    throw new Error('Invalid response from Gemini API');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logLLMRequest(
      userId,
      'gemini',
      '/api/llm/crop-comparison',
      'comparison',
      responseTime,
      'error',
      undefined,
      undefined,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

// Get crop encyclopedia info
export const getCropEncyclopediaInfo = async (
  cropName: string,
  userId?: string
): Promise<string> => {
  const startTime = Date.now();
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Provide comprehensive encyclopedia information about growing ${cropName}. Include: best growing season, climate zones, sunlight requirements, soil type, water needs, fertilizer recommendations, common pests/diseases, harvest time, yield expectations, and storage tips.`,
            },
          ],
        },
      ],
    });

    const responseTime = Date.now() - startTime;
    const content = response.candidates?.[0]?.content?.parts?.[0];

    if (content && 'text' in content) {
      await logLLMRequest(
        userId,
        'gemini',
        '/api/llm/crop-encyclopedia',
        'encyclopedia',
        responseTime,
        'success'
      );
      return content.text;
    }

    throw new Error('Invalid response from Gemini API');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logLLMRequest(
      userId,
      'gemini',
      '/api/llm/crop-encyclopedia',
      'encyclopedia',
      responseTime,
      'error',
      undefined,
      undefined,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};
