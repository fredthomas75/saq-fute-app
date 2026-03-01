import { API_BASE_URL } from '@/constants/api';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
}

const SYSTEM_PROMPT: ChatMessage = {
  role: 'system',
  content: `Tu es un sommelier expert pour SAQ Futé. Règles importantes:
- Quand on te demande un accord mets-vin, recommande TOUJOURS des vins adaptés en utilisant tes connaissances en œnologie. Ne dis jamais que tu ne trouves pas de résultat.
- Recommande des cépages, styles de vin et des noms de bouteilles précis qui se marient bien avec le plat.
- Inclus un lien SAQ UNIQUEMENT si tu as l'URL exacte d'un produit spécifique (ex: https://www.saq.com/fr/12345678). Ne génère JAMAIS de liens de recherche SAQ, ils ne fonctionnent pas.
- Si tu n'as pas de lien produit exact, recommande simplement le nom du vin et le cépage, l'utilisateur pourra chercher lui-même.
- Ne mets PAS de crochets markdown autour des liens, donne juste l'URL directe.
- Ne mets PAS de séparateurs · entre les rubriques.
- Sois concis, enthousiaste et utile.`,
};

export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [SYSTEM_PROMPT, ...messages] }),
  });

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

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) throw new Error('Erreur analyse étiquette');
  const data = await response.json();
  return data.reply;
}

export async function readBarcodeFromImage(imageBase64: string): Promise<string | null> {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: "Lis le code-barres dans cette image. Réponds UNIQUEMENT avec les chiffres du code-barres (EAN-13, UPC-A, etc.), rien d'autre. Si tu ne vois pas de code-barres lisible, réponds exactement: NONE",
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
      ],
    },
  ];

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const reply = (data.reply || '').trim();
    // Only return if it looks like a barcode (digits only, 8-14 chars)
    if (/^\d{8,14}$/.test(reply)) return reply;
    return null;
  } catch {
    return null;
  }
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

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) throw new Error('Erreur analyse menu');
  const data = await response.json();
  return data.reply;
}
