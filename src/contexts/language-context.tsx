'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import enTranslations from '@/locales/en.json';
import jaTranslations from '@/locales/ja.json';

/** Supported language codes */
type Language = 'en' | 'ja';

/** Context type for the Language provider */
interface LanguageContextType {
  /** Current active language */
  language: Language;
  /** Function to change the current language */
  setLanguage: (language: Language) => void;
  /** Translation function that takes a key and returns the translated text */
  t: (key: string) => string;
  /** Whether the context is still loading/mounting */
  isLoading: boolean;
}

/** React context for language and translation functionality */
const LanguageContext = createContext<LanguageContextType | null>(null);

/** Translation data mapping for each supported language */
const translations = {
  en: enTranslations,
  ja: jaTranslations,
};

/**
 * Language provider component that manages language state and provides translation functionality
 * Handles hydration-safe language loading from cookies and provides translation functions
 * @param props Component properties
 * @param props.children Child components to render within the provider
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    // Read from cookie after mount to avoid hydration mismatch
    const savedLanguage = document.cookie
      .split('; ')
      .find(row => row.startsWith('language='))
      ?.split('=')[1] as Language;

    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ja')) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    // Save to cookie
    document.cookie = `language=${newLanguage}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Strict${
      typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? '; Secure'
        : ''
    }`;
  }, []);

  const t = useCallback(
    (key: string) => {
      const keys = key.split('.');
      let value: unknown = translations[language];

      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }

      return (value as string) || key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage: handleSetLanguage,
      t,
      isLoading: !mounted,
    }),
    [language, handleSetLanguage, t, mounted]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context and translation functionality
 * @returns LanguageContextType object with language, setLanguage, t, and isLoading
 * @throws Error if used outside of LanguageProvider
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
