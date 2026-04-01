import { describe, expect, it } from 'vitest';

import {
  buildStudyContextInputFromOnboarding,
  buildStudyContextDraftFromOnboarding,
  getStudyModeNavigation,
  getTabsForMode,
  resolveDetectedProductPhase,
  resolveStudyContextRoute,
  resolveLegacyTrackFromStudyContextMode,
  shouldUseLegacyBeginnerBootstrap,
} from '../features/studyContext';

describe('studyContext', () => {
  it('builds faculdade draft from onboarding snapshot', () => {
    const record = buildStudyContextDraftFromOnboarding('user-1', {
      focus: 'faculdade',
      contextSummary: 'ADS · 3o periodo',
      contextDescription: 'Plano academico focado em provas.',
      faculdade: {
        institution: 'IFPI',
        institutionType: 'instituto',
        course: 'ADS',
        semester: '3o periodo',
        semesterNumber: 3,
        focus: 'provas',
        studyDays: ['seg', 'ter', 'qui'],
        dailyMinutes: 90,
        preferredTurn: 'noite',
      },
    });

    expect(record.mode).toBe('faculdade');
    expect(record.contextSummary).toBe('ADS · 3o periodo');
    expect(record.contextPayload.faculdade).toMatchObject({
      institutionName: 'IFPI',
      institutionType: 'instituto',
      courseName: 'ADS',
      academicPeriodLabel: '3o periodo',
      academicPeriodNumber: 3,
      focus: 'provas',
      dailyMinutes: 90,
      preferredTurn: 'noite',
    });
  });

  it('maps outros onboarding focus to a native goal type', () => {
    const record = buildStudyContextDraftFromOnboarding('user-2', {
      focus: 'outros',
      outros: {
        goalTitle: 'JavaScript',
        focus: 'evoluir_tema',
        level: 'intermediario',
        dailyMinutes: 30,
        pace: 'moderado',
      },
    });

    expect(record.mode).toBe('outros');
    expect(record.contextPayload.outros).toMatchObject({
      topicName: 'JavaScript',
      goalType: 'aprofundar',
      level: 'intermediario',
      dailyMinutes: 30,
      pace: 'moderado',
    });
  });

  it('builds an upsert payload for faculdade onboarding', () => {
    const input = buildStudyContextInputFromOnboarding({
      focus: 'faculdade',
      contextSummary: 'ADS · 3o periodo',
      faculdade: {
        institution: 'IFPI',
        course: 'ADS',
        semester: '3o periodo',
        focus: 'rotina',
      },
    });

    expect(input).toMatchObject({
      mode: 'faculdade',
      contextSummary: 'ADS · 3o periodo',
      contextPayload: {
        faculdade: {
          institutionName: 'IFPI',
          courseName: 'ADS',
          academicPeriodLabel: '3o periodo',
          focus: 'rotina',
        },
      },
    });
  });

  it('exposes native navigation for faculdade and outros', () => {
    expect(getStudyModeNavigation('faculdade').items.map((item) => item.label)).toEqual([
      'Home',
      'Disciplinas',
      'Planejamento',
      'Calendario',
      'Perfil',
    ]);

    expect(getStudyModeNavigation('outros').items.map((item) => item.label)).toEqual([
      'Visao geral',
      'Meu foco',
      'Plano',
      'Execucao',
      'Ritmo',
      'Perfil',
    ]);
  });

  it('resolves shell tabs and initial route for native modes', () => {
    expect(getTabsForMode('faculdade').map((item) => item.id)).toEqual([
      'inicio',
      'departamento',
      'cronograma',
      'arvore',
      'perfil',
    ]);

    expect(resolveStudyContextRoute('outros', 'departamento')).toBe('departamento');
    expect(resolveStudyContextRoute('outros', 'flashcards')).toBe('inicio');
  });

  it('keeps faculdade and outros outside legacy track fallback', () => {
    expect(resolveLegacyTrackFromStudyContextMode('faculdade')).toBeNull();
    expect(resolveLegacyTrackFromStudyContextMode('outros')).toBeNull();
    expect(resolveLegacyTrackFromStudyContextMode('concurso')).toBe('concursos');
  });

  it('treats native contexts as official intermediate phase without legacy bootstrap', () => {
    expect(shouldUseLegacyBeginnerBootstrap('faculdade')).toBe(false);
    expect(shouldUseLegacyBeginnerBootstrap('outros')).toBe(false);
    expect(resolveDetectedProductPhase({
      mode: 'faculdade',
      isReadyForIntermediate: false,
    })).toBe('intermediate');
    expect(resolveDetectedProductPhase({
      mode: 'outros',
      isReadyForIntermediate: false,
      isReadyForAdvanced: true,
    })).toBe('intermediate');
  });

  it('keeps legacy tracks on the existing phase progression', () => {
    expect(shouldUseLegacyBeginnerBootstrap('enem')).toBe(true);
    expect(resolveDetectedProductPhase({
      mode: 'enem',
      isReadyForIntermediate: false,
    })).toBe('beginner');
    expect(resolveDetectedProductPhase({
      mode: 'concurso',
      isReadyForIntermediate: true,
    })).toBe('intermediate');
    expect(resolveDetectedProductPhase({
      mode: 'hibrido',
      isReadyForIntermediate: true,
      isReadyForAdvanced: true,
    })).toBe('advanced');
  });
});
