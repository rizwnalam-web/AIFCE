import React, { useState, useEffect, useMemo } from 'react';
import { FeatureTab } from '../types';

interface TourStep {
  selector?: string;
  title: string;
  content: string;
  action?: () => void;
  tab?: FeatureTab;
}

interface OnboardingTourProps {
  onClose: () => void;
  setActiveTab: (tab: FeatureTab) => void;
  openSettings: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onClose, setActiveTab, openSettings }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);

  const steps: TourStep[] = useMemo(() => [
    {
      title: 'Welcome to the AI Farming Estimator!',
      content: "This quick tour will guide you through the core features. Let's get your farm optimized!",
    },
    {
      selector: '[data-tour-id="settings-button"]',
      title: '1. Set Up Your AI Provider',
      content: "The app uses AI to generate plans and predictions. The first step is to add your API key. Click the settings icon to open the API Provider manager.",
      action: openSettings,
    },
    {
      selector: '[data-tour-id="api-settings-form"]',
      title: '2. Add Your API Key',
      content: 'Select a provider from the dropdown, give your configuration a name, paste your key, and click "Save Provider". This is a one-time setup.',
    },
    {
      selector: '[data-tour-id="growing-capacity-tab"]',
      title: '3. Get a Planting Plan',
      content: 'Now for the fun part! Let\'s go to the "Growing Capacity" tab to create your first AI-optimized planting plan.',
      tab: FeatureTab.Capacity,
    },
    {
      selector: '[data-tour-id="generate-plan-button"]',
      title: '4. Generate Your Plan',
      content: 'Fill in the details about your plot, crops, and location, then click this button to get a custom plan designed to maximize your yield.',
      tab: FeatureTab.Capacity,
    },
    {
      selector: '[data-tour-id="header-controls"]',
      title: '5. Customize Your View',
      content: 'Up here, you can switch between your configured AI providers and toggle between Imperial/Metric units to match your preference.',
    },
    {
      title: 'You\'re All Set!',
      content: 'That\'s it for the basics. Explore the other tabs to get weather forecasts, watering schedules, and much more. Happy farming!',
    },
  ], [openSettings]);

  const currentStep = useMemo(() => steps[stepIndex], [stepIndex, steps]);

  useEffect(() => {
    const { selector, tab, action } = currentStep;

    if (tab) {
      setActiveTab(tab);
    }
    
    if (action) {
      action();
    }
    
    const findElement = () => {
      if (selector) {
        const elem = document.querySelector(selector);
        if (elem) {
          setElementRect(elem.getBoundingClientRect());
        } else {
          setElementRect(null);
        }
      } else {
        setElementRect(null);
      }
    };
    
    const timeoutId = setTimeout(findElement, 250);

    return () => clearTimeout(timeoutId);
  }, [stepIndex, currentStep, setActiveTab]);


  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };
  
  const tooltipStyle: React.CSSProperties = elementRect
    ? { top: elementRect.bottom + 10, left: elementRect.left, maxWidth: 320, position: 'fixed', zIndex: 10001 }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: 400, position: 'fixed', zIndex: 10001 };

  return (
    <div className="fixed inset-0 z-[10000]">
      <div className="fixed inset-0 bg-black/70" />
      
      {elementRect && (
        <div
            className="fixed rounded-md transition-all duration-300 pointer-events-none"
            style={{
                top: elementRect.top - 4,
                left: elementRect.left - 4,
                width: elementRect.width + 8,
                height: elementRect.height + 8,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
                border: '2px solid #4ade80', // green-400
            }}
        />
      )}

      <div
        className="bg-gray-800 text-white rounded-lg shadow-2xl p-6 border border-gray-600 transition-all duration-300"
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-green-400 mb-2">{currentStep.title}</h3>
        <p className="text-gray-300 mb-4">{currentStep.content}</p>
        <div className="flex justify-between items-center">
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Skip Tour</button>
            <div className="flex gap-2">
                {stepIndex > 0 && (
                    <button onClick={handlePrev} className="px-4 py-2 bg-gray-600 rounded-md text-sm font-semibold hover:bg-gray-500">
                        Previous
                    </button>
                )}
                <button onClick={handleNext} className="px-4 py-2 bg-green-600 rounded-md text-sm font-semibold hover:bg-green-700">
                    {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                </button>
            </div>
        </div>
        <div className="flex justify-center mt-4 gap-2">
            {steps.map((_, index) => (
                <div key={index} className={`h-2 w-2 rounded-full ${index === stepIndex ? 'bg-green-400' : 'bg-gray-600'}`}/>
            ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;