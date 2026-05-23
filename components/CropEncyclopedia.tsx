import React, { useState, useEffect } from 'react';
import { getCropInfo, getPlantingCalendar, compareCrops, getTrendingPlantingAdvice } from '../services/geminiService';
import Spinner from './shared/Spinner';
import Card from './shared/Card';
import { BookIcon, FileDownloadIcon, ScaleIcon, ShareIcon, PdfIcon } from './icons';
import { PlantingCalendarData, CropComparisonData, SavedComparison, ComparedCrop } from '../types';
import AutoCompleteInput from './shared/AutoCompleteInput';
import { CROP_SUGGESTION_LIST, LOCATION_SUGGESTION_LIST } from '../data/suggestions';
import { useAppContext } from '../contexts/AppContext';

export interface PlantingReminder {
  id: string;
  crop: string;
  climateZone: string;
  month: string;
  action: string;
  notes: string;
  isCompleted: boolean;
  isHighPriority: boolean;
  timing: '1' | '15' | 'end';
  createdAt: string;
}

const MONTH_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getMonthName = (monthIndex: number): string => {
  return MONTH_LIST[monthIndex] || "January";
};


const COMMON_CROPS = ['Tomato', 'Corn', 'Wheat', 'Potato', 'Lettuce', 'Soybean'];

const getActionColor = (action: string) => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('sow') || lowerAction.includes('plant') || lowerAction.includes('transplant')) {
    return 'bg-green-500/20 hover:bg-green-500/30'; // Planting/Sowing
  }
  if (lowerAction.includes('harvest')) {
    return 'bg-blue-500/20 hover:bg-blue-500/30'; // Harvesting
  }
  if (lowerAction.includes('prune') || lowerAction.includes('prepare') || lowerAction.includes('maintain') || lowerAction.includes('fertilize')) {
    return 'bg-yellow-500/20 hover:bg-yellow-500/30'; // Maintenance
  }
  return 'bg-gray-700/50 hover:bg-gray-700/60'; // Default/other
};

