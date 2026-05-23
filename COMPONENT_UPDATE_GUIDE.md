# Component Update Guide: Using Backend APIs

This guide shows how to update your existing React components to use the new backend API service instead of direct LLM calls and localStorage.

## 1. Update App Context

Replace `contexts/AppContext.tsx`:

```typescript
import React, { createContext, useReducer, useContext, useEffect, ReactNode } from 'react';
import backendAPI from '../services/backendAPI';
import { SavedLocation, ApiConfig, ProviderType } from '../types';

interface SettingsState {
  units: 'imperial' | 'metric';
  theme: 'dark' | 'light';
  temperatureUnit: 'fahrenheit' | 'celsius';
}

interface AppState {
  userId: string | null;
  settings: SettingsState;
  apiConfigurations: ApiConfig[];
  hasCompletedOnboarding: boolean;
}

type Action =
  | { type: 'SET_USER_ID'; payload: string }
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<SettingsState> }
  | { type: 'SET_ONBOARDING'; payload: boolean };

const initialState: AppState = {
  userId: null,
  settings: {
    units: 'imperial',
    theme: 'dark',
    temperatureUnit: 'fahrenheit',
  },
  apiConfigurations: [],
  hasCompletedOnboarding: false,
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    case 'SET_STATE':
      return action.payload;
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'SET_ONBOARDING':
      return { ...state, hasCompletedOnboarding: action.payload };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize user on mount
  useEffect(() => {
    const initUser = async () => {
      try {
        const result = await backendAPI.initAppState('user@example.com');
        const { userId, appState } = result;

        backendAPI.setUserId(userId);
        dispatch({
          type: 'SET_STATE',
          payload: {
            userId,
            settings: appState.settings,
            apiConfigurations: [],
            hasCompletedOnboarding: appState.hasCompletedOnboarding,
          },
        });
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initUser();
  }, []);

  // Sync settings to server
  useEffect(() => {
    if (state.userId) {
      backendAPI.updateAppState({
        units: state.settings.units,
        theme: state.settings.theme,
        temperatureUnit: state.settings.temperatureUnit,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      });
    }
  }, [state.settings, state.hasCompletedOnboarding, state.userId]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
};
```

## 2. Update Weather Prediction Component

Replace LLM call with backend API:

```typescript
// Before
import { generateWeatherAnalysis } from '../services/geminiService';

const analysis = await generateWeatherAnalysis(location, weatherData);

// After
import backendAPI from '../services/backendAPI';
import { useAppContext } from '../contexts/AppContext';

const { state } = useAppContext();
const { analysis } = await backendAPI.analyzeWeather(location, weatherData);
```

### Complete Example: WeatherPrediction.tsx

```typescript
import React, { useState } from 'react';
import backendAPI from '../services/backendAPI';
import { useAppContext } from '../contexts/AppContext';
import Spinner from './shared/Spinner';

const WeatherPrediction: React.FC = () => {
  const { state } = useAppContext();
  const [location, setLocation] = useState('');
  const [weatherData, setWeatherData] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!location.trim() || !weatherData.trim()) {
      setError('Please enter location and weather data');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await backendAPI.analyzeWeather(location, weatherData);
      setAnalysis(result.analysis);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to analyze weather'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!state.userId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="weather-prediction">
      <h2>Weather Analysis</h2>
      <div className="input-group">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
        />
        <textarea
          value={weatherData}
          onChange={(e) => setWeatherData(e.target.value)}
          placeholder="Weather data"
        />
        <button onClick={handleAnalyze} disabled={loading}>
          {loading ? <Spinner /> : 'Analyze'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {analysis && <div className="result">{analysis}</div>}
    </div>
  );
};

export default WeatherPrediction;
```

## 3. Update Crop Health Analysis

```typescript
// Before
import { analyzeCropHealth } from '../services/geminiService';

const diagnosis = await analyzeCropHealth(cropType, description, imageBase64);

// After
import backendAPI from '../services/backendAPI';

const { analysis } = await backendAPI.analyzeCropHealth(
  cropType,
  description,
  imageBase64
);
```

