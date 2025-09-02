import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  LANGUAGE_FLAGS,
  changeLanguage,
  getCurrentLanguage,
  type SupportedLanguage
} from '../../lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'inline';
  showLabel?: boolean;
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  showLabel = true,
  className = ''
}) => {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = getCurrentLanguage();

  const handleLanguageChange = async (language: SupportedLanguage) => {
    try {
      await changeLanguage(language);
      setIsOpen(false);
      
      // Reload the page to ensure all components update
      window.location.reload();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && (
          <span className="text-sm text-gray-600">
            {t('language.current', 'Language')}:
          </span>
        )}
        <div className="flex space-x-1">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`px-2 py-1 text-sm rounded transition-colors flex items-center space-x-1 ${
                currentLanguage === lang
                  ? 'bg-[#BFA054] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={LANGUAGE_NAMES[lang]}
            >
              <span className="text-base">{LANGUAGE_FLAGS[lang]}</span>
              <span className="text-xs">{lang.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        aria-label={t('language.select')}
      >
        <span className="text-base">{LANGUAGE_FLAGS[currentLanguage]}</span>
        {showLabel && (
          <span className="hidden sm:block">
            {LANGUAGE_NAMES[currentLanguage]}
          </span>
        )}
        <span className="sm:hidden text-xs">
          {currentLanguage.toUpperCase()}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                {t('language.select')}
              </div>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    currentLanguage === lang
                      ? 'bg-[#BFA054] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{LANGUAGE_FLAGS[lang]}</span>
                      <span>{LANGUAGE_NAMES[lang]}</span>
                    </div>
                    <span className="text-xs opacity-75">
                      {lang.toUpperCase()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
