import type {
  MentorActionDirective,
  MentorDecisionInput,
  MentorMomentClassification,
  MentorResponseKind,
  MentorResponseTone,
  MentorResponseType,
  MentorRiskSnapshot,
} from '../contracts';

interface MentorScenarioContext {
  input: MentorDecisionInput;
  primarySubject: string;
  secondarySubject: string;
  dominantSubject?: string;
  dominantSubjectSharePct: number;
  recommendedSession?: MentorDecisionInput['execution']['nextRecommendedSession'];
}

interface MentorPlaybookMeta {
  id: string;
  title: string;
  type: MentorResponseType;
  tone: MentorResponseTone;
  whyNow: string;
  caution: string;
  chips: string[];
}

interface MentorPlaybookMatch {
  playbookId: string;
  classification: MentorMomentClassification;
  actions: MentorActionDirective[];
  responseMeta: MentorPlaybookMeta;
}

interface MentorPlaybookDefinition {
  id: string;
  match: (context: MentorScenarioContext) => boolean;
  build: (context: MentorScenarioContext) => MentorPlaybookMatch;
}

const buildRisk = (
  level: MentorRiskSnapshot['level'],
  label: string,
  summary: string,
): MentorRiskSnapshot => ({
  level,
  label,
  summary,
});

const buildAction = (
  id: string,
  type: MentorActionDirective['type'],
  label: string,
  description: string,
  expectedOutcome: string,
  urgency: MentorActionDirective['urgency'],
  subject?: string,
  durationMin?: number,
): MentorActionDirective => ({
  id,
  type,
  label,
  description,
  subject,
  durationMin,
  urgency,
  expectedOutcome,
});

const resolvePrimarySubject = (input: MentorDecisionInput): string =>
  input.studyState.weakSubjects[0]
  || input.execution.nextRecommendedSession?.subject
  || input.studyState.activeSubjects[0]
  || 'Outra';

const resolveSecondarySubject = (input: MentorDecisionInput, fallback: string): string =>
  input.studyState.weakSubjects[1]
  || input.studyState.recentMistakeSubjects[0]
  || fallback;

const getKnowledgeRule = (input: MentorDecisionInput, ruleId: string, fallback: string): string =>
  input.knowledge.rules.find((rule) => rule.id === ruleId)?.guidance || fallback;

const buildMeta = (
  id: string,
  type: MentorResponseType,
  tone: MentorResponseTone,
  title: string,
  whyNow: string,
  caution: string,
  chips: string[],
): MentorPlaybookMeta => ({
  id,
  type,
  tone,
  title,
  whyNow,
  caution,
  chips,
});

const buildClassification = (
  moment: MentorMomentClassification['moment'],
  responseKind: MentorResponseKind,
  primarySubject: string,
  risk: MentorRiskSnapshot,
  reasons: string[],
): MentorMomentClassification => ({
  moment,
  responseKind,
  primarySubject,
  risk,
  reasons,
});

const finalSprintZeroedPlaybook: MentorPlaybookDefinition = {
  id: 'final_sprint_zeroed',
  match: ({ input }) => input.profile.daysToExam <= 30 && input.execution.todayMinutes === 0,
  build: ({ input, primarySubject, secondarySubject }) => {
    const risk = buildRisk(
      'high',
      'Reta final com dia zerado',
      'A prova esta proxima e hoje ainda nao houve execucao.',
    );

    const actions = [
      buildAction(
        'final-review',
        'review_block',
        `Revisar ${primarySubject} por 20 min`,
        'Fechar um bloco curto de revisao guiada antes de abrir qualquer variacao.',
        'Retomar o controle do dia sem tentar recuperar a semana inteira.',
        'today',
        primarySubject,
        20,
      ),
      buildAction(
        'final-questions',
        'question_set',
        `Resolver 8 questoes de ${primarySubject}`,
        'Transformar revisao curta em execucao pratica ainda hoje.',
        'Ganhar feedback rapido antes da prova.',
        'today',
        primarySubject,
        15,
      ),
      buildAction(
        'final-guardrail',
        'plan_adjustment',
        `Guardar ${secondarySubject} para manutencao leve`,
        'Segurar novas frentes e manter o bloco principal objetivo.',
        'Evitar dispersao no momento mais critico.',
        'this_week',
        secondarySubject,
        10,
      ),
    ];

    return {
      playbookId: 'final_sprint_zeroed',
      classification: buildClassification(
        'final_sprint',
        'next_step',
        primarySubject,
        risk,
        [
          `Faltam ${input.profile.daysToExam} dias para a prova.`,
          'Hoje ainda nao houve estudo registrado.',
        ],
      ),
      actions,
      responseMeta: buildMeta(
        'final_sprint_zeroed',
        'next_step',
        'direct',
        'Reta final pede execucao limpa',
        `Com a prova perto, revisar ${primarySubject} agora rende mais do que tentar compensar a semana inteira.`,
        getKnowledgeRule(
          input,
          'playbook-final-sprint',
          'Nao abra conteudo novo hoje. Priorize revisao e pratica curta.',
        ),
        [risk.label, `${primarySubject} agora`],
      ),
    };
  },
};

