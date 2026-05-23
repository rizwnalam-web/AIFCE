import React, { useState, useEffect } from 'react';
import { getGrowingPlan, getYieldPrediction } from '../services/geminiService';
import Spinner from './shared/Spinner';
import { LeafIcon, FileDownloadIcon, ShareIcon, PdfIcon, PrinterIcon } from './icons';
import Card from './shared/Card';
import AutoCompleteInput from './shared/AutoCompleteInput';
import { CROP_SUGGESTION_LIST, LOCATION_SUGGESTION_LIST } from '../data/suggestions';
import { useAppContext } from '../contexts/AppContext';
import { GrowthTimelineChart } from './GrowthTimelineChart';

const GrowingCapacity: React.FC = () => {
  const { state } = useAppContext();
  const { settings } = state;

  const [plotSize, setPlotSize] = useState('');
  const [sunExposure, setSunExposure] = useState('');
  const [plants, setPlants] = useState('');
  const [season, setSeason] = useState('');
  const [location, setLocation] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // State for Yield Prediction
  const [cropHealth, setCropHealth] = useState('');
  const [weatherSummary, setWeatherSummary] = useState('');
  const [yieldPrediction, setYieldPrediction] = useState('');
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [predictionErrors, setPredictionErrors] = useState<{ [key: string]: string }>({});

  // Print-Friendly States & Custom Options
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [includeMoistureLog, setIncludeMoistureLog] = useState(true);
  const [includeGrowthTracker, setIncludeGrowthTracker] = useState(true);
  const [includeNotesLines, setIncludeNotesLines] = useState(true);
  const [useSerifFont, setUseSerifFont] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState<{ [key: string]: boolean }>({});

  // Parsing weekly plan details into structured checklist blocks for clipboard sheets.
  const getParsedChecklist = () => {
    if (!plan) return [];
    
    interface ParsedSection {
      phaseTitle: string;
      tasks: string[];
      notes: string[];
    }
    
    const lines = plan.split('\n');
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection | null = null;
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Match headings: e.g., "## Phase 1" or "### Week 1" or "**Phase"
      const isHeading = trimmed.startsWith('#') || (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 85);
      if (isHeading) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          phaseTitle: trimmed.replace(/^#+\s*|^\*\*|\*\*$/g, ''),
          tasks: [],
          notes: []
        };
      } 
      // Match Bullet points: "- task" or "* task" or nums "1. task"
      else if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\.\s/.test(trimmed)) {
        const taskText = trimmed.replace(/^([-\*\s]|\d+\.\s)+/, '');
        if (currentSection) {
          currentSection.tasks.push(taskText);
        } else {
          currentSection = {
            phaseTitle: "General Preparation & Initial Steps",
            tasks: [taskText],
            notes: []
          };
        }
      } 
      // General paragraph text
      else {
        if (currentSection) {
          currentSection.notes.push(trimmed);
        } else {
          currentSection = {
            phaseTitle: "Overview & Specifications",
            tasks: [],
            notes: [trimmed]
          };
        }
      }
    });
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  };

  useEffect(() => {
    try {
      const savedInputs = localStorage.getItem('growingCapacityInputs');
      if (savedInputs) {
        const { plotSize, sunExposure, plants, season, location } = JSON.parse(savedInputs);
        setPlotSize(plotSize || '');
        setSunExposure(sunExposure || '');
        setPlants(plants || '');
        setSeason(season || '');
        setLocation(location || '');
      }
    } catch (e) {
      console.error("Failed to parse growing capacity inputs from localStorage", e);
    }
  }, []);

  const validatePlanForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!plotSize.trim()) newErrors.plotSize = 'Plot size is required.';
    if (!sunExposure.trim()) newErrors.sunExposure = 'Sun exposure is required.';
    if (!plants.trim()) newErrors.plants = 'Primary crop is required.';
    if (!season.trim()) newErrors.season = 'Season is required.';
    if (!location.trim()) newErrors.location = 'Location is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePredictionForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!cropHealth.trim()) newErrors.cropHealth = 'Crop health description is required.';
    if (!weatherSummary.trim()) newErrors.weatherSummary = 'Weather summary is required.';
    setPredictionErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePlanForm()) return;

    try {
      localStorage.setItem('growingCapacityInputs', JSON.stringify({ plotSize, sunExposure, plants, season, location }));
    } catch (e) {
      console.error("Failed to save growing capacity inputs to localStorage", e);
    }

    setLoading(true);
    setPlan('');
    setYieldPrediction(''); // Reset prediction when new plan is generated
    const result = await getGrowingPlan(plotSize, sunExposure, plants, season, location);
    setPlan(result);
    setLoading(false);
  };
  
  const handleExportPlan = (format: 'txt' | 'pdf') => {
    if (!plan) return;
    const filename = `growing-plan-${plants.replace(/\s+/g, '_')}`;
    if (format === 'pdf') {
       // PDF generation is complex client-side. This simulates a download with the report content.
        const blob = new Blob([`--- SIMULATED PDF REPORT ---\n\nGrowing Plan for ${plants}\n\n${plan}`], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.pdf.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        const blob = new Blob([plan], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
          // You could also implement a copy-to-clipboard fallback here.
      }
  };

  const handlePredictYield = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePredictionForm()) return;

    setLoadingPrediction(true);
    setYieldPrediction('');
    const result = await getYieldPrediction(plan, cropHealth, weatherSummary, location, plants);
    setYieldPrediction(result);
    setLoadingPrediction(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-100 mb-1">Maximize Your Yield</h2>
      <p className="text-gray-400 mb-6">Describe your plot to get an AI-optimized planting plan.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="plotSize" className="block text-sm font-medium text-gray-300">Plot Size (e.g., 10x20 square {settings.units === 'imperial' ? 'feet' : 'meters'})</label>
            <input
              type="text"
              id="plotSize"
              value={plotSize}
              onChange={(e) => setPlotSize(e.target.value)}
              className={`mt-1 block w-full bg-gray-700 border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500 ${errors.plotSize ? 'border-red-500' : 'border-gray-600'}`}
              placeholder="e.g., 20x30"
              aria-invalid={!!errors.plotSize}
            />
            {errors.plotSize && <p className="mt-1 text-xs text-red-400">{errors.plotSize}</p>}
          </div>
          <div>
            <label htmlFor="sunExposure" className="block text-sm font-medium text-gray-300">Sun Exposure</label>
            <input
              type="text"
              id="sunExposure"
              value={sunExposure}
              onChange={(e) => setSunExposure(e.target.value)}
              className={`mt-1 block w-full bg-gray-700 border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500 ${errors.sunExposure ? 'border-red-500' : 'border-gray-600'}`}
              placeholder="e.g., Full sun, partial shade"
               aria-invalid={!!errors.sunExposure}
            />
            {errors.sunExposure && <p className="mt-1 text-xs text-red-400">{errors.sunExposure}</p>}
          </div>
           <div>
            <label htmlFor="season" className="block text-sm font-medium text-gray-300">Season</label>
            <input
              type="text"
              id="season"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className={`mt-1 block w-full bg-gray-700 border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500 ${errors.season ? 'border-red-500' : 'border-gray-600'}`}
              placeholder="e.g., Spring, Summer"
               aria-invalid={!!errors.season}
            />
            {errors.season && <p className="mt-1 text-xs text-red-400">{errors.season}</p>}
          </div>
           <AutoCompleteInput
             id="location"
             label="Location"
             value={location}
             onChange={setLocation}
             suggestionsData={LOCATION_SUGGESTION_LIST}
             placeholder="e.g., Napa Valley, CA"
             error={errors.location}
           />
        </div>
        <AutoCompleteInput
          id="plants"
          label="Primary Crop"
          value={plants}
          onChange={setPlants}
          suggestionsData={CROP_SUGGESTION_LIST}
          placeholder="e.g., Tomatoes"
          error={errors.plants}
        />
        <button type="submit" disabled={loading} data-tour-id="generate-plan-button" className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 disabled:bg-gray-500">
          {loading ? <Spinner /> : 'Generate Plan'}
        </button>
      </form>

      {plan && (
        <>
            <Card title="Optimized Growing Plan" icon={<LeafIcon />}>
                <div className="flex flex-wrap items-center justify-end gap-2 -mt-2 mb-4">
                     <button 
                        onClick={() => setShowPrintModal(true)}
                        title="Print-Friendly Clipboard Plan"
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-transparent text-xs font-bold rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                     >
                        <PrinterIcon />
                        <span>Field Print View</span>
                     </button>
                     <button 
                        onClick={() => handleShare(`Growing Plan: ${plants}`, plan)}
                        title="Share Plan"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <ShareIcon />
                    </button>
                     <button 
                        onClick={() => handleExportPlan('pdf')} 
                        title="Export Plan as PDF"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <PdfIcon />
                    </button>
                    <button 
                        onClick={() => handleExportPlan('txt')} 
                        title="Export Plan as TXT"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <FileDownloadIcon />
                    </button>
                </div>
                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: plan.replace(/\n/g, '<br />') }} />
            </Card>

            <GrowthTimelineChart cropName={plants} location={location} />

            <div className="mt-8">
                <Card title="Predict Your Crop Yield" icon={<LeafIcon />}>
                    <p className="text-gray-400 mb-4 text-sm">Provide real-world observations to get a yield forecast based on your plan.</p>
                    <form onSubmit={handlePredictYield} className="space-y-4">
                        <div>
                            <label htmlFor="cropHealth" className="block text-sm font-medium text-gray-300">Current Crop Health</label>
                            <textarea
                                id="cropHealth"
                                rows={3}
                                value={cropHealth}
                                onChange={(e) => setCropHealth(e.target.value)}
                                className={`mt-1 block w-full bg-gray-700 border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500 ${predictionErrors.cropHealth ? 'border-red-500' : 'border-gray-600'}`}
                                placeholder="e.g., Plants look healthy, vibrant green leaves, no visible pests."
                                aria-invalid={!!predictionErrors.cropHealth}
                            />
                            {predictionErrors.cropHealth && <p className="mt-1 text-xs text-red-400">{predictionErrors.cropHealth}</p>}
                        </div>
                        <div>
                            <label htmlFor="weatherSummary" className="block text-sm font-medium text-gray-300">Past Weather Summary</label>
                            <textarea
                                id="weatherSummary"
                                rows={3}
                                value={weatherSummary}
                                onChange={(e) => setWeatherSummary(e.target.value)}
                                className={`mt-1 block w-full bg-gray-700 border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500 ${predictionErrors.weatherSummary ? 'border-red-500' : 'border-gray-600'}`}
                                placeholder="e.g., Consistent rainfall for the first month, followed by an unexpected heatwave."
                                aria-invalid={!!predictionErrors.weatherSummary}
                            />
                            {predictionErrors.weatherSummary && <p className="mt-1 text-xs text-red-400">{predictionErrors.weatherSummary}</p>}
                        </div>
                        <button type="submit" disabled={loadingPrediction} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 disabled:bg-gray-500">
                            {loadingPrediction ? <Spinner /> : 'Predict Yield'}
                        </button>
                    </form>
                </Card>
            </div>
        </>
      )}

      {yieldPrediction && (
          <div className="mt-8">
            <Card title="Yield Prediction Result" icon={<LeafIcon />}>
                <div className="flex justify-end gap-2 -mt-2 mb-4">
                     <button 
                        onClick={() => handleShare(`Yield Prediction: ${plants}`, yieldPrediction)}
                        title="Share Prediction"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <ShareIcon />
                    </button>
                    <button 
                        onClick={() => handleExportPlan('pdf')} 
                        title="Export Prediction as PDF"
                        className="inline-flex items-center p-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                    >
                        <PdfIcon />
                    </button>
                </div>
                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: yieldPrediction.replace(/\n/g, '<br />') }} />
            </Card>
          </div>
      )}

      {showPrintModal && (
        <div id="print-modal-overlay" className="fixed inset-0 z-50 flex flex-col md:flex-row bg-slate-950/95 backdrop-blur-md overflow-hidden no-print">
          {/* Style injection for browser printing */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              html, body {
                background-color: #ffffff !important;
                background-image: none !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                font-size: 11pt !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #root, header, footer, nav, aside, .no-print, #print-modal-overlay > .modal-sidebar {
                display: none !important;
                height: 0 !important;
                width: 0 !important;
                overflow: hidden !important;
              }
              #print-modal-overlay {
                position: static !important;
                display: block !important;
                background: white !important;
                color: black !important;
                overflow: visible !important;
                width: 100% !important;
                height: auto !important;
              }
              .print-paper-sheet {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                display: block !important;
                background: white !important;
                color: black !important;
              }
              /* Avoid orphan headers */
              h2, h3, h4 {
                page-break-after: avoid !important;
              }
              .print-section {
                page-break-inside: avoid !important;
              }
            }
          `}} />

          {/* Left Panel: Settings Controls */}
          <div className="modal-sidebar w-full md:w-80 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-6 flex flex-col justify-between overflow-y-auto shrink-0">
            <div>
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <PrinterIcon className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-bold text-white tracking-tight">Print Layout</h3>
              </div>
              <p className="text-xs text-slate-450 mb-6 leading-relaxed">
                Format and refine your layout options to create a custom physical sheet to carry into your fields.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-355">High Contrast Serif Font</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={useSerifFont}
                      onChange={() => setUseSerifFont(!useSerifFont)}
                    />
                    <div className="relative w-9 h-5 bg-slate-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-650"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-355">Soil Moisture Log Grid</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={includeMoistureLog}
                      onChange={() => setIncludeMoistureLog(!includeMoistureLog)}
                    />
                    <div className="relative w-9 h-5 bg-slate-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-650"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-355">Growth Milestone Tracker</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={includeGrowthTracker}
                      onChange={() => setIncludeGrowthTracker(!includeGrowthTracker)}
                    />
                    <div className="relative w-9 h-5 bg-slate-755 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-655"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-355">Ruled Observations Journal</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={includeNotesLines}
                      onChange={() => setIncludeNotesLines(!includeNotesLines)}
                    />
                    <div className="relative w-9 h-5 bg-slate-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-650"></div>
                  </label>
                </div>
              </div>
              
              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/80 mb-6">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Field Clipboard Tip</span>
                <p className="text-[11px] text-slate-455 leading-relaxed">
                  Checking items on-screen toggles completed state before printing. Tables and handwriting grids are formatted line-by-line using high-contrast black ink.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
              >
                <PrinterIcon className="h-4 w-4" />
                <span>Print or Save PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors border border-slate-700/50 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>

          {/* Right Panel: Scrollable Realistic Letter Sheet Preview */}
          <div className="flex-1 bg-slate-950 p-4 sm:p-8 overflow-y-auto">
            <div id="print-area" className={`print-paper-sheet bg-white text-slate-900 p-6 sm:p-12 shadow-2xl rounded-lg max-w-2xl mx-auto border border-amber-100 ${useSerifFont ? 'font-serif' : 'font-sans'}`}>
              
              {/* Document Header */}
              <div className="border-b-4 border-slate-900 pb-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-black text-slate-505">Cultivation Ledger & Checklist</span>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-0.5">CULTIVATION ACTION PLAN</h1>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase tracking-widest font-black text-slate-505">Record ID</span>
                    <p className="text-xs font-mono font-bold text-slate-800 uppercase mt-0.5">FLD-{plants.substring(0, 3).toUpperCase()}-{new Date().toISOString().substring(2, 10).replace(/-/g, '')}</p>
                  </div>
                </div>
              </div>

              {/* High-density Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 bg-slate-50 border border-slate-205 p-4 rounded-lg mb-8 text-xs">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-505">Primary Plant Cultivar</span>
                  <span className="font-bold text-slate-900 text-sm">{plants}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-550">Farm Location</span>
                  <span className="font-bold text-slate-900 text-sm">{location || 'Not Specified'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-550">Target Season</span>
                  <span className="font-bold text-slate-900 text-sm">{season || 'Not Specified'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-550">Plot Dimensions</span>
                  <span className="font-bold text-slate-900 text-sm">{plotSize} sq {settings.units === 'imperial' ? 'feet' : 'meters'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-550">Sun & Light exposure</span>
                  <span className="font-bold text-slate-900 text-sm">{sunExposure}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-550">Ledger Compiled on</span>
                  <span className="font-semibold text-slate-800 font-mono">{new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              </div>

              {/* Checklist Blocks Sections */}
              <div className="space-y-6">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-950 pb-1 mb-3">I. Biological Action Guidelines</h2>
                {getParsedChecklist().map((section, sIdx) => (
                  <div key={sIdx} className="print-section bg-slate-50/20 p-2.5 rounded border border-slate-100/80 mb-4">
                    <h3 className="text-xs font-black uppercase text-slate-850 mb-2 border-b border-slate-205 pb-1 flex items-center justify-between">
                      <span>{section.phaseTitle}</span>
                      <span className="text-[9px] text-slate-455 normal-case font-medium">Phase {sIdx + 1} Guidance</span>
                    </h3>

                    {section.notes.length > 0 && (
                      <p className="text-[11px] text-slate-600 italic mb-3 leading-relaxed bg-white border border-slate-105 p-2 rounded">
                        {section.notes.join(' ')}
                      </p>
                    )}

                    {section.tasks.length > 0 ? (
                      <ul className="space-y-1.5">
                        {section.tasks.map((task, tIdx) => {
                          const taskId = `${sIdx}-${tIdx}`;
                          const isDone = !!checkedTasks[taskId];
                          return (
                            <li 
                              key={tIdx} 
                              onClick={() => setCheckedTasks({ ...checkedTasks, [taskId]: !isDone })}
                              className={`flex items-start gap-2.5 text-xs text-slate-800 leading-normal cursor-pointer hover:bg-slate-50 p-1 rounded-sm select-none transition-colors duration-100 ${isDone ? 'opacity-55' : ''}`}
                            >
                              <div className="relative flex items-center justify-center shrink-0 w-4 h-4 rounded border border-slate-405 bg-white mt-0.5">
                                {isDone ? (
                                  <span className="text-[10px] font-black text-green-700 leading-none">✓</span>
                                ) : (
                                  <span className="opacity-0 print:opacity-0 text-[10px] font-mono leading-none font-bold text-slate-300"> </span>
                                )}
                              </div>
                              <span className={isDone ? 'line-through text-slate-500' : ''}>{task}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">No checklist elements parsed for this block. Follow overview notes.</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Printable Table: Soil Moisture and Salinity Journal */}
              {includeMoistureLog && (
                <div className="print-section mt-8">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-950 pb-1 mb-3">II. Field Soil Hydro-Moisture Log</h2>
                  <p className="text-[10px] text-slate-500 mb-2 italic">Physically record soil moisture readings, watering volumes, and tested pH levels in the field.</p>
                  <table className="w-full border-collapse border border-slate-300 text-left text-[10px] leading-tight bg-white">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-2 font-bold w-16">Date</th>
                        <th className="border border-slate-300 p-2 font-bold w-20">Moisture %</th>
                        <th className="border border-slate-300 p-2 font-bold w-24">Water Applied</th>
                        <th className="border border-slate-300 p-2 font-bold w-20">Probed pH</th>
                        <th className="border border-slate-300 p-2 font-bold">Observer Note Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map((idx) => (
                        <tr key={idx} className="h-8 hover:bg-slate-50/50">
                          <td className="border border-slate-300 p-2 font-mono text-slate-300">/</td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Printable Table: Canopy & Stress Milestone Tracker */}
              {includeGrowthTracker && (
                <div className="print-section mt-8">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-950 pb-1 mb-3">III. Canopy Phenology & Crop Health Ledger</h2>
                  <p className="text-[10px] text-slate-500 mb-2 italic">Track vegetative staging, canopy growth fraction, pest incidents, and visual foliar status.</p>
                  <table className="w-full border-collapse border border-slate-300 text-left text-[10px] leading-tight bg-white">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-2 font-bold w-20">Growth Stage</th>
                        <th className="border border-slate-300 p-2 font-bold w-20">Canopy %</th>
                        <th className="border border-slate-300 p-2 font-bold w-24">Pest Findings</th>
                        <th className="border border-slate-300 p-2 font-bold w-20">Foliage Status</th>
                        <th className="border border-slate-300 p-2 font-bold">Soil / Pathogen Action Logs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4].map((idx) => (
                        <tr key={idx} className="h-8 hover:bg-slate-50/50">
                          <td className="border border-slate-300 p-2 font-mono text-slate-400">Wk </td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2 text-slate-400 italic">None / Observed</td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Printable Notes Grid (Ruled Lines) */}
              {includeNotesLines && (
                <div className="print-section mt-8">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-950 pb-1 mb-3">IV. Daily Observation Field Journal</h2>
                  <p className="text-[10px] text-slate-500 mb-4 italic">Register manual logs concerning microclimate fluctuations, fertilizer applications, and soil actions.</p>
                  <div className="space-y-5">
                    <div className="border-b border-dashed border-slate-300 h-1"></div>
                    <div className="border-b border-dashed border-slate-300 h-1"></div>
                    <div className="border-b border-dashed border-slate-300 h-1"></div>
                    <div className="border-b border-dashed border-slate-300 h-1"></div>
                    <div className="border-b border-dashed border-slate-300 h-1"></div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-slate-300 mt-12 pt-4 text-center text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                Assisted by AI Cultivation Companion • Maintain printed copy on field clipboard.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowingCapacity;