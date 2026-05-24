/**
 * Backend API Service
 * Centralized service for all backend API calls
 */

const API_BASE_URL = ''; // Use relative paths to support Vite proxying

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class BackendAPIService {
  private userId: string | null = null;

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
      const error = await response.json();
      throw new Error(error.error || `API Error: ${response.statusText}`);
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
    return this.fetch('/api/auth/login', 'POST', credentials);
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

  // Health checks
  async checkServerHealth() {
    return this.fetch('/api/health');
  }

  async checkDatabaseHealth() {
    return this.fetch('/api/db-health');
  }
}

export default new BackendAPIService();