const reviewBacklogRecoveryPlaybook: MentorPlaybookDefinition = {
  id: 'review_backlog_recovery',
  match: ({ input }) =>
    input.studyState.overdueReviews > 0
    && input.execution.weeklyProgressPct < 70,
  build: ({ input, primarySubject }) => {
    const risk = buildRisk(
      input.studyState.overdueReviews >= 3 ? 'high' : 'medium',
      'Revisao acumulada com semana fraca',
      `${input.studyState.overdueReviews} revisao(oes) vencida(s) com progresso semanal em ${input.execution.weeklyProgressPct}%.`,
    );

    const actions = [
      buildAction(
        'review-backlog',
        'review_block',
        `Quitar revisao prioritaria em ${primarySubject}`,
        'Abrir primeiro a revisao vencida mais proxima da sua materia fraca.',
        'Reduzir backlog sem fragmentar a sessao.',
        'today',
        primarySubject,
        20,
      ),
      buildAction(
        'review-restart',
        'recovery_session',
        `Retomar a semana com 20 min em ${primarySubject}`,
        'Usar uma sessao curta logo depois da revisao para recolocar a semana em movimento.',
        'Sair da inercia sem prometer compensacao total.',
        'today',
        primarySubject,
        20,
      ),
      buildAction(
        'review-hold',
        'plan_adjustment',
        'Segurar novo conteudo por enquanto',
        'Priorizar consolidacao antes de expandir carga ou abrir novas frentes.',
        'Evitar que o atraso continue crescendo.',
        'this_week',
      ),
    ];

    return {
      playbookId: 'review_backlog_recovery',
      classification: buildClassification(
        'review_pressure',
        'review_intervention',
        primarySubject,
        risk,
        [
          `${input.studyState.overdueReviews} revisao(oes) passaram da janela ideal.`,
          `A meta semanal esta em ${input.execution.weeklyProgressPct}%.`,
        ],
      ),
      actions,
      responseMeta: buildMeta(
        'review_backlog_recovery',
        'review_alert',
        'direct',
        'Revisao vem antes de expandir carga',
        `Seu backlog de revisao ja esta pesando. Quitar ${primarySubject} primeiro devolve tracao sem abrir mais ruído.`,
        getKnowledgeRule(
          input,
          'product-overdue-review-priority',
          'Nao abra novo conteudo antes de reduzir a revisao vencida.',
        ),
        [risk.label, 'Consolidacao primeiro'],
      ),
    };
  },
};

