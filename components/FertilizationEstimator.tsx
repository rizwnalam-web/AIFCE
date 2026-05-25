import React, { useState, useRef, useEffect } from 'react';
import { fileToGenerativePart, getFertilizationPlan } from '../services/geminiService';
import Spinner from './shared/Spinner';
import Card from './shared/Card';
import { SproutIcon, ShareIcon, PdfIcon } from './icons';
import { HealthHistoryEntry } from '../types';
import AutoCompleteInput from './shared/AutoCompleteInput';
import { CROP_SUGGESTION_LIST, LOCATION_SUGGESTION_LIST } from '../data/suggestions';
import { saveAndDownloadReport } from '../utils/reportUtils';
import backendAPI from '../services/backendAPI';
import { useToast } from '../contexts/ToastContext';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const FertilizationEstimator: React.FC = () => {
  const [cropType, setCropType] = useState('');
  const [location, setLocation] = useState('');
  const [healthDescription, setHealthDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // State for health history
  const [healthHistory, setHealthHistory] = useState<HealthHistoryEntry[]>([]);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<HealthHistoryEntry | null>(null);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('cropHealthHistory');
      if (storedHistory) {
        setHealthHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to parse health history from localStorage", e);
    }
  }, []);

  const updateHistoryStorage = (history: HealthHistoryEntry[]) => {
    try {
      localStorage.setItem('cropHealthHistory', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save health history to localStorage", e);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrors(prev => ({ ...prev, image: `File size cannot exceed ${MAX_FILE_SIZE_MB}MB.` }));
        return;
      }
      setErrors(prev => ({ ...prev, image: '' }));
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!cropType.trim()) newErrors.cropType = 'Crop type is required.';
    if (!location.trim()) newErrors.location = 'Location is required.';
    if (!healthDescription.trim() && !imageFile) {
      newErrors.description = 'Please provide either a health description or an image.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setPlan('');
    
    let imagePart = null;
    if (imageFile) {
        imagePart = await fileToGenerativePart(imageFile);
    }
    
    const result = await getFertilizationPlan(cropType, location, imagePart, healthDescription);
    setPlan(result);
    setLoading(false);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setErrors(prev => ({ ...prev, image: '' }));
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleSaveReport = async () => {
    if (!plan) return;
    try {
      const title = `Health Analysis: ${cropType} (${location})`;
      const filename = `health-analysis-${cropType.replace(/\s+/g, '_')}.pdf`;
      await backendAPI.saveReport(title, 'health-analysis', plan, filename);
      showToast('Crop health analysis saved successfully.', 'success');
    } catch (error) {
      console.error('Failed to save health report:', error);
      showToast('Unable to save report. Please try again.', 'error');
    }
  };

  const saveToHistory = () => {
    if (!plan) return;
    const newEntry: HealthHistoryEntry = {
      id: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      cropType,
      location,
      healthDescription,
      imageUrl: imagePreview || undefined,
      plan,
    };
    const updatedHistory = [...healthHistory, newEntry];
    setHealthHistory(updatedHistory);
    updateHistoryStorage(updatedHistory);
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your entire crop health history? This cannot be undone.')) {
        setHealthHistory([]);
        localStorage.removeItem('cropHealthHistory');
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

  const getFullReportText = (entry: HealthHistoryEntry): string => {
    return `Crop Health Report
Date: ${entry.date}
Crop Type: ${entry.cropType}
Location: ${entry.location}

Submitted Description: ${entry.healthDescription || 'N/A'}

--- AI ANALYSIS ---
${entry.plan}`;
  };


  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-100 mb-1">Fertilization &amp; Disease Analysis</h2>
      <p className="text-gray-400 mb-6">Analyze crop health, detect diseases from images, and get a custom treatment and fertilization plan.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AutoCompleteInput
            id="cropTypeFert"
            label="Crop Type"
            value={cropType}
            onChange={setCropType}
            suggestionsData={CROP_SUGGESTION_LIST}
            placeholder="e.g., Tomatoes"
            error={errors.cropType}
          />
          <AutoCompleteInput
            id="locationFert"
            label="Location"
            value={location}
            onChange={setLocation}
            suggestionsData={LOCATION_SUGGESTION_LIST}
            placeholder="e.g., Salinas, CA"
            error={errors.location}
          />
        </div>
        <div>
          <label htmlFor="healthDescription" className="block text-sm font-medium text-gray-300">Describe Crop Health (optional if uploading image)</label>
          <textarea
            id="healthDescription"
            rows={3}
            value={healthDescription}
            onChange={(e) => setHealthDescription(e.target.value)}
            className={`mt-1 block w-full bg-gray-700 border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500 ${errors.description ? 'border-red-500' : 'border-gray-600'}`}
            placeholder="e.g., Leaves are yellowing with brown spots."
          />
           {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Upload Crop Image (optional)</label>
          <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${errors.image ? 'border-red-500' : 'border-gray-600'}`}>
            <div className="space-y-1 text-center">
              {imagePreview ? (
                <div>
                  <img src={imagePreview} alt="Crop preview" className="mx-auto h-24 w-auto rounded-lg"/>
                  <button type="button" onClick={removeImage} className="mt-2 text-sm text-red-400 hover:text-red-300">Remove image</button>
                </div>
              ) : (
                <>
                  <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-400">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-green-400 hover:text-green-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-green-500">
                      <span>Upload a file</span>
                      <input id="file-upload" ref={fileInputRef} name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to {MAX_FILE_SIZE_MB}MB</p>
                </>
              )}
            </div>
          </div>
          {errors.image && <p className="mt-1 text-xs text-red-400">{errors.image}</p>}
        </div>
        <button type="submit" disabled={loading} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 disabled:bg-gray-500">
          {loading ? <Spinner /> : 'Get Health Analysis'}
        </button>
      </form>

      {plan && (
        <Card title="Crop Health Analysis &amp; Recommendations" icon={<SproutIcon />}>
            <div className="flex justify-end gap-2 -mt-2 mb-4">
                 <button 
                    onClick={() => handleShare(`Health Analysis: ${cropType}`, plan)}
                    title="Share Analysis"
                    className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                >
                    <ShareIcon />
                </button>
                <button 
                    onClick={handleSaveReport}
                    title="Save Analysis to Account"
                    className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 transition-colors"
                >
                    Save Report
                </button>
                <button 
                    onClick={() => handlePdfExport(plan, `health-analysis-${cropType.replace(/\s+/g, '_')}`, `Crop Health Analysis - ${cropType}`, 'health-analysis')}
                    title="Export Analysis as PDF"
                    className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                >
                    <PdfIcon />
                </button>
            </div>
            <div className="prose prose-invert max-w-none mb-6" dangerouslySetInnerHTML={{ __html: plan.replace(/\n/g, '<br />') }} />
            <div className="text-center mt-4 border-t border-gray-600 pt-4">
                <button 
                    onClick={saveToHistory}
                    className="w-full sm:w-auto inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800"
                >
                    Save to History
                </button>
            </div>
        </Card>
      )}

      <div className="mt-12">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-200">Crop Health History</h3>
          {healthHistory.length > 0 && (
            <button onClick={clearHistory} className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors">Clear History</button>
          )}
        </div>
        {healthHistory.length > 0 ? (
          <div className="space-y-3">
            {healthHistory.slice().reverse().map(entry => (
              <div key={entry.id} className="grid grid-cols-2 md:grid-cols-3 items-center gap-4 bg-gray-700/50 p-3 rounded-md hover:bg-gray-700 transition-colors">
                <div className="md:col-span-1">
                  <p className="font-medium text-white">{entry.cropType}</p>
                  <p className="text-xs text-gray-400">{entry.location} - {entry.date}</p>
                </div>
                <div className="col-span-2 md:col-span-2 flex justify-end items-center gap-2">
                    <button onClick={() => setSelectedHistoryEntry(entry)} className="text-sm font-medium text-green-400 hover:text-green-300 transition-colors px-3 py-1 bg-gray-600/50 rounded-md">View Report</button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleShare(`Health Report: ${entry.cropType} on ${entry.date}`, getFullReportText(entry)); }}
                      title="Share Report"
                      className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <ShareIcon />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handlePdfExport(getFullReportText(entry), `report-${entry.cropType.replace(/\s+/g, '_')}-${entry.date}`, `Health Report - ${entry.cropType}`, 'health-report'); }}
                        title="Export Report as PDF"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <PdfIcon />
                    </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-700/30 rounded-lg">
            <p className="text-gray-500">No history saved.</p>
            <p className="text-gray-500 text-sm">Your saved crop health reports will appear here.</p>
          </div>
        )}
      </div>

      {selectedHistoryEntry && (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedHistoryEntry(null)}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-green-400">{selectedHistoryEntry.cropType} - Health Report</h3>
                            <p className="text-sm text-gray-400">{selectedHistoryEntry.location} on {selectedHistoryEntry.date}</p>
                        </div>
                        <button onClick={() => setSelectedHistoryEntry(null)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
                    {selectedHistoryEntry.imageUrl && (
                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2">Submitted Image:</h4>
                            <img src={selectedHistoryEntry.imageUrl} alt="Saved crop" className="rounded-lg max-h-64 w-auto mx-auto" />
                        </div>
                    )}
                    {selectedHistoryEntry.healthDescription && (
                        <div>
                            <h4 className="font-semibold text-gray-300">Submitted Description:</h4>
                            <p className="text-gray-400 italic bg-gray-700/50 p-3 rounded-md">"{selectedHistoryEntry.healthDescription}"</p>
                        </div>
                    )}
                    <div>
                        <h4 className="font-semibold text-gray-300">AI Analysis & Recommendations:</h4>
                        <div className="prose prose-invert max-w-none mt-2 p-3 bg-gray-700/50 rounded-md" dangerouslySetInnerHTML={{ __html: selectedHistoryEntry.plan.replace(/\n/g, '<br />') }} />
                    </div>
                </div>
                <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-2">
                    <button 
                        onClick={() => handleShare(`Health Report: ${selectedHistoryEntry.cropType}`, getFullReportText(selectedHistoryEntry))}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <ShareIcon /> Share
                    </button>
                    <button 
                        onClick={() => handlePdfExport(getFullReportText(selectedHistoryEntry), `report-${selectedHistoryEntry.cropType.replace(/\s+/g, '_')}-${selectedHistoryEntry.date}`, `Health Report - ${selectedHistoryEntry.cropType}`, 'health-report')}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <PdfIcon /> Export PDF
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default FertilizationEstimator;