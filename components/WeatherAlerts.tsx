
import React, { useState } from 'react';
import { AlertIcon } from './icons';

interface WeatherAlertsProps {
  alerts: string[];
}

const WeatherAlerts: React.FC<WeatherAlertsProps> = ({ alerts }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!alerts || alerts.length === 0 || !isVisible) {
    return null;
  }

  return (
    <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
      <div className="flex">
        <div className="py-1">
          <AlertIcon />
        </div>
        <div className="ml-4">
          <strong className="font-bold">Critical Weather Alerts!</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            {alerts.map((alert, index) => (
              <li key={index}>{alert}</li>
            ))}
          </ul>
        </div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-0 bottom-0 right-0 px-4 py-3"
        aria-label="Close"
      >
        <span className="text-2xl text-yellow-300 hover:text-white transition-colors">&times;</span>
      </button>
    </div>
  );
};

export default WeatherAlerts;
