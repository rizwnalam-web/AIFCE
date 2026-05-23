

export enum FeatureTab {
  Capacity = 'Growing Capacity',
  Weather = 'Weather Prediction',
  Watering = 'Watering Needs',
  Fertilization = 'Fertilization & Disease Analysis',
  Encyclopedia = 'Crop Encyclopedia',
}

export type ProviderType = 'gemini' | 'openai' | 'grok' | 'deepseek' | 'anthropic' | 'cohere';

export interface ApiConfig {
  id: string;
  name: string;
  provider: ProviderType;
  apiKey: string;
  model: string;
}

export type ApiConfigurations = ApiConfig[];

export interface WeatherDay {
  day: string;
  high: string;
  low: string;
  precipitation: string;
  wind: string;
  description: string;
}

export interface WeatherForecast {
  location: string;
  forecast: WeatherDay[];
}

export interface SavedLocation {
  name: string;
  moisture: string;
}

export interface HistoricalWeatherDay {
  date: string;
  high: string;
  low: string;
  precipitation: string;
  description: string;
}

export interface HistoricalWeatherData {
  location: string;
  data: HistoricalWeatherDay[];
}

export interface PlantingAction {
    month: string;
    action: string;
}

export interface PlantingCalendarData {
    crop: string;
    climateZone: string;
    calendar: PlantingAction[];
}

export interface HealthHistoryEntry {
  id: string;
  date: string;
  cropType: string;
  location: string;
  healthDescription: string;
  imageUrl?: string;
  plan: string;
}

export interface CropAttributes {
  sunlight: string;
  soil: string;
  water: string;
  harvestTime: string;
  commonPests: string;
}

export interface ComparedCrop {
  name: string;
  attributes: CropAttributes;
}

export interface CropComparisonData {
  crops: ComparedCrop[];
}

export interface SavedComparison {
  id: string;
  crops: string[];
}

export interface User {
  email: string;
}