const lostStartingPointPlaybook: MentorPlaybookDefinition = {
  id: 'lost_starting_point',
  match: ({ input }) =>
    input.execution.todayMinutes === 0
    && input.execution.sessionsLast7Days <= 1
    && input.execution.currentStreak === 0
    && input.execution.weeklyProgressPct < 25,
  build: ({ input, primarySubject, secondarySubject }) => {
    const risk = buildRisk(
      'high',
      'Sem tracao para comecar',
      'O aluno esta sem execucao recente e precisa de um ponto de partida simples.',
    );

    const actions = [
      buildAction(
        'direction-reset',
        'recovery_session',
        `Comecar com 15 min em ${primarySubject}`,
        'Dar um ponto de partida pequeno e objetivo para reduzir a friccao inicial.',
        'Voltar a estudar sem travar na escolha da materia.',
        'now',
        primarySubject,
        15,
      ),
      buildAction(
        'direction-feedback',
        'question_set',
        `Resolver 5 questoes de ${primarySubject}`,
        'Fechar o primeiro bloco com uma leitura rapida do que esta mais fragil.',
        'Produzir sinal concreto para o proximo ajuste.',
        'today',
        primarySubject,
        10,
      ),
      buildAction(
        'direction-guardrail',
        'review_block',
        `Revisar ${secondarySubject} por 5 min`,
        'Usar revisao leve so para sair do zero sem criar carga alta.',
        'Gerar sensacao de progresso real ainda hoje.',
        'today',
        secondarySubject,
        5,
      ),
    ];

    return {
      playbookId: 'lost_starting_point',
      classification: buildClassification(
        'behind_week',
        'session_recommendation',
        primarySubject,
        risk,
        [
          'Ha pouca execucao recente para orientar a semana.',
          'Hoje ainda nao houve estudo registrado.',
        ],
      ),
      actions,
      responseMeta: buildMeta(
        'lost_starting_point',
        'direction_reset',
        'supportive',
        'Primeiro clareza, depois volume',
        `Voce nao precisa decidir a semana inteira agora. So precisa de um inicio limpo em ${primarySubject}.`,
        getKnowledgeRule(
          input,
          'study-short-restart',
          'Nao tente compensar tudo hoje. Comece pequeno e repetivel.',
        ),
        [risk.label, 'Meta minima viavel'],
      ),
    };
  },
};

const restartAfterBreakPlaybook: MentorPlaybookDefinition = {
  id: 'restart_after_break',
  match: ({ input }) =>
    input.execution.todayMinutes === 0
    && input.execution.weeklyProgressPct < 40,
  build: ({ input, primarySubject, secondarySubject }) => {
    const risk = buildRisk(
      'high',
      'Retomada necessaria',
      'Hoje esta zerado e a semana ficou abaixo do ritmo minimo.',
    );

    const actions = [
      buildAction(
        'restart-focus',
        'recovery_session',
        `Fazer 20 min de retomada em ${primarySubject}`,
        'Iniciar com um bloco leve, viavel e sem friccao extra.',
        'Quebrar o dia zerado com uma execucao real.',
        'today',
        primarySubject,
        20,
      ),
      buildAction(
        'restart-review',
        'review_block',
        `Fechar revisao curta em ${secondarySubject}`,
        'Consolidar um segundo ponto fraco logo depois da retomada.',
        'Voltar para o estudo com sensacao de progresso concreto.',
        'today',
        secondarySubject,
        10,
      ),
      buildAction(
        'restart-plan',
        'plan_adjustment',
        'Reduzir a ambicao do dia',
        'Trocar volume ideal por meta minima executavel.',
        'Aumentar a chance de consistencia diaria.',
        'today',
      ),
    ];

    return {
      playbookId: 'restart_after_break',
      classification: buildClassification(
        'restart_needed',
        'session_recommendation',
        primarySubject,
        risk,
        [
          'Hoje ainda nao houve estudo registrado.',
          `A meta semanal esta em ${input.execution.weeklyProgressPct}%.`,
        ],
      ),
      actions,
      responseMeta: buildMeta(
        'restart_after_break',
        'recovery',
        'supportive',
        'Retomar vem antes de acelerar',
        `O dia esta zerado e a semana perdeu ritmo. A resposta certa agora e uma retomada curta em ${primarySubject}.`,
        'Feche o primeiro bloco viavel antes de pensar em aumentar carga.',
        [risk.label, `${primarySubject} primeiro`],
      ),
    };
  },
};

