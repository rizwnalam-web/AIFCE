import React, { useState } from 'react';
import { getWeatherForecast, getHistoricalWeather, checkForAlerts } from '../services/geminiService';
import { WeatherForecast, WeatherDay, SavedLocation, HistoricalWeatherData } from '../types';
import Spinner from './shared/Spinner';
import { CloudIcon, MapIcon, ShareIcon, PdfIcon } from './icons';
import Card from './shared/Card';
import AutoCompleteInput from './shared/AutoCompleteInput';
import { LOCATION_SUGGESTION_LIST } from '../data/suggestions';
import { useAppContext } from '../contexts/AppContext';

interface WeatherPredictionProps {
  checkAlertsForLocation: (location: string) => void;
}

const WeatherPrediction: React.FC<WeatherPredictionProps> = ({ checkAlertsForLocation }) => {
  const { state, dispatch } = useAppContext();
  const { savedLocations } = state;

  const [location, setLocation] = useState('');
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeSubTab, setActiveSubTab] = useState<'forecast' | 'history' | 'map'>('forecast');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historicalData, setHistoricalData] = useState<HistoricalWeatherData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyLocation, setHistoryLocation] = useState('');

  const saveLocation = (locationToSave: string) => {
    dispatch({ type: 'ADD_LOCATION', payload: { name: locationToSave, moisture: '' } });
  };

  const removeLocation = (locationToRemove: string) => {
    dispatch({ type: 'REMOVE_LOCATION', payload: locationToRemove });
  };
  
  const handleMoistureChange = (name: string, moisture: string) => {
    if (moisture === '') {
        dispatch({ type: 'UPDATE_LOCATION_MOISTURE', payload: { name, moisture: '' } });
        return;
    }
    const newMoisture = Math.max(0, Math.min(100, Number(moisture)));
    // This prevents NaN from being dispatched if user enters non-numeric text
    // that bypasses the input type=number guard (e.g., "e").
    if (!isNaN(newMoisture)) {
        dispatch({ type: 'UPDATE_LOCATION_MOISTURE', payload: { name, moisture: newMoisture.toString() } });
    }
  };

  const handleSubmit = async (e: React.FormEvent, locationOverride?: string) => {
    e.preventDefault();
    const locationToSearch = locationOverride || location;
    if (!locationToSearch.trim()) {
      setError('Please enter a location.');
      return;
    }
    setError('');
    setLoading(true);
    setForecast(null);
    try {
        const resultString = await getWeatherForecast(locationToSearch);
        const result = JSON.parse(resultString);
        if (result.error) {
            setError(result.error);
            setForecast(null);
        } else {
            setForecast(result);
            // Trigger background alert check
            checkAlertsForLocation(locationToSearch);
        }
    } catch(e) {
        setError("Failed to parse weather data. The location may be invalid.");
        setForecast(null);
    }
    setLoading(false);
  };

  const handleSavedLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLocation = e.target.value;
    if (selectedLocation) {
        // The change event from a select is a FormEvent, so we can pass it.
        handleSubmit(e, selectedLocation);
        // Also update the main search input for consistency.
        setLocation(selectedLocation);
    }
  };

  const handleHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    if (!historyLocation.trim()) {
        setHistoryError('Please provide a location.');
        hasError = true;
    }
    if (!startDate || !endDate) {
        setHistoryError(prev => prev + ' Please provide both start and end dates.');
        hasError = true;
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        setHistoryError(prev => prev + ' End date cannot be before the start date.');
        hasError = true;
    }

    if(hasError) return;

    setHistoryError('');
    setLoadingHistory(true);
    setHistoricalData(null);
    try {
        const resultString = await getHistoricalWeather(historyLocation, startDate, endDate);
        const result = JSON.parse(resultString);
        if (result.error) {
            setHistoryError(result.error);
        } else {
            setHistoricalData(result);
        }
    } catch(e) {
        setHistoryError("Failed to parse historical weather data. The service might be unavailable.");
    }
    setLoadingHistory(false);
  };

  const handleShare = async (title: string, text: string) => {
      if (navigator.share) {
          try {
              await navigator.share({ title, text });
          } catch (error) {
              console.error('Error sharing:', error);
          }
      } else {
          alert('Web Share API not supported. You can manually copy the report.');
      }
  };

  const handlePdfExport = (content: string, filename: string) => {
      const blob = new Blob([`--- SIMULATED PDF REPORT ---\n\n${content}`], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}.pdf.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const formatForecastForExport = (forecastData: WeatherForecast): string => {
    let content = `7-Day Weather Forecast for ${forecastData.location}\n\n`;
    forecastData.forecast.forEach(day => {
        content += `Day: ${day.day}\n`;
        content += `High/Low: ${day.high} / ${day.low}\n`;
        content += `Description: ${day.description}\n`;
        content += `Precipitation: ${day.precipitation}\n`;
        content += `Wind: ${day.wind}\n\n`;
    });
    return content;
  };

  const formatHistoryForExport = (histData: HistoricalWeatherData): string => {
    let content = `Historical Weather for ${histData.location}\n\n`;
    histData.data.forEach(day => {
        content += `Date: ${day.date}\n`;
        content += `High/Low: ${day.high} / ${day.low}\n`;
        content += `Precipitation: ${day.precipitation}\n`;
        content += `Conditions: ${day.description}\n\n`;
    });
    return content;
  };


  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-100 mb-1">Weather Center</h2>
      <p className="text-gray-400 mb-6">View 7-day forecasts or look up historical weather data for your fields.</p>

      <div className="mb-6">
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveSubTab('forecast')}
              className={`${
                activeSubTab === 'forecast'
                  ? 'border-green-400 text-green-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none`}
            >
              7-Day Forecast
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`${
                activeSubTab === 'history'
                  ? 'border-green-400 text-green-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none`}
            >
              Weather History
            </button>
            <button
              onClick={() => setActiveSubTab('map')}
              className={`${
                activeSubTab === 'map'
                  ? 'border-green-400 text-green-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } inline-flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none`}
            >
              <MapIcon />
              Map View
            </button>
          </nav>
        </div>
      </div>

      {activeSubTab === 'forecast' && (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-grow">
              <AutoCompleteInput
                  id="forecastLocation"
                  value={location}
                  onChange={setLocation}
                  suggestionsData={LOCATION_SUGGESTION_LIST}
                  placeholder="e.g., Napa Valley, CA"
              />
            </div>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 disabled:bg-gray-500">
              {loading ? <Spinner /> : 'Get Forecast'}
            </button>
          </form>

          {savedLocations.length > 0 && (
            <div className="my-6">
                <label htmlFor="saved-location-select" className="block text-sm font-medium text-gray-300">Or, select a saved location</label>
                <select
                  id="saved-location-select"
                  onChange={handleSavedLocationSelect}
                  value={""} // Controlled to reset after selection
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">-- Choose a location --</option>
                  {savedLocations.map(loc => (
                    <option key={loc.name} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-700 pb-2">Manage Saved Locations</h3>
            {savedLocations.length > 0 ? (
                <div className="space-y-2">
                    {savedLocations.map((loc, index) => (
                        <div key={loc.name} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 bg-gray-700/50 p-3 rounded-md hover:bg-gray-700 transition-colors">
                            <span className="text-gray-300 font-medium md:col-span-1">{loc.name}</span>
                            <div className="flex items-center gap-2 md:col-span-1">
                              <label htmlFor={`moisture-${index}`} className="text-sm text-gray-400">Moisture:</label>
                              <input
                                type="number"
                                id={`moisture-${index}`}
                                value={loc.moisture}
                                onChange={(e) => handleMoistureChange(loc.name, e.target.value)}
                                min="0"
                                max="100"
                                className="w-20 bg-gray-800 border border-gray-600 rounded-md py-1 px-2 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                                placeholder="e.g., 35"
                              />
                               <span className="text-gray-400 text-sm">%</span>
                            </div>
                            <div className="flex items-center gap-4 md:col-span-1 justify-end">
                                <button onClick={(e) => handleSubmit(e, loc.name)} className="text-sm font-medium text-green-400 hover:opacity-80 transition-opacity">View</button>
                                <button onClick={() => removeLocation(loc.name)} className="text-sm font-medium text-red-400 hover:opacity-80 transition-opacity">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 bg-gray-700/30 rounded-lg">
                    <p className="text-gray-500">No locations saved.</p>
                    <p className="text-gray-500 text-sm">Search for a location to save it for alerts and moisture tracking.</p>
                </div>
            )}
          </div>
        </>
      )}

      {activeSubTab === 'history' && (
        <div>
            <form onSubmit={handleHistorySubmit} className="space-y-4 mb-8">
              <AutoCompleteInput
                  id="locationHistory"
                  label="Location"
                  value={historyLocation}
                  onChange={setHistoryLocation}
                  suggestionsData={LOCATION_SUGGESTION_LIST}
                  placeholder="e.g., Napa Valley, CA"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-300">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-300">End Date</label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
               {historyError && <p className="text-red-400 text-sm text-center">{historyError}</p>}
              <button type="submit" disabled={loadingHistory} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 disabled:bg-gray-500">
                {loadingHistory ? <Spinner /> : 'Get Historical Data'}
              </button>
            </form>

            {loadingHistory && <div className="flex justify-center"><Spinner /></div>}

            {historicalData && (
                <Card title={`Historical Weather for ${historicalData.location}`} icon={<CloudIcon />}>
                    <div className="flex justify-end gap-2 -mt-2 mb-4">
                        <button 
                            onClick={() => handleShare(`Historical Weather: ${historicalData.location}`, formatHistoryForExport(historicalData))}
                            title="Share Report"
                            className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                        >
                            <ShareIcon />
                        </button>
                        <button 
                            onClick={() => handlePdfExport(formatHistoryForExport(historicalData), `historical-weather-${historicalData.location.replace(/\s+/g, '_')}`)}
                            title="Export as PDF"
                            className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                        >
                            <PdfIcon />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-600">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">High/Low</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Precipitation</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Conditions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-700/50 divide-y divide-gray-600">
                                {historicalData.data.map((day, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{day.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{day.high} / {day.low}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{day.precipitation}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{day.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )}

    {activeSubTab === 'map' && (
      <div>
        <p className="text-center text-gray-400 mb-4">Click a saved location pin to view its forecast.</p>
        <div className="bg-gray-700/50 rounded-lg p-4 min-h-[200px] flex flex-wrap gap-4 items-center justify-center">
            {savedLocations.length > 0 ? (
                savedLocations.map(loc => (
                    <button 
                        key={loc.name}
                        onClick={(e) => handleSubmit(e, loc.name)}
                        className="bg-green-600 text-white font-semibold py-2 px-4 rounded-full shadow-lg hover:bg-green-700 transform hover:-translate-y-1 transition-all"
                    >
                        {loc.name}
                    </button>
                ))
            ) : (
                <p className="text-gray-500">No saved locations to show on map. Add some from the '7-Day Forecast' tab.</p>
            )}
        </div>
      </div>
    )}
    
    <div className="mt-8">
        {loading && <div className="flex justify-center"><Spinner /></div>}
        {error && <p className="text-red-400 text-center mb-4">{error}</p>}
        {forecast && (
          <Card title={`Forecast for ${forecast.location}`} icon={<CloudIcon />}>
              <div className="flex justify-end gap-2 -mt-2 mb-4">
                  <button 
                      onClick={() => handleShare(`Weather Forecast: ${forecast.location}`, formatForecastForExport(forecast))}
                      title="Share Forecast"
                      className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                  >
                      <ShareIcon />
                  </button>
                  <button 
                      onClick={() => handlePdfExport(formatForecastForExport(forecast), `forecast-${forecast.location.replace(/\s+/g, '_')}`)}
                      title="Export Forecast as PDF"
                      className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                  >
                      <PdfIcon />
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {forecast.forecast.map((day: WeatherDay, index: number) => (
                      <div key={index} className="bg-gray-800 p-4 rounded-lg">
                          <p className="font-bold text-lg text-white">{day.day}</p>
                          <p className="text-gray-300">{day.description}</p>
                          <p className="text-2xl font-semibold text-green-400">{day.high} / <span className="text-gray-400">{day.low}</span></p>
                          <p className="text-sm text-gray-400">Precip: {day.precipitation}</p>
                          <p className="text-sm text-gray-400">Wind: {day.wind}</p>
                      </div>
                  ))}
              </div>
              {!savedLocations.some(l => l.name.toLowerCase() === forecast.location.toLowerCase()) && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => saveLocation(forecast.location)}
                        className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        Save {forecast.location} for Alerts
                    </button>
                </div>
              )}
          </Card>
        )}
    </div>
    </div>
  );
};

export default WeatherPrediction;