import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';

const TranslationTestPage: React.FC = () => {
  const { formatDuration, currentLanguage } = useTranslation();

  const testDurations = [15, 30, 60, 90, 120, 130, 180, 195];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Translation Test Page</h1>
            <LanguageSwitcher />
          </div>
          <p className="text-gray-600">Current Language: <span className="font-semibold">{currentLanguage}</span></p>
        </div>

        {/* Duration Formatting Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Duration Formatting Test</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {testDurations.map((duration) => (
              <div key={duration} className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">{duration} min</div>
                <div className="font-semibold">{formatDuration(duration)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Expected Bulgarian Examples:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>90 min → 1 час и 30 минути</li>
              <li>120 min → 2 часа</li>
              <li>130 min → 2 часа и 10 минути</li>
            </ul>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">How to Test</h3>
          <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
            <li>Use the language switcher at the top to change between English and Bulgarian</li>
            <li>Observe how the duration formatting changes to the selected language</li>
            <li>Pay special attention to the Bulgarian grammar (1 час vs 2 часа)</li>
            <li>Notice how the page reloads to ensure all components update properly</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TranslationTestPage;


