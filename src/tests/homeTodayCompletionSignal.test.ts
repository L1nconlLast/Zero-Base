import { describe, expect, it } from 'vitest';
import {
  applyHomeTodayCompletionSignal,
  createHomeCompletionSignal,
  isHomeCompletionSignalActive,
  matchesHomeCompletionSignalPriority,
} from '../components/Home/homeTodayCompletionSignal';
import type { HomeTodayState } from '../components/Home/homeTodayState';

const buildState = (overrides: Partial<HomeTodayState> = {}): HomeTodayState => ({
  priority: 'study',
  phase: 'inicio',
  isDone: false,
  hero: {
    mode: 'default',
    eyebrow: 'estudo',
    title: 'Seu bloco de hoje esta pronto',
    subtitle: 'Matematica - Funcoes',
    insight: 'Sessao curta pronta - leva 25 min.',
    supportingText: 'Seu foco do dia ja esta definido.',
    primaryActionLabel: 'Continuar sessao',
    primaryActionTarget: 'study',
  },
  dayStatus: {
    label: 'Hoje',
    value: 'Estudo pronto',
    detail: 'Seu plano de hoje ja tem foco definido e pronto para entrar.',
    summary: '25 min previstos',
    remainder: 'Nenhuma revisao esta vencida agora.',
  },
  primaryPanel: {
    eyebrow: 'estudo',
    title: 'Estudar agora',
    description: 'O plano ja escolheu o bloco do dia.',
    sessionLabel: 'Sessao oficial',
    stateBadgeLabel: 'Inicio',
    rows: [{ id: 'study-row', label: 'Bloco atual', detail: 'Matematica - Funcoes', badge: '25 min' }],
  },
  continuityPanel: {
    eyebrow: 'depois',
    title: 'Depois desse bloco',
    actionLabel: 'Abrir plano',
    actionTarget: 'planning',
    rows: [{ id: 'weekly-row', label: 'Semana aberta', detail: 'Faltam 2 blocos para fechar a semana.', badge: '2 restantes' }],
  },
  ...overrides,
});

describe('homeTodayCompletionSignal', () => {
  it('reconhece sinal valido antes da expiracao', () => {
    const signal = createHomeCompletionSignal('review', '2026-03-30T10:00:00.000Z', 60_000);

    expect(isHomeCompletionSignalActive(signal, new Date('2026-03-30T10:00:30.000Z'))).toBe(true);
    expect(matchesHomeCompletionSignalPriority(signal, 'review')).toBe(true);
    expect(matchesHomeCompletionSignalPriority(signal, 'study')).toBe(false);
  });

  it('ignora sinal expirado', () => {
    const signal = createHomeCompletionSignal('study', '2026-03-30T10:00:00.000Z', 60_000);
    const state = buildState();

    expect(isHomeCompletionSignalActive(signal, new Date('2026-03-30T10:01:01.000Z'))).toBe(false);
    expect(applyHomeTodayCompletionSignal(state, signal, new Date('2026-03-30T10:01:01.000Z'))).toEqual(state);
  });

  it('forca a home para concluido preservando o proximo passo atual', () => {
    const signal = createHomeCompletionSignal('review', '2026-03-30T10:00:00.000Z', 60_000);
    const state = buildState({
      priority: 'continue',
      hero: {
        mode: 'default',
        eyebrow: 'continuidade',
        title: 'Hoje voce continua daqui',
        subtitle: 'Matematica - Porcentagem',
        insight: 'Faltam 2 questoes para fechar este bloco. Leva menos de 5 min.',
        supportingText: 'Nenhuma revisao esta vencida agora.',
        primaryActionLabel: 'Continuar sessao',
        primaryActionTarget: 'study',
      },
      primaryPanel: {
        eyebrow: 'continuidade',
        title: 'Continuar agora',
        description: 'Seu retorno ficou preparado para voce retomar sem reabrir decisao.',
        sessionLabel: 'Continuidade',
        stateBadgeLabel: 'Inicio',
        rows: [{ id: 'continuation-row', label: 'Bloco atual', detail: 'Matematica - Porcentagem', badge: 'menos de 5 min' }],
      },
    });

    const completedState = applyHomeTodayCompletionSignal(state, signal, new Date('2026-03-30T10:00:30.000Z'));

    expect(completedState.priority).toBe('review');
    expect(completedState.phase).toBe('concluido');
    expect(completedState.isDone).toBe(true);
    expect(completedState.dayStatus.value).toBe('Revisao concluida');
    expect(completedState.continuityPanel.actionLabel).toBe('Continuar sessao');
    expect(completedState.continuityPanel.rows[0]).toMatchObject({
      label: 'Proximo passo',
      detail: 'Matematica - Porcentagem. Faltam 2 questoes para fechar este bloco. Leva menos de 5 min.',
    });
  });
});