const CropEncyclopedia: React.FC = () => {
  const { state } = useAppContext();
  const { savedLocations } = state;

  const [activeSubTab, setActiveSubTab] = useState<'search' | 'calendar' | 'compare'>('calendar');
  
  // State for Crop Search
  const [searchTerm, setSearchTerm] = useState('');
  const [cropInfo, setCropInfo] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [currentCrop, setCurrentCrop] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // State for Real-Time Grounded Advice
  const [groundingRegion, setGroundingRegion] = useState('');
  const [trendingAdvice, setTrendingAdvice] = useState('');
  const [trendingSources, setTrendingSources] = useState<Array<{ title: string; uri: string }>>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [trendingError, setTrendingError] = useState('');
  const [activeGroundingRegion, setActiveGroundingRegion] = useState('');

  // State for Planting Calendar
  const [calendarCrop, setCalendarCrop] = useState('Tomato');
  const [climateZone, setClimateZone] = useState('USDA Zone 7b');
  const [calendarData, setCalendarData] = useState<PlantingCalendarData | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [savedPreferences, setSavedPreferences] = useState<{ climateZone: string; favoriteCrops: string[] } | null>(null);
  const [calendarAutoTriggered, setCalendarAutoTriggered] = useState(false);

  // State for Planting Reminders feature
  const [reminders, setReminders] = useState<PlantingReminder[]>([]);
  const [reminderModalData, setReminderModalData] = useState<{
    id?: string;
    crop: string;
    climateZone: string;
    month: string;
    action: string;
  } | null>(null);
  const [reminderFormNotes, setReminderFormNotes] = useState('');
  const [reminderFormPriority, setReminderFormPriority] = useState(false);
  const [reminderFormTiming, setReminderFormTiming] = useState<'1' | '15' | 'end'>('15');
  const [reminderFormCrop, setReminderFormCrop] = useState('');
  const [reminderFormZone, setReminderFormZone] = useState('');
  const [reminderFormMonth, setReminderFormMonth] = useState('January');
  const [reminderFormAction, setReminderFormAction] = useState('');
  
  // In-app elegant notifications
  const [inAppToast, setInAppToast] = useState<{ message: string; type: 'success' | 'info' | 'deleted' } | null>(null);


  // State for Crop Comparison
  const [comparisonCrops, setComparisonCrops] = useState<string[]>(['', '']);
  const [comparisonData, setComparisonData] = useState<CropComparisonData | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState('');
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>([]);


  useEffect(() => {
    try {
      const savedSearch = localStorage.getItem('encyclopediaLastSearch');
      if (savedSearch) setSearchTerm(savedSearch);

      const savedRecent = localStorage.getItem('encyclopediaRecentSearches');
      if (savedRecent) {
        setRecentSearches(JSON.parse(savedRecent));
      }

      const savedGroundingRegion = localStorage.getItem('encyclopediaGroundingRegion');
      if (savedGroundingRegion) {
        setGroundingRegion(savedGroundingRegion);
      } else if (savedLocations.length > 0) {
        setGroundingRegion(savedLocations[0].name);
      }

      const savedPrefs = localStorage.getItem('plantingCalendarPreferences');
      if (savedPrefs) setSavedPreferences(JSON.parse(savedPrefs));
      
      const savedCalendarInputs = localStorage.getItem('encyclopediaCalendarInputs');
      if (savedCalendarInputs) {
        const { crop, zone } = JSON.parse(savedCalendarInputs);
        setCalendarCrop(crop || 'Tomato');
        setClimateZone(zone || 'USDA Zone 7b');
      } else {
        setCalendarCrop('Tomato');
        setClimateZone('USDA Zone 7b');
      }

      const savedComparisonsData = localStorage.getItem('cropComparisons');
      if (savedComparisonsData) {
          setSavedComparisons(JSON.parse(savedComparisonsData));
      }
      
      const savedReminders = localStorage.getItem('plantingReminders');
      if (savedReminders) {
          setReminders(JSON.parse(savedReminders));
      }
    } catch (e) {
      console.error("Failed to parse saved encyclopedia data from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (!groundingRegion && savedLocations.length > 0) {
      setGroundingRegion(savedLocations[0].name);
    }
  }, [savedLocations, groundingRegion]);

  useEffect(() => {
    if (activeSubTab === 'calendar' && !calendarData && !loadingCalendar && !calendarAutoTriggered && calendarCrop === 'Tomato' && climateZone === 'USDA Zone 7b') {
      const triggerDefaultCalendar = async () => {
        setCalendarAutoTriggered(true);
        setCalendarError('');
        setLoadingCalendar(true);
        try {
          localStorage.setItem('encyclopediaCalendarInputs', JSON.stringify({ crop: 'Tomato', zone: 'USDA Zone 7b' }));
          const resultString = await getPlantingCalendar('Tomato', 'USDA Zone 7b');
          const result = JSON.parse(resultString);
          if (result.error) {
              setCalendarError(result.error);
          } else {
              setCalendarData(result);
          }
        } catch (e) {
            setCalendarError("Failed to parse calendar data. The service might be unavailable.");
        }
        setLoadingCalendar(false);
      };
      triggerDefaultCalendar();
    }
  }, [activeSubTab, calendarData, calendarAutoTriggered, calendarCrop, climateZone]);

  const handleGroundingRegionChange = (newVal: string) => {
    setGroundingRegion(newVal);
    localStorage.setItem('encyclopediaGroundingRegion', newVal);
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

  const fetchCropData = async (cropName: string) => {
    const trimmedCropName = cropName.trim();
    if (!trimmedCropName) {
      setSearchError('Please enter a crop name to search.');
      return;
    }
    setSearchError('');
    setLoadingSearch(true);
    setCropInfo('');
    
    // Clear previous trending advice
    setTrendingAdvice('');
    setTrendingSources([]);
    setTrendingError('');
    setActiveGroundingRegion('');

    setCurrentCrop(trimmedCropName);
    localStorage.setItem('encyclopediaLastSearch', trimmedCropName);

    // Save to recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmedCropName.toLowerCase());
      const updated = [trimmedCropName, ...filtered].slice(0, 8); // keep last 8 searches
      localStorage.setItem('encyclopediaRecentSearches', JSON.stringify(updated));
      return updated;
    });

    // Run encyclopedic fetch
    const p1 = getCropInfo(trimmedCropName).then(result => {
      setCropInfo(result);
      setLoadingSearch(false);
    }).catch(err => {
      setSearchError('Failed to retrieve generic crop information.');
      setLoadingSearch(false);
    });

    // Run grounded trending advice fetch if a region is available
    if (groundingRegion.trim()) {
      const regionToGround = groundingRegion.trim();
      setActiveGroundingRegion(regionToGround);
      setLoadingTrending(true);
      getTrendingPlantingAdvice(trimmedCropName, regionToGround).then(res => {
        setTrendingAdvice(res.text);
        if (res.sources) {
          setTrendingSources(res.sources);
        }
        setLoadingTrending(false);
      }).catch(err => {
        setTrendingError('Failed to suggest real-time trending planting advice.');
        setLoadingTrending(false);
      });
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('encyclopediaRecentSearches');
  };


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCropData(searchTerm);
  };

  const handleCalendarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCrop = calendarCrop.trim();
    const trimmedZone = climateZone.trim();

    if (!trimmedCrop || !trimmedZone) {
      setCalendarError('Please provide both a crop and a climate zone.');
      return;
    }
    setCalendarError('');
    setLoadingCalendar(true);
    setCalendarData(null);

    try {
      localStorage.setItem('encyclopediaCalendarInputs', JSON.stringify({ crop: trimmedCrop, zone: trimmedZone }));
      const resultString = await getPlantingCalendar(trimmedCrop, trimmedZone);
      const result = JSON.parse(resultString);
      if (result.error) {
          setCalendarError(result.error);
      } else {
          setCalendarData(result);
      }
    } catch (e) {
        setCalendarError("Failed to parse calendar data. The service might be unavailable.");
    }
    setLoadingCalendar(false);
  };

  const saveCalendarPreferences = () => {
    const newPrefs = {
      climateZone: climateZone.trim(),
      favoriteCrops: [...new Set([...(savedPreferences?.favoriteCrops || []), calendarCrop.trim()])].filter(Boolean),
    };
    setSavedPreferences(newPrefs);
    localStorage.setItem('plantingCalendarPreferences', JSON.stringify(newPrefs));
  };
  
  const removeFavoriteCrop = (cropToRemove: string) => {
    if (!savedPreferences) return;
    const newPrefs = {
      ...savedPreferences,
      favoriteCrops: savedPreferences.favoriteCrops.filter(c => c !== cropToRemove),
    };
    setSavedPreferences(newPrefs);
    localStorage.setItem('plantingCalendarPreferences', JSON.stringify(newPrefs));
  };
  
  const handleSetReminder = (month: string, action: string) => {
    if (!calendarData) return;
    setReminderModalData({
      crop: calendarData.crop,
      climateZone: calendarData.climateZone,
      month: month,
      action: action
    });
    setReminderFormCrop(calendarData.crop);
    setReminderFormZone(calendarData.climateZone);
    setReminderFormMonth(month);
    setReminderFormAction(action);
    setReminderFormNotes('');
    setReminderFormPriority(false);
    setReminderFormTiming('15');
  };

  const handleEditReminder = (reminder: PlantingReminder) => {
    setReminderModalData({
      id: reminder.id,
      crop: reminder.crop,
      climateZone: reminder.climateZone,
      month: reminder.month,
      action: reminder.action
    });
    setReminderFormCrop(reminder.crop);
    setReminderFormZone(reminder.climateZone);
    setReminderFormMonth(reminder.month);
    setReminderFormAction(reminder.action);
    setReminderFormNotes(reminder.notes || '');
    setReminderFormPriority(reminder.isHighPriority || false);
    setReminderFormTiming(reminder.timing || '15');
  };

  const handleCreateCustomReminder = () => {
    const currentMonthName = getMonthName(new Date().getMonth());
    setReminderModalData({
      crop: '',
      climateZone: '',
      month: currentMonthName,
      action: ''
    });
    setReminderFormCrop(calendarCrop || '');
    setReminderFormZone(climateZone || 'USDA Zone 7b');
    setReminderFormMonth(currentMonthName);
    setReminderFormAction('');
    setReminderFormNotes('');
    setReminderFormPriority(false);
    setReminderFormTiming('15');
  };

  const handleSaveReminder = () => {
    if (!reminderFormCrop.trim() || !reminderFormAction.trim()) {
      alert('Please enter both Crop Name and Recommended Action.');
      return;
    }

    let updatedReminders = [...reminders];
    const isEditing = !!(reminderModalData && reminderModalData.id);

    if (isEditing && reminderModalData?.id) {
      updatedReminders = reminders.map(r => {
        if (r.id === reminderModalData.id) {
          return {
            ...r,
            crop: reminderFormCrop.trim(),
            climateZone: reminderFormZone.trim(),
            month: reminderFormMonth,
            action: reminderFormAction.trim(),
            notes: reminderFormNotes.trim(),
            isHighPriority: reminderFormPriority,
            timing: reminderFormTiming,
          };
        }
        return r;
      });
      showToast(`Reminder for ${reminderFormCrop} updated successfully!`, 'success');
    } else {
      const newReminder: PlantingReminder = {
        id: Math.random().toString(36).substr(2, 9),
        crop: reminderFormCrop.trim(),
        climateZone: reminderFormZone.trim(),
        month: reminderFormMonth,
        action: reminderFormAction.trim(),
        notes: reminderFormNotes.trim(),
        isCompleted: false,
        isHighPriority: reminderFormPriority,
        timing: reminderFormTiming,
        createdAt: new Date().toISOString()
      };
      updatedReminders.unshift(newReminder);
      showToast(`Reminder created for ${reminderFormCrop} in ${reminderFormMonth}!`, 'success');
    }

    setReminders(updatedReminders);
    localStorage.setItem('plantingReminders', JSON.stringify(updatedReminders));
    setReminderModalData(null);
  };

  const handleToggleReminderCompleted = (id: string) => {
    const updated = reminders.map(r => {
      if (r.id === id) {
        const newStatus = !r.isCompleted;
        showToast(
          newStatus 
            ? `Sowing task marked as completed! 🎉` 
            : `Reminder marked as active.`,
          'info'
        );
        return { ...r, isCompleted: newStatus };
      }
      return r;
    });
    setReminders(updated);
    localStorage.setItem('plantingReminders', JSON.stringify(updated));
  };

  const handleDeleteReminder = (id: string, cropName: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    localStorage.setItem('plantingReminders', JSON.stringify(updated));
    showToast(`Reminder for ${cropName} deleted.`, 'deleted');
  };

  const showToast = (message: string, type: 'success' | 'info' | 'deleted') => {
    setInAppToast({ message, type });
    setTimeout(() => {
      setInAppToast(prev => prev && prev.message === message ? null : prev);
    }, 4500);
  };

  const formatCalendarForExport = (data: PlantingCalendarData): string => {
    let content = `Planting Calendar for ${data.crop} in ${data.climateZone}\n\n`;
    content += data.calendar.map(row => `${row.month}: ${row.action}`).join('\n');
    return content;
  };

  const handleExportCalendar = (format: 'csv' | 'pdf') => {
    if (!calendarData) return;
    const filename = `${calendarData.crop.replace(/\s+/g, '_')}-planting-calendar`;
    
    if(format === 'pdf') {
        handlePdfExport(formatCalendarForExport(calendarData), filename);
        return;
    }

    const headers = "Month,Action\n";
    const csvContent = calendarData.calendar
        .map(row => `"${row.month.replace(/"/g, '""')}","${row.action.replace(/"/g, '""')}"`)
        .join('\n');
    const csv = headers + csvContent;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Comparison Handlers
  const updateComparisonStorage = (comparisons: SavedComparison[]) => {
    try {
        localStorage.setItem('cropComparisons', JSON.stringify(comparisons));
    } catch (e) {
        console.error("Failed to save crop comparisons to localStorage", e);
    }
  };

  const handleSaveComparison = () => {
    const cropsToSave = comparisonCrops.map(c => c.trim()).filter(c => c !== '');
    if (cropsToSave.length < 2) return;

    const isDuplicate = savedComparisons.some(
        saved => JSON.stringify(saved.crops.slice().sort()) === JSON.stringify(cropsToSave.slice().sort())
    );

    if (isDuplicate) {
        alert("This comparison is already saved.");
        return;
    }

    const newComparison: SavedComparison = {
        id: new Date().toISOString(),
        crops: cropsToSave,
    };
    const updatedComparisons = [...savedComparisons, newComparison];
    setSavedComparisons(updatedComparisons);
    updateComparisonStorage(updatedComparisons);
  };

  const handleLoadComparison = (crops: string[]) => {
    const newComparisonCrops = [...crops];
    while (newComparisonCrops.length < 2) {
        newComparisonCrops.push('');
    }
    setComparisonCrops(newComparisonCrops);
    setComparisonData(null);
    setComparisonError('');
  };

  const handleDeleteComparison = (id: string) => {
    if (window.confirm("Are you sure you want to delete this saved comparison?")) {
        const updatedComparisons = savedComparisons.filter(c => c.id !== id);
        setSavedComparisons(updatedComparisons);
        updateComparisonStorage(updatedComparisons);
    }
  };
  
  const handleComparisonCropChange = (index: number, value: string) => {
    const newCrops = [...comparisonCrops];
    newCrops[index] = value;
    setComparisonCrops(newCrops);
  };

  const addComparisonCrop = () => {
    if (comparisonCrops.length < 4) {
      setComparisonCrops([...comparisonCrops, '']);
    }
  };

  const removeComparisonCrop = (index: number) => {
    if (comparisonCrops.length > 2) {
      const newCrops = [...comparisonCrops];
      newCrops.splice(index, 1);
      setComparisonCrops(newCrops);
    }
  };

  const handleComparisonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validCrops = comparisonCrops.map(c => c.trim()).filter(c => c !== '');
    if (validCrops.length < 2) {
      setComparisonError('Please enter at least two crops to compare.');
      return;
    }
    setComparisonError('');
    setLoadingComparison(true);
    setComparisonData(null);
    try {
        const resultString = await compareCrops(validCrops);
        const result = JSON.parse(resultString);
        if (result.error) {
            setComparisonError(result.error);
        } else {
            setComparisonData(result);
        }
    } catch (e) {
        setComparisonError("Failed to parse comparison data. The service might be unavailable.");
    }
    setLoadingComparison(false);
  };
  
  const attributeLabels: { [key: string]: string } = {
    sunlight: "Sunlight",
    soil: "Soil",
    water: "Water Needs",
    harvestTime: "Time to Harvest",
    commonPests: "Common Pests",
  };

  const formatComparisonForExport = (data: CropComparisonData): string => {
    let content = `Crop Comparison: ${data.crops.map(c => c.name).join(' vs ')}\n\n`;
    
    content += `Attribute\t${data.crops.map(c => c.name).join('\t')}\n`;
    content += `---------\t${data.crops.map(c => '-'.repeat(c.name.length)).join('\t')}\n`;

    Object.keys(attributeLabels).forEach(attrKey => {
        const row = data.crops.map(crop => crop.attributes[attrKey as keyof typeof crop.attributes]);
        content += `${attributeLabels[attrKey]}\t${row.join('\t')}\n`;
    });

    return content;
  };


  return (
    <div className="relative">
      {inAppToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in shadow-2xl">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${
            inAppToast.type === 'success' 
              ? 'bg-green-950/90 border-green-500/30 text-green-200' 
              : inAppToast.type === 'deleted' 
              ? 'bg-red-950/90 border-red-500/30 text-red-200' 
              : 'bg-gray-800 border-gray-600 text-gray-200'
          }`}>
            <div className={`p-1.5 rounded-full ${
              inAppToast.type === 'success' ? 'bg-green-500/20' : inAppToast.type === 'deleted' ? 'bg-red-500/20' : 'bg-gray-600/20'
            }`}>
              {inAppToast.type === 'success' ? '✓' : inAppToast.type === 'deleted' ? '🗑' : 'ℹ'}
            </div>
            <p className="text-sm font-medium pr-4">{inAppToast.message}</p>
            <button onClick={() => setInAppToast(null)} className="text-gray-400 hover:text-white text-lg font-semibold select-none focus:outline-none">&times;</button>
          </div>
        </div>
      )}
      <h2 className="text-2xl font-bold text-gray-100 mb-1">Crop Encyclopedia</h2>
      <p className="text-gray-400 mb-6">Look up detailed crop information or generate a seasonal planting calendar.</p>
      
       <div className="mb-6">
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveSubTab('search')}
              className={`${
                activeSubTab === 'search'
                  ? 'border-green-400 text-green-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none`}
            >
              Crop Search
            </button>
            <button
              onClick={() => setActiveSubTab('calendar')}
              className={`${
                activeSubTab === 'calendar'
                  ? 'border-green-400 text-green-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none`}
            >
              Planting Calendar
            </button>
             <button
              onClick={() => setActiveSubTab('compare')}
              className={`${
                activeSubTab === 'compare'
                  ? 'border-green-400 text-green-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } inline-flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none`}
            >
              <ScaleIcon />
              Crop Comparison
            </button>
          </nav>
        </div>
      </div>

      {activeSubTab === 'search' && (
        <>
            <div className="relative mb-8">
              <form onSubmit={handleSearchSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="encyclopediaSearch" className="block text-sm font-medium text-gray-300 mb-1">
                      Crop Name
                    </label>
                    <AutoCompleteInput
                      id="encyclopediaSearch"
                      value={searchTerm}
                      onChange={setSearchTerm}
                      suggestionsData={CROP_SUGGESTION_LIST}
                      placeholder="e.g., Strawberry, Basil, Carrot..."
                    />
                  </div>
                  <div>
                    <label htmlFor="encyclopediaGroundingRegion" className="block text-sm font-medium text-gray-300 mb-1">
                      Target Region / Location (for Real-time Web grounding)
                    </label>
                    <AutoCompleteInput
                      id="encyclopediaGroundingRegion"
                      value={groundingRegion}
                      onChange={handleGroundingRegionChange}
                      suggestionsData={LOCATION_SUGGESTION_LIST}
                      placeholder="e.g., California, USDA Zone 7, London..."
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={loadingSearch || loadingTrending} className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 disabled:bg-gray-500">
                    {(loadingSearch || loadingTrending) ? <Spinner /> : 'Search & Get Advice'}
                  </button>
                </div>
              </form>
            </div>

            {recentSearches.length > 0 && (
              <div className="mb-8 bg-gray-800/40 border border-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-300 text-sm font-medium">Recent Searches</p>
                  <button 
                    onClick={clearRecentSearches}
                    className="text-xs text-red-400 hover:text-red-300 focus:outline-none focus:underline"
                  >
                    Clear History
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((crop, idx) => (
                    <button
                      key={`${crop}-${idx}`}
                      onClick={() => {
                        setSearchTerm(crop);
                        fetchCropData(crop);
                      }}
                      disabled={loadingSearch || loadingTrending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 hover:border-green-500/50 text-gray-300 hover:text-green-400 rounded-md text-sm transition-all disabled:opacity-50"
                    >
                      <span className="text-xs text-green-400/80">🔍</span>
                      <span>{crop}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8">
                <p className="text-gray-400 text-sm mb-3 text-center">Or browse common crops:</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {COMMON_CROPS.map(crop => (
                        <button
                            key={crop}
                            onClick={() => {
                                setSearchTerm(crop);
                                fetchCropData(crop);
                            }}
                            disabled={loadingSearch || loadingTrending}
                            className="px-4 py-2 bg-gray-700/80 text-gray-300 rounded-md text-sm hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                        >
                            {crop}
                        </button>
                    ))}
                </div>
            </div>

            {searchError && <p className="text-red-400 text-center mb-6">{searchError}</p>}
            {trendingError && <p className="text-yellow-400 text-center mb-6">{trendingError}</p>}

            {(loadingSearch || loadingTrending) && (
              <div className="flex flex-col items-center justify-center gap-4 py-12 bg-gray-800/20 border border-gray-700/30 rounded-xl mb-8">
                <Spinner />
                <p className="text-gray-400 text-sm animate-pulse tracking-wide">
                  {loadingSearch && !loadingTrending && "Retrieving encyclopedic guide..."}
                  {!loadingSearch && loadingTrending && "Grounding live advice with Google Search..."}
                  {loadingSearch && loadingTrending && "Running web search and compiling regional tips..."}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Encyclopedic Info Card */}
              {cropInfo && (
                <div className={trendingAdvice ? "lg:col-span-7" : "lg:col-span-12"}>
                  <Card title={`Guide to Growing ${currentCrop}`} icon={<BookIcon />}>
                    <div className="flex justify-end gap-2 -mt-2 mb-4">
                      <button 
                        onClick={() => handleShare(`Growing Guide: ${currentCrop}`, cropInfo)}
                        title="Share Guide"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                      >
                        <ShareIcon />
                      </button>
                      <button 
                        onClick={() => handlePdfExport(cropInfo, `guide-${currentCrop.replace(/\s+/g, '_')}`)}
                        title="Export Guide as PDF"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                      >
                        <PdfIcon />
                      </button>
                    </div>
                    <div 
                      className="prose prose-invert max-w-none prose-h3:text-green-400 prose-strong:text-gray-100" 
                      dangerouslySetInnerHTML={{ __html: cropInfo.replace(/\n/g, '<br />') }} 
                    />
                  </Card>
                </div>
              )}

              {/* Grounded Real-Time Dynamic Advice Card */}
              {trendingAdvice && (
                <div className="lg:col-span-5">
                  <Card title={`Real-Time Trends & Advice`} icon={<span className="text-green-400 text-lg">💡</span>}>
                    {activeGroundingRegion && (
                      <div className="mb-4">
                        <span className="text-xs text-green-300 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded inline-block font-mono">
                          Grounded Search: {activeGroundingRegion}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 -mt-2 mb-4">
                      <button 
                        onClick={() => handleShare(`Real-Time Advice for ${currentCrop} in ${activeGroundingRegion}`, trendingAdvice)}
                        title="Share Advice"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                      >
                        <ShareIcon />
                      </button>
                      <button 
                        onClick={() => handlePdfExport(trendingAdvice, `trending-${currentCrop.replace(/\s+/g, '_')}-${activeGroundingRegion.replace(/\s+/g, '_')}`)}
                        title="Export Advice as PDF"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                      >
                        <PdfIcon />
                      </button>
                    </div>
                    <div 
                      className="prose prose-invert max-w-none text-sm text-gray-200" 
                      dangerouslySetInnerHTML={{ __html: trendingAdvice.replace(/\n/g, '<br />') }} 
                    />

                    {trendingSources.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-gray-700/50">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sources & References:</p>
                        <ul className="space-y-1.5 block max-h-48 overflow-y-auto pr-2">
                          {trendingSources.map((source, index) => (
                            <li key={index} className="text-xs flex items-start gap-1.5 leading-snug">
                              <span className="text-green-500 font-bold">↗</span>
                              <a 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-green-400 hover:text-green-300 underline font-medium break-all"
                              >
                                {source.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
        </>
      )}

      {activeSubTab === 'calendar' && (
        <div>
            {/* Real-time In-App Month Match Alerts */}
            {(() => {
              const currentMonthName = getMonthName(new Date().getMonth());
              const activeMonthlyReminders = reminders.filter(r => r.month === currentMonthName && !r.isCompleted);
              if (activeMonthlyReminders.length > 0) {
                return (
                  <div className="mb-6 bg-gradient-to-r from-amber-950/60 to-gray-800 border-2 border-amber-500/20 p-4 rounded-xl flex items-start gap-4 shadow-lg animate-pulse" id="active-month-alert">
                    <span className="text-3xl text-amber-500 mt-1 inline-block">🔊</span>
                    <div className="flex-grow">
                      <h4 className="text-amber-400 font-bold text-base">In-App Planting Alerts: {currentMonthName} ({new Date().getFullYear()})</h4>
                      <p className="text-sm text-gray-300 mt-1">You have <span className="font-bold text-white">{activeMonthlyReminders.length} sowing or harvest task(s)</span> scheduled for this month. Get your seeds and tools ready!</p>
                      <div className="mt-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
                        {activeMonthlyReminders.map(rem => (
                          <div key={rem.id} className="bg-gray-900/50 rounded-lg p-2.5 flex items-center justify-between border border-amber-500/10 hover:border-amber-500/25 transition">
                            <div className="flex-grow flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs">
                              <span className="font-bold text-white uppercase tracking-wider">{rem.crop}</span>
                              <span className="text-gray-400 sm:border-l sm:border-gray-600 sm:pl-2">{rem.action}</span>
                              {rem.isHighPriority && <span className="text-[10px] bg-red-600/30 border border-red-500/30 text-red-300 px-1.5 py-0.5 rounded font-bold uppercase">Urgent</span>}
                            </div>
                            <button 
                              onClick={() => handleToggleReminderCompleted(rem.id)}
                              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium px-2.5 py-1 rounded transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <form onSubmit={handleCalendarSubmit} className="space-y-4 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AutoCompleteInput
                    id="calendarCrop"
                    label="Crop Type"
                    value={calendarCrop}
                    onChange={setCalendarCrop}
                    suggestionsData={CROP_SUGGESTION_LIST}
                    placeholder="e.g., Tomatoes"
                  />
                  <AutoCompleteInput
                    id="climateZone"
                    label="Climate Zone"
                    value={climateZone}
                    onChange={setClimateZone}
                    suggestionsData={LOCATION_SUGGESTION_LIST}
                    placeholder="e.g., USDA Zone 7b, Tropical"
                  />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button type="submit" disabled={loadingCalendar} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 disabled:bg-gray-500">
                  {loadingCalendar ? <Spinner /> : 'Generate Calendar'}
                </button>
                <button type="button" onClick={saveCalendarPreferences} className="w-full sm:w-auto mt-2 sm:mt-0 inline-flex justify-center py-2 px-4 border border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800">
                    Save Inputs as Preference
                </button>
              </div>
              {calendarError && <p className="text-red-400 text-sm text-center pt-2">{calendarError}</p>}
            </form>
            
            {savedPreferences && (savedPreferences.climateZone || savedPreferences.favoriteCrops.length > 0) && (
              <div className="mb-8 p-4 bg-gray-700/50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Your Saved Preferences</h3>
                  <div className="space-y-3">
                      {savedPreferences.climateZone && (
                          <div className="flex items-center justify-between">
                              <p className="text-gray-300">Climate Zone: <span className="font-medium text-white">{savedPreferences.climateZone}</span></p>
                              <button onClick={() => setClimateZone(savedPreferences.climateZone)} className="text-sm font-medium text-green-400 hover:text-green-300">Use</button>
                          </div>
                      )}
                      {savedPreferences.favoriteCrops.length > 0 && (
                          <div>
                              <p className="text-gray-300 mb-2">Favorite Crops:</p>
                              <div className="flex flex-wrap gap-2">
                                  {savedPreferences.favoriteCrops.map(crop => (
                                      <div key={crop} className="flex items-center gap-1 bg-gray-600 rounded-full px-3 py-1 text-sm">
                                          <span className="text-gray-200">{crop}</span>
                                          <button onClick={() => setCalendarCrop(crop)} className="text-green-400 hover:text-green-200 ml-2">Use</button>
                                          <button onClick={() => removeFavoriteCrop(crop)} className="text-red-400 hover:text-red-200 text-xs font-bold">&times;</button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
            )}


            {loadingCalendar && <div className="flex justify-center"><Spinner /></div>}

            {calendarData && (
                <Card title={`Planting Calendar for ${calendarData.crop} in ${calendarData.climateZone}`} icon={<BookIcon />}>
                    <div className="flex justify-end gap-2 -mt-2 mb-4">
                        <button 
                            onClick={() => handleShare(`Planting Calendar: ${calendarData.crop}`, formatCalendarForExport(calendarData))}
                            title="Share Calendar"
                            className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                        >
                            <ShareIcon />
                        </button>
                        <button 
                            onClick={() => handleExportCalendar('pdf')}
                            title="Export Calendar as PDF"
                            className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                        >
                            <PdfIcon />
                        </button>
                        <button 
                            onClick={() => handleExportCalendar('csv')}
                            title="Download Calendar as CSV"
                            className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                        >
                            <FileDownloadIcon />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-600">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Month</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Recommended Action</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Reminder</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-600">
                                {calendarData.calendar.map((item) => {
                                    const isSet = reminders.some(r => r.month === item.month && r.crop === calendarData.crop && !r.isCompleted);
                                    return (
                                        <tr key={item.month} className={`${getActionColor(item.action)} transition-colors`}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.month}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.action}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                <button
                                                    onClick={() => handleSetReminder(item.month, item.action)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 ${
                                                      isSet 
                                                        ? 'bg-green-600 text-white hover:bg-green-700' 
                                                        : 'bg-gray-600 text-gray-200 hover:bg-green-600 hover:text-white'
                                                    }`}
                                                >
                                                    {isSet ? '🔔 Active' : 'Set Reminder'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Premium Interactive Reminders List Dashboard Panel */}
            <div className="mt-8" id="planting-reminders-panel">
              <Card 
                title="Active Planting Reminders" 
                icon={
                  <div className="relative">
                    <span className="text-lg">📢</span>
                    {reminders.filter(r => !r.isCompleted).length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {reminders.filter(r => !r.isCompleted).length}
                      </span>
                    )}
                  </div>
                }
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6" id="reminders-controls">
                  <p className="text-sm text-gray-400">Manage your customized alerts, timing preferences, and sowing reminders locally in your browser.</p>
                  <button 
                    onClick={handleCreateCustomReminder}
                    className="whitespace-nowrap px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg text-sm font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-all flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
                  >
                    <span>＋</span> Create Custom Reminder
                  </button>
                </div>

                {reminders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reminders.map(rem => (
                      <div 
                        key={rem.id} 
                        className={`border p-4 rounded-xl transition-all duration-300 flex flex-col justify-between ${
                          rem.isCompleted 
                            ? 'border-gray-800 bg-gray-800/10 opacity-60' 
                            : rem.isHighPriority 
                            ? 'border-red-500/30 bg-red-950/10 shadow-lg shadow-red-950/5' 
                            : 'border-gray-700 bg-gray-800/40 hover:bg-gray-800/60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold tracking-wide uppercase ${
                                rem.isCompleted 
                                  ? 'bg-gray-700 text-gray-400' 
                                  : rem.month === getMonthName(new Date().getMonth())
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
                              }`}>
                                {rem.month}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">
                                {rem.timing === '1' ? 'Begin (1st)' : rem.timing === 'end' ? 'End' : 'Mid (15th)'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {rem.isHighPriority && (
                                <span className="text-[10px] bg-red-600/20 border border-red-500/30 text-red-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                                  <span>🚩</span> High Priority
                                </span>
                              )}
                            </div>
                          </div>

                          <h4 className={`text-base font-bold select-all ${rem.isCompleted ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
                            {rem.crop}
                          </h4>
                          {rem.climateZone && (
                            <p className="text-xs text-gray-400 font-medium">Zone: {rem.climateZone}</p>
                          )}
                          <p className={`text-sm mt-2 select-all ${rem.isCompleted ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                            {rem.action}
                          </p>
                          
                          {rem.notes && (
                            <div className="mt-3 bg-gray-900/40 border border-gray-800 p-2.5 rounded-lg text-xs text-gray-400">
                              <p className="font-semibold text-gray-300 uppercase tracking-wider text-[9px] mb-1">My Notes:</p>
                              <p className="whitespace-pre-line leading-relaxed">{rem.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between">
                          <button 
                            onClick={() => handleToggleReminderCompleted(rem.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold focus:outline-none transition-colors"
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center font-bold text-[9px] ${
                              rem.isCompleted 
                                ? 'bg-green-600 border-green-600 text-white' 
                                : 'border-gray-500 text-transparent hover:border-green-400'
                            }`}>
                              ✓
                            </span>
                            <span className={rem.isCompleted ? 'text-green-400' : 'text-gray-400 hover:text-green-400'}>
                              {rem.isCompleted ? 'Done' : 'Mark Done'}
                            </span>
                          </button>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleEditReminder(rem)}
                              title="Edit Notes & Schedule"
                              className="text-xs text-gray-400 hover:text-green-400 font-medium transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteReminder(rem.id, rem.crop)}
                              title="Delete Reminder"
                              className="text-xs text-gray-500 hover:text-red-400 font-semibold transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-700/20 rounded-xl border border-dashed border-gray-700">
                    <span className="text-3xl block mb-2 opacity-50">📅</span>
                    <h5 className="text-gray-300 font-bold text-sm">No Planting Reminders Saved</h5>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Set reminders directly using the "Set Reminder" action in the 12-Month Planting Calendar table above, or add a custom reminder.</p>
                  </div>
                )}
              </Card>
            </div>
        </div>
      )}

      {activeSubTab === 'compare' && (
        <div>
          <form onSubmit={handleComparisonSubmit} className="space-y-4 mb-8">
            <div className="space-y-3">
              {comparisonCrops.map((crop, index) => (
                <div key={index} className="flex items-center gap-2 relative">
                  <div className="flex-grow">
                     <AutoCompleteInput
                       id={`compareCrop-${index}`}
                       value={crop}
                       onChange={(value) => handleComparisonCropChange(index, value)}
                       suggestionsData={CROP_SUGGESTION_LIST}
                       placeholder={`Crop ${index + 1}`}
                     />
                  </div>
                  {comparisonCrops.length > 2 && (
                    <button type="button" onClick={() => removeComparisonCrop(index)} className="text-red-400 hover:text-red-300 p-2 rounded-full bg-gray-600 hover:bg-gray-500 leading-none text-xl font-bold">&times;</button>
                  )}
                </div>
              ))}
            </div>
            {comparisonCrops.length < 4 && (
              <button type="button" onClick={addComparisonCrop} className="text-sm text-green-400 hover:text-green-300">+ Add another crop</button>
            )}
            {comparisonError && <p className="text-red-400 text-sm text-center">{comparisonError}</p>}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button type="submit" disabled={loadingComparison} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 disabled:bg-gray-500">
                  {loadingComparison ? <Spinner /> : 'Compare Crops'}
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveComparison} 
                  disabled={comparisonCrops.map(c => c.trim()).filter(Boolean).length < 2}
                  className="w-full sm:w-auto mt-2 sm:mt-0 inline-flex justify-center py-2 px-4 border border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 disabled:opacity-50"
                >
                    Save Set
                </button>
            </div>
          </form>

            <div className="my-8">
                <h3 className="text-lg font-semibold text-gray-200 mb-3">Saved Comparisons</h3>
                {savedComparisons.length > 0 ? (
                    <div className="space-y-2">
                        {savedComparisons.map(comp => (
                            <div key={comp.id} className="grid grid-cols-1 md:grid-cols-2 items-center gap-2 bg-gray-700/50 p-3 rounded-md">
                                <p className="text-gray-300 truncate font-medium" title={comp.crops.join(' vs ')}>
                                    {comp.crops.join(' vs ')}
                                </p>
                                <div className="flex items-center gap-4 justify-start md:justify-end">
                                    <button onClick={() => handleLoadComparison(comp.crops)} className="text-sm font-medium text-green-400 hover:text-green-300 transition-colors">Load</button>
                                    <button onClick={() => handleDeleteComparison(comp.id)} className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 bg-gray-700/30 rounded-lg">
                        <p className="text-gray-500 text-sm">No saved comparisons yet.</p>
                    </div>
                )}
            </div>

          {loadingComparison && <div className="flex justify-center"><Spinner /></div>}
          
          {comparisonData && (
            <Card title="Crop Comparison" icon={<ScaleIcon />}>
                <div className="flex justify-end gap-2 -mt-2 mb-4">
                    <button
                        onClick={() => handleShare(`Crop Comparison`, formatComparisonForExport(comparisonData))}
                        title="Share Comparison"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <ShareIcon />
                    </button>
                    <button
                        onClick={() => handlePdfExport(formatComparisonForExport(comparisonData), `crop-comparison-${comparisonData.crops.map(c=>c.name).join('_')}`)}
                        title="Export Comparison as PDF"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <PdfIcon />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-600 border border-gray-600">
                        <thead className="bg-gray-800">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Attribute</th>
                                {comparisonData.crops.map(crop => (
                                    <th key={crop.name} scope="col" className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-l border-gray-600">{crop.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-gray-700/50 divide-y divide-gray-600">
                           {Object.keys(attributeLabels).map(attrKey => (
                               <tr key={attrKey}>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{attributeLabels[attrKey]}</td>
                                   {comparisonData.crops.map(crop => (
                                       <td key={crop.name} className="px-4 py-4 whitespace-normal text-sm text-gray-300 border-l border-gray-600">
                                          {crop.attributes[attrKey as keyof typeof crop.attributes]}
                                       </td>
                                   ))}
                               </tr>
                           ))}
                        </tbody>
                    </table>
                </div>
            </Card>
          )}
        </div>
      )}
      
      {/* Set/Edit Reminder Dialog Overlay */}
      {reminderModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in" id="reminder-modal">
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl w-full max-w-lg flex flex-col">
            <div className="bg-gradient-to-r from-green-950 to-gray-800 p-5 border-b border-gray-700/60 flex items-center justify-between">
              <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                <span>🔔</span> {reminderModalData.id ? 'Edit Planting Reminder' : 'Set Planting Reminder'}
              </h3>
              <button 
                onClick={() => setReminderModalData(null)}
                className="text-gray-400 hover:text-white text-2xl font-bold font-mono focus:outline-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Crop Type</label>
                  <input 
                    type="text" 
                    value={reminderFormCrop} 
                    onChange={e => setReminderFormCrop(e.target.value)} 
                    className="w-full bg-gray-900/80 border border-gray-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="e.g., Cucumber"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Climate Zone</label>
                  <input 
                    type="text" 
                    value={reminderFormZone} 
                    onChange={e => setReminderFormZone(e.target.value)} 
                    className="w-full bg-gray-900/80 border border-gray-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="e.g., USDA Zone 8b"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Month Preference</label>
                  <select
                    value={reminderFormMonth}
                    onChange={e => setReminderFormMonth(e.target.value)}
                    className="w-full bg-gray-900/80 border border-gray-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {MONTH_LIST.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Timing in Month</label>
                  <select
                    value={reminderFormTiming}
                    onChange={e => setReminderFormTiming(e.target.value as any)}
                    className="w-full bg-gray-900/80 border border-gray-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    <option value="1">Beginning of Month (1st)</option>
                    <option value="15">Middle of Month (15th)</option>
                    <option value="end">End of Month</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Recommended Action</label>
                <input 
                  type="text" 
                  value={reminderFormAction} 
                  onChange={e => setReminderFormAction(e.target.value)} 
                  className="w-full bg-gray-900/80 border border-gray-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="e.g., Sow seeds indoors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Personal Notes & Sowing Instructions</label>
                <textarea 
                  value={reminderFormNotes} 
                  onChange={e => setReminderFormNotes(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500 h-20 resize-none"
                  placeholder="e.g., Use organic seed starter kit; place near South-facing window."
                />
              </div>
              <div className="flex items-center gap-2 pt-1 font-sans">
                <input 
                  type="checkbox" 
                  id="highPriorityCb" 
                  checked={reminderFormPriority} 
                  onChange={e => setReminderFormPriority(e.target.checked)}
                  className="h-4 w-4 bg-gray-900 border-gray-700 text-green-600 rounded focus:ring-green-500"
                />
                <label htmlFor="highPriorityCb" className="text-sm text-gray-300 font-medium select-none cursor-pointer">
                  Mark as High Priority (adds high importance flag)
                </label>
              </div>
            </div>
            <div className="bg-gray-800/80 p-5 border-t border-gray-700/60 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setReminderModalData(null)}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveReminder}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
              >
                {reminderModalData.id ? 'Save Changes' : 'Set Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CropEncyclopedia;