export type Intent = 'greeting' | 'crop' | 'pest' | 'fertilizer' | 'weather' | 'fallback';

const KEYWORDS: Record<Exclude<Intent, 'fallback'>, string[]> = {
  greeting: [
    'hi',
    'hello',
    'hey',
    'namaste',
    'namaskar',
    'vanakkam',
    'shubh',
    'नमस्ते',
    'ನಮಸ್ಕಾರ',
    'வணக்கம்',
    'నమస్కారం',
  ],
  crop: [
    'crop',
    'grow',
    'seed',
    'sow',
    'plant',
    'rice',
    'wheat',
    'paddy',
    'maize',
    'cotton',
    'फसल',
    'ಬೆಳೆ',
    'பயிர்',
    'పంట',
    'पीक',
    'धान',
  ],
  pest: [
    'pest',
    'insect',
    'disease',
    'fungus',
    'rust',
    'mildew',
    'leaf',
    'spot',
    'bug',
    'कीट',
    'रोग',
    'ಕೀಟ',
    'ರೋಗ',
    'பூச்சி',
    'கீடம்',
    'వ్యాధి',
    'कीटक',
  ],
  fertilizer: [
    'fertilizer',
    'fertiliser',
    'manure',
    'compost',
    'urea',
    'dap',
    'npk',
    'nutrient',
    'उर्वरक',
    'खाद',
    'ಗೊಬ್ಬರ',
    'உரம்',
    'ఎరువు',
    'खत',
  ],
  weather: [
    'weather',
    'rain',
    'storm',
    'temperature',
    'heat',
    'forecast',
    'climate',
    'monsoon',
    'मौसम',
    'बारिश',
    'ಹವಾಮಾನ',
    'ಮಳೆ',
    'வானிலை',
    'மழை',
    'వాతావరణం',
    'हवामान',
    'पाऊस',
  ],
};

/**
 * Match a single keyword against the (lowercased) message. ASCII keywords are
 * matched on word boundaries so short tokens like "hi" don't fire inside
 * unrelated words ("which", "this"). Native-script keywords fall back to a
 * substring test — `\b` is ASCII-only and those tokens are distinctive enough
 * that a substring match won't false-positive.
 */
function matchesKeyword(message: string, keyword: string): boolean {
  if (/^[a-z]+$/.test(keyword)) {
    return new RegExp(`\\b${keyword}\\b`).test(message);
  }
  return message.includes(keyword);
}

export function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  for (const intent of ['greeting', 'crop', 'pest', 'fertilizer', 'weather'] as const) {
    if (KEYWORDS[intent].some((k) => matchesKeyword(m, k.toLowerCase()))) {
      return intent;
    }
  }
  return 'fallback';
}
