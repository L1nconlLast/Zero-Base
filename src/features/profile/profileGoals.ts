import type { ProfileGoalData, ProfileGoalsData, ProfileGoalStatus } from './types';

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const formatMinutesLabel = (minutes: number): string => `${Math.max(0, minutes)} min`;

const getWeekElapsedRatio = (now: Date): number => {
  const weekday = now.getDay();
  const mondayFirstDay = weekday === 0 ? 7 : weekday;
  return mondayFirstDay / 7;
};

const buildGoalCopy = (
  status: ProfileGoalStatus,
  remainingMinutes: number,
  progressMinutes: number,
  targetMinutes: number,
): Pick<ProfileGoalData, 'remainingLabel' | 'helperLabel'> => {
  if (status === 'empty') {
    return {
      remainingLabel: 'Defina um alvo semanal para acompanhar seu progresso.',
      helperLabel: 'Uma meta simples ajuda a visualizar o ritmo da semana.',
    };
  }

  if (status === 'completed') {
    return {
      remainingLabel: 'Meta concluida nesta semana.',
      helperLabel: progressMinutes > targetMinutes
        ? `${formatMinutesLabel(progressMinutes - targetMinutes)} acima do alvo semanal.`
        : 'Voce bateu o alvo principal desta semana.',
    };
  }

  if (status === 'on_track') {
    return {
      remainingLabel: `Faltam ${formatMinutesLabel(remainingMinutes)} para concluir.`,
      helperLabel: 'Voce segue no ritmo certo para fechar a meta da semana.',
    };
  }

  return {
    remainingLabel: `Faltam ${formatMinutesLabel(remainingMinutes)} para concluir.`,
    helperLabel: 'Ainda falta um pouco para recuperar o ritmo desta semana.',
  };
};

export const buildProfileGoalsData = (
  weeklyGoalMinutes: number,
  weeklyStudiedMinutes: number,
  now: Date = new Date(),
): ProfileGoalsData => {
  const targetMinutes = Math.max(0, Math.round(Number.isFinite(weeklyGoalMinutes) ? weeklyGoalMinutes : 0));
  const progressMinutes = Math.max(0, Math.round(Number.isFinite(weeklyStudiedMinutes) ? weeklyStudiedMinutes : 0));

  if (targetMinutes <= 0) {
    return {
      primaryGoal: {
        title: 'Meta da semana',
        targetLabel: 'Sem meta definida',
        progressLabel: 'Sem meta ativa',
        completionPercent: 0,
        status: 'empty',
        ...buildGoalCopy('empty', 0, progressMinutes, targetMinutes),
      },
    };
  }

  const remainingMinutes = Math.max(0, targetMinutes - progressMinutes);
  const completionPercent = clampPercent((progressMinutes / targetMinutes) * 100);

  let status: ProfileGoalStatus = 'behind';
  if (progressMinutes >= targetMinutes) {
    status = 'completed';
  } else {
    const elapsedRatio = getWeekElapsedRatio(now);
    const progressRatio = progressMinutes / targetMinutes;
    status = progressRatio + 0.05 >= elapsedRatio ? 'on_track' : 'behind';
  }

  return {
    primaryGoal: {
      title: 'Meta da semana',
      targetLabel: `${formatMinutesLabel(targetMinutes)} planejados`,
      progressLabel: `${formatMinutesLabel(progressMinutes)} de ${formatMinutesLabel(targetMinutes)}`,
      completionPercent,
      status,
      ...buildGoalCopy(status, remainingMinutes, progressMinutes, targetMinutes),
    },
  };
};
