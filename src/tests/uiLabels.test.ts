import { describe, expect, it } from 'vitest';
import {
  normalizePresentationLabel,
  normalizeSubjectLabel,
  truncatePresentationLabel,
} from '../utils/uiLabels';

describe('uiLabels', () => {
  it('removes technical metadata from subject labels', () => {
    expect(normalizeSubjectLabel('Linguagens||zb-session||8b23')).toBe('Linguagens');
  });

  it('removes single-pipe session metadata from subject labels', () => {
    expect(normalizeSubjectLabel('Matematica|zb-session|eyJ0b2tlbiI6IngifQ==')).toBe('Matematica');
  });

  it('converts slug-like labels into readable presentation copy', () => {
    expect(normalizeSubjectLabel('direito-administrativo')).toBe('Direito Administrativo');
  });

  it('keeps bullet-separated labels readable', () => {
    expect(normalizePresentationLabel('linguagens • interpretacao de texto||zb-session||8b23')).toBe(
      'Linguagens • Interpretacao de Texto',
    );
  });

  it('truncates long labels after normalization', () => {
    expect(truncatePresentationLabel('direito-administrativo', 12)).toBe('Direito Adm…');
  });

  it('falls back when the subject is just technical garbage', () => {
    expect(normalizeSubjectLabel('{"payload":true}', 'Geral')).toBe('Geral');
  });
});
