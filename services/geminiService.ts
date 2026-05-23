import { GoogleGenAI, Type } from "@google/genai";
import { ApiConfig } from "../types";

// --- Configuration and Utility Functions ---

const getSettingsFromStorage = () => {
  try {
    const appStateString = localStorage.getItem('farmAppState');
    if (appStateString) {
      const appState = JSON.parse(appStateString);
      const settings = appState.settings || {};
      const units = settings.units || 'imperial';
      return {
        units: units,
        theme: settings.theme || 'dark',
        temperatureUnit: settings.temperatureUnit || (units === 'metric' ? 'celsius' : 'fahrenheit'),
      };
    }
  } catch (e) {
    console.error("Could not parse settings from localStorage", e);
  }
  return { units: 'imperial', theme: 'dark', temperatureUnit: 'fahrenheit' };
};

const getActiveProviderConfig = (): ApiConfig => {
  try {
    const appStateString = localStorage.getItem('farmAppState');
    if (!appStateString) {
      throw new Error("App state not found in localStorage. Please configure an API provider.");
    }
    
    const appState = JSON.parse(appStateString);
    const configs: ApiConfig[] = appState.apiConfigurations || [];
    const activeId = appState.activeApiProviderId;

    if (configs.length === 0) {
      throw new Error(`No API Providers are configured. Please add one in the settings.`);
    }

    const activeConfig = configs.find(c => c.id === activeId);

    if (!activeConfig) {
      const fallbackConfig = configs[0];
       if (!fallbackConfig) {
          throw new Error('No API Key is configured. Please add one in the settings.');
       }
       console.warn(`Active provider with ID "${activeId}" not found. Falling back to "${fallbackConfig.name}".`);
       return fallbackConfig;
    }

    return activeConfig;
  } catch (e) {
    console.error("Error getting provider credentials:", e);
    throw e;
  }
};

export const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string)?.split(',')[1] || '');
    reader.readAsDataURL(file);
  });
  return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type } };
};


// --- Core API Abstraction Layer ---

const handleApiError = async (response: Response, providerName: string) => {
    const errorBody = await response.text();
    console.error(`${providerName} API Error:`, response.status, errorBody);
    // Try to parse a meaningful message from the error body
    try {
        const errorJson = JSON.parse(errorBody);
        const message = errorJson.error?.message || errorJson.message || 'No specific error message provided.';
        throw new Error(`${providerName} API Error: ${message}`);
    } catch {
        throw new Error(`${providerName} API request failed with status ${response.status}. See console for the full response.`);
    }
};

/**
 * Generates text content using the currently active AI provider.
 * Handles JSON schema enforcement by modifying the prompt for non-Gemini providers.
 */
const generateText = async (prompt: string, jsonSchema: any = null): Promise<string> => {
    const config = getActiveProviderConfig();
    let finalPrompt = prompt;

    // For providers that don't have a native JSON mode via an API parameter,
    // we instruct them within the prompt itself.
    if (jsonSchema && (config.provider === 'anthropic' || config.provider === 'cohere')) {
        finalPrompt += `\n\nIMPORTANT: Respond with ONLY a valid JSON object that conforms to this schema:\n${JSON.stringify(jsonSchema, null, 2)}`;
    }

    switch (config.provider) {
        case 'gemini':
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const geminiConfig: any = {};
            if (jsonSchema) {
                geminiConfig.responseMimeType = 'application/json';
                geminiConfig.responseSchema = jsonSchema;
            }
            const geminiResponse = await ai.models.generateContent({
                model: config.model,
                contents: finalPrompt,
                config: geminiConfig,
            });
            return geminiResponse.text;

        case 'anthropic':
            const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.model,
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: finalPrompt }],
                }),
            });
            if (!anthropicResponse.ok) await handleApiError(anthropicResponse, 'Anthropic');
            const anthropicData = await anthropicResponse.json();
            return anthropicData.content[0].text;

        case 'cohere':
            const cohereResponse = await fetch('https://api.cohere.ai/v1/chat', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.model,
                    message: finalPrompt,
                }),
            });
            if (!cohereResponse.ok) await handleApiError(cohereResponse, 'Cohere');
            const cohereData = await cohereResponse.json();
            return cohereData.text;

        default:
            throw new Error(`Provider '${config.provider}' is not yet implemented.`);
    }
};

/**
 * Generates content from multimodal input (text and an image).
 * Currently supports Gemini and Anthropic.
 */
