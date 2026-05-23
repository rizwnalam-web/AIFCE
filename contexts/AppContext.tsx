import React, { createContext, useReducer, useContext, useEffect, ReactNode } from 'react';
import { SavedLocation, ApiConfig, ProviderType } from '../types';

// State Interfaces
interface SettingsState {
  units: 'imperial' | 'metric';
  theme: 'dark' | 'light';
  temperatureUnit: 'fahrenheit' | 'celsius';
}

interface AppState {
  settings: SettingsState;
  savedLocations: SavedLocation[];
  apiConfigurations: ApiConfig[];
  activeApiProviderId: string | null;
  hasCompletedOnboarding: boolean;
}

// Action Types
type Action =
  | { type: 'SET_UNITS'; payload: 'imperial' | 'metric' }
  | { type: 'SET_TEMPERATURE_UNIT'; payload: 'fahrenheit' | 'celsius' }
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_LOCATION'; payload: SavedLocation }
  | { type: 'REMOVE_LOCATION'; payload: string } // payload is location name
  | { type: 'UPDATE_LOCATION_MOISTURE'; payload: { name: string; moisture: string } }
  | { type: 'ADD_API_CONFIG'; payload: ApiConfig }
  | { type: 'UPDATE_API_CONFIG'; payload: ApiConfig }
  | { type: 'DELETE_API_CONFIG'; payload: string } // id
  | { type: 'SET_ACTIVE_PROVIDER_ID'; payload: string | null }
  | { type: 'COMPLETE_ONBOARDING' };

// Initial State
const initialState: AppState = {
  settings: {
    theme: 'dark',
    units: 'imperial',
    temperatureUnit: 'fahrenheit',
  },
  savedLocations: [],
  apiConfigurations: [
    {
      id: 'default-gemini',
      name: 'Google Gemini (Server)',
      provider: 'gemini',
      apiKey: 'built-in',
      model: 'gemini-3.5-flash',
    }
  ],
  activeApiProviderId: 'default-gemini',
  hasCompletedOnboarding: true,
};

// Reducer
const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_UNITS':
      const newTempUnit = action.payload === 'imperial' ? 'fahrenheit' : 'celsius';
      return { ...state, settings: { ...state.settings, units: action.payload, temperatureUnit: newTempUnit } };
    case 'SET_TEMPERATURE_UNIT':
        return { ...state, settings: { ...state.settings, temperatureUnit: action.payload } };
    case 'ADD_LOCATION':
      if (state.savedLocations.some(loc => loc.name.toLowerCase() === action.payload.name.toLowerCase())) {
        return state;
      }
      return { ...state, savedLocations: [...state.savedLocations, action.payload] };
    case 'REMOVE_LOCATION':
      return { ...state, savedLocations: state.savedLocations.filter(loc => loc.name.toLowerCase() !== action.payload.toLowerCase()) };
    case 'UPDATE_LOCATION_MOISTURE':
      return {
        ...state,
        savedLocations: state.savedLocations.map(loc =>
          loc.name.toLowerCase() === action.payload.name.toLowerCase()
            ? { ...loc, moisture: action.payload.moisture }
            : loc
        ),
      };
    case 'ADD_API_CONFIG': {
        const newConfigs = [...state.apiConfigurations, action.payload];
        // If it's the first config being added, make it active.
        const newActiveId = state.apiConfigurations.length === 0 ? action.payload.id : state.activeApiProviderId;
        return { ...state, apiConfigurations: newConfigs, activeApiProviderId: newActiveId };
    }
    case 'UPDATE_API_CONFIG': {
        return {
            ...state,
            apiConfigurations: state.apiConfigurations.map(config =>
                config.id === action.payload.id ? action.payload : config
            )
        };
    }
    case 'DELETE_API_CONFIG': {
        const newConfigs = state.apiConfigurations.filter(config => config.id !== action.payload);
        let newActiveId = state.activeApiProviderId;
        // If the deleted config was the active one, select the first one in the list as the new active.
        if (state.activeApiProviderId === action.payload) {
            newActiveId = newConfigs.length > 0 ? newConfigs[0].id : null;
        }
        return { ...state, apiConfigurations: newConfigs, activeApiProviderId: newActiveId };
    }
    case 'SET_ACTIVE_PROVIDER_ID':
        return { ...state, activeApiProviderId: action.payload };
    case 'COMPLETE_ONBOARDING':
        return { ...state, hasCompletedOnboarding: true };
    case 'SET_STATE': {
        // Migration from old structure
        let payloadConfigs = action.payload.apiConfigurations || [];
        let activeId = action.payload.activeApiProviderId;

        if (payloadConfigs && !Array.isArray(payloadConfigs)) {
            const oldConfigs = payloadConfigs as any;
            const migratedConfigs: ApiConfig[] = Object.keys(oldConfigs).map(provider => ({
                id: provider,
                name: provider.charAt(0).toUpperCase() + provider.slice(1),
                provider: provider as ProviderType,
                apiKey: oldConfigs[provider],
                model: 'gemini-2.5-flash',
            }));
            payloadConfigs = migratedConfigs;
            activeId = (action.payload as any).activeApiProvider || (migratedConfigs.length > 0 ? migratedConfigs[0].id : null);
        }

        // If there are no configurations, inject the default server-side Gemini config
        if (!payloadConfigs || payloadConfigs.length === 0) {
            payloadConfigs = [
                {
                    id: 'default-gemini',
                    name: 'Google Gemini (Server)',
                    provider: 'gemini',
                    apiKey: 'built-in',
                    model: 'gemini-3.5-flash',
                }
            ];
            activeId = 'default-gemini';
        }

        if (!activeId && payloadConfigs.length > 0) {
            activeId = payloadConfigs[0].id;
        }

        return {
          ...initialState,
          ...action.payload,
          apiConfigurations: payloadConfigs,
          activeApiProviderId: activeId,
          settings: { ...initialState.settings, ...action.payload.settings },
        };
    }
    default:
      return state;
  }
};

// Context
const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

// Provider
export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const storedState = localStorage.getItem('farmAppState');
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        const oldLocations = localStorage.getItem('savedWeatherLocations');
        if(oldLocations) {
            parsedState.savedLocations = JSON.parse(oldLocations);
            localStorage.removeItem('savedWeatherLocations');
        }
        dispatch({ type: 'SET_STATE', payload: parsedState });
      }
    } catch (error) {
      console.error("Failed to parse app state from localStorage", error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('farmAppState', JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save app state to localStorage", error);
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom Hook
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};