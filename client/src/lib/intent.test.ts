import { describe, it, expect } from 'vitest';
import { detectIntent } from './intent';

describe('detectIntent', () => {
  it('detects greetings, including transliterated and native-script forms', () => {
    expect(detectIntent('Hello there')).toBe('greeting');
    expect(detectIntent('namaste')).toBe('greeting');
    expect(detectIntent('ನಮಸ್ಕಾರ')).toBe('greeting');
  });

  it('detects crop, pest, fertilizer and weather intents by keyword', () => {
    expect(detectIntent('which crop should I sow this season?')).toBe('crop');
    expect(detectIntent('there is a fungus on my leaf')).toBe('pest');
    expect(detectIntent('how much urea per acre?')).toBe('fertilizer');
    expect(detectIntent('will it rain tomorrow?')).toBe('weather');
  });

  it('detects native-script keywords', () => {
    expect(detectIntent('फसल के बारे में बताओ')).toBe('crop');
    expect(detectIntent('మా పంట గురించి')).toBe('crop');
  });

  it('is case-insensitive', () => {
    expect(detectIntent('WEATHER forecast please')).toBe('weather');
  });

  it('falls back when nothing matches', () => {
    expect(detectIntent('tell me a joke about tractors')).toBe('fallback');
  });

  it('resolves to the first matching intent in priority order', () => {
    // "greeting" is checked before the others, so a greeting + crop message
    // resolves to greeting.
    expect(detectIntent('hello, about my crop')).toBe('greeting');
  });
});
