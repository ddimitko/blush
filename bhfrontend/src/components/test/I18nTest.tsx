import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const I18nTest: React.FC = () => {
  const { t, tCommon, tAuth, currentLanguage, formatCurrency, formatDate } = useTranslation();

  // Helper function to safely convert translation results to strings
  const safeTranslate = (translationFn: () => any): string => {
    try {
      const result = translationFn();
      return typeof result === 'string' ? result : String(result);
    } catch (error) {
      return 'Translation Error';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Internationalization Test</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Current Language</h3>
          <p className="text-gray-600">Language: {currentLanguage}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Common Translations</h3>
          <ul className="space-y-1 text-gray-600">
            <li>App Name: {safeTranslate(() => tCommon('app.name'))}</li>
            <li>App Tagline: {safeTranslate(() => tCommon('app.tagline'))}</li>
            <li>Welcome: {safeTranslate(() => tCommon('app.welcome'))}</li>
            <li>Save: {safeTranslate(() => tCommon('actions.save'))}</li>
            <li>Cancel: {safeTranslate(() => tCommon('actions.cancel'))}</li>
            <li>Email: {safeTranslate(() => tCommon('labels.email'))}</li>
            <li>Phone: {safeTranslate(() => tCommon('labels.phone'))}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Auth Translations</h3>
          <ul className="space-y-1 text-gray-600">
            <li>Login Title: {safeTranslate(() => tAuth('login.title'))}</li>
            <li>Register Title: {safeTranslate(() => tAuth('register.title'))}</li>
            <li>Email Required: {safeTranslate(() => tAuth('validation.emailRequired'))}</li>
            <li>Password Required: {safeTranslate(() => tAuth('validation.passwordRequired'))}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Status Translations</h3>
          <ul className="space-y-1 text-gray-600">
            <li>Active: {safeTranslate(() => tCommon('status.active'))}</li>
            <li>Pending: {safeTranslate(() => tCommon('status.pending'))}</li>
            <li>Completed: {safeTranslate(() => tCommon('status.completed'))}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Formatting</h3>
          <ul className="space-y-1 text-gray-600">
            <li>Currency: {formatCurrency(29.99)}</li>
            <li>Date: {formatDate(new Date())}</li>
            <li>Time: {formatDate(new Date(), { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Days & Months</h3>
          <ul className="space-y-1 text-gray-600">
            <li>Monday: {safeTranslate(() => tCommon('days.monday'))}</li>
            <li>January: {safeTranslate(() => tCommon('months.january'))}</li>
            <li>Today: {safeTranslate(() => tCommon('time.today'))}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Messages</h3>
          <ul className="space-y-1 text-gray-600">
            <li>Loading: {safeTranslate(() => tCommon('messages.loading'))}</li>
            <li>No Data: {safeTranslate(() => tCommon('messages.noData'))}</li>
            <li>Try Again: {safeTranslate(() => tCommon('messages.tryAgain'))}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default I18nTest;