### Complete Example: CropHealthAnalyzer.tsx

```typescript
import React, { useState } from 'react';
import backendAPI from '../services/backendAPI';
import { useAppContext } from '../contexts/AppContext';
import Spinner from './shared/Spinner';

const CropHealthAnalyzer: React.FC = () => {
  const { state } = useAppContext();
  const [cropType, setCropType] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);

    let imageBase64: string | undefined;

    if (image) {
      imageBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve((reader.result as string)?.split(',')[1]);
        };
        reader.readAsDataURL(image);
      });
    }

    try {
      const result = await backendAPI.analyzeCropHealth(
        cropType,
        description,
        imageBase64
      );
      setAnalysis(result.analysis);

      // Optionally save to health history
      await backendAPI.saveHealthHistory(
        new Date().toISOString().split('T')[0],
        cropType,
        'Current Location',
        description,
        result.analysis,
        imageBase64
      );
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!state.userId) return <div>Loading...</div>;

  return (
    <div className="crop-health-analyzer">
      <h2>Crop Health Analysis</h2>
      <input
        value={cropType}
        onChange={(e) => setCropType(e.target.value)}
        placeholder="Crop type (e.g., tomato)"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe symptoms..."
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
      />
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? <Spinner /> : 'Analyze'}
      </button>
      {analysis && <div className="analysis-result">{analysis}</div>}
    </div>
  );
};

export default CropHealthAnalyzer;
```

## 4. Update Saved Locations

```typescript
// Load locations
const locations = await backendAPI.getLocations();

// Save location
await backendAPI.saveLocation(name, moisture, latitude, longitude);

// Delete location
await backendAPI.deleteLocation(name);
```

### Complete Example:

```typescript
import React, { useEffect, useState } from 'react';
import backendAPI from '../services/backendAPI';
import { useAppContext } from '../contexts/AppContext';

const SavedLocations: React.FC = () => {
  const { state } = useAppContext();
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');

  useEffect(() => {
    if (state.userId) {
      loadLocations();
    }
  }, [state.userId]);

  const loadLocations = async () => {
    try {
      const locs = await backendAPI.getLocations();
      setLocations(locs);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;

    try {
      await backendAPI.saveLocation(newLocation, '50%');
      setNewLocation('');
      await loadLocations();
    } catch (error) {
      console.error('Failed to add location:', error);
    }
  };

  const handleDeleteLocation = async (name: string) => {
    try {
      await backendAPI.deleteLocation(name);
      await loadLocations();
    } catch (error) {
      console.error('Failed to delete location:', error);
    }
  };

  return (
    <div className="saved-locations">
      <h3>My Locations</h3>
      <div className="add-location">
        <input
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          placeholder="Location name"
        />
        <button onClick={handleAddLocation}>Add</button>
      </div>
      <ul>
        {locations.map((loc: any) => (
          <li key={loc.id}>
            {loc.name} (Moisture: {loc.moisture})
            <button onClick={() => handleDeleteLocation(loc.name)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SavedLocations;
```

## 5. Update API Settings

```typescript
// Get API configs
const configs = await backendAPI.getApiConfigs();

// Add new config
await backendAPI.saveApiConfig('OpenAI', 'openai', apiKey, 'gpt-4', true);

// Delete config
await backendAPI.deleteApiConfig(configId);
```

### Complete Example:

