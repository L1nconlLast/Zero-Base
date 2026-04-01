import { describe, expect, it } from 'vitest';
import {
  formatStudyHeatmapDateKey,
  normalizeStudyHeatmapDateKey,
} from '../components/Dashboard/StudyHeatmap';

describe('StudyHeatmap date normalization', () => {
  it('keeps plain YYYY-MM-DD dates unchanged', () => {
    expect(normalizeStudyHeatmapDateKey('2026-03-20')).toBe('2026-03-20');
  });

  it('extracts the calendar day from ISO timestamps', () => {
    expect(normalizeStudyHeatmapDateKey('2026-03-20T18:30:00.000Z')).toBe('2026-03-20');
  });

  it('returns null for invalid values', () => {
    expect(normalizeStudyHeatmapDateKey('not-a-date')).toBeNull();
  });

  it('formats Date objects with local calendar values', () => {
    expect(formatStudyHeatmapDateKey(new Date(2026, 2, 20))).toBe('2026-03-20');
  });
});
