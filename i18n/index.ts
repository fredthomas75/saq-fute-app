import { useSettings } from '@/context/SettingsContext';
import { fr } from './fr';
import { en } from './en';

export type Locale = 'fr' | 'en';
export type Translations = typeof fr;

const locales: Record<Locale, Translations> = { fr, en };

export function useTranslation(): Translations {
  const { language } = useSettings();
  return locales[language];
}

export { fr, en };
