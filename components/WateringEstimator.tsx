import React, { useState, useEffect, useRef } from 'react';
import { getWateringEstimate, getWeatherForecast } from '../services/geminiService';
import Spinner from './shared/Spinner';
import Card from './shared/Card';
import { WaterDropIcon, ShareIcon, PdfIcon, SensorIcon, FileDownloadIcon } from './icons';
import AutoCompleteInput from './shared/AutoCompleteInput';
import { CROP_SUGGESTION_LIST, LOCATION_SUGGESTION_LIST } from '../data/suggestions';
import { useAppContext } from '../contexts/AppContext';
import { fetchMockSensorData } from '../services/sensorService';
import { saveAndDownloadReport } from '../utils/reportUtils';

interface WateringTip {
  title: string;
  description: string;
  icon: string;
}

const getSmartTips = (temp: number, isCelsius: boolean): WateringTip[] => {
  const tips: WateringTip[] = [];
  
  if (isCelsius) {
    if (temp >= 30) {
      // Very Hot
      tips.push({
        title: 'Mulch heavily to retain moisture',
        description: 'High heat increases soil evaporation. Lay a 2-3 inch layer of organic mulch (straw, woodchips) to block direct sun.',
        icon: '🍂'
      });
      tips.push({
        title: 'Water early in the morning',
        description: 'Water before 7:00 AM to minimize evaporation losses and protect leaves from heat stress / scalding.',
        icon: '🌅'
      });
      tips.push({
        title: 'Deep root soaking',
        description: 'Apply water slowly and deep into the roots rather than frequent light misting, which evaporates instantly.',
        icon: '💧'
      });
    } else if (temp <= 12) {
      // Cold
      tips.push({
        title: 'Water late morning or afternoon',
        description: 'Water during warmer daylight hours (11:00 AM - 2:00 PM) to allow soil to warm up and prevent root frost shock.',
        icon: '☀️'
      });
      tips.push({
        title: 'Reduce watering frequency',
        description: 'Crops have slower metabolism and lower transpiration rate. Overwatering in cold soil causes fungal root rot.',
        icon: '⏳'
      });
      tips.push({
        title: 'Check drainage efficiency',
        description: 'Ensure standing water does not freeze around the stems. Clear any mulch directly touching the crown.',
        icon: '🚿'
      });
    } else {
      // Moderate (13 - 29)
      tips.push({
        title: 'Consistent moisture schedules',
        description: 'Perfect moderate conditions. Maintain consistent daily/bi-daily watering patterns for stable fruit development.',
        icon: '📈'
      });
      tips.push({
        title: 'Finger moisture-test first',
        description: 'Always insert your finger 2 inches into the soil. If it feels damp, delay your watering estimation by 24 hours.',
        icon: '👉'
      });
      tips.push({
        title: 'Utilize drip irrigation',
        description: 'Deliver water directly to the plant root system, reducing weeds from germinating in dry spaces.',
        icon: '🔌'
      });
    }
  } else {
    // Fahrenheit
    if (temp >= 85) {
      // Very Hot
      tips.push({
        title: 'Mulch heavily to retain moisture',
        description: 'High heat increases soil evaporation. Lay a 2-3 inch layer of organic mulch (straw, woodchips) to block direct sun.',
        icon: '🍂'
      });
      tips.push({
        title: 'Water early in the morning',
        description: 'Water before 7:00 AM to minimize evaporation losses and protect leaves from heat stress / scalding.',
        icon: '🌅'
      });
      tips.push({
        title: 'Deep root soaking',
        description: 'Apply water slowly and deep into the roots rather than frequent light misting, which evaporates instantly.',
        icon: '💧'
      });
    } else if (temp <= 54) {
      // Cold
      tips.push({
        title: 'Water late morning or afternoon',
        description: 'Water during warmer daylight hours (11:00 AM - 2:00 PM) to allow soil to warm up and prevent root frost shock.',
        icon: '☀️'
      });
      tips.push({
        title: 'Reduce watering frequency',
        description: 'Crops have slower metabolism and lower transpiration rate. Overwatering in cold soil causes fungal root rot.',
        icon: '⏳'
      });
      tips.push({
        title: 'Check drainage efficiency',
        description: 'Ensure standing water does not freeze around the stems. Clear any mulch directly touching the crown.',
        icon: '🚿'
      });
    } else {
      // Moderate (55 - 84)
      tips.push({
        title: 'Consistent moisture schedules',
        description: 'Perfect moderate conditions. Maintain consistent daily/bi-daily watering patterns for stable fruit development.',
        icon: '📈'
      });
      tips.push({
        title: 'Finger moisture-test first',
        description: 'Always insert your finger 2 inches into the soil. If it feels damp, delay your watering estimation by 24 hours.',
        icon: '👉'
      });
      tips.push({
        title: 'Utilize drip irrigation',
        description: 'Deliver water directly to the plant root system, reducing weeds from germinating in dry spaces.',
        icon: '🔌'
      });
    }
  }

  return tips;
};