const generateMultimodal = async (textPrompt: string, imagePart: { inlineData: { data: string, mimeType: string } }): Promise<string> => {
    const config = getActiveProviderConfig();

    switch (config.provider) {
        case 'gemini':
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const geminiParts = [imagePart, { text: textPrompt }];
            const geminiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: geminiParts } });
            return geminiResponse.text;

        case 'anthropic':
            const anthropicParts = [
                { type: 'image', source: { type: 'base64', media_type: imagePart.inlineData.mimeType, data: imagePart.inlineData.data } },
                { type: 'text', content: textPrompt }
            ];
            const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.model,
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: anthropicParts }],
                }),
            });
            if (!anthropicResponse.ok) await handleApiError(anthropicResponse, 'Anthropic');
            const anthropicData = await anthropicResponse.json();
            return anthropicData.content[0].text;

        case 'cohere':
            throw new Error(`Image analysis is not supported for the Cohere provider in this application.`);

        default:
            throw new Error(`Provider '${config.provider}' is not implemented for multimodal generation.`);
    }
};


// --- Public Service Functions ---

export const getGrowingPlan = async (plotSize: string, sunExposure: string, plants: string, season: string, location: string): Promise<string> => {
  try {
    const { units } = getSettingsFromStorage();
    const plotUnit = units === 'imperial' ? 'feet' : 'meters';
    const prompt = `You are an expert agriculturalist. Given a plot of land in ${location} during the ${season} season, with a size of ${plotSize} (in square ${plotUnit}), sun exposure of ${sunExposure}, and a list of desired plants: ${plants}. Create an optimal, detailed planting layout plan to maximize yield and plant health. The plan should be specific to the climate of the location and the time of year. Provide the plan as a step-by-step guide with clear actions. Use markdown for formatting.`;
    return await generateText(prompt);
  } catch (error) {
    return `Failed to generate a growing plan. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const getWeatherForecast = async (location: string): Promise<string> => {
    try {
        const { units, temperatureUnit } = getSettingsFromStorage();
        const tempUnit = temperatureUnit === 'fahrenheit' ? 'Fahrenheit' : 'Celsius';
        const windUnit = units === 'imperial' ? 'mph' : 'km/h';
        const prompt = `Provide a 7-day weather forecast for ${location}. Give temperatures in ${tempUnit} and wind speed in ${windUnit}.`;
        const schema = {
            type: Type.OBJECT,
            properties: {
                location: { type: Type.STRING },
                forecast: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.STRING },
                            high: { type: Type.STRING },
                            low: { type: Type.STRING },
                            precipitation: { type: Type.STRING },
                            wind: { type: Type.STRING },
                            description: { type: Type.STRING },
                        },
                    },
                },
            },
        };
        return await generateText(prompt, schema);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return JSON.stringify({ error: `Failed to fetch weather data. ${errorMessage}` });
    }
};

export const getWateringEstimate = async (cropType: string, location: string, soilMoisture?: string): Promise<string> => {
  try {
    const { temperatureUnit } = getSettingsFromStorage();
    const tempUnit = temperatureUnit === 'fahrenheit' ? 'Fahrenheit' : 'Celsius';
    let prompt = `You are an agricultural water management expert. For ${cropType} crops planted in ${location}, create a detailed daily watering schedule for the next 7 days. First, briefly state the current weather forecast for the location (with temperatures in ${tempUnit}), then provide the schedule.`;

    if (soilMoisture && soilMoisture.trim() !== '') {
        prompt += ` The current soil moisture level from a sensor is ${soilMoisture}%. Take this critical data into account to provide a more accurate schedule. Specifically mention how this sensor reading influences your recommendations (e.g., delaying or increasing watering).`;
    }
    prompt += ` Consider factors like typical plant needs, weather conditions (temperature, rain probability), and soil moisture retention. Explain your reasoning. Use markdown for formatting.`;
    
    return await generateText(prompt);
  } catch (error) {
    return `Failed to generate a watering estimate. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const getFertilizationPlan = async (cropType: string, location: string, imagePart: {inlineData: {data:string, mimeType: string}} | null, healthDescription: string): Promise<string> => {
  try {
    if (imagePart) {
        const prompt = `You are a plant pathologist and agronomist. Analyze this image of a ${cropType} plant.
1. **Disease/Pest Identification**: First, identify any visible signs of common plant diseases or pests. Be specific (e.g., "powdery mildew," "aphids," "late blight"). If no disease is apparent, state that the plant appears healthy.
2. **Treatment & Prevention**: If a disease or pest is identified, provide specific, actionable treatment recommendations. Include both organic and conventional options if possible. Specify application methods, frequency, and suggest preventative measures to avoid future issues.
3. **Fertilization Plan**: Based on the plant's overall visual health (considering any diseases) and the current weather in ${location}, provide a detailed fertilization plan. Identify potential nutrient deficiencies. Explain the type of fertilizer, amount, and application schedule.
4. **General Health Tips**: Provide a brief section with general health tips and best practices for growing ${cropType}. Include advice on ideal sunlight, watering, and soil conditions.
Use markdown for formatting, with clear headings for each section (e.g., "## Disease Detection", "## Treatment & Prevention", "## Fertilization Schedule", "## General Health Tips").`;
        return await generateMultimodal(prompt, imagePart);
    } else {
        const prompt = `You are a plant pathologist and agronomist. A farmer describes their ${cropType} plants as: "${healthDescription}".
1. **Potential Disease Diagnosis**: Based on the description, diagnose potential common plant diseases or pest issues.
2. **Treatment & Prevention**: Provide specific, actionable treatment recommendations for the likely issues. Include both organic and conventional options, and suggest preventative measures.
3. **Fertilization Plan**: Based on the description and the weather in ${location}, provide a detailed fertilization plan.
4. **General Health Tips**: Provide a brief section with general health tips and best practices for growing ${cropType}. Include advice on ideal sunlight, watering, and soil conditions.
Use markdown for formatting, with clear headings for each section (e.g., "## Potential Diagnosis", "## Treatment & Prevention", "## Fertilization Schedule", "## General Health Tips").`;
        return await generateText(prompt);
    }
  } catch (error) {
    return `Failed to generate a fertilization plan. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const getHistoricalWeather = async (location: string, startDate: string, endDate: string): Promise<string> => {
    try {
        const { temperatureUnit } = getSettingsFromStorage();
        const tempUnit = temperatureUnit === 'fahrenheit' ? 'Fahrenheit' : 'Celsius';
        const prompt = `You are a historical weather data service. Provide the historical weather data for ${location} from ${startDate} to ${endDate}. Return temperatures in ${tempUnit}.`;
        const schema = {
            type: Type.OBJECT,
            properties: {
                location: { type: Type.STRING },
                data: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING },
                            high: { type: Type.STRING },
                            low: { type: Type.STRING },
                            precipitation: { type: Type.STRING },
                            description: { type: Type.STRING },
                        },
                    },
                },
            },
        };
        return await generateText(prompt, schema);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return JSON.stringify({ error: `Failed to fetch historical weather data. ${errorMessage}` });
    }
};

export const checkForAlerts = async (location: string): Promise<string[] | null> => {
    try {
        const forecastString = await getWeatherForecast(location);
        const forecastData = JSON.parse(forecastString);

        if (forecastData.error) {
            console.error(`Could not get forecast for ${location} to check for alerts.`);
            return null;
        }

        const { units, temperatureUnit } = getSettingsFromStorage();
        const tempUnit = temperatureUnit === 'fahrenheit' ? '32°F' : '0°C';
        const windUnit = units === 'imperial' ? '25 mph' : '40 km/h';

        const prompt = `You are an agricultural meteorologist. Analyze the following 7-day weather forecast JSON for ${location} and identify any critical weather warnings for farmers. Focus on:
- Frost warnings (temperatures near or below ${tempUnit}).
- Heavy rainfall (significant precipitation amounts that could lead to flooding or crop damage).
- Strong winds (e.g., over ${windUnit}).
- Extreme heat waves (multiple consecutive days of unusually high temperatures).

For each warning, provide a concise, one-sentence alert prefixed with the location. For example: "${location}: Frost warning for Tuesday night with temperatures dropping to 30°F." If there are multiple warnings for a location, list each on a new line. If there are no critical warnings, you MUST respond with the exact word "NONE".

Forecast JSON:
${JSON.stringify(forecastData, null, 2)}`;

        const resultText = await generateText(prompt);
        
        if (resultText.trim().toUpperCase() === 'NONE') {
            return null;
        }
        
        return resultText.split('\n').map(line => line.trim().replace(/^- /, '')).filter(line => line.length > 0);

    } catch (error) {
        console.error(`Error checking for weather alerts in ${location}:`, error);
        return null;
    }
};

export const getCropInfo = async (cropName: string): Promise<string> => {
  try {
    const prompt = `You are an agricultural encyclopedia. Provide a detailed guide for the crop: "${cropName}". Structure the information under the following headings in markdown to follow a logical crop lifecycle:
- **Overview**: A brief introduction to the crop.
- **Ideal Growing Conditions**: Information on sunlight, soil type and pH, temperature, and watering needs.
- **Propagation Methods**: Describe common ways to propagate the plant (e.g., from seed, cuttings, division).
- **Cultivation Guide**: Step-by-step instructions from planting/seeding to getting ready for harvest.
- **Harvesting Techniques & Window**: Detailed instructions on when and how to harvest. Include the optimal harvest window (e.g., "when fruit is fully colored but firm") and specific visual cues to look for.
- **Optimal Storage Conditions**: Guidance on how to properly store the harvested crop to maximize its shelf life (e.g., temperature, humidity, location).
- **Companion Planting**: Suggest beneficial companion plants that deter pests or improve growth, and mention any plants to avoid planting nearby.
- **Common Pests**: List and briefly describe 3-5 common pests that affect this crop.
- **Common Diseases**: List and briefly describe 3-5 common diseases.

Ensure the information is clear, concise, and actionable for a farmer.`;
    return await generateText(prompt);
  } catch (error) {
    return `Failed to retrieve crop information. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export interface GroundedAdviceResponse {
  text: string;
  sources?: Array<{ title: string; uri: string }>;
}

export const getTrendingPlantingAdvice = async (cropName: string, region: string): Promise<GroundedAdviceResponse> => {
  try {
    const config = getActiveProviderConfig();
    const prompt = `Provide the latest real-time trending planting advice, sowing timelines, regional tips, and gardening discussions/news for growing "${cropName}" in the region "${region}". Focus on the current year's seasonal suggestions. Use markdown.`;

    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ 
        apiKey: config.apiKey, 
        httpOptions: { 
          headers: { 
            'User-Agent': 'aistudio-build' 
          } 
        } 
      });
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

      return {
        text: geminiResponse.text || "No active trending advice found.",
        sources: sources.length > 0 ? sources : undefined,
      };
    } else {
      const responseText = await generateText(prompt + " Since you do not have active web search grounding, use your best general knowledge about trending regional gardening patterns.");
      return {
        text: responseText,
      };
    }
  } catch (error) {
    return {
      text: `Failed to retrieve trending advice. Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

export const getPlantingCalendar = async (cropName: string, climateZone: string): Promise<string> => {
    try {
        const prompt = `You are an expert master gardener. Generate a 12-month seasonal planting calendar for growing ${cropName} in ${climateZone}. Provide key activities for each month, such as "Sow indoors", "Transplant", "Harvest", "Prune", or "Prepare soil".`;
        const schema = {
            type: Type.OBJECT,
            properties: {
                crop: { type: Type.STRING },
                climateZone: { type: Type.STRING },
                calendar: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            month: { type: Type.STRING },
                            action: { type: Type.STRING, description: "Key action for the month (e.g., Sow indoors, Transplant, Harvest)" },
                        },
                        required: ["month", "action"],
                    },
                },
            },
            required: ["crop", "climateZone", "calendar"],
        };
        return await generateText(prompt, schema);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return JSON.stringify({ error: `Failed to generate a planting calendar. ${errorMessage}` });
    }
};

export const compareCrops = async (cropNames: string[]): Promise<string> => {
    try {
        const prompt = `You are an agricultural expert. Provide a side-by-side comparison of the following crops: ${cropNames.join(', ')}.`;
        const schema = {
            type: Type.OBJECT,
            properties: {
                crops: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            attributes: {
                                type: Type.OBJECT,
                                properties: {
                                    sunlight: { type: Type.STRING, description: "e.g., Full Sun, Partial Shade" },
                                    soil: { type: Type.STRING, description: "e.g., Well-drained, Loamy, pH 6.0-6.8" },
                                    water: { type: Type.STRING, description: "e.g., Moderate, Consistent moisture" },
                                    harvestTime: { type: Type.STRING, description: "e.g., 60-80 days from transplant" },
                                    commonPests: { type: Type.STRING, description: "List of 2-3 common pests" },
                                },
                                required: ["sunlight", "soil", "water", "harvestTime", "commonPests"],
                            },
                        },
                        required: ["name", "attributes"],
                    },
                },
            },
            required: ["crops"],
        };
        return await generateText(prompt, schema);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return JSON.stringify({ error: `Failed to generate a crop comparison. ${errorMessage}` });
    }
};

export const getYieldPrediction = async (growingPlan: string, cropHealth: string, weatherSummary: string, location: string, plants: string): Promise<string> => {
    try {
        const prompt = `You are an agricultural data scientist specializing in crop yield prediction.
Given the following information for a farm in ${location} growing ${plants}:

1. **Generated Planting Plan**:
${growingPlan}

2. **Observed Crop Health**:
"${cropHealth}"

3. **Summary of Past Weather Since Planting**:
"${weatherSummary}"

Synthesize this information to provide a crop yield prediction. Express the prediction as a percentage range of the optimal potential yield (e.g., "90-95% of optimal yield"). Follow this with a brief, one or two-sentence justification for your prediction, explaining how the observed crop health and weather conditions have influenced the potential outcome based on the initial plan.`;
        return await generateText(prompt);
    } catch (error) {
        return `Failed to generate a yield prediction. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
};