const subjectImbalanceShiftPlaybook: MentorPlaybookDefinition = {
  id: 'subject_imbalance_shift',
  match: ({ input, primarySubject, dominantSubject, dominantSubjectSharePct }) =>
    Boolean(dominantSubject)
    && dominantSubject !== primarySubject
    && dominantSubjectSharePct >= 55
    && input.execution.sessionsLast7Days >= 3,
  build: ({ input, primarySubject, secondarySubject, dominantSubject, dominantSubjectSharePct }) => {
    const risk = buildRisk(
      dominantSubjectSharePct >= 70 ? 'high' : 'medium',
      'Carga desequilibrada entre materias',
      `${dominantSubject} esta puxando ${dominantSubjectSharePct}% do volume recente enquanto ${primarySubject} segue fragil.`,
    );

    const actions = [
      buildAction(
        'focus-shift',
        'focus_session',
        `Virar o proximo bloco para ${primarySubject}`,
        'Mudar o foco do proximo bloco para a materia que mais precisa de alavancagem agora.',
        'Corrigir desequilibrio sem desmontar a semana.',
        'today',
        primarySubject,
        20,
      ),
      buildAction(
        'focus-cap',
        'plan_adjustment',
        `Limitar ${dominantSubject} a manutencao leve`,
        'Segurar volume extra na materia dominante para abrir espaco para o foco real.',
        'Evitar concentracao excessiva onde voce ja esta mais forte.',
        'this_week',
        dominantSubject,
        10,
      ),
      buildAction(
        'focus-review',
        'review_block',
        `Revisar ${secondarySubject} por 10 min`,
        'Fechar o ajuste protegendo o segundo ponto fraco.',
        'Equilibrar o restante da semana.',
        'this_week',
        secondarySubject,
        10,
      ),
    ];

    return {
      playbookId: 'subject_imbalance_shift',
      classification: buildClassification(
        'focus_shift',
        'plan_adjustment',
        primarySubject,
        risk,
        [
          `${dominantSubject} concentrou ${dominantSubjectSharePct}% do volume recente.`,
          `${primarySubject} segue como foco fragil da semana.`,
        ],
      ),
      actions,
      responseMeta: buildMeta(
        'subject_imbalance_shift',
        'focus_shift',
        'direct',
        'Hora de corrigir o foco',
        `${dominantSubject} ja ocupou espaco demais. Virar o proximo bloco para ${primarySubject} reequilibra a semana.`,
        getKnowledgeRule(
          input,
          'study-load-calibration',
          'Nao aumente carga bruta. So redistribua o proximo bloco para o foco certo.',
        ),
        [risk.label, `${dominantSubjectSharePct}% em ${dominantSubject}`],
      ),
    };
  },
};

const steadyProgressPlaybook: MentorPlaybookDefinition = {
  id: 'steady_progress_clear',
  match: ({ input }) =>
    input.execution.currentStreak >= 3
    && input.execution.weeklyProgressPct >= 70
    && input.execution.todayMinutes > 0,
  build: ({ input, primarySubject, secondarySubject, recommendedSession }) => {
    const risk = buildRisk(
      'low',
      'Ritmo estavel',
      'A consistencia recente esta boa e o proximo passo ja esta claro.',
    );

    const actions = [
      buildAction(
        'steady-next',
        recommendedSession?.format === 'questions' ? 'question_set' : 'focus_session',
        recommendedSession
          ? `${recommendedSession.durationMin} min em ${recommendedSession.subject}`
          : `Manter foco em ${primarySubject}`,
        recommendedSession?.reason || 'Existe clareza de proximo passo e o ritmo atual permite continuidade limpa.',
        'Sustentar a consistencia sem dispersar a semana.',
        'today',
        recommendedSession?.subject || primarySubject,
        recommendedSession?.durationMin || 25,
      ),
      buildAction(
        'steady-questions',
        'question_set',
        `Resolver 10 questoes de ${primarySubject}`,
        'Transformar o foco do dia em pratica objetiva.',
        'Ganhar leitura rapida de evolucao da materia.',
        'today',
        primarySubject,
        15,
      ),
      buildAction(
        'steady-review',
        'review_block',
        `Reservar 10 min para revisar ${secondarySubject}`,
        'Fechar o dia protegendo a consolidacao do que ainda pede repeticao.',
        'Evitar que lacunas pequenas virem atraso.',
        'this_week',
        secondarySubject,
        10,
      ),
    ];

    return {
      playbookId: 'steady_progress_clear',
      classification: buildClassification(
        'steady_progress',
        'next_step',
        primarySubject,
        risk,
        [
          `Streak atual em ${input.execution.currentStreak} dias.`,
          `A meta semanal esta em ${input.execution.weeklyProgressPct}%.`,
        ],
      ),
      actions,
      responseMeta: buildMeta(
        'steady_progress_clear',
        'steady_push',
        'supportive',
        'Continuar sem dispersar',
        `Seu ritmo esta saudavel. O proximo passo mais claro agora e manter execucao objetiva em ${actions[0]?.subject || primarySubject}.`,
        'Nao transforme um bom ritmo em sobrecarga. Mantenha o bloco principal e feche o dia.',
        [risk.label, 'Ritmo bom'],
      ),
    };
  },
};

