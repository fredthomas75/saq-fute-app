import { API_BASE_URL } from '@/constants/api';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
}

/** Fetch with timeout (AbortController) */
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function getSystemPrompt(language: string = 'fr', vipMode: boolean = false): ChatMessage {
  const vipEn = vipMode
    ? '\n- VIP MODE IS ACTIVE: The user only wants premium wines with 90+ scores from external expert critics (Wine Spectator, Wine Advocate, Decanter, James Suckling, etc.). ONLY recommend wines known to have received 90/100 or higher from recognized critics. Mention the critic and score when recommending. Do NOT use internal or personal ratings.'
    : '';
  const vipFr = vipMode
    ? '\n- MODE VIP ACTIF: L\'utilisateur ne veut que des vins premium ayant reçu 90+ de critiques experts externes (Wine Spectator, Wine Advocate, Decanter, James Suckling, etc.). Recommande UNIQUEMENT des vins reconnus pour avoir obtenu 90/100 ou plus de critiques reconnus. Mentionne le critique et le score dans tes recommandations. N\'utilise PAS de notes internes ou personnelles.'
    : '';

  if (language === 'en') {
    return {
      role: 'system',
      content: `You are an expert sommelier for SAQ Futé. Important rules:
- ALWAYS respond in English.
- When asked about food-wine pairings, ALWAYS recommend suitable wines using your oenology knowledge. Never say you can't find results.
- Recommend specific grape varieties, wine styles and precise bottle names that pair well with the dish.
- Include a SAQ link ONLY if you have the exact product URL (e.g.: https://www.saq.com/fr/12345678). NEVER generate SAQ search links, they don't work.
- If you don't have an exact product link, simply recommend the wine name and grape variety, the user can search themselves.
- Do NOT put markdown brackets around links, just give the direct URL.
- Do NOT put · separators between sections.
- Be concise, enthusiastic and helpful.${vipEn}`,
    };
  }

  return {
    role: 'system',
    content: `Tu es un sommelier expert pour SAQ Futé. Règles importantes:
- Réponds TOUJOURS en français.
- Quand on te demande un accord mets-vin, recommande TOUJOURS des vins adaptés en utilisant tes connaissances en œnologie. Ne dis jamais que tu ne trouves pas de résultat.
- Recommande des cépages, styles de vin et des noms de bouteilles précis qui se marient bien avec le plat.
- Inclus un lien SAQ UNIQUEMENT si tu as l'URL exacte d'un produit spécifique (ex: https://www.saq.com/fr/12345678). Ne génère JAMAIS de liens de recherche SAQ, ils ne fonctionnent pas.
- Si tu n'as pas de lien produit exact, recommande simplement le nom du vin et le cépage, l'utilisateur pourra chercher lui-même.
- Ne mets PAS de crochets markdown autour des liens, donne juste l'URL directe.
- Ne mets PAS de séparateurs · entre les rubriques.
- Sois concis, enthousiaste et utile.${vipFr}`,
  };
}

export async function sendChatMessage(messages: ChatMessage[], language: string = 'fr', vipMode: boolean = false): Promise<string> {
  const systemPrompt = getSystemPrompt(language, vipMode);
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [systemPrompt, ...messages] }),
  }, 30000);

  if (!response.ok) {
    throw new Error(`Erreur chat: ${response.status}`);
  }

  const data = await response.json();
  return data.reply;
}

export async function analyzeWineLabel(imageBase64: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: "Identifie le vin sur cette étiquette. Réponds UNIQUEMENT avec le nom commercial du vin tel qu'il apparaît sur l'étiquette, sans guillemets, sans ponctuation, sans explication. Juste le nom. Exemples de réponses correctes:\nMouton Cadet\nKim Crawford Sauvignon Blanc\nClos du Bois Chardonnay\nMarqués de Cáceres Crianza",
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
      ],
    },
  ];

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  }, 20000);

  if (!response.ok) throw new Error('Erreur analyse étiquette');
  const data = await response.json();
  return data.reply;
}

export async function analyzeMenuPhoto(imageBase64: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyse cette photo de menu de restaurant. Pour chaque plat visible, suggère un type de vin qui irait bien.
Réponds en format clair:
🍽️ [Nom du plat] → 🍷 [Type de vin recommandé + cépage suggéré]

Sois concis et pratique. Si le menu n'est pas lisible, dis-le.`,
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
      ],
    },
  ];

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  }, 20000);

  if (!response.ok) throw new Error('Erreur analyse menu');
  const data = await response.json();
  return data.reply;
}
