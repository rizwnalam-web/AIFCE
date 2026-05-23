

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
  id?: string;
  email: string;
}

export interface UserProfile extends User {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImage?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  isVerified?: boolean;
  isActive?: boolean;
  registeredAt?: string;
  lastLogin?: string;
}

// Registration Types
export interface RegistrationFormData {
  // Account Information
  email: string;
  password: string;
  confirmPassword: string;

  // Personal Information
  firstName: string;
  lastName: string;
  phone?: string;

  // Address Information
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImage?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  isVerified: boolean;
  isActive: boolean;
  registeredAt: string;
  lastLogin?: string;
}

export interface RegistrationResponse {
  success: boolean;
  userId?: string;
  user?: UserProfile;
  message?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  userId?: string;
  user?: UserProfile;
  token?: string;
  message?: string;
  error?: string;
}