/**
 * Backend API Service
 * Centralized service for all backend API calls
 */
import { AuthResponse, SavedReport } from '../types';
const API_BASE_URL = ''; // Use relative paths to support Vite proxying

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class BackendAPIService {
  private userId: string | null = null;

  constructor() {
    // Attempt to load userId from localStorage on service instantiation
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) this.userId = storedUserId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  private async fetch<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMessage = `API Error: ${response.statusText}`;
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        // Fallback if the response is not valid JSON (e.g., a 404 HTML page)
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // App State APIs
  async initSession() {
    return this.fetch('/api/auth/session', 'GET');
  }

  async initAppState(email: string) {
    return this.fetch('/api/app-state/init', 'POST', { email });
  }

  async register(formData: any) {
    return this.fetch('/api/auth/register', 'POST', formData);
  }

  async login(credentials: any) {
    const response = await this.fetch<AuthResponse>('/api/auth/login', 'POST', credentials);
    if (response.success && response.userId) {
      this.setUserId(response.userId);
      // Store userId in local storage for persistence across sessions
      localStorage.setItem('userId', response.userId);
    }
    return response;
  }

  async getAppState() {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/app-state/${this.userId}`);
  }

  async updateAppState(updates: any) {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/app-state/${this.userId}`, 'PUT', updates);
  }

  // Location APIs
  async saveLocation(name: string, moisture: string, latitude?: number, longitude?: number) {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/app-state/locations/${this.userId}`, 'POST', {
      name,
      moisture,
      latitude,
      longitude,
    });
  }

  async getLocations() {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/app-state/locations/${this.userId}`);
  }

  async deleteLocation(name: string) {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/app-state/locations/${this.userId}/${encodeURIComponent(name)}`, 'DELETE');
  }

  // API Config APIs
  async saveApiConfig(name: string, provider: string, apiKey: string, model: string, isActive = false) {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/app-state/api-configs/${this.userId}`, 'POST', {
      name,
      provider,
      apiKey,
      model,
      isActive,
    });
  }

  async getApiConfigs() {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/app-state/api-configs/${this.userId}`);
  }

  async updateApiConfig(configId: string, updates: any) {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/app-state/api-configs/${this.userId}/${configId}`, 'PUT', updates);
  }

  async deleteApiConfig(configId: string) {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/app-state/api-configs/${this.userId}/${configId}`, 'DELETE');
  }

  // Health History APIs
  async saveHealthHistory(
    date: string,
    cropType: string,
    location: string,
    healthDescription: string,
    plan: string,
    imageBase64?: string
  ) {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/app-state/health-history/${this.userId}`, 'POST', {
      date,
      cropType,
      location,
      healthDescription,
      imageBase64,
      plan,
    });
  }

  async getHealthHistory(limit = 50, cropType?: string, location?: string) {
    if (!this.userId) throw new Error('User ID not set');
    let endpoint = `/api/app-state/health-history/${this.userId}?limit=${limit}`;
    if (cropType) endpoint += `&cropType=${encodeURIComponent(cropType)}`;
    if (location) endpoint += `&location=${encodeURIComponent(location)}`;
    return this.fetch(endpoint);
  }

  // LLM APIs (Now on Server)
  async analyzeWeather(location: string, weatherData: string) {
    return this.fetch('/api/llm/weather-analysis', 'POST', {
      location,
      weatherData,
      userId: this.userId,
    });
  }

  async analyzeCropHealth(cropType: string, description: string, imageBase64?: string) {
    return this.fetch('/api/llm/crop-health', 'POST', {
      cropType,
      description,
      imageBase64,
      userId: this.userId,
    });
  }

  async generateWateringRecommendations(
    cropType: string,
    location: string,
    weatherData: string
  ) {
    return this.fetch('/api/llm/watering-recommendations', 'POST', {
      cropType,
      location,
      weatherData,
      userId: this.userId,
    });
  }

  async generateFertilizationPlan(cropType: string, soilData: string, weatherData: string) {
    return this.fetch('/api/llm/fertilization', 'POST', {
      cropType,
      soilData,
      weatherData,
      userId: this.userId,
    });
  }

  async checkWeatherAlerts(location: string, weatherData: string) {
    return this.fetch('/api/llm/weather-alerts', 'POST', {
      location,
      weatherData,
      userId: this.userId,
    });
  }

  async compareCrops(crops: string[]) {
    return this.fetch('/api/llm/crop-comparison', 'POST', {
      crops,
      userId: this.userId,
    });
  }

  async getCropEncyclopedia(cropName: string) {
    return this.fetch('/api/llm/crop-encyclopedia', 'POST', {
      cropName,
      userId: this.userId,
    });
  }

  async saveReport(title: string, reportType: string, content: string, filename?: string) {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/reports/${this.userId}`, 'POST', {
      title,
      reportType,
      content,
      filename,
    });
  }

  async getReports() {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/reports/${this.userId}`);
  }

  async getReport(reportId: string) {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch(`/api/reports/${this.userId}/${reportId}`);
  }

  async updateReport(reportId: string, title?: string, content?: string, filename?: string, isFavorite?: boolean, lastViewedAt?: string): Promise<SavedReport> {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch<SavedReport>(`/api/reports/${this.userId}/${reportId}`, 'PUT', {
      title,
      content,
      filename,
      isFavorite,
      lastViewedAt,
    });
  }

  async deleteReport(reportId: string): Promise<{ success: boolean }> {
    if (!this.userId) throw new Error('User ID not set');
    return this.fetch<{ success: boolean }>(`/api/reports/${this.userId}/${reportId}`, 'DELETE');
  }

  async saveGrowingPlan(title: string, content: string, filename?: string) {
    if (!this.userId) throw new Error('User ID not set');
    return this.saveReport(title, 'growing-plan', content, filename);
  }

  async getSavedGrowingPlans(): Promise<SavedReport[]> {
    const reports = await this.getReports();
    return (reports as SavedReport[]).filter((report) => report.reportType === 'growing-plan');
  }

  // Health checks
  async checkServerHealth() {
    return this.fetch('/api/health');
  }

  async checkDatabaseHealth() {
    return this.fetch('/api/db-health');
  }
}

const backendAPIService = new BackendAPIService();

// Optionally, add a logout method to clear the userId
export const logout = () => {
  backendAPIService.setUserId(null);
  localStorage.removeItem('userId');
  localStorage.removeItem('farmAppState'); // Also clear app settings
};
export default backendAPIService;
