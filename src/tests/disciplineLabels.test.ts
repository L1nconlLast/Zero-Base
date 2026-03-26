import { describe, expect, it } from 'vitest';
import { getCycleSubjectByDisplayLabel } from '../utils/disciplineLabels';

describe('getCycleSubjectByDisplayLabel', () => {
  it('maps ENEM Redação to the internal timer subject key', () => {
    expect(getCycleSubjectByDisplayLabel('Redação', 'enem')).toBe('Bioquímica');
  });

  it('maps ENEM Linguagens to the internal timer subject key', () => {
    expect(getCycleSubjectByDisplayLabel('Linguagens', 'enem')).toBe('Fisiologia');
  });

  it('supports labels that come with front context from the focus banner', () => {
    expect(getCycleSubjectByDisplayLabel('Português • Redação', 'enem')).toBe('Bioquímica');
  });

  it('falls back to the hybrid mapping when the track changes', () => {
    expect(getCycleSubjectByDisplayLabel('Redação', 'hibrido')).toBe('Outra');
  });

  it('returns Outra for labels outside the configured cycle', () => {
    expect(getCycleSubjectByDisplayLabel('Bancas', 'concursos')).toBe('Outra');
  });
});
