import { beforeEach, describe, expect, it } from 'vitest';
import type { UserData } from '../types';
import type { MentorOutput } from '../types/mentor';
import {
  applyMentorBriefingToMemory,
  buildMentorMemoryRuntime,
} from '../services/mentorMemory.service';

const makeUserData = (sessions: UserData['studyHistory']): UserData => ({
  weekProgress: {
    domingo: { studied: false, minutes: 0 },
    segunda: { studied: true, minutes: 40 },
    terca: { studied: true, minutes: 35 },
    quarta: { studied: false, minutes: 0 },
    quinta: { studied: false, minutes: 0 },
    sexta: { studied: false, minutes: 0 },
    sabado: { studied: false, minutes: 0 },
  },
  completedTopics: {},
  totalPoints: 0,
  streak: 2,
  bestStreak: 2,
  achievements: [],
  level: 1,
  studyHistory: sessions,
  dailyGoal: 60,
  sessions: [],
  currentStreak: 2,
});

const briefing: MentorOutput = {
  prioridade: 'Farmacologia',
  justificativa: 'Foco por baixa recorrencia recente.',
  acao_semana: ['Revisar Farmacologia', 'Fazer questoes curtas'],
  tom: 'default',
  mensagem_motivacional: 'Consistencia diaria vence intensidade isolada.',
};

