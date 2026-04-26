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

export function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  for (const intent of ['greeting', 'crop', 'pest', 'fertilizer', 'weather'] as const) {
    if (KEYWORDS[intent].some((k) => m.includes(k.toLowerCase()))) {
      return intent;
    }
  }
  return 'fallback';
}
