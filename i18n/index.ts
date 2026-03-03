import { useSettings } from '@/context/SettingsContext';
import { fr } from './fr';
import { en } from './en';

export type Locale = 'fr' | 'en';

const locales: Record<Locale, typeof fr> = { fr, en };

export function useTranslation(): typeof fr {
  const { language } = useSettings();
  return locales[language];
}

/** Translate a country name from French (API) to the current locale */
export function useTranslateCountry(): (country: string) => string {
  const { language } = useSettings();
  const countries = locales[language].countries;
  return (country: string) => countries[country] || country;
}