```typescript
import React, { useEffect, useState } from 'react';
import backendAPI from '../services/backendAPI';
import { useAppContext } from '../contexts/AppContext';

const ApiSettings: React.FC = () => {
  const { state } = useAppContext();
  const [configs, setConfigs] = useState([]);
  const [newProvider, setNewProvider] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (state.userId) {
      loadConfigs();
    }
  }, [state.userId]);

  const loadConfigs = async () => {
    try {
      const result = await backendAPI.getApiConfigs();
      setConfigs(result);
    } catch (error) {
      console.error('Failed to load configs:', error);
    }
  };

  const handleAddConfig = async () => {
    if (!newProvider.trim() || !apiKey.trim()) return;

    try {
      await backendAPI.saveApiConfig(
        newProvider,
        newProvider.toLowerCase(),
        apiKey,
        'default-model',
        true
      );
      setNewProvider('');
      setApiKey('');
      await loadConfigs();
    } catch (error) {
      console.error('Failed to add config:', error);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      await backendAPI.deleteApiConfig(id);
      await loadConfigs();
    } catch (error) {
      console.error('Failed to delete config:', error);
    }
  };

  return (
    <div className="api-settings">
      <h2>API Configurations</h2>
      <div className="add-config">
        <input
          value={newProvider}
          onChange={(e) => setNewProvider(e.target.value)}
          placeholder="Provider name"
        />
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API Key"
        />
        <button onClick={handleAddConfig}>Add</button>
      </div>
      <div className="configs-list">
        {configs.map((config: any) => (
          <div key={config.id} className="config-item">
            <span>{config.name}</span>
            {config.isActive && <span className="active">Active</span>}
            <button onClick={() => handleDeleteConfig(config.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApiSettings;
```

## 6. Update Other Components Similarly

Apply the same pattern to:
- `WateringEstimator.tsx` → `backendAPI.generateWateringRecommendations()`
- `FertilizationEstimator.tsx` → `backendAPI.generateFertilizationPlan()`
- `WeatherAlerts.tsx` → `backendAPI.checkWeatherAlerts()`
- `CropEncyclopedia.tsx` → `backendAPI.getCropEncyclopedia()`
- `GrowingCapacity.tsx` → `backendAPI.compareCrops()`

## Common Patterns

### Pattern 1: Loading State
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [result, setResult] = useState('');

const handleAction = async () => {
  setLoading(true);
  setError('');
  try {
    const result = await backendAPI.someMethod(...);
    setResult(result);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Error');
  } finally {
    setLoading(false);
  }
};
```

### Pattern 2: List Management
```typescript
const [items, setItems] = useState([]);

const loadItems = async () => {
  const result = await backendAPI.getItems();
  setItems(result);
};

const deleteItem = async (id: string) => {
  await backendAPI.deleteItem(id);
  await loadItems(); // Refresh
};
```

### Pattern 3: Form Submission
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await backendAPI.saveData(data);
    setSuccess(true);
  } catch (error) {
    setError(error);
  }
};
```

## Debugging

### View API Calls
```typescript
// In backendAPI.ts, add logging:
private async fetch<T>(...) {
  console.log(`[API] ${method} ${endpoint}`, body);
  const response = await fetch(url, options);
  console.log(`[API] Response:`, await response.json());
  ...
}
```

### Check Database
```bash
npx prisma studio
# View all data at http://localhost:5555
```

### Monitor Server Logs
```bash
# Terminal running dev server shows all API calls
```

## Testing Component Changes

1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:3000`
3. Check Console for errors
4. Check Network tab to see API calls
5. Use Prisma Studio to verify data was saved

## Migration Checklist

- [ ] Update AppContext.tsx
- [ ] Update App.tsx for user initialization
- [ ] Update WeatherPrediction.tsx
- [ ] Update CropHealthAnalyzer.tsx
- [ ] Update SavedLocations.tsx
- [ ] Update ApiSettings.tsx
- [ ] Update WateringEstimator.tsx
- [ ] Update FertilizationEstimator.tsx
- [ ] Update WeatherAlerts.tsx
- [ ] Update CropEncyclopedia.tsx
- [ ] Update GrowingCapacity.tsx
- [ ] Remove localStorage references
- [ ] Test all features
- [ ] Check browser console for errors
- [ ] Verify data persists in database

Done! Your app now uses the backend for all state and LLM operations! 🚀