const WateringEstimator: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { savedLocations } = state;

  const [cropType, setCropType] = useState('');
  const [location, setLocation] = useState('');
  const [soilMoisture, setSoilMoisture] = useState('');
  const [estimate, setEstimate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [fetchingSensor, setFetchingSensor] = useState(false);
  const [sensorInfo, setSensorInfo] = useState<{
    sensorId: string;
    batteryLevel: number;
    status: 'optimal' | 'dry' | 'wet';
    lastUpdated: string;
  } | null>(null);

  const [predictedTemp, setPredictedTemp] = useState<number | null>(null);
  const [tempUnitStr, setTempUnitStr] = useState<string>('');

  // Background Telemetry/Polling State
  const [isPolling, setIsPolling] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(15); // Default to 15 seconds
  const [pollingLogs, setPollingLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] 🔋 Telemetry poller initialized.`
  ]);
  const [locationSensorTelemetry, setLocationSensorTelemetry] = useState<Record<string, {
    sensorId: string;
    batteryLevel: number;
    status: 'optimal' | 'dry' | 'wet';
    lastUpdated: string;
  }>>({});
  const [newSensorLocationName, setNewSensorLocationName] = useState('');
  const [isForceSyncingAll, setIsForceSyncingAll] = useState(false);

  const syncLocationRef = useRef<((locName: string) => Promise<void>) | null>(null);

  // Keep dynamic values locked in ref
  useEffect(() => {
    syncLocationRef.current = async (locName: string) => {
      try {
        const response = await fetchMockSensorData(cropType || 'Tomato', locName);
        if (response.success) {
          // 1. Dispatch global moisture state update
          dispatch({
            type: 'UPDATE_LOCATION_MOISTURE',
            payload: { name: locName, moisture: String(response.moisture) },
          });

          // 2. Cache details locally to display battery & status info per location
          setLocationSensorTelemetry((prev) => ({
            ...prev,
            [locName.toLowerCase()]: {
              sensorId: response.sensorId,
              batteryLevel: response.batteryLevel,
              status: response.status,
              lastUpdated: response.lastUpdated,
            }
          }));

          // 3. Queue an activity logging trace
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setPollingLogs((prev) => [
            `[${timestamp}] 📡 Synced ${response.sensorId} (${locName}) → ${response.moisture}% moisture`,
            ...prev.slice(0, 14) // Keep latest 15 traces
          ]);

          // 4. If current select matches this location, keep the active estimate form synced in real-time
          if (location && location.toLowerCase() === locName.toLowerCase()) {
            setSoilMoisture(String(response.moisture));
            setSensorInfo({
              sensorId: response.sensorId,
              batteryLevel: response.batteryLevel,
              status: response.status,
              lastUpdated: response.lastUpdated,
            });
          }
        }
      } catch (err) {
        console.error(`Background telemetry fetch failed for ${locName}`, err);
      }
    };
  }, [cropType, location, dispatch]);

  // Main Background Polling Engine
  useEffect(() => {
    if (!isPolling || savedLocations.length === 0) return;

    const triggerSyncAll = () => {
      savedLocations.forEach((loc) => {
        if (syncLocationRef.current) {
          syncLocationRef.current(loc.name);
        }
      });
    };

    // Immediate start
    triggerSyncAll();

    // Setup cyclic interval tracker
    const intervalId = setInterval(() => {
      triggerSyncAll();
    }, pollingInterval * 1000);

    return () => clearInterval(intervalId);
  }, [isPolling, pollingInterval, savedLocations.length]);

  const handleForceSyncAll = async () => {
    if (savedLocations.length === 0) return;
    setIsForceSyncingAll(true);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setPollingLogs((prev) => [
      `[${timestamp}] ⚡ Manual Force Synchronizing All Sensor Nodes...`,
      ...prev.slice(0, 14)
    ]);
    
    // Concurrent force synchronization
    await Promise.all(
      savedLocations.map(async (loc) => {
        if (syncLocationRef.current) {
          await syncLocationRef.current(loc.name);
        }
      })
    );
    setIsForceSyncingAll(false);
  };

  const handleAddSensorNode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSensorLocationName.trim();
    if (!trimmed) return;

    if (savedLocations.some(l => l.name.toLowerCase() === trimmed.toLowerCase())) {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setPollingLogs((prev) => [
        `[${timestamp}] ⚠️ Sensor node for ${trimmed} already exists.`,
        ...prev.slice(0, 14)
      ]);
      return;
    }

    dispatch({
      type: 'ADD_LOCATION',
      payload: { name: trimmed, moisture: '50' }
    });
    setNewSensorLocationName('');

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setPollingLogs((prev) => [
      `[${timestamp}] 🆕 Registered new IoT Sensor node at ${trimmed}. Initializing...`,
      ...prev.slice(0, 14)
    ]);

    // Force immediate sync for the new location
    setTimeout(() => {
      if (syncLocationRef.current) {
        syncLocationRef.current(trimmed);
      }
    }, 400);
  };

  const handleFetchSensorData = async () => {
    setFetchingSensor(true);
    setErrors((prev) => {
      const { soilMoisture, ...rest } = prev;
      return rest;
    });
    try {
      const response = await fetchMockSensorData(cropType, location);
      if (response.success) {
        setSoilMoisture(String(response.moisture));
        setSensorInfo({
          sensorId: response.sensorId,
          batteryLevel: response.batteryLevel,
          status: response.status,
          lastUpdated: response.lastUpdated,
        });
      }
    } catch (err) {
      console.error(err);
      setErrors((prev) => ({
        ...prev,
        soilMoisture: 'Failed to retrieve sensor telemetry. Please try again.',
      }));
    } finally {
      setFetchingSensor(false);
    }
  };

  const handleLocationSelect = (selectedLocationName: string) => {
    if (selectedLocationName === "") {
        setLocation('');
        setSoilMoisture('');
        return;
    }
    const selected = savedLocations.find(l => l.name === selectedLocationName);
    if (selected) {
      setLocation(selected.name);
      setSoilMoisture(selected.moisture);
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!cropType.trim()) newErrors.cropType = 'Crop type is required.';
    if (!location.trim()) newErrors.location = 'Location is required.';
    const moisture = Number(soilMoisture);
    if (soilMoisture && (isNaN(moisture) || moisture < 0 || moisture > 100)) {
        newErrors.soilMoisture = 'Soil moisture must be a number between 0 and 100.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setEstimate('');
    setPredictedTemp(null);

    try {
      const isCelsius = state.settings.temperatureUnit === 'celsius';
      const defaultTemp = isCelsius ? 22 : 72;
      let detectedTemp = defaultTemp;
      let detectedUnit = isCelsius ? '°C' : '°F';

      const forecastPromise = getWeatherForecast(location)
        .then((res) => {
          try {
            return JSON.parse(res);
          } catch {
            return null;
          }
        })
        .catch(() => null);

      const estimatePromise = getWateringEstimate(cropType, location, soilMoisture);

      const [forecastData, result] = await Promise.all([forecastPromise, estimatePromise]);

      setEstimate(result);

      if (forecastData && forecastData.forecast && forecastData.forecast.length > 0) {
        const todayForecast = forecastData.forecast[0];
        const highTempStr = todayForecast.high || todayForecast.low || "";
        const numericMatch = highTempStr.match(/(-?\d+)/);
        if (numericMatch) {
          detectedTemp = parseInt(numericMatch[1], 10);
        }
        if (highTempStr.includes('C') || highTempStr.includes('c')) {
          detectedUnit = '°C';
        } else if (highTempStr.includes('F') || highTempStr.includes('f')) {
          detectedUnit = '°F';
        }
      } else {
        const locLower = location.toLowerCase();
        if (locLower.includes('phoenix') || locLower.includes('vegas') || locLower.includes('desert') || locLower.includes('florida') || locLower.includes('miami') || locLower.includes('fresno')) {
          detectedTemp = isCelsius ? 34 : 93;
        } else if (locLower.includes('seattle') || locLower.includes('london') || locLower.includes('alaska') || locLower.includes('chicago')) {
          detectedTemp = isCelsius ? 11 : 52;
        }
      }

      setPredictedTemp(detectedTemp);
      setTempUnitStr(detectedUnit);

    } catch (err) {
      console.error(err);
      const result = await getWateringEstimate(cropType, location, soilMoisture);
      setEstimate(result);
      const isCelsius = state.settings.temperatureUnit === 'celsius';
      setPredictedTemp(isCelsius ? 22 : 72);
      setTempUnitStr(isCelsius ? '°C' : '°F');
    } finally {
      setLoading(false);
    }
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

  const handlePdfExport = async (content: string, filename: string, title: string, reportType: string) => {
      await saveAndDownloadReport(title, reportType, content, filename);
  };

  const handleExportJson = () => {
    const climateStatus = displayedTemp >= (isCelsius ? 30 : 85) 
       ? 'High Heat' 
       : displayedTemp <= (isCelsius ? 12 : 54) 
         ? 'Frost/Cold' 
         : 'Optimal/Moderate';

    const reportData = {
      cropType,
      location,
      soilMoisture: soilMoisture || 'Not provided',
      predictedTemperature: `${displayedTemp}${tempUnitStr || (isCelsius ? '°C' : '°F')}`,
      weatherStatus: climateStatus,
      smartWateringTips: tips.map(t => ({
        title: t.title,
        description: t.description,
        icon: t.icon
      })),
      wateringSchedule: estimate,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `watering-report-${cropType.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportText = () => {
    const climateStatus = displayedTemp >= (isCelsius ? 30 : 85) 
       ? 'High Heat' 
       : displayedTemp <= (isCelsius ? 12 : 54) 
         ? 'Frost/Cold' 
         : 'Optimal/Moderate';

    let txtContent = `==================================================
WATERING ESTIMATION & SMART ADVICE REPORT
==================================================
Date/Time:   ${new Date().toLocaleString()}
Crop Type:   ${cropType}
Location:    ${location}
Soil Moisture: ${soilMoisture ? `${soilMoisture}%` : 'Not provided'}
Temperature: ${displayedTemp}${tempUnitStr || (isCelsius ? '°C' : '°F')} (${climateStatus})

==================================================
SMART WATERING TIPS
==================================================
`;

    tips.forEach((tip, idx) => {
      txtContent += `${idx + 1}. [${tip.icon}] ${tip.title}\n   ${tip.description}\n\n`;
    });

    txtContent += `==================================================
WATERING SCHEDULE
==================================================
${estimate}

==================================================
Report generated by GreenThumb Smart Estimator.
==================================================`;

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `watering-report-${cropType.replace(/\s+/g, '_')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isCelsius = tempUnitStr === '°C' || state.settings.temperatureUnit === 'celsius';
  const displayedTemp = predictedTemp !== null ? predictedTemp : (isCelsius ? 22 : 72);
  const tips = getSmartTips(displayedTemp, isCelsius);

  return (
    <div>
      <div className="mb-6 pb-2 border-b border-gray-700/40">
        <h2 className="text-2xl font-bold text-gray-100 mb-1">Watering Needs / Soil Moisture Telemetry</h2>
        <p className="text-gray-400 text-sm">Review, monitor, and simulate soil conditions across your saved locations and get tailored AI schedules.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls and AI watering estimates info */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-gray-800/40 border border-gray-700/60 p-5 rounded-xl space-y-4">
            <h3 className="text-base font-bold text-gray-100 flex items-center gap-1.5">
              <span>💧</span>
              <span>Watering Schedule Planner</span>
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {savedLocations.length > 0 && (
                <div>
                  <label htmlFor="savedLocation" className="block text-sm font-medium text-gray-300">Use a Saved Location</label>
                  <select
                    id="savedLocation"
                    onChange={(e) => handleLocationSelect(e.target.value)}
                    value={location}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                  >
                    <option value="">-- Apply a Saved Location Sensor Node --</option>
                    {savedLocations.map(loc => (
                      <option key={loc.name} value={loc.name}>{loc.name} ({loc.moisture}%)</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AutoCompleteInput
                    id="cropType"
                    label="Crop Type"
                    value={cropType}
                    onChange={setCropType}
                    suggestionsData={CROP_SUGGESTION_LIST}
                    placeholder="e.g., Lettuce, Corn"
                    error={errors.cropType}
                  />
                  <AutoCompleteInput
                    id="location"
                    label="Location"
                    value={location}
                    onChange={setLocation}
                    suggestionsData={LOCATION_SUGGESTION_LIST}
                    placeholder="e.g., Fresno, CA"
                    error={errors.location}
                  />
              </div>

              <div>
                  <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                    <label htmlFor="soilMoisture" className="block text-sm font-medium text-gray-300">
                      Current Soil Moisture (%) <span className="text-gray-400 text-xs font-normal">(optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleFetchSensorData}
                      disabled={fetchingSensor || !location.trim()}
                      className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 font-semibold focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-2 py-1 border border-green-500/20 hover:border-green-500/40 bg-green-950/20 hover:bg-green-950/40 transition-all disabled:opacity-50"
                      title={!location.trim() ? "Provide a location to query sensor node directly" : "Fetch sensor data for this location"}
                    >
                      {fetchingSensor ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-t border-r border-green-400"></div>
                          <span>Fetching live telemetry...</span>
                        </>
                      ) : (
                        <>
                          <SensorIcon className="w-3.5 h-3.5" />
                          <span>Fetch Live Sensor Data</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="number"
                    id="soilMoisture"
                    value={soilMoisture}
                    onChange={(e) => {
                      setSoilMoisture(e.target.value);
                      setSensorInfo(null);
                    }}
                    className={`mt-1 block w-full bg-gray-700 border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm ${errors.soilMoisture ? 'border-red-500' : 'border-gray-600'}`}
                    placeholder="Enter or sync sensor reading (e.g., 35)"
                    aria-invalid={!!errors.soilMoisture}
                  />
                  {errors.soilMoisture && <p className="mt-1 text-xs text-red-400">{errors.soilMoisture}</p>}
                  
                  {sensorInfo && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-green-400 bg-green-950/40 border border-green-800/30 rounded-lg p-2.5">
                      <span className="flex items-center gap-1.5 font-semibold text-green-300">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Synced: {sensorInfo.sensorId}
                      </span>
                      <span className="text-green-800/60 font-light">|</span>
                      <span className="text-gray-300">Battery: {sensorInfo.batteryLevel}%</span>
                      <span className="text-green-800/60 font-light">|</span>
                      <span className="text-gray-300">
                        Soil Status: <span className={`font-semibold ${sensorInfo.status === 'dry' ? 'text-amber-400' : sensorInfo.status === 'wet' ? 'text-blue-400' : 'text-green-400'}`}>{sensorInfo.status}</span>
                      </span>
                      <span className="text-gray-500 text-[10px] sm:ml-auto">Last updated: {sensorInfo.lastUpdated}</span>
                    </div>
                  )}
              </div>

              <button type="submit" disabled={loading} className="w-full inline-flex justify-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-semibold rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 disabled:bg-gray-500 transition-colors">
                {loading ? <Spinner /> : 'Estimate Watering Needs'}
              </button>
            </form>
          </div>

          {estimate && (
            <div className="space-y-6">
              <Card title="Sensor-Adjusted Watering Schedule" icon={<WaterDropIcon />}>
                <div className="flex flex-wrap items-center justify-end gap-2 -mt-2 mb-4">
                    <button 
                        onClick={() => handleShare(`Watering Schedule: ${cropType}`, estimate)}
                        title="Share Schedule"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <ShareIcon />
                    </button>
                    <button 
                        onClick={() => handlePdfExport(estimate, `watering-schedule-${cropType.replace(/\s+/g, '_')}`, `Watering Schedule - ${cropType}`, 'watering-schedule')}
                        title="Export Schedule as PDF"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <PdfIcon />
                    </button>
                    <button 
                        onClick={handleExportText}
                        title="Export Report & Tips as Text (.txt)"
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-750 hover:border-green-500/50 bg-gray-800/80 hover:bg-gray-700 text-xs font-medium rounded-md text-gray-300 hover:text-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-all shadow-sm"
                    >
                        <FileDownloadIcon className="w-3.5 h-3.5" />
                        <span>Export TXT</span>
                    </button>
                    <button 
                        onClick={handleExportJson}
                        title="Export Inputs, Tips & Schedule as JSON (.json)"
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-750 hover:border-green-500/50 bg-gray-800/80 hover:bg-gray-700 text-xs font-medium rounded-md text-gray-300 hover:text-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-all shadow-sm"
                    >
                        <FileDownloadIcon className="w-3.5 h-3.5" />
                        <span>Export JSON</span>
                    </button>
                </div>
                <div className="prose dark:prose-invert max-w-none text-gray-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: estimate.replace(/\n/g, '<br />') }} />
                
                {/* Elegant Smart Watering Tips Callout Box inside result card */}
                <div className="mt-8 border-t border-gray-700/80 pt-6">
                  <div className="bg-gradient-to-br from-green-950/30 to-emerald-950/30 border border-green-800/30 rounded-xl p-4 sm:p-5">
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">💡</span>
                        <div>
                          <h4 className="font-bold text-green-400 text-sm sm:text-base">Smart Watering Tips</h4>
                          <p className="text-xs text-gray-400">Adaptive agricultural coaching based on environmental factors</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-700/80 rounded-lg px-2.5 py-1 text-xs">
                        <span className="text-gray-400">Predicted Temp:</span>
                        <button
                          type="button"
                          onClick={() => setPredictedTemp(prev => (prev !== null ? prev - 2 : (isCelsius ? 20 : 70)))}
                          className="w-5 h-5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-center flex items-center justify-center text-xs font-bold text-white leading-none transition-colors"
                          title="Decrease Temperature"
                        >
                          -
                        </button>
                        <span className="font-bold text-green-400 min-w-[36px] text-center">
                          {displayedTemp}{tempUnitStr || (isCelsius ? '°C' : '°F')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPredictedTemp(prev => (prev !== null ? prev + 2 : (isCelsius ? 24 : 74)))}
                          className="w-5 h-5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-center flex items-center justify-center text-xs font-bold text-white leading-none transition-colors"
                          title="Increase Temperature"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Weather Alert Status Badge */}
                    <div className="mb-4">
                       {displayedTemp >= (isCelsius ? 30 : 85) ? (
                         <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                           <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                           High heat conditions currently active (Tips optimized for extreme heat)
                         </div>
                       ) : displayedTemp <= (isCelsius ? 12 : 54) ? (
                         <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                           Frost/Cold conditions active (Tips optimized for root warmth & rot avoidance)
                         </div>
                       ) : (
                         <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold">
                           <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                           Optimal crop-growing climate (Tips optimized for moderate weather stability)
                         </div>
                       )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {tips.map((tip, idx) => (
                        <div key={idx} className="bg-gray-900/60 hover:bg-gray-900/80 border border-gray-800/30 p-3.5 rounded-lg transition-all">
                          <div className="flex items-start gap-2.5">
                            <span className="text-xl leading-none mt-0.5">{tip.icon}</span>
                            <div>
                              <p className="font-semibold text-gray-200 text-xs sm:text-sm">{tip.title}</p>
                              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{tip.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column: IoT Soil Sensor Background Dashboard Widget */}
        <div className="lg:col-span-5">
          <div className="bg-gray-800/40 border border-gray-700/60 p-5 rounded-xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-700/50">
              <div>
                <h3 className="text-base font-bold text-gray-100 flex items-center gap-1.5">
                  <span className="text-xl">📡</span>
                  <span>IoT Soil Sensor Arena</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Real-time mock sensor background polling</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${isPolling && savedLocations.length > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-700 text-gray-400'}`}>
                  {isPolling && savedLocations.length > 0 && <span className="w-1 h-1 rounded-full bg-green-400 animate-ping mr-1 inline-block" />}
                  {isPolling && savedLocations.length > 0 ? 'AUTO-POLLING' : 'PAUSED'}
                </span>
              </div>
            </div>

            {/* Control Desk Panel */}
            <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-800/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Interval:</span>
                  <select
                    value={pollingInterval}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPollingInterval(val);
                      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      setPollingLogs(prev => [`[${timestamp}] ⚙️ Set background polling frequency to ${val}s.`, ...prev.slice(0, 14)]);
                    }}
                    className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value={5}>5s (Fast)</option>
                    <option value={10}>10s</option>
                    <option value={15}>15s (Default)</option>
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPolling(!isPolling);
                      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      setPollingLogs(prev => [
                        `[${timestamp}] ${!isPolling ? '▶️ Background auto-polling active.' : '⏸️ Background auto-polling paused.'}`,
                        ...prev.slice(0, 14)
                      ]);
                    }}
                    className={`px-2 py-1 rounded text-xs font-semibold select-none transition-colors ${
                      isPolling 
                        ? 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/30' 
                        : 'bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30'
                    }`}
                  >
                    {isPolling ? 'Pause' : 'Resume'}
                  </button>

                  <button
                    type="button"
                    onClick={handleForceSyncAll}
                    disabled={isForceSyncingAll || savedLocations.length === 0}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-750 rounded text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {isForceSyncingAll ? (
                      <div className="animate-spin rounded-full h-2.5 w-2.5 border-t border-gray-100"></div>
                    ) : 'Sync All'}
                  </button>
                </div>
              </div>
            </div>

            {/* Saved IoT Nodes Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Node Grid Tracker</h4>
              
              {savedLocations.length === 0 ? (
                <div className="text-center py-6 px-4 border border-dashed border-gray-750 rounded-xl bg-gray-900/20">
                  <p className="text-gray-400 text-xs">No active IoT sensor telemetry nodes found.</p>
                  <p className="text-gray-500 text-[11px] mt-1">Register a new node location below to activate real-time background sweeps.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-[340px] overflow-y-auto pr-1">
                  {savedLocations.map((loc) => {
                    const telemetry = locationSensorTelemetry[loc.name.toLowerCase()];
                    const numericMoisture = Number(loc.moisture) || 50;
                    
                    // Color mapping for progressive gauge
                    let statusColor = 'bg-emerald-500';
                    let textColor = 'text-emerald-400';
                    let barColor = 'from-emerald-500/30 to-emerald-500';
                    
                    if (numericMoisture < 30) {
                      statusColor = 'bg-amber-500';
                      textColor = 'text-amber-400';
                      barColor = 'from-amber-500/30 to-amber-500';
                    } else if (numericMoisture > 70) {
                      statusColor = 'bg-blue-500';
                      textColor = 'text-blue-400';
                      barColor = 'from-blue-500/30 to-blue-500';
                    }

                    return (
                      <div 
                        key={loc.name} 
                        className="p-3 bg-gray-900/50 hover:bg-gray-900/80 border border-gray-800/80 rounded-lg group transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <span className="font-bold text-gray-200 text-xs group-hover:text-white transition-colors">{loc.name}</span>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${isPolling ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                              <span>{telemetry?.sensorId || 'Node Syncing...'}</span>
                            </div>
                          </div>

                          <div className="text-right text-xs">
                            <span className={`font-mono font-bold text-sm ${textColor}`}>{loc.moisture}%</span>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              {telemetry ? `🔋 ${telemetry.batteryLevel}%` : '---'}
                            </span>
                          </div>
                        </div>

                        {/* Progressive gauge loading line */}
                        <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden mb-1.5">
                          <div 
                            className={`bg-gradient-to-r ${barColor} h-2 rounded-full transition-all duration-700`}
                            style={{ width: `${numericMoisture}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span>Soil: <strong className={`uppercase ${textColor}`}>{telemetry?.status || 'OPTIMAL'}</strong></span>
                          <button 
                            type="button"
                            onClick={() => {
                              if (syncLocationRef.current) syncLocationRef.current(loc.name);
                            }}
                            className="text-gray-400 hover:text-green-400 border border-gray-750 hover:border-green-500/20 px-1.5 py-0.5 bg-gray-950 rounded flex items-center gap-0.5 hover:shadow-xs transition-all active:scale-95"
                          >
                            ⚡ Force Sync
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick add mock sensor node */}
            <form onSubmit={handleAddSensorNode} className="border-t border-gray-700/30 pt-3">
              <label htmlFor="newSensorNode" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                Register Simulated Sensor
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="newSensorNode"
                  value={newSensorLocationName}
                  onChange={(e) => setNewSensorLocationName(e.target.value)}
                  placeholder="e.g. Phoenix, Portland"
                  className="flex-1 bg-gray-900 border border-gray-750 focus:border-green-500 text-xs px-2.5 py-1.5 text-white rounded focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-green-700 hover:bg-green-600 border border-green-600 text-white font-medium text-xs px-3 py-1.5 rounded transition-all active:scale-95 shrink-0"
                >
                  + Add Node
                </button>
              </div>
            </form>

            {/* Live Event Terminal Loop */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-gray-400 uppercase tracking-wide">Telemetry Event Stream</span>
                <button
                  type="button"
                  onClick={() => setPollingLogs([`[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] 🧹 Logs cleared.`])}
                  className="text-[9px] text-gray-500 hover:text-gray-400 font-mono"
                >
                  Clear Terminal
                </button>
              </div>
              
              <div className="bg-gray-950 border border-gray-900 p-2 text-[10px] text-green-400 space-y-1 max-w-full font-mono rounded-lg h-[120px] overflow-y-auto">
                {pollingLogs.map((log, i) => (
                  <div key={i} className="leading-snug break-all text-gray-300">
                    <span className="text-green-500 select-none mr-1 font-semibold">&gt;</span>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WateringEstimator;