import React, { useState, useCallback, useEffect } from 'react';
import { FeatureTab, UserProfile, ApiConfig, SavedReport } from './types';
import { LeafIcon, CloudIcon, WaterDropIcon, SproutIcon, BookIcon, SettingsIcon } from './components/icons';
import GrowingCapacity from './components/GrowingCapacity';
import WeatherPrediction from './components/WeatherPrediction';
import WateringEstimator from './components/WateringEstimator';
import FertilizationEstimator from './components/FertilizationEstimator';
import WeatherAlerts from './components/WeatherAlerts';
import backendAPI from './services/backendAPI';
import { checkForAlerts } from './services/geminiService';
import Spinner from './components/shared/Spinner';
import CropEncyclopedia from './components/CropEncyclopedia';
import SavedPlansDashboard from './components/SavedPlansDashboard';
import { useAppContext } from './contexts/AppContext';
import ApiSettings from './components/ApiSettings';
import OnboardingTour from './components/OnboardingTour';
import { translate, LANGUAGE_OPTIONS, TranslationKey } from './i18n';

interface AppProps {
  user: UserProfile;
  onLogout: () => void;
}

const App: React.FC<AppProps> = ({ user, onLogout }) => {
  const { state, dispatch } = useAppContext();
  const { settings, savedLocations, apiConfigurations, activeApiProviderId, hasCompletedOnboarding } = state;
  const t = (key: TranslationKey) => translate(settings.language, key);

  const [activeTab, setActiveTab] = useState<FeatureTab>(FeatureTab.Capacity);
  const [savedPlanToEdit, setSavedPlanToEdit] = useState<SavedReport | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<string[]>([]);
  const [newReportsCount, setNewReportsCount] = useState(0);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [isTourVisible, setIsTourVisible] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    // Show tour if user hasn't completed it.
    if (!hasCompletedOnboarding) {
      setIsTourVisible(true);
    }
  }, [hasCompletedOnboarding]);
  
  useEffect(() => {
    // If no API keys are configured, open the settings modal automatically.
    if (apiConfigurations.length === 0) {
      setIsSettingsModalOpen(true);
    }
  }, [apiConfigurations.length]);

  useEffect(() => {
    const fetchAlerts = async () => {
      setIsLoadingAlerts(true);
      try {
        if (savedLocations && savedLocations.length > 0) {
          const allAlertsPromises = savedLocations.map((loc: any) => checkForAlerts(loc.name));
          const resolvedAlerts = await Promise.all(allAlertsPromises);
          
          const flattenedAlerts = resolvedAlerts.flat().filter((alert: any): alert is string => alert !== null);
          setWeatherAlerts(flattenedAlerts);
        } else {
          setWeatherAlerts([]);
        }
      } catch (error) {
        console.error("Failed to fetch or parse weather alerts:", error);
        setWeatherAlerts([]);
      }
      setIsLoadingAlerts(false);
    };

    if (apiConfigurations.length > 0) {
      fetchAlerts();
    } else {
      setIsLoadingAlerts(false);
      setWeatherAlerts([]);
    }
  }, [savedLocations, apiConfigurations]);

  const updateCount = useCallback(async () => {
    if (apiConfigurations.length > 0) {
      try {
        const reports = await backendAPI.getReports();
        const count = (reports as any[]).filter(r => !r.lastViewedAt).length;
        setNewReportsCount(count);
      } catch (e) {
        console.warn("Failed to update new reports count", e);
      }
    }
  }, [apiConfigurations]);

  useEffect(() => {
    updateCount();
  }, [updateCount, activeTab]);

  const checkAlertsForLocation = useCallback(async (location: string) => {
    try {
        const newAlerts = await checkForAlerts(location);
        
        setWeatherAlerts((prevAlerts: string[]) => {
            // Remove any old alerts for the location being checked. The alert text is prefixed with the location.
            const otherAlerts = prevAlerts.filter((alert: string) => !alert.startsWith(`${location}:`));
            
            // Add the new alerts if any were found.
            const allAlerts = [...otherAlerts];
            if (newAlerts) {
                allAlerts.push(...newAlerts);
            }
            return allAlerts;
        });

    } catch (error) {
        // Silently fail in the background to not disrupt user experience.
        console.error(`Failed to fetch or parse weather alerts for ${location}:`, error);
    }
  }, []);


  const renderContent = useCallback(() => {
    if (apiConfigurations.length === 0) {
      return (
        <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-300">{t('appTitle')}</h2>
            <p className="text-gray-400 mt-2">{t('welcomeMessage')}</p>
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800"
            >
              <SettingsIcon /> {t('openSettings')}
            </button>
        </div>
      );
    }
    
    switch (activeTab) {
      case FeatureTab.Capacity:
        return (
          <GrowingCapacity
            initialPlan={savedPlanToEdit?.content}
            initialPlants={savedPlanToEdit?.title?.replace(/^Growing Plan:\s*/i, '')}
            onClearInitialPlan={() => setSavedPlanToEdit(null)}
          />
        );
      case FeatureTab.Weather:
        return <WeatherPrediction checkAlertsForLocation={checkAlertsForLocation} />;
      case FeatureTab.Watering:
        return <WateringEstimator />;
      case FeatureTab.Fertilization:
        return <FertilizationEstimator />;
      case FeatureTab.Encyclopedia:
        return <CropEncyclopedia />;
      case FeatureTab.SavedPlans:
        return (
          <SavedPlansDashboard 
            onEditPlan={(plan) => {
              setSavedPlanToEdit(plan);
              setActiveTab(FeatureTab.Capacity);
            }}
            onReportsRead={updateCount}
          />
        );
      default:
        return null;
    }
  }, [activeTab, apiConfigurations, checkAlertsForLocation, savedPlanToEdit, updateCount]);
  
  const handleCloseTour = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    setIsTourVisible(false);
  };

  const toggleUnits = () => {
    dispatch({ type: 'SET_UNITS', payload: settings.units === 'imperial' ? 'metric' : 'imperial' });
  };

  const toggleTempUnit = () => {
    dispatch({ type: 'SET_TEMPERATURE_UNIT', payload: settings.temperatureUnit === 'fahrenheit' ? 'celsius' : 'fahrenheit' });
  };


  const tabs = [
    { name: FeatureTab.Capacity, icon: <LeafIcon />, label: t('tabCapacity'), tourId: 'growing-capacity-tab' },
    { name: FeatureTab.Weather, icon: <CloudIcon />, label: t('tabWeather') },
    { name: FeatureTab.Watering, icon: <WaterDropIcon />, label: t('tabWatering') },
    { name: FeatureTab.Fertilization, icon: <SproutIcon />, label: t('tabFertilization') },
    { name: FeatureTab.Encyclopedia, icon: <BookIcon />, label: t('tabEncyclopedia') },
    { name: FeatureTab.SavedPlans, icon: <BookIcon />, label: 'Saved Plans' },
  ];

  return (
    <div className="dark font-sans">
       {isTourVisible && (
        <OnboardingTour
          onClose={handleCloseTour}
          openSettings={() => setIsSettingsModalOpen(true)}
          setActiveTab={setActiveTab}
        />
      )}
      {isSettingsModalOpen && <ApiSettings onClose={() => setIsSettingsModalOpen(false)} />}
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col transition-colors duration-300">
        <header className="bg-gray-800 shadow-md">
          <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-green-400">
                  {t('appTitle')}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <div data-tour-id="header-controls" className="hidden md:flex items-center gap-4">
                  <div className="flex items-center gap-1">
                      <span className="text-gray-400">{t('provider')}</span>
                      <select
                          value={activeApiProviderId ?? ''}
                          onChange={(e: any) => dispatch({ type: 'SET_ACTIVE_PROVIDER_ID', payload: e.target.value })}
                          className="bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-green-500 capitalize"
                        >
                          {apiConfigurations.length > 0 ? (
                            apiConfigurations.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))
                          ) : (
                            <option value="" disabled>{t('noApiConfigured')}</option>
                          )}
                        </select>
                  </div>
                  <div className="flex items-center gap-1">
                      <span className="text-gray-400">{t('units')}</span>
                      <button onClick={toggleUnits} className="font-semibold text-green-400 hover:opacity-80 transition-opacity capitalize w-16 text-left">
                          {settings.units}
                      </button>
                  </div>
                  <div className="flex items-center gap-1">
                      <span className="text-gray-400">{t('temp')}</span>
                      <button onClick={toggleTempUnit} className="font-semibold text-green-400 hover:opacity-80 transition-opacity capitalize w-12 text-left">
                          {settings.temperatureUnit === 'fahrenheit' ? '°F' : '°C'}
                      </button>
                  </div>
                </div>

              <div className="flex items-center gap-2">
                <button 
                  data-tour-id="settings-button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                  aria-label="Open API Provider Settings"
                >
                  <SettingsIcon />
                </button>
                <div className="text-right flex-shrink-0">
                  <label htmlFor="language-select" className="sr-only">Language</label>
                  <select
                    id="language-select"
                    value={settings.language}
                    onChange={(e) => dispatch({ type: 'SET_LANGUAGE', payload: e.target.value as any })}
                    className="bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeLabel}
                      </option>
                    ))}
                  </select>
                  <p className="text-gray-300 truncate mt-2" title={user.email}>
                    {user.firstName || user.email} {user.lastName ? `${user.lastName}` : ''}
                  </p>
                  <button onClick={onLogout} className="font-medium text-red-400 hover:opacity-80 transition-opacity focus:outline-none">
                    {t('logout')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-4 md:p-6">
          {isLoadingAlerts ? (
              <div className="flex justify-center items-center gap-2 text-gray-400 mb-4">
                <Spinner />
                <span>{t('checkingWeatherAlerts')}</span>
              </div>
          ) : (
            <WeatherAlerts alerts={weatherAlerts} />
          )}

          <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="border-b border-gray-700">
              <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    data-tour-id={tab.tourId}
                    className={`${
                      activeTab === tab.name
                        ? 'border-green-400 text-green-400'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                    } group inline-flex items-center justify-center py-3 px-2 md:px-4 border-b-2 font-medium text-sm md:text-base focus:outline-none transition-all duration-200 flex-grow text-center`}
                  >
                    <div className="relative">
                      {tab.icon}
                      {tab.name === FeatureTab.SavedPlans && newReportsCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-gray-800">
                          {newReportsCount}
                        </span>
                      )}
                    </div>
                    <span className="ml-2 hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-4 md:p-8">
              {renderContent()}
            </div>
          </div>
        </main>

        <footer className="text-center p-4 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} AI Farming Solutions. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;