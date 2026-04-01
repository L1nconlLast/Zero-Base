import { describe, expect, it } from 'vitest';
import { buildProfileContextData } from '../features/profile/profileContext';
import type { ProfileTrackContext } from '../features/profile/types';

describe('buildProfileContextData', () => {
  it('gera contexto de ENEM com meta e sinais do onboarding', () => {
    const data = buildProfileContextData({
      profile: 'enem',
      examGoal: 'ENEM 2026',
      examDate: '2026-11-09',
      enem: {
        triedBefore: 'nao',
        profileLevel: 'iniciante',
        targetCollege: 'UFPI',
        targetCourse: 'Direito',
      },
    } satisfies ProfileTrackContext);

    expect(data?.trackLabel).toBe('ENEM');
    expect(data?.title).toContain('ENEM 2026');
    expect(data?.tags).toContain('Primeira vez');
    expect(data?.tags).toContain('Iniciante');
  });

  it('gera contexto de concurso orientado por edital e prazo', () => {
    const data = buildProfileContextData({
      profile: 'concurso',
      concurso: {
        name: 'PF Administrativo 2025',
        board: 'Cebraspe',
        area: 'Administrativo',
        experienceLevel: 'intermediario',
        examDate: '2026-08-12',
      },
    } satisfies ProfileTrackContext);

    expect(data?.trackLabel).toBe('Concurso');
    expect(data?.title).toContain('PF Administrativo 2025');
    expect(data?.tags).toEqual(expect.arrayContaining(['Administrativo', 'Cebraspe', 'Intermediario']));
  });

  it('gera contexto de faculdade com curso, periodo e foco', () => {
    const data = buildProfileContextData({
      profile: 'faculdade',
      faculdade: {
        institution: 'IFPI',
        course: 'ADS',
        semester: '3',
        focus: 'rotina',
      },
    } satisfies ProfileTrackContext);

    expect(data?.trackLabel).toBe('Faculdade');
    expect(data?.title).toContain('ADS');
    expect(data?.tags).toEqual(expect.arrayContaining(['IFPI', '3o periodo', 'Rotina academica']));
  });

  it('gera contexto flexivel para outros', () => {
    const data = buildProfileContextData({
      profile: 'outros',
      outros: {
        goalTitle: 'JavaScript',
        focus: 'praticar',
      },
    } satisfies ProfileTrackContext);

    expect(data?.trackLabel).toBe('Outros');
    expect(data?.title).toBe('JavaScript');
    expect(data?.tags).toContain('Praticar');
  });

  it('gera contexto hibrido com foco principal explicito', () => {
    const data = buildProfileContextData({
      profile: 'hibrido',
      summaryDescription: 'Plano balanceado entre ENEM e concurso.',
      concurso: {
        name: 'PF Administrativo 2025',
        board: 'Cebraspe',
      },
      hibrido: {
        primaryFocus: 'concurso',
        availableStudyTime: 'medio',
      },
    } satisfies ProfileTrackContext);

    expect(data?.trackLabel).toBe('Hibrido');
    expect(data?.title).toBe('ENEM + Concurso');
    expect(data?.tags).toEqual(expect.arrayContaining(['Foco: Concurso', 'PF Administrativo 2025', 'Cebraspe']));
  });
});