describe('mentor memory service', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reaproveita briefing recente quando nao houve mudanca relevante', () => {
    const baseUserData = makeUserData([
      {
        date: '2026-03-21T08:00:00.000Z',
        minutes: 20,
        points: 0,
        subject: 'Farmacologia',
        duration: 20,
      },
      {
        date: '2026-03-20T08:00:00.000Z',
        minutes: 50,
        points: 0,
        subject: 'Anatomia',
        duration: 50,
      },
      {
        date: '2026-03-19T08:00:00.000Z',
        minutes: 45,
        points: 0,
        subject: 'Fisiologia',
        duration: 45,
      },
    ]);

    const firstRuntime = buildMentorMemoryRuntime({
      userData: baseUserData,
      weeklyGoalMinutes: 300,
      daysToExam: 90,
      trigger: 'chat_opened',
      previousMemory: null,
    });

    const savedMemory = applyMentorBriefingToMemory(firstRuntime.memory, briefing, 'fallback');

    const secondRuntime = buildMentorMemoryRuntime({
      userData: baseUserData,
      weeklyGoalMinutes: 300,
      daysToExam: 90,
      trigger: 'chat_opened',
      previousMemory: savedMemory,
    });

    expect(secondRuntime.recommendedFocus).toBe(savedMemory.lastFocus);
    expect(secondRuntime.shouldRefreshBriefing).toBe(false);
    expect(secondRuntime.focusShiftReason).toBe(savedMemory.focusShiftReason);
  });

  it('muda o foco quando o usuario progrediu bem na prioridade anterior', () => {
    const initialUserData = makeUserData([
      {
        date: '2026-03-21T08:00:00.000Z',
        minutes: 10,
        points: 0,
        subject: 'Farmacologia',
        duration: 10,
      },
      {
        date: '2026-03-20T08:00:00.000Z',
        minutes: 20,
        points: 0,
        subject: 'Patologia',
        duration: 20,
      },
      {
        date: '2026-03-19T08:00:00.000Z',
        minutes: 60,
        points: 0,
        subject: 'Anatomia',
        duration: 60,
      },
    ]);

    const initialRuntime = buildMentorMemoryRuntime({
      userData: initialUserData,
      weeklyGoalMinutes: 300,
      daysToExam: 90,
      trigger: 'chat_opened',
      previousMemory: null,
    });

    expect(initialRuntime.recommendedFocus).toBe('Farmacologia');
    const savedMemory = applyMentorBriefingToMemory(initialRuntime.memory, briefing, 'fallback');

    const progressedUserData = makeUserData([
      {
        date: '2026-03-21T08:00:00.000Z',
        minutes: 35,
        points: 0,
        subject: 'Farmacologia',
        duration: 35,
      },
      {
        date: '2026-03-20T08:00:00.000Z',
        minutes: 20,
        points: 0,
        subject: 'Patologia',
        duration: 20,
      },
      {
        date: '2026-03-19T08:00:00.000Z',
        minutes: 60,
        points: 0,
        subject: 'Anatomia',
        duration: 60,
      },
      {
        date: '2026-03-18T08:00:00.000Z',
        minutes: 15,
        points: 0,
        subject: 'Farmacologia',
        duration: 15,
      },
    ]);

    const shiftedRuntime = buildMentorMemoryRuntime({
      userData: progressedUserData,
      weeklyGoalMinutes: 300,
      daysToExam: 90,
      trigger: 'chat_opened',
      previousMemory: savedMemory,
    });

    expect(shiftedRuntime.recommendedFocus).toBe('Patologia');
    expect(shiftedRuntime.memory.previousFocus).toBe('Farmacologia');
    expect(shiftedRuntime.focusShiftReason).toContain('Boa evolucao em Farmacologia');
    expect(shiftedRuntime.shouldRefreshBriefing).toBe(true);
    expect(shiftedRuntime.memory.lastBriefing).toBeNull();
    expect(shiftedRuntime.memory.lastBriefingSource).toBeNull();
    expect(shiftedRuntime.memory.lastRecommendations).toEqual([]);
  });

  it('sanitiza memoria legada poluida antes de reutilizar briefing e focos', () => {
    const userData = makeUserData([
      {
        date: '2026-03-21T08:00:00.000Z',
        minutes: 25,
        points: 0,
        subject: 'Matematica',
        duration: 25,
      },
      {
        date: '2026-03-20T08:00:00.000Z',
        minutes: 45,
        points: 0,
        subject: 'Redacao',
        duration: 45,
      },
    ]);

    const runtime = buildMentorMemoryRuntime({
      userData,
      weeklyGoalMinutes: 300,
      daysToExam: 90,
      trigger: 'chat_opened',
      previousMemory: {
        version: 1,
        lastAnalysisAt: Date.now(),
        lastUpdatedAt: Date.now(),
        lastFocus: 'Matematical|zb-session|eyJ0b2tlbiI6IngifQ==',
        previousFocus: 'Linguagens||zb-session||abc123',
        focusShiftReason: 'Boa evolucao em Linguagens||zb-session||abc123. Agora vamos equilibrar com Matematical|zb-session|eyJ0b2tlbiI6IngifQ==.',
        weakAreas: ['Matematical|zb-session|eyJ0b2tlbiI6IngifQ==', 'Redacao'],
        strongArea: 'Redacao',
        weeklyGoalMinutes: 300,
        weeklyMinutesDone: 70,
        weeklyProgressPct: 23,
        totalStudyMinutes: 70,
        sessionsLast7Days: 2,
        sessionCount: 2,
        currentStreak: 2,
        completedMockExams: 0,
        daysToExam: 90,
        lastTrigger: 'chat_opened',
        lastRecommendations: ['Revisar Matematical|zb-session|eyJ0b2tlbiI6IngifQ== por 20min'],
        lastBriefing: {
          prioridade: 'Matematical|zb-session|eyJ0b2tlbiI6IngifQ==',
          justificativa: 'Baixa recorrencia recente em Matematical|zb-session|eyJ0b2tlbiI6IngifQ==.',
          acao_semana: ['Revisar Matematical|zb-session|eyJ0b2tlbiI6IngifQ== por 20min'],
          tom: 'default',
          mensagem_motivacional: 'Consistencia diaria em Matematical|zb-session|eyJ0b2tlbiI6IngifQ==.',
        },
        lastBriefingSource: 'fallback',
        lastActionFollowed: 'Revisar Matematical|zb-session|eyJ0b2tlbiI6IngifQ== por 20min',
        lastActionFollowedAt: Date.now(),
        subjectMinutes: {
          'Matematical|zb-session|eyJ0b2tlbiI6IngifQ==': 25,
          Redacao: 45,
          'Linguagens||zb-session||abc123': 15,
        },
      },
    });

    expect(runtime.recommendedFocus).toBe('Matematica');
    expect(runtime.memory.previousFocus).toBe('Linguagens');
    expect(runtime.focusShiftReason).not.toContain('zb-session');
    expect(Object.keys(runtime.memory.subjectMinutes)).toEqual(['Matematica', 'Redacao']);
  });

  it('sanitiza briefing salvo ao persistir memoria do mentor', () => {
    const baseUserData = makeUserData([
      {
        date: '2026-03-21T08:00:00.000Z',
        minutes: 20,
        points: 0,
        subject: 'Farmacologia',
        duration: 20,
      },
      {
        date: '2026-03-20T08:00:00.000Z',
        minutes: 50,
        points: 0,
        subject: 'Anatomia',
        duration: 50,
      },
    ]);

    const runtime = buildMentorMemoryRuntime({
      userData: baseUserData,
      weeklyGoalMinutes: 300,
      daysToExam: 90,
      trigger: 'chat_opened',
      previousMemory: null,
    });

    const saved = applyMentorBriefingToMemory(
      runtime.memory,
      {
        prioridade: 'Matematical|zb-session|eyJ0b2tlbiI6IngifQ==',
        justificativa: 'Baixa recorrencia recente em Matematical|zb-session|eyJ0b2tlbiI6IngifQ==.',
        acao_semana: ['Revisar Matematical|zb-session|eyJ0b2tlbiI6IngifQ== por 20min'],
        tom: 'default',
        mensagem_motivacional: 'Consistencia diaria em Matematical|zb-session|eyJ0b2tlbiI6IngifQ==.',
      },
      'fallback',
    );

    expect(saved.lastBriefing?.prioridade).toBe('Matematica');
    expect(saved.lastRecommendations[0]).toBe('Revisar Matematical por 20min');
    expect(saved.lastBriefing?.justificativa).not.toContain('zb-session');
  });
});
