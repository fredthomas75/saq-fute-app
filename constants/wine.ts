/**
 * Shared wine constants — single source of truth.
 * Used by WineCard, map, country-wines, wine detail, etc.
 */

export const TYPE_COLORS: Record<string, string> = {
  Rouge: '#722F37',
  Blanc: '#C5A572',
  Rosé: '#E8A0BF',
  Mousseux: '#7FB3D8',
};

export const COUNTRY_FLAGS: Record<string, string> = {
  France: '🇫🇷', Italie: '🇮🇹', Espagne: '🇪🇸', Portugal: '🇵🇹',
  Argentine: '🇦🇷', Chili: '🇨🇱', 'États-Unis': '🇺🇸', Australie: '🇦🇺',
  'Nouvelle-Zélande': '🇳🇿', 'Afrique du Sud': '🇿🇦', Allemagne: '🇩🇪',
  Canada: '🇨🇦', Grèce: '🇬🇷', Hongrie: '🇭🇺', Autriche: '🇦🇹',
  Liban: '🇱🇧', Israël: '🇮🇱', Géorgie: '🇬🇪', Uruguay: '🇺🇾',
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}
