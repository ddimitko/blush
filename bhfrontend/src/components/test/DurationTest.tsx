import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const DurationTest: React.FC = () => {
  const { formatDuration, currentLanguage } = useTranslation();

  const testDurations = [
    15,   // 15 minutes
    30,   // 30 minutes
    45,   // 45 minutes
    60,   // 1 hour
    90,   // 1 hour 30 minutes
    120,  // 2 hours
    130,  // 2 hours 10 minutes
    180,  // 3 hours
    195,  // 3 hours 15 minutes
    240,  // 4 hours
    300,  // 5 hours
    330   // 5 hours 30 minutes
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Duration Formatting Test</h2>
      
      <div className="mb-4">
        <p className="text-lg font-semibold">Current Language: {currentLanguage}</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Duration Examples:</h3>
        {testDurations.map((duration) => (
          <div key={duration} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-mono text-sm text-gray-600">{duration} minutes</span>
            <span className="font-medium">{formatDuration(duration)}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Expected Bulgarian Translations:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>90 minutes → 1 час и 30 минути</li>
          <li>120 minutes → 2 часа</li>
          <li>130 minutes → 2 часа и 10 минути</li>
          <li>180 minutes → 3 часа</li>
          <li>195 minutes → 3 часа и 15 минути</li>
        </ul>
      </div>
    </div>
  );
};

export default DurationTest;