const weakSubjectPressurePlaybook: MentorPlaybookDefinition = {
  id: 'weak_subject_pressure',
  match: () => true,
  build: ({ input, primarySubject, secondarySubject }) => {
    const risk = buildRisk(
      'medium',
      'Materia fragil pedindo atencao',
      `${primarySubject} segue como principal ponto de alavancagem.`,
    );

    const actions = [
      buildAction(
        'weak-focus',
        'focus_session',
        `Focar ${primarySubject} por 25 min`,
        'Concentrar energia onde existe maior potencial de ganho agora.',
        'Melhorar a materia que mais pressiona o resultado.',
        'today',
        primarySubject,
        25,
      ),
      buildAction(
        'weak-questions',
        'question_set',
        `Resolver 10 questoes de ${primarySubject}`,
        'Usar pratica curta para medir se o bloco virou execucao.',
        'Produzir diagnostico rapido do foco atual.',
        'today',
        primarySubject,
        15,
      ),
      buildAction(
        'weak-review',
        'review_block',
        `Revisar ${secondarySubject} por 10 min`,
        'Consolidar o segundo ponto fragil sem fragmentar demais a semana.',
        'Equilibrar o foco sem sobrecarga.',
        'this_week',
        secondarySubject,
        10,
      ),
    ];

    return {
      playbookId: 'weak_subject_pressure',
      classification: buildClassification(
        'weak_subject_pressure',
        'next_step',
        primarySubject,
        risk,
        [`${primarySubject} aparece como foco mais fragil do momento.`],
      ),
      actions,
      responseMeta: buildMeta(
        'weak_subject_pressure',
        'next_step',
        'direct',
        'Foco claro para ganhar tracao',
        `${primarySubject} segue como prioridade real. O melhor proximo passo agora e agir nela com bloco curto e pratica.`,
        'Evite abrir novas frentes antes de concluir a acao prioritaria.',
        [risk.label, `${primarySubject} prioridade`],
      ),
    };
  },
};

const PLAYBOOKS: MentorPlaybookDefinition[] = [
  finalSprintZeroedPlaybook,
  reviewBacklogRecoveryPlaybook,
  lostStartingPointPlaybook,
  restartAfterBreakPlaybook,
  subjectImbalanceShiftPlaybook,
  steadyProgressPlaybook,
  weakSubjectPressurePlaybook,
];

const buildScenarioContext = (input: MentorDecisionInput): MentorScenarioContext => {
  const primarySubject = resolvePrimarySubject(input);

  return {
    input,
    primarySubject,
    secondarySubject: resolveSecondarySubject(input, primarySubject),
    dominantSubject: input.studyState.dominantSubject,
    dominantSubjectSharePct: input.studyState.dominantSubjectSharePct,
    recommendedSession: input.execution.nextRecommendedSession,
  };
};

export const resolveMentorPlaybook = (input: MentorDecisionInput): MentorPlaybookMatch => {
  const context = buildScenarioContext(input);
  const playbook = PLAYBOOKS.find((candidate) => candidate.match(context)) || weakSubjectPressurePlaybook;
  return playbook.build(context);
};
