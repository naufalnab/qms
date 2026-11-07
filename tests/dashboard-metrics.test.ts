import { describe, expect, it } from 'vitest';
import { percentageOrNull } from '../src/lib/qms';

describe('QMS dashboard zero-data KPI semantics', () => {
  it('does not fabricate 100% compliance or approval when no records qualify', () => {
    expect(percentageOrNull(0, 0)).toBeNull();
  });
  it('preserves valid 0%, 75%, and 100% rates when records exist', () => {
    expect(percentageOrNull(0, 4)).toBe(0);
    expect(percentageOrNull(3, 4)).toBe(75);
    expect(percentageOrNull(4, 4)).toBe(100);
  });
  it('does not divide by a nonpositive denominator', () => {
    expect(percentageOrNull(0, -1)).toBeNull();
  });
});
