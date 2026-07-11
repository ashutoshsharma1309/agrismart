import { describe, it, expect } from 'vitest';
import { cn, clamp, hashString, getInitials, seededRandom } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('resolves conflicting Tailwind utilities in favour of the last one', () => {
    // tailwind-merge should keep only the winning padding.
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });
});

describe('clamp', () => {
  it('bounds a value to the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe('hashString', () => {
  it('is deterministic and non-negative', () => {
    expect(hashString('leaf.jpg')).toBe(hashString('leaf.jpg'));
    expect(hashString('leaf.jpg')).toBeGreaterThanOrEqual(0);
  });

  it('distinguishes different inputs', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});

describe('getInitials', () => {
  it('takes the first letter of up to two words, uppercased', () => {
    expect(getInitials('ravi kumar')).toBe('RK');
    expect(getInitials('Anita')).toBe('A');
    expect(getInitials('a b c d')).toBe('AB');
  });

  it('falls back to the brand initials for empty input', () => {
    expect(getInitials('   ')).toBe('AS');
  });
});

describe('seededRandom', () => {
  it('produces a reproducible sequence for a given seed', () => {
    const a = seededRandom(123);
    const b = seededRandom(123);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('diverges for different seeds', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });
});
