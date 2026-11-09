import { describe, it, expect } from 'vitest';
import { isMeaningfulSignature } from './signatureValidation';

describe('isMeaningfulSignature', () => {
  it('rejects an empty pad', () => {
    expect(isMeaningfulSignature([], 400, 180)).toBe(false);
  });

  it('rejects a single tap', () => {
    expect(isMeaningfulSignature([[{ x: 0.5, y: 0.5 }]], 400, 180)).toBe(false);
  });

  it('accepts a real signature stroke', () => {
    const stroke = Array.from({ length: 30 }, (_, i) => ({ x: 0.1 + i * 0.025, y: 0.4 + Math.sin(i / 2) * 0.15 }));
    expect(isMeaningfulSignature([stroke], 400, 180)).toBe(true);
  });
});
