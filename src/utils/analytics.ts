import type {
  AdvancedEventName,
  AdvancedOperationSnapshot,
  AdvancedPriorityItem,
  AdvancedRiskEventName,
  AdvancedSnapshot,
  AdvancedWeeklyRecord,
  AdvancedWeeklyScorecard,
} from '../types';

export interface AnalyticsEvent {
  name: string;
  timestamp: string;
  userEmail?: string;
  payload?: Record<string, unknown>;
}

export interface DepartmentDecisionReasonMetrics {
  code: string;
  label: string;
  heuristicVersions: string[];
  sampleStatus: 'sufficient_sample' | 'insufficient_sample';
  operationalStatus: 'do_not_act' | 'monitor' | 'candidate_for_adjustment' | 'review_post_change';
  operationalSummary: string;
  recommended: number;
  accepted: number;
  overridden: number;
  acceptanceRate: number | null;
  overrideRate: number | null;
  recommended7d: number;
  accepted7d: number;
  overridden7d: number;
  acceptanceRate7d: number | null;
  overrideRate7d: number | null;
  recommended28d: number;
  accepted28d: number;
  overridden28d: number;
  acceptanceRate28d: number | null;
  overrideRate28d: number | null;
}

export interface DepartmentDecisionOverrideDiscipline {
  disciplineId: string;
  overrides: number;
  lastReasonCode: string | null;
  lastReasonLabel: string | null;
  heuristicVersions: string[];
}

export interface DepartmentDecisionVersionMetrics {
  version: string;
  recommended: number;
  accepted: number;
  overridden: number;
  acceptanceRate: number | null;
  overrideRate: number | null;
}

export interface DepartmentDecisionSnapshot {
  windows: {
    shortDays: number;
    mediumDays: number;
    minRecommendedSample: number;
    minDecisionSample: number;
  };
  heuristicVersions: string[];
  versions: DepartmentDecisionVersionMetrics[];
  totals: {
    recommended: number;
    accepted: number;
    overridden: number;
    acceptanceRate: number | null;
    overrideRate: number | null;
    recommended7d: number;
    accepted7d: number;
    overridden7d: number;
    acceptanceRate7d: number | null;
    overrideRate7d: number | null;
    recommended28d: number;
    accepted28d: number;
    overridden28d: number;
    acceptanceRate28d: number | null;
    overrideRate28d: number | null;
  };
  reasons: DepartmentDecisionReasonMetrics[];
  topOverriddenRecommendations: DepartmentDecisionOverrideDiscipline[];
}

export type BeginnerAnalyticsEventName =
  | 'onboarding_completed'
  | 'beginner_mission_viewed'
  | 'beginner_session_started'
  | 'beginner_session_completed'
  | 'beginner_questions_started'
  | 'beginner_questions_completed'
  | 'beginner_post_session_viewed'
  | 'beginner_next_step_clicked'
  | 'beginner_returned_next_day'
  | 'beginner_blocked_feature_clicked'
  | 'beginner_week_summary_viewed'
  | 'beginner_week_summary_completed'
  | 'beginner_dropped_at';

export type IntermediateAnalyticsEventName =
  | 'intermediate_home_viewed'
  | 'intermediate_plan_viewed'
  | 'intermediate_continue_automatic_clicked'
  | 'intermediate_adjust_light_clicked'
  | 'intermediate_method_opened'
  | 'intermediate_schedule_opened'
  | 'intermediate_questions_opened'
  | 'intermediate_recommended_tool_used'
  | 'intermediate_manual_choice_made'
  | 'intermediate_day_plan_completed'
  | 'intermediate_returned_next_day'
  | 'intermediate_tool_bounced'
  | 'intermediate_choice_abandoned'
  | 'intermediate_overload_signal';

export type AdvancedAnalyticsEventName = AdvancedEventName | AdvancedRiskEventName;

export interface BeginnerFunnelSnapshot {
  counts: {
    onboardingCompleted: number;
    missionViewed: number;
    sessionStarted: number;
    sessionCompleted: number;
    questionsStarted: number;
    questionsCompleted: number;
    postSessionViewed: number;
    nextStepClicked: number;
    returnedNextDay: number;
    blockedFeatureClicked: number;
    weekSummaryViewed: number;
    weekSummaryCompleted: number;
    droppedAt: number;
  };
  conversion: {
    onboardingToSessionStart: number | null;
    sessionStartToComplete: number | null;
    sessionCompleteToQuestionsStart: number | null;
    questionsStartToComplete: number | null;
    postSessionToNextStep: number | null;
    day2ReturnRate: number | null;
    weekSummaryViewToComplete: number | null;
  };
  diagnoses: string[];
}

export interface BeginnerPriorityItem {
  id: string;
  stage: string;
  signal: string;
  diagnosis: string;
  action: string;
  severity: 'Critica' | 'Alta' | 'Media' | 'Baixa';
  kpi: string;
  sortOrder: number;
}

export interface BeginnerOperationSnapshot {
  weeklyDecision: {
    focus: string;
    hypothesis: string;
    action: string;
    kpi: string;
  } | null;
  dontTouch: string[];
  quickContext: string | null;
}

export interface IntermediateSnapshot {
  counts: {
    homeViewed: number;
    planViewed: number;
    continueAutomaticClicked: number;
    adjustLightClicked: number;
    methodOpened: number;
    scheduleOpened: number;
    questionsOpened: number;
    recommendedToolUsed: number;
    manualChoiceMade: number;
    dayPlanCompleted: number;
    returnedNextDay: number;
    toolBounced: number;
    choiceAbandoned: number;
    overloadSignal: number;
  };
  conversion: {
    continueAutomaticRate: number | null;
    adjustLightRate: number | null;
    manualChoiceRate: number | null;
    dayPlanCompletionRate: number | null;
    recommendedToolUsageRate: number | null;
    nextDayReturnRate: number | null;
    toolBounceRate: number | null;
  };
  diagnoses: string[];
}

export interface IntermediatePriorityItem {
  id: string;
  stage: string;
  signal: string;
  diagnosis: string;
  action: string;
  severity: 'Critica' | 'Alta' | 'Media' | 'Baixa';
  kpi: string;
  sortOrder: number;
}

export interface IntermediateOperationSnapshot {
  weeklyDecision: {
    focus: string;
    hypothesis: string;
    action: string;
    kpi: string;
  } | null;
  dontTouch: string[];
  quickContext: string | null;
}

export interface GlobalPriorityItem {
  id: string;
  phase: 'beginner' | 'intermediate';
  phaseLabel: 'Iniciante' | 'Intermediario';
  stage: string;
  signal: string;
  diagnosis: string;
  action: string;
  severity: 'Critica' | 'Alta' | 'Media' | 'Baixa';
  kpi: string;
  category: 'Retencao' | 'Core Loop' | 'Autonomia' | 'Experiencia Secundaria';
  sortOrder: number;
}

export interface GlobalOperationSnapshot {
  weeklyDecision: {
    phaseLabel: 'Iniciante' | 'Intermediario';
    focus: string;
    why: string;
    action: string;
    kpi: string;
  } | null;
  dontTouch: string[];
  quickContext: string | null;
}

export interface GlobalWeeklyRecord {
  weekKey: string;
  capturedAt: string;
  phase: 'beginner' | 'intermediate';
  phaseLabel: 'Iniciante' | 'Intermediario';
  focus: string;
  action: string;
  kpi: string;
  kpiLabel: string;
  kpiValue: number | null;
  severity: 'Critica' | 'Alta' | 'Media' | 'Baixa';
}

export interface GlobalWeeklyScorecard {
  previousWeek: GlobalWeeklyRecord | null;
  currentWeek: GlobalWeeklyRecord | null;
  change: {
    status: 'Melhorou' | 'Piorou' | 'Estavel' | 'Mudou' | 'Sem historico';
    summary: string;
  };
}

const STORAGE_KEY = 'mdz_analytics_events';
const GLOBAL_WEEKLY_SCORECARD_STORAGE_KEY = 'mdz_global_weekly_scorecards';
const ADVANCED_WEEKLY_SCORECARD_STORAGE_KEY = 'mdz_advanced_weekly_scorecards';
const MAX_EVENTS = 500;
const BEGINNER_EVENT_COUNTER_KEYS = {
  onboarding_completed: 'onboardingCompleted',
  beginner_mission_viewed: 'missionViewed',
  beginner_session_started: 'sessionStarted',
  beginner_session_completed: 'sessionCompleted',
  beginner_questions_started: 'questionsStarted',
  beginner_questions_completed: 'questionsCompleted',
  beginner_post_session_viewed: 'postSessionViewed',
  beginner_next_step_clicked: 'nextStepClicked',
  beginner_returned_next_day: 'returnedNextDay',
  beginner_blocked_feature_clicked: 'blockedFeatureClicked',
  beginner_week_summary_viewed: 'weekSummaryViewed',
  beginner_week_summary_completed: 'weekSummaryCompleted',
  beginner_dropped_at: 'droppedAt',
} as const;
const INTERMEDIATE_EVENT_COUNTER_KEYS = {
  intermediate_home_viewed: 'homeViewed',
  intermediate_plan_viewed: 'planViewed',
  intermediate_continue_automatic_clicked: 'continueAutomaticClicked',
  intermediate_adjust_light_clicked: 'adjustLightClicked',
  intermediate_method_opened: 'methodOpened',
  intermediate_schedule_opened: 'scheduleOpened',
  intermediate_questions_opened: 'questionsOpened',
  intermediate_recommended_tool_used: 'recommendedToolUsed',
  intermediate_manual_choice_made: 'manualChoiceMade',
  intermediate_day_plan_completed: 'dayPlanCompleted',
  intermediate_returned_next_day: 'returnedNextDay',
  intermediate_tool_bounced: 'toolBounced',
  intermediate_choice_abandoned: 'choiceAbandoned',
  intermediate_overload_signal: 'overloadSignal',
} as const;
const ADVANCED_EVENT_COUNTER_KEYS = {
  advanced_home_viewed: 'homeViewed',
  advanced_plan_built: 'plansBuilt',
  advanced_plan_adjusted: 'plansAdjusted',
  advanced_manual_schedule_used: 'manualScheduleUsed',
  advanced_advanced_filters_used: 'advancedFiltersUsed',
  advanced_strategy_review_viewed: 'strategyReviewViewed',
  advanced_strategy_review_applied: 'strategyReviewApplied',
  advanced_mock_exam_started: 'mockExamStarted',
  advanced_mock_exam_completed: 'mockExamCompleted',
  advanced_revision_block_started: 'revisionBlockStarted',
  advanced_revision_block_completed: 'revisionBlockCompleted',
  advanced_performance_analysis_opened: 'performanceAnalysisOpened',
  advanced_study_strategy_changed: 'studyStrategyChanged',
  advanced_week_completed: 'weekCompleted',
  advanced_overplanning_signal: 'overplanningSignal',
  advanced_plan_abandoned: 'planAbandoned',
  advanced_tool_fragmentation_signal: 'toolFragmentationSignal',
  advanced_low_execution_after_planning: 'lowExecutionAfterPlanning',
} as const;

const getEvents = (): AnalyticsEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
};

const saveEvents = (events: AnalyticsEvent[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // localStorage cheio ou indisponível
  }
};

const getStoredGlobalWeeklyRecords = (): GlobalWeeklyRecord[] => {
  try {
    const raw = localStorage.getItem(GLOBAL_WEEKLY_SCORECARD_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GlobalWeeklyRecord[]) : [];
  } catch {
    return [];
  }
};

const saveGlobalWeeklyRecords = (records: GlobalWeeklyRecord[]) => {
  try {
    localStorage.setItem(
      GLOBAL_WEEKLY_SCORECARD_STORAGE_KEY,
      JSON.stringify(records.slice(-12)),
    );
  } catch {
    // localStorage cheio ou indisponivel
  }
};

const getStoredAdvancedWeeklyRecords = (): AdvancedWeeklyRecord[] => {
  try {
    const raw = localStorage.getItem(ADVANCED_WEEKLY_SCORECARD_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdvancedWeeklyRecord[]) : [];
  } catch {
    return [];
  }
};

const saveAdvancedWeeklyRecords = (records: AdvancedWeeklyRecord[]) => {
  try {
    localStorage.setItem(
      ADVANCED_WEEKLY_SCORECARD_STORAGE_KEY,
      JSON.stringify(records.slice(-12)),
    );
  } catch {
    // localStorage cheio ou indisponivel
  }
};

export const trackEvent = (
  name: string,
  payload?: Record<string, unknown>,
  options?: { userEmail?: string }
) => {
  const entry: AnalyticsEvent = {
    name,
    timestamp: new Date().toISOString(),
    userEmail: options?.userEmail,
    payload,
  };

  const events = getEvents();
  events.push(entry);
  saveEvents(events);
};

const toPercent = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? Math.round((numerator / denominator) * 100) : null;

const formatPercentSignal = (label: string, value: number | null, numerator: number, denominator: number): string => {
  if (value === null) {
    return `${label}: sem dados suficientes`;
  }

  return `${label}: ${value}% (${numerator}/${denominator})`;
};

const formatMetricValue = (kpi: string, value: number | null): string => {
  if (value === null) {
    return '--';
  }

  if (kpi === 'blocked_feature_clicks' || kpi === 'intermediate_overload_signal') {
    return `${value}`;
  }

  return `${value}%`;
};

const getWeekKey = (date = new Date()): string => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const formatAdvancedMetricValue = (value: number | null): string => (value === null ? '--' : `${value}%`);

const getReturnRateBase = (counts: BeginnerFunnelSnapshot['counts']): number =>
  counts.sessionCompleted > 0 ? counts.sessionCompleted : counts.onboardingCompleted;

const getIntermediateReturnRateBase = (counts: IntermediateSnapshot['counts']): number =>
  counts.dayPlanCompleted > 0 ? counts.dayPlanCompleted : counts.planViewed;

const getIntermediateToolOpenBase = (counts: IntermediateSnapshot['counts']): number =>
  counts.methodOpened + counts.scheduleOpened + counts.questionsOpened;

const getAdvancedPlanCreationBase = (snapshot: AdvancedSnapshot): number =>
  snapshot.plansBuilt + snapshot.plansAdjusted;

const getAdvancedExecutionBase = (snapshot: AdvancedSnapshot): number => {
  const planBase = getAdvancedPlanCreationBase(snapshot);
  return planBase > 0 ? planBase : snapshot.homeViewed;
};

const getAdvancedToolUsageBase = (snapshot: AdvancedSnapshot): number =>
  snapshot.manualScheduleUsed +
  snapshot.advancedFiltersUsed +
  snapshot.strategyReviewViewed +
  snapshot.mockExamStarted +
  snapshot.revisionBlockStarted +
  snapshot.performanceAnalysisOpened;

type AdvancedPriorityComputedItem = AdvancedPriorityItem & {
  id: string;
  signal: string;
  sortOrder: number;
};

const buildBeginnerFunnelSnapshot = (events: AnalyticsEvent[]): BeginnerFunnelSnapshot => {
  const counts: BeginnerFunnelSnapshot['counts'] = {
    onboardingCompleted: 0,
    missionViewed: 0,
    sessionStarted: 0,
    sessionCompleted: 0,
    questionsStarted: 0,
    questionsCompleted: 0,
    postSessionViewed: 0,
    nextStepClicked: 0,
    returnedNextDay: 0,
    blockedFeatureClicked: 0,
    weekSummaryViewed: 0,
    weekSummaryCompleted: 0,
    droppedAt: 0,
  };

  events.forEach((event) => {
    const key = BEGINNER_EVENT_COUNTER_KEYS[event.name as keyof typeof BEGINNER_EVENT_COUNTER_KEYS];
    if (!key) {
      return;
    }

    counts[key] += 1;
  });

  const conversion: BeginnerFunnelSnapshot['conversion'] = {
    onboardingToSessionStart: toPercent(counts.sessionStarted, counts.onboardingCompleted),
    sessionStartToComplete: toPercent(counts.sessionCompleted, counts.sessionStarted),
    sessionCompleteToQuestionsStart: toPercent(counts.questionsStarted, counts.sessionCompleted),
    questionsStartToComplete: toPercent(counts.questionsCompleted, counts.questionsStarted),
    postSessionToNextStep: toPercent(counts.nextStepClicked, counts.postSessionViewed),
    day2ReturnRate: toPercent(counts.returnedNextDay, getReturnRateBase(counts)),
    weekSummaryViewToComplete: toPercent(counts.weekSummaryCompleted, counts.weekSummaryViewed),
  };

  const diagnoses: string[] = [];

  if (counts.onboardingCompleted === 0) {
    diagnoses.push('Sem dados suficientes do modo iniciante ainda.');
  } else {
    if ((conversion.onboardingToSessionStart ?? 100) < 65) {
      diagnoses.push('Queda forte entre onboarding e inicio da sessao. Revise CTA final e clareza da primeira missao.');
    }

    if ((conversion.sessionStartToComplete ?? 100) < 70) {
      diagnoses.push('A sessao esta perdendo usuarios antes do fim. Vale revisar duracao, friccao e esforco percebido.');
    }

    if ((conversion.sessionCompleteToQuestionsStart ?? 100) < 70) {
      diagnoses.push('O pos-sessao nao esta puxando bem para questoes. O proximo passo pode estar pouco claro.');
    }

    if ((conversion.questionsStartToComplete ?? 100) < 70) {
      diagnoses.push('O fluxo de questoes esta quebrando ritmo. Revise UX, dificuldade inicial e atrito antes da primeira resposta.');
    }

    if ((conversion.postSessionToNextStep ?? 100) < 50) {
      diagnoses.push('O CTA do proximo passo esta fraco. Teste copy e destaque visual no pos-sessao.');
    }

    if (counts.returnedNextDay === 0) {
      diagnoses.push('Ainda nao houve retorno no dia seguinte registrado. Esse e o KPI principal para validar o modo iniciante.');
    }

    if (counts.blockedFeatureClicked >= Math.max(3, counts.sessionStarted)) {
      diagnoses.push('As ferramentas bloqueadas estao gerando bastante curiosidade. Bom sinal de interesse, mas monitore frustracao do modal.');
    }

    if ((conversion.weekSummaryViewToComplete ?? 100) < 80) {
      diagnoses.push('A Week Summary pode nao estar deixando a evolucao clara o bastante. Revise copy e CTA de fechamento.');
    }
  }

  return {
    counts,
    conversion,
    diagnoses,
  };
};

const buildIntermediateSnapshot = (events: AnalyticsEvent[]): IntermediateSnapshot => {
  const counts: IntermediateSnapshot['counts'] = {
    homeViewed: 0,
    planViewed: 0,
    continueAutomaticClicked: 0,
    adjustLightClicked: 0,
    methodOpened: 0,
    scheduleOpened: 0,
    questionsOpened: 0,
    recommendedToolUsed: 0,
    manualChoiceMade: 0,
    dayPlanCompleted: 0,
    returnedNextDay: 0,
    toolBounced: 0,
    choiceAbandoned: 0,
    overloadSignal: 0,
  };

  events.forEach((event) => {
    const key = INTERMEDIATE_EVENT_COUNTER_KEYS[event.name as keyof typeof INTERMEDIATE_EVENT_COUNTER_KEYS];
    if (!key) {
      return;
    }

    counts[key] += 1;
  });

  const toolOpenBase = getIntermediateToolOpenBase(counts);
  const returnRateBase = getIntermediateReturnRateBase(counts);
  const conversion: IntermediateSnapshot['conversion'] = {
    continueAutomaticRate: toPercent(counts.continueAutomaticClicked, counts.homeViewed),
    adjustLightRate: toPercent(counts.adjustLightClicked, counts.homeViewed),
    manualChoiceRate: toPercent(counts.manualChoiceMade, counts.homeViewed),
    dayPlanCompletionRate: toPercent(counts.dayPlanCompleted, counts.planViewed),
    recommendedToolUsageRate: toPercent(counts.recommendedToolUsed, counts.planViewed),
    nextDayReturnRate: toPercent(counts.returnedNextDay, returnRateBase),
    toolBounceRate: toPercent(counts.toolBounced, toolOpenBase),
  };

  const diagnoses: string[] = [];

  if (counts.homeViewed === 0) {
    diagnoses.push('Sem dados suficientes do modo intermediario ainda.');
  } else {
    if ((conversion.continueAutomaticRate ?? 100) < 45) {
      diagnoses.push('Pouca gente esta escolhendo continuar no automatico. A home pode estar oferecendo liberdade demais cedo demais.');
    }

    if ((conversion.adjustLightRate ?? 0) > (conversion.continueAutomaticRate ?? 0)) {
      diagnoses.push('Ajuste leve esta dominando sobre continuar automatico. Isso pode indicar excesso de escolha cedo demais.');
    }

    if ((conversion.dayPlanCompletionRate ?? 100) < 60) {
      diagnoses.push('O plano do dia ainda nao esta fechando bem. Revise clareza dos blocos e esforco percebido.');
    }

    if ((conversion.recommendedToolUsageRate ?? 100) < 35) {
      diagnoses.push('As ferramentas recomendadas ainda nao estao sendo usadas o suficiente para validar autonomia guiada.');
    }

    if ((conversion.toolBounceRate ?? 0) > 40) {
      diagnoses.push('Bounce alto nas ferramentas liberadas. O usuario pode estar entrando e saindo sem encontrar direcao clara.');
    }

    if ((conversion.nextDayReturnRate ?? 100) < 35) {
      diagnoses.push('O retorno no dia seguinte caiu no intermediario. Liberdade maior pode estar reduzindo direcao.');
    }

    if (counts.overloadSignal > 0) {
      diagnoses.push('Ja houve sinal de overload no intermediario. Vale monitorar excesso de escolha manual.');
    }
  }

  return {
    counts,
    conversion,
    diagnoses,
  };
};

const buildAdvancedSnapshot = (events: AnalyticsEvent[]): AdvancedSnapshot => {
  const snapshot: AdvancedSnapshot = {
    phase: 'advanced',
    homeViewed: 0,
    plansBuilt: 0,
    plansAdjusted: 0,
    manualScheduleUsed: 0,
    advancedFiltersUsed: 0,
    strategyReviewViewed: 0,
    strategyReviewApplied: 0,
    mockExamStarted: 0,
    mockExamCompleted: 0,
    revisionBlockStarted: 0,
    revisionBlockCompleted: 0,
    performanceAnalysisOpened: 0,
    studyStrategyChanged: 0,
    weekCompleted: 0,
    overplanningSignal: 0,
    planAbandoned: 0,
    toolFragmentationSignal: 0,
    lowExecutionAfterPlanning: 0,
    manualPlanRate: null,
    planExecutionRate: null,
    advancedToolCompletionRate: null,
    strategicReviewApplyRate: null,
    mockCompletionRate: null,
    weeklyConsistencyRate: null,
    planningWithoutExecutionRate: null,
    toolFragmentationRate: null,
  };

  events.forEach((event) => {
    const key = ADVANCED_EVENT_COUNTER_KEYS[event.name as keyof typeof ADVANCED_EVENT_COUNTER_KEYS];
    if (!key) {
      return;
    }

    snapshot[key] += 1;
  });

  const planCreationBase = getAdvancedPlanCreationBase(snapshot);
  const executionBase = getAdvancedExecutionBase(snapshot);
  const toolUsageBase = getAdvancedToolUsageBase(snapshot);
  const advancedToolCompletionBase =
    snapshot.strategyReviewApplied +
    snapshot.mockExamCompleted +
    snapshot.revisionBlockCompleted +
    snapshot.studyStrategyChanged;
  const impliedPlanningWithoutExecution = Math.max(planCreationBase - snapshot.weekCompleted, 0);

  snapshot.manualPlanRate = toPercent(snapshot.manualScheduleUsed, snapshot.homeViewed);
  snapshot.planExecutionRate = toPercent(snapshot.weekCompleted, executionBase);
  snapshot.advancedToolCompletionRate = toPercent(advancedToolCompletionBase, toolUsageBase);
  snapshot.strategicReviewApplyRate = toPercent(snapshot.strategyReviewApplied, snapshot.strategyReviewViewed);
  snapshot.mockCompletionRate = toPercent(snapshot.mockExamCompleted, snapshot.mockExamStarted);
  snapshot.weeklyConsistencyRate = toPercent(snapshot.weekCompleted, snapshot.homeViewed);
  snapshot.planningWithoutExecutionRate = toPercent(
    Math.max(snapshot.lowExecutionAfterPlanning + snapshot.planAbandoned, impliedPlanningWithoutExecution),
    planCreationBase,
  );
  snapshot.toolFragmentationRate = toPercent(snapshot.toolFragmentationSignal, toolUsageBase);

  return snapshot;
};

const buildDepartmentDecisionSnapshot = (events: AnalyticsEvent[]): DepartmentDecisionSnapshot => {
  const DEPARTMENT_DECISION_WINDOWS = {
    shortDays: 7,
    mediumDays: 28,
    minRecommendedSample: 20,
    minDecisionSample: 5,
    candidateOverrideRate7d: 45,
    candidateOverrideRate28d: 40,
  } as const;
  const recommendedEvents = events.filter((event) => event.name === 'department_focus_recommended');
  const acceptedEvents = events.filter((event) => event.name === 'department_focus_accepted');
  const overriddenEvents = events.filter((event) => event.name === 'department_focus_overridden');

  const readString = (value: unknown): string | null =>
    typeof value === 'string' && value.trim().length > 0 ? value : null;

  const toTimestamp = (value: string): number => {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const now = Date.now();
  const shortCutoff = now - (DEPARTMENT_DECISION_WINDOWS.shortDays * 24 * 60 * 60 * 1000);
  const mediumCutoff = now - (DEPARTMENT_DECISION_WINDOWS.mediumDays * 24 * 60 * 60 * 1000);

  const getWindowFlags = (timestamp: string) => {
    const eventTime = toTimestamp(timestamp);

    return {
      shortWindow: eventTime >= shortCutoff,
      mediumWindow: eventTime >= mediumCutoff,
    };
  };

  const reasonMap = new Map<string, {
    label: string;
    heuristicVersions: Set<string>;
    recommended: number;
    accepted: number;
    overridden: number;
    recommended7d: number;
    accepted7d: number;
    overridden7d: number;
    recommended28d: number;
    accepted28d: number;
    overridden28d: number;
  }>();
  const overriddenRecommendationMap = new Map<string, {
    overrides: number;
    lastReasonCode: string | null;
    lastReasonLabel: string | null;
    heuristicVersions: Set<string>;
  }>();
  const heuristicVersions = new Set<string>();
  const versionMap = new Map<string, { recommended: number; accepted: number; overridden: number }>();

  const ensureReason = (code: string, label: string) => {
    if (!reasonMap.has(code)) {
      reasonMap.set(code, {
        label,
        heuristicVersions: new Set<string>(),
        recommended: 0,
        accepted: 0,
        overridden: 0,
        recommended7d: 0,
        accepted7d: 0,
        overridden7d: 0,
        recommended28d: 0,
        accepted28d: 0,
        overridden28d: 0,
      });
    }

    return reasonMap.get(code)!;
  };

  const ensureVersion = (version: string) => {
    if (!versionMap.has(version)) {
      versionMap.set(version, {
        recommended: 0,
        accepted: 0,
        overridden: 0,
      });
    }

    return versionMap.get(version)!;
  };

  recommendedEvents.forEach((event) => {
    const code = readString(event.payload?.decisionReasonCode) || 'unknown';
    const label = readString(event.payload?.reason) || code;
    const version = readString(event.payload?.heuristicVersion);
    const windowFlags = getWindowFlags(event.timestamp);
    const reason = ensureReason(code, label);

    reason.recommended += 1;
    if (windowFlags.shortWindow) {
      reason.recommended7d += 1;
    }
    if (windowFlags.mediumWindow) {
      reason.recommended28d += 1;
    }
    if (version) {
      reason.heuristicVersions.add(version);
      heuristicVersions.add(version);
      ensureVersion(version).recommended += 1;
    }
  });

  acceptedEvents.forEach((event) => {
    const code = readString(event.payload?.decisionReasonCode) || 'unknown';
    const label = readString(event.payload?.reason) || code;
    const version = readString(event.payload?.heuristicVersion);
    const windowFlags = getWindowFlags(event.timestamp);
    const reason = ensureReason(code, label);

    reason.accepted += 1;
    if (windowFlags.shortWindow) {
      reason.accepted7d += 1;
    }
    if (windowFlags.mediumWindow) {
      reason.accepted28d += 1;
    }
    if (version) {
      reason.heuristicVersions.add(version);
      heuristicVersions.add(version);
      ensureVersion(version).accepted += 1;
    }
  });

  overriddenEvents.forEach((event) => {
    const code = readString(event.payload?.recommendedDecisionReasonCode) || 'unknown';
    const label = readString(event.payload?.recommendedReason) || code;
    const version = readString(event.payload?.heuristicVersion);
    const windowFlags = getWindowFlags(event.timestamp);
    const reason = ensureReason(code, label);

    reason.overridden += 1;
    if (windowFlags.shortWindow) {
      reason.overridden7d += 1;
    }
    if (windowFlags.mediumWindow) {
      reason.overridden28d += 1;
    }
    if (version) {
      reason.heuristicVersions.add(version);
      heuristicVersions.add(version);
      ensureVersion(version).overridden += 1;
    }

    const disciplineId = readString(event.payload?.recommendedDisciplineId) || 'desconhecida';
    const existing = overriddenRecommendationMap.get(disciplineId) || {
      overrides: 0,
      lastReasonCode: null,
      lastReasonLabel: null,
      heuristicVersions: new Set<string>(),
    };

    overriddenRecommendationMap.set(disciplineId, {
      overrides: existing.overrides + 1,
      lastReasonCode: code,
      lastReasonLabel: label,
      heuristicVersions: version ? new Set([...existing.heuristicVersions, version]) : existing.heuristicVersions,
    });
  });

  const reasons = Array.from(reasonMap.entries())
    .map<DepartmentDecisionReasonMetrics>(([code, metrics]) => {
      const acceptanceRate = toPercent(metrics.accepted, metrics.recommended);
      const overrideRate = toPercent(metrics.overridden, metrics.recommended);
      const acceptanceRate7d = toPercent(metrics.accepted7d, metrics.recommended7d);
      const overrideRate7d = toPercent(metrics.overridden7d, metrics.recommended7d);
      const acceptanceRate28d = toPercent(metrics.accepted28d, metrics.recommended28d);
      const overrideRate28d = toPercent(metrics.overridden28d, metrics.recommended28d);
      const sampleStatus =
        metrics.recommended28d >= DEPARTMENT_DECISION_WINDOWS.minRecommendedSample
        && metrics.accepted28d + metrics.overridden28d >= DEPARTMENT_DECISION_WINDOWS.minDecisionSample
          ? 'sufficient_sample'
          : 'insufficient_sample';
      const operationalStatus =
        metrics.heuristicVersions.size > 1
          ? 'review_post_change'
          : sampleStatus === 'insufficient_sample'
            ? 'do_not_act'
            : (overrideRate7d ?? 0) >= DEPARTMENT_DECISION_WINDOWS.candidateOverrideRate7d
                && (overrideRate28d ?? 0) >= DEPARTMENT_DECISION_WINDOWS.candidateOverrideRate28d
              ? 'candidate_for_adjustment'
              : 'monitor';
      const operationalSummary =
        operationalStatus === 'review_post_change'
          ? 'Revisar apos mudanca recente de versao antes de alterar pesos novamente.'
          : operationalStatus === 'do_not_act'
            ? 'Nao agir ainda. O volume observado ainda nao sustenta tuning.'
            : operationalStatus === 'candidate_for_adjustment'
              ? 'Candidato a ajuste: override alto de forma consistente em 7d e 28d.'
              : 'Monitorar. Ha amostra suficiente, mas o sinal ainda nao pede mudanca.';

      return {
      code,
      label: metrics.label,
      heuristicVersions: Array.from(metrics.heuristicVersions).sort(),
      sampleStatus,
      operationalStatus,
      operationalSummary,
      recommended: metrics.recommended,
      accepted: metrics.accepted,
      overridden: metrics.overridden,
      acceptanceRate,
      overrideRate,
      recommended7d: metrics.recommended7d,
      accepted7d: metrics.accepted7d,
      overridden7d: metrics.overridden7d,
      acceptanceRate7d,
      overrideRate7d,
      recommended28d: metrics.recommended28d,
      accepted28d: metrics.accepted28d,
      overridden28d: metrics.overridden28d,
      acceptanceRate28d,
      overrideRate28d,
      };
    })
    .sort((left, right) => {
      const statusOrder = {
        candidate_for_adjustment: 0,
        review_post_change: 1,
        monitor: 2,
        do_not_act: 3,
      } as const;

      if (statusOrder[left.operationalStatus] !== statusOrder[right.operationalStatus]) {
        return statusOrder[left.operationalStatus] - statusOrder[right.operationalStatus];
      }

      if (left.sampleStatus !== right.sampleStatus) {
        return left.sampleStatus === 'sufficient_sample' ? -1 : 1;
      }

      if (left.recommended28d !== right.recommended28d) {
        return right.recommended28d - left.recommended28d;
      }

      if (left.overrideRate28d !== right.overrideRate28d) {
        return (right.overrideRate28d ?? -1) - (left.overrideRate28d ?? -1);
      }

      if (left.recommended !== right.recommended) {
        return right.recommended - left.recommended;
      }

      return left.code.localeCompare(right.code);
    });

  const topOverriddenRecommendations = Array.from(overriddenRecommendationMap.entries())
    .map<DepartmentDecisionOverrideDiscipline>(([disciplineId, metrics]) => ({
      disciplineId,
      overrides: metrics.overrides,
      lastReasonCode: metrics.lastReasonCode,
      lastReasonLabel: metrics.lastReasonLabel,
      heuristicVersions: Array.from(metrics.heuristicVersions).sort(),
    }))
    .sort((left, right) => {
      if (left.overrides !== right.overrides) {
        return right.overrides - left.overrides;
      }

      return left.disciplineId.localeCompare(right.disciplineId);
    })
    .slice(0, 5);

  const versions = Array.from(versionMap.entries())
    .map<DepartmentDecisionVersionMetrics>(([version, metrics]) => ({
      version,
      recommended: metrics.recommended,
      accepted: metrics.accepted,
      overridden: metrics.overridden,
      acceptanceRate: toPercent(metrics.accepted, metrics.recommended),
      overrideRate: toPercent(metrics.overridden, metrics.recommended),
    }))
    .sort((left, right) => right.version.localeCompare(left.version));

  return {
    windows: DEPARTMENT_DECISION_WINDOWS,
    heuristicVersions: Array.from(heuristicVersions).sort(),
    versions,
    totals: {
      recommended: recommendedEvents.length,
      accepted: acceptedEvents.length,
      overridden: overriddenEvents.length,
      acceptanceRate: toPercent(acceptedEvents.length, recommendedEvents.length),
      overrideRate: toPercent(overriddenEvents.length, recommendedEvents.length),
      recommended7d: recommendedEvents.filter((event) => getWindowFlags(event.timestamp).shortWindow).length,
      accepted7d: acceptedEvents.filter((event) => getWindowFlags(event.timestamp).shortWindow).length,
      overridden7d: overriddenEvents.filter((event) => getWindowFlags(event.timestamp).shortWindow).length,
      acceptanceRate7d: toPercent(
        acceptedEvents.filter((event) => getWindowFlags(event.timestamp).shortWindow).length,
        recommendedEvents.filter((event) => getWindowFlags(event.timestamp).shortWindow).length,
      ),
      overrideRate7d: toPercent(
        overriddenEvents.filter((event) => getWindowFlags(event.timestamp).shortWindow).length,
        recommendedEvents.filter((event) => getWindowFlags(event.timestamp).shortWindow).length,
      ),
      recommended28d: recommendedEvents.filter((event) => getWindowFlags(event.timestamp).mediumWindow).length,
      accepted28d: acceptedEvents.filter((event) => getWindowFlags(event.timestamp).mediumWindow).length,
      overridden28d: overriddenEvents.filter((event) => getWindowFlags(event.timestamp).mediumWindow).length,
      acceptanceRate28d: toPercent(
        acceptedEvents.filter((event) => getWindowFlags(event.timestamp).mediumWindow).length,
        recommendedEvents.filter((event) => getWindowFlags(event.timestamp).mediumWindow).length,
      ),
      overrideRate28d: toPercent(
        overriddenEvents.filter((event) => getWindowFlags(event.timestamp).mediumWindow).length,
        recommendedEvents.filter((event) => getWindowFlags(event.timestamp).mediumWindow).length,
      ),
    },
    reasons,
    topOverriddenRecommendations,
  };
};

const buildAdvancedPriorityTable = (snapshot: AdvancedSnapshot): AdvancedPriorityComputedItem[] => {
  const planCreationBase = getAdvancedPlanCreationBase(snapshot);
  const executionBase = getAdvancedExecutionBase(snapshot);
  const toolUsageBase = getAdvancedToolUsageBase(snapshot);

  const items: AdvancedPriorityComputedItem[] = [
    {
      id: 'planning_without_execution',
      stage: 'Planejamento sem execucao',
      problem: formatPercentSignal(
        'Planejamento sem execucao',
        snapshot.planningWithoutExecutionRate,
        Math.max(snapshot.lowExecutionAfterPlanning + snapshot.planAbandoned, Math.max(planCreationBase - snapshot.weekCompleted, 0)),
        planCreationBase,
      ),
      signal: formatPercentSignal(
        'Planejamento sem execucao',
        snapshot.planningWithoutExecutionRate,
        Math.max(snapshot.lowExecutionAfterPlanning + snapshot.planAbandoned, Math.max(planCreationBase - snapshot.weekCompleted, 0)),
        planCreationBase,
      ),
      diagnosis:
        snapshot.planningWithoutExecutionRate !== null && snapshot.planningWithoutExecutionRate >= 40
          ? 'O usuario esta montando estrategia demais sem converter isso em execucao real.'
          : 'O nivel de planejamento sem execucao esta controlado.',
      recommendedAction: 'Simplificar o plano estrategico e reforcar um plano do dia mais acionavel antes de abrir novos ajustes.',
      severity:
        snapshot.planningWithoutExecutionRate === null
          ? 'Baixa'
          : snapshot.planningWithoutExecutionRate >= 50
            ? 'Critica'
            : snapshot.planningWithoutExecutionRate >= 35
              ? 'Alta'
              : snapshot.planningWithoutExecutionRate >= 20
                ? 'Media'
                : 'Baixa',
      kpi: 'planningWithoutExecutionRate',
      category: 'Execucao',
      sortOrder: 1,
    },
    {
      id: 'weekly_consistency',
      stage: 'Consistencia semanal',
      problem: formatPercentSignal(
        'Consistencia semanal',
        snapshot.weeklyConsistencyRate,
        snapshot.weekCompleted,
        snapshot.homeViewed,
      ),
      signal: formatPercentSignal(
        'Consistencia semanal',
        snapshot.weeklyConsistencyRate,
        snapshot.weekCompleted,
        snapshot.homeViewed,
      ),
      diagnosis:
        snapshot.weeklyConsistencyRate !== null && snapshot.weeklyConsistencyRate < 65
          ? 'A liberdade maior esta enfraquecendo a regularidade da execucao semanal.'
          : 'A consistencia semanal esta sustentando bem o avancado.',
      recommendedAction: 'Reduzir friccao estrategica e trazer a semana para um roteiro mais claro de execucao.',
      severity:
        snapshot.weeklyConsistencyRate === null
          ? 'Baixa'
          : snapshot.weeklyConsistencyRate < 50
            ? 'Critica'
            : snapshot.weeklyConsistencyRate < 65
              ? 'Alta'
              : snapshot.weeklyConsistencyRate < 75
                ? 'Media'
                : 'Baixa',
      kpi: 'weeklyConsistencyRate',
      category: 'Retencao',
      sortOrder: 2,
    },
    {
      id: 'plan_execution',
      stage: 'Execucao do plano',
      problem: formatPercentSignal(
        'Execucao do plano',
        snapshot.planExecutionRate,
        snapshot.weekCompleted,
        executionBase,
      ),
      signal: formatPercentSignal(
        'Execucao do plano',
        snapshot.planExecutionRate,
        snapshot.weekCompleted,
        executionBase,
      ),
      diagnosis:
        snapshot.planExecutionRate !== null && snapshot.planExecutionRate < 60
          ? 'O usuario tem controle suficiente para planejar, mas ainda nao para fechar o que planejou.'
          : 'A execucao do plano esta em faixa aceitavel para controle estrategico.',
      recommendedAction: 'Enxugar o plano e destacar a proxima acao mais valiosa em vez de expor muitas rotas simultaneas.',
      severity:
        snapshot.planExecutionRate === null
          ? 'Baixa'
          : snapshot.planExecutionRate < 45
            ? 'Critica'
            : snapshot.planExecutionRate < 60
              ? 'Alta'
              : snapshot.planExecutionRate < 72
                ? 'Media'
                : 'Baixa',
      kpi: 'planExecutionRate',
      category: 'Core Loop',
      sortOrder: 3,
    },
    {
      id: 'tool_fragmentation',
      stage: 'Fragmentacao por ferramentas',
      problem: formatPercentSignal(
        'Fragmentacao por ferramentas',
        snapshot.toolFragmentationRate,
        snapshot.toolFragmentationSignal,
        toolUsageBase,
      ),
      signal: formatPercentSignal(
        'Fragmentacao por ferramentas',
        snapshot.toolFragmentationRate,
        snapshot.toolFragmentationSignal,
        toolUsageBase,
      ),
      diagnosis:
        snapshot.toolFragmentationRate !== null && snapshot.toolFragmentationRate >= 35
          ? 'O stack avancado esta gerando dispersao e troca excessiva entre ferramentas.'
          : 'O uso de ferramentas avancadas esta relativamente coeso.',
      recommendedAction: 'Sugerir um fluxo recomendado entre analise, revisao e simulado antes de liberar navegacao paralela.',
      severity:
        snapshot.toolFragmentationRate === null
          ? 'Baixa'
          : snapshot.toolFragmentationRate >= 45
            ? 'Alta'
            : snapshot.toolFragmentationRate >= 35
              ? 'Alta'
              : snapshot.toolFragmentationRate >= 20
                ? 'Media'
                : 'Baixa',
      kpi: 'toolFragmentationRate',
      category: 'Execucao',
      sortOrder: 4,
    },
    {
      id: 'strategic_review_apply',
      stage: 'Aplicacao da revisao estrategica',
      problem: formatPercentSignal(
        'Aplicacao da revisao estrategica',
        snapshot.strategicReviewApplyRate,
        snapshot.strategyReviewApplied,
        snapshot.strategyReviewViewed,
      ),
      signal: formatPercentSignal(
        'Aplicacao da revisao estrategica',
        snapshot.strategicReviewApplyRate,
        snapshot.strategyReviewApplied,
        snapshot.strategyReviewViewed,
      ),
      diagnosis:
        snapshot.strategicReviewApplyRate !== null && snapshot.strategicReviewApplyRate < 35
          ? 'A analise esta sendo vista, mas ainda nao esta virando ajuste estrategico concreto.'
          : 'A revisao estrategica esta conseguindo virar acao em faixa saudavel.',
      recommendedAction: 'Conectar a leitura de desempenho a um bloco de revisao acionavel e direto.',
      severity:
        snapshot.strategicReviewApplyRate === null
          ? 'Baixa'
          : snapshot.strategicReviewApplyRate < 20
            ? 'Alta'
            : snapshot.strategicReviewApplyRate < 35
              ? 'Media'
              : 'Baixa',
      kpi: 'strategicReviewApplyRate',
      category: 'Estrategia',
      sortOrder: 5,
    },
    {
      id: 'mock_completion',
      stage: 'Conclusao de simulados',
      problem: formatPercentSignal(
        'Conclusao de simulados',
        snapshot.mockCompletionRate,
        snapshot.mockExamCompleted,
        snapshot.mockExamStarted,
      ),
      signal: formatPercentSignal(
        'Conclusao de simulados',
        snapshot.mockCompletionRate,
        snapshot.mockExamCompleted,
        snapshot.mockExamStarted,
      ),
      diagnosis:
        snapshot.mockCompletionRate !== null && snapshot.mockCompletionRate < 45
          ? 'O simulado esta entrando como intencao, mas nao esta fechando como pratica completa.'
          : 'Os simulados estao sustentando bem a rotina estrategica.',
      recommendedAction: 'Rever tamanho, contexto de entrada e expectativa do simulado para reduzir abandono.',
      severity:
        snapshot.mockCompletionRate === null
          ? 'Baixa'
          : snapshot.mockCompletionRate < 30
            ? 'Alta'
            : snapshot.mockCompletionRate < 45
              ? 'Alta'
              : snapshot.mockCompletionRate < 60
                ? 'Media'
                : 'Baixa',
      kpi: 'mockCompletionRate',
      category: 'Estrategia',
      sortOrder: 6,
    },
  ];

  const severityWeight: Record<AdvancedPriorityComputedItem['severity'], number> = {
    Critica: 0,
    Alta: 1,
    Media: 2,
    Baixa: 3,
  };

  return items.sort((left, right) => {
    const severityDiff = severityWeight[left.severity] - severityWeight[right.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    return left.sortOrder - right.sortOrder;
  });
};

const buildAdvancedOperationSnapshot = (
  snapshot: AdvancedSnapshot,
  priorities: AdvancedPriorityComputedItem[],
): AdvancedOperationSnapshot => {
  const topPriority = priorities.find((item) => item.severity !== 'Baixa') || priorities[0] || null;
  const dontChangeNow = [
    'Nao liberar mais ferramentas avancadas agora.',
    'Nao adicionar novas camadas de planejamento manual.',
    'Nao transformar analise em dashboard sem acao.',
    'Nao abrir UI pesada antes de estabilizar execucao e consistencia.',
  ];

  if (!topPriority || topPriority.severity === 'Baixa') {
    return {
      weeklyDecision: null,
      quickContext: null,
      dontChangeNow,
    };
  }

  const quickContextMap: Record<string, string | null> = {
    planning_without_execution:
      snapshot.planningWithoutExecutionRate !== null
        ? `Sinal principal: planejamento sem execucao em ${snapshot.planningWithoutExecutionRate}%.`
        : null,
    weekly_consistency:
      snapshot.weeklyConsistencyRate !== null
        ? `Sinal principal: consistencia semanal em ${snapshot.weeklyConsistencyRate}%.`
        : null,
    plan_execution:
      snapshot.planExecutionRate !== null
        ? `Sinal principal: execucao do plano em ${snapshot.planExecutionRate}%.`
        : null,
    tool_fragmentation:
      snapshot.toolFragmentationRate !== null
        ? `Sinal principal: fragmentacao por ferramentas em ${snapshot.toolFragmentationRate}%.`
        : null,
    strategic_review_apply:
      snapshot.strategicReviewApplyRate !== null
        ? `Sinal principal: revisao estrategica aplicada em ${snapshot.strategicReviewApplyRate}%.`
        : null,
    mock_completion:
      snapshot.mockCompletionRate !== null
        ? `Sinal principal: conclusao de simulados em ${snapshot.mockCompletionRate}%.`
        : null,
  };

  return {
    weeklyDecision: {
      focus: topPriority.stage,
      hypothesis: topPriority.diagnosis,
      action: topPriority.recommendedAction,
      kpi: topPriority.kpi,
    },
    quickContext: quickContextMap[topPriority.id] || topPriority.signal,
    dontChangeNow,
  };
};

const getAdvancedKpiValue = (snapshot: AdvancedSnapshot, kpi: string): number | null => {
  const kpiMap: Record<string, number | null> = {
    planExecutionRate: snapshot.planExecutionRate,
    weeklyConsistencyRate: snapshot.weeklyConsistencyRate,
    planningWithoutExecutionRate: snapshot.planningWithoutExecutionRate,
    toolFragmentationRate: snapshot.toolFragmentationRate,
    strategicReviewApplyRate: snapshot.strategicReviewApplyRate,
    mockCompletionRate: snapshot.mockCompletionRate,
  };

  return kpiMap[kpi] ?? null;
};

const isLowerBetterAdvancedKpi = (kpi: string): boolean =>
  kpi === 'planningWithoutExecutionRate' || kpi === 'toolFragmentationRate';

const createAdvancedWeeklyRecord = (
  priority: AdvancedPriorityComputedItem,
  snapshot: AdvancedSnapshot,
): AdvancedWeeklyRecord => ({
  weekId: getWeekKey(),
  focus: priority.stage,
  kpi: priority.kpi,
  value: getAdvancedKpiValue(snapshot, priority.kpi),
  severity: priority.severity,
});

const buildAdvancedWeeklyScorecard = (
  snapshot: AdvancedSnapshot,
  priorities: AdvancedPriorityComputedItem[],
): AdvancedWeeklyScorecard => {
  const focusPriority = priorities.find((item) => item.severity !== 'Baixa') || priorities[0] || null;

  if (!focusPriority) {
    return {
      previousWeek: null,
      currentWeek: null,
      change: 'estavel',
      summary: 'Ainda nao ha dados suficientes para registrar foco semanal do avancado.',
    };
  }

  const currentRecord = createAdvancedWeeklyRecord(focusPriority, snapshot);
  const currentWeekId = currentRecord.weekId;
  const existingRecords = getStoredAdvancedWeeklyRecords().sort((left, right) => left.weekId.localeCompare(right.weekId));
  const currentWeekIndex = existingRecords.findIndex((record) => record.weekId === currentWeekId);

  if (currentWeekIndex >= 0) {
    existingRecords[currentWeekIndex] = currentRecord;
  } else {
    existingRecords.push(currentRecord);
  }

  saveAdvancedWeeklyRecords(existingRecords);

  const previousWeek =
    existingRecords
      .filter((record) => record.weekId !== currentWeekId)
      .sort((left, right) => right.weekId.localeCompare(left.weekId))[0] || null;

  if (!previousWeek) {
    return {
      previousWeek: null,
      currentWeek: currentRecord,
      change: 'estavel',
      summary: `Primeira semana registrada no avancado: foco atual em ${currentRecord.focus}.`,
    };
  }

  if (previousWeek.kpi === currentRecord.kpi && previousWeek.value !== null && currentRecord.value !== null) {
    const delta = currentRecord.value - previousWeek.value;
    const improved = isLowerBetterAdvancedKpi(currentRecord.kpi) ? delta < 0 : delta > 0;
    const worsened = isLowerBetterAdvancedKpi(currentRecord.kpi) ? delta > 0 : delta < 0;

    if (delta === 0) {
      return {
        previousWeek,
        currentWeek: currentRecord,
        change: 'estavel',
        summary:
          previousWeek.focus === currentRecord.focus &&
          (currentRecord.severity === 'Critica' || currentRecord.severity === 'Alta')
            ? `${currentRecord.focus} continua ${currentRecord.severity.toLowerCase()} pela segunda semana.`
            : `O KPI ${currentRecord.kpi} ficou estavel em ${formatAdvancedMetricValue(currentRecord.value)}.`,
      };
    }

    return {
      previousWeek,
      currentWeek: currentRecord,
      change: improved ? 'melhorou' : worsened ? 'piorou' : 'mudou_o_problema',
      summary: `O KPI ${currentRecord.kpi} foi de ${formatAdvancedMetricValue(previousWeek.value)} para ${formatAdvancedMetricValue(currentRecord.value)}.`,
    };
  }

  return {
    previousWeek,
    currentWeek: currentRecord,
    change: 'mudou_o_problema',
    summary: `A prioridade do avancado mudou de ${previousWeek.focus} para ${currentRecord.focus}.`,
  };
};

const buildIntermediatePriorityTable = (snapshot: IntermediateSnapshot): IntermediatePriorityItem[] => {
  const { counts, conversion } = snapshot;
  const toolOpenBase = getIntermediateToolOpenBase(counts);
  const returnRateBase = getIntermediateReturnRateBase(counts);
  const autonomyTooLoose =
    (conversion.continueAutomaticRate !== null && conversion.continueAutomaticRate < 40) ||
    (conversion.toolBounceRate !== null && conversion.toolBounceRate > 40);
  const toolDistracting =
    (conversion.recommendedToolUsageRate ?? 0) >= 45 && (conversion.dayPlanCompletionRate ?? 100) < 60;

  const items: IntermediatePriorityItem[] = [
    {
      id: 'continue_automatic',
      stage: 'Continuar automatico',
      signal: formatPercentSignal(
        'Continuar automatico',
        conversion.continueAutomaticRate,
        counts.continueAutomaticClicked,
        counts.homeViewed,
      ),
      diagnosis:
        autonomyTooLoose
          ? 'A liberdade pode estar chegando cedo demais e desviando o usuario do plano principal.'
          : 'O automatico ainda esta sustentando a direcao principal do intermediario.',
      action: 'Reforcar o caminho recomendado na home e reduzir o destaque das escolhas paralelas.',
      severity:
        conversion.continueAutomaticRate === null
          ? 'Baixa'
          : conversion.continueAutomaticRate < 25
            ? 'Critica'
            : conversion.continueAutomaticRate < 40
              ? 'Alta'
              : 'Media',
      kpi: 'continue_automatic_rate',
      sortOrder: 1,
    },
    {
      id: 'day_plan_completion',
      stage: 'Plano do dia concluido',
      signal: formatPercentSignal(
        'Plano do dia concluido',
        conversion.dayPlanCompletionRate,
        counts.dayPlanCompleted,
        counts.planViewed,
      ),
      diagnosis:
        conversion.dayPlanCompletionRate !== null && conversion.dayPlanCompletionRate < 60
          ? 'O plano do dia ainda nao esta fechando bem e pode estar pesado ou pouco claro.'
          : 'O plano do dia esta convertendo dentro do esperado para autonomia guiada.',
      action: 'Simplificar os blocos do plano, reforcar sequencia recomendada e reduzir esforco percebido.',
      severity:
        conversion.dayPlanCompletionRate === null
          ? 'Baixa'
          : conversion.dayPlanCompletionRate < 45
            ? 'Critica'
            : conversion.dayPlanCompletionRate < 60
              ? 'Alta'
              : 'Media',
      kpi: 'day_plan_completion_rate',
      sortOrder: 2,
    },
    {
      id: 'recommended_tool_usage',
      stage: 'Uso de ferramenta recomendada',
      signal: formatPercentSignal(
        'Uso de ferramenta recomendada',
        conversion.recommendedToolUsageRate,
        counts.recommendedToolUsed,
        counts.planViewed,
      ),
      diagnosis:
        toolDistracting
          ? 'As ferramentas estao chamando atencao, mas estao distraindo mais do que ajudando o fechamento do plano.'
          : (conversion.recommendedToolUsageRate ?? 100) < 35
            ? 'As ferramentas recomendadas ainda nao provaram valor suficiente dentro da autonomia guiada.'
            : 'O uso de ferramentas recomendadas esta em faixa saudavel.',
      action:
        toolDistracting
          ? 'Reforcar contexto de uso antes da ferramenta e puxar o usuario de volta para o plano principal.'
          : 'Ajustar copy e posicionamento das recomendacoes para conectar melhor ferramenta e resultado esperado.',
      severity:
        toolDistracting
          ? 'Alta'
          : conversion.recommendedToolUsageRate === null
            ? 'Baixa'
            : conversion.recommendedToolUsageRate < 20
              ? 'Alta'
              : conversion.recommendedToolUsageRate < 35
                ? 'Media'
                : 'Baixa',
      kpi: 'recommended_tool_usage_rate',
      sortOrder: 3,
    },
    {
      id: 'tool_bounce',
      stage: 'Bounce de ferramenta',
      signal: formatPercentSignal(
        'Bounce de ferramenta',
        conversion.toolBounceRate,
        counts.toolBounced,
        toolOpenBase,
      ),
      diagnosis:
        conversion.toolBounceRate !== null && conversion.toolBounceRate > 40
          ? 'O usuario esta abrindo ferramentas sem encontrar direcao clara ou sem concluir uma acao util.'
          : 'O bounce atual das ferramentas esta em faixa controlada.',
      action: 'Melhorar orientacao de entrada nas ferramentas e deixar a primeira acao mais obvia.',
      severity:
        conversion.toolBounceRate === null
          ? 'Baixa'
          : conversion.toolBounceRate > 55
            ? 'Critica'
            : conversion.toolBounceRate > 40
              ? 'Alta'
              : conversion.toolBounceRate > 25
                ? 'Media'
                : 'Baixa',
      kpi: 'tool_bounce_rate',
      sortOrder: 4,
    },
    {
      id: 'next_day_return',
      stage: 'Retorno no dia seguinte',
      signal: formatPercentSignal(
        'Retorno no dia seguinte',
        conversion.nextDayReturnRate,
        counts.returnedNextDay,
        returnRateBase,
      ),
      diagnosis:
        conversion.nextDayReturnRate !== null && conversion.nextDayReturnRate < 35
          ? 'O intermediario pode estar pesado demais ou com liberdade sem continuidade clara.'
          : 'A retencao do intermediario esta em faixa aceitavel para a fase atual.',
      action: 'Reforcar continuidade do plano, valor do proximo dia e sensacao de progresso apos cada bloco.',
      severity:
        conversion.nextDayReturnRate === null
          ? 'Baixa'
          : conversion.nextDayReturnRate < 20
            ? 'Critica'
            : conversion.nextDayReturnRate < 35
              ? 'Alta'
              : 'Media',
      kpi: 'next_day_return_rate',
      sortOrder: 5,
    },
    {
      id: 'manual_choice_balance',
      stage: 'Equilibrio de escolha manual',
      signal: formatPercentSignal(
        'Escolha manual',
        conversion.manualChoiceRate,
        counts.manualChoiceMade,
        counts.homeViewed,
      ),
      diagnosis:
        (conversion.adjustLightRate ?? 0) > (conversion.continueAutomaticRate ?? 0)
          ? 'Ajuste leve esta dominando cedo demais sobre o caminho automatico.'
          : conversion.adjustLightRate !== null &&
              conversion.adjustLightRate >= 20 &&
              (conversion.dayPlanCompletionRate ?? 0) >= 60
            ? 'Existe autonomia guiada saudavel: ha ajuste leve sem perda forte de conclusao.'
            : 'A escolha manual esta em faixa neutra e ainda precisa de mais volume para leitura forte.',
      action: 'Manter o ajuste leve como opcao secundaria e evitar abrir mais niveis de configuracao agora.',
      severity:
        conversion.adjustLightRate === null
          ? 'Baixa'
          : (conversion.adjustLightRate ?? 0) > (conversion.continueAutomaticRate ?? 0)
            ? 'Media'
            : 'Baixa',
      kpi: 'manual_choice_rate',
      sortOrder: 6,
    },
    {
      id: 'overload_signal',
      stage: 'Sinal de overload',
      signal: counts.overloadSignal > 0 ? `Overload registrado: ${counts.overloadSignal}` : 'Overload registrado: nenhum',
      diagnosis:
        counts.overloadSignal > 0
          ? 'Ja houve combinacao de sinais de excesso de escolha no intermediario.'
          : 'Nao ha sinal forte de overload no snapshot atual.',
      action: 'Segurar novas escolhas manuais e reforcar o plano recomendado ate a navegacao estabilizar.',
      severity: counts.overloadSignal >= 2 ? 'Alta' : counts.overloadSignal === 1 ? 'Media' : 'Baixa',
      kpi: 'intermediate_overload_signal',
      sortOrder: 7,
    },
  ];

  const severityWeight: Record<IntermediatePriorityItem['severity'], number> = {
    Critica: 0,
    Alta: 1,
    Media: 2,
    Baixa: 3,
  };

  return items.sort((left, right) => {
    const severityDiff = severityWeight[left.severity] - severityWeight[right.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    return left.sortOrder - right.sortOrder;
  });
};

const buildBeginnerPriorityTable = (snapshot: BeginnerFunnelSnapshot): BeginnerPriorityItem[] => {
  const { counts, conversion } = snapshot;
  const returnRateBase = getReturnRateBase(counts);

  const items: BeginnerPriorityItem[] = [
    {
      id: 'day2_return',
      stage: 'Retorno no Dia 2',
      signal: formatPercentSignal('Retorno no Dia 2', conversion.day2ReturnRate, counts.returnedNextDay, returnRateBase),
      diagnosis:
        conversion.day2ReturnRate !== null && conversion.day2ReturnRate < 35
          ? 'O produto ainda nao deixou continuidade e progresso fortes o suficiente para criar habito.'
          : 'A retencao inicial esta em faixa aceitavel, mas ainda merece acompanhamento continuo.',
      action: 'Melhorar copy de retorno, deixar a proxima missao mais clara e reforcar a sensacao de evolucao apos a primeira sessao.',
      severity:
        conversion.day2ReturnRate === null || conversion.day2ReturnRate < 20
          ? 'Critica'
          : conversion.day2ReturnRate < 35
            ? 'Alta'
            : 'Media',
      kpi: 'day2_return_rate',
      sortOrder: 1,
    },
    {
      id: 'session_completion',
      stage: 'Sessao iniciada -> concluida',
      signal: formatPercentSignal('Conclusao da sessao', conversion.sessionStartToComplete, counts.sessionCompleted, counts.sessionStarted),
      diagnosis:
        conversion.sessionStartToComplete !== null && conversion.sessionStartToComplete < 70
          ? 'A sessao inicial pode estar longa, cansativa ou pouco clara para quem acabou de entrar.'
          : 'A sessao principal esta sustentando bem o fluxo atual.',
      action: 'Reduzir carga inicial, reforcar checkpoint visual e deixar o fluxo da sessao ainda mais obvio.',
      severity:
        conversion.sessionStartToComplete === null
          ? 'Baixa'
          : conversion.sessionStartToComplete < 55
            ? 'Critica'
            : conversion.sessionStartToComplete < 70
              ? 'Alta'
              : 'Media',
      kpi: 'session_completion_rate',
      sortOrder: 2,
    },
    {
      id: 'questions_completion',
      stage: 'Questoes iniciadas -> concluidas',
      signal: formatPercentSignal('Conclusao das questoes', conversion.questionsStartToComplete, counts.questionsCompleted, counts.questionsStarted),
      diagnosis:
        conversion.questionsStartToComplete !== null && conversion.questionsStartToComplete < 70
          ? 'O bloco de questoes pode estar com dificuldade alta, UX cansativa ou volume excessivo.'
          : 'O fluxo de questoes esta convertendo dentro do esperado.',
      action: 'Revisar quantidade de perguntas, dificuldade da primeira leva e feedback por questao.',
      severity:
        conversion.questionsStartToComplete === null
          ? 'Baixa'
          : conversion.questionsStartToComplete < 55
            ? 'Critica'
            : conversion.questionsStartToComplete < 70
              ? 'Alta'
              : 'Media',
      kpi: 'questions_completion_rate',
      sortOrder: 3,
    },
    {
      id: 'onboarding_to_session',
      stage: 'Onboarding -> primeira sessao',
      signal: formatPercentSignal('Inicio da primeira sessao', conversion.onboardingToSessionStart, counts.sessionStarted, counts.onboardingCompleted),
      diagnosis:
        conversion.onboardingToSessionStart !== null && conversion.onboardingToSessionStart < 65
          ? 'A home ou a primeira missao ainda nao estao claras o bastante, ou o CTA principal esta competindo com outras opcoes.'
          : 'A transicao do onboarding para a acao principal esta relativamente clara.',
      action: 'Simplificar o hero, reforcar um CTA dominante e reduzir competicao visual na entrada.',
      severity:
        conversion.onboardingToSessionStart === null
          ? 'Baixa'
          : conversion.onboardingToSessionStart < 50
            ? 'Alta'
            : conversion.onboardingToSessionStart < 65
              ? 'Media'
              : 'Baixa',
      kpi: 'session_started_rate',
      sortOrder: 4,
    },
    {
      id: 'session_to_questions',
      stage: 'Sessao concluida -> questoes iniciadas',
      signal: formatPercentSignal('Entrada em questoes', conversion.sessionCompleteToQuestionsStart, counts.questionsStarted, counts.sessionCompleted),
      diagnosis:
        conversion.sessionCompleteToQuestionsStart !== null && conversion.sessionCompleteToQuestionsStart < 70
          ? 'A passagem entre estudo e pratica esta fraca ou pouco automatica.'
          : 'A transicao entre sessao e pratica esta funcionando de forma saudavel.',
      action: 'Deixar a passagem para questoes mais automatica ou reforcar o CTA de pratica logo apos a sessao.',
      severity:
        conversion.sessionCompleteToQuestionsStart === null
          ? 'Baixa'
          : conversion.sessionCompleteToQuestionsStart < 55
            ? 'Alta'
            : conversion.sessionCompleteToQuestionsStart < 70
              ? 'Media'
              : 'Baixa',
      kpi: 'questions_start_rate',
      sortOrder: 5,
    },
    {
      id: 'post_session_next_step',
      stage: 'Pos-sessao -> proximo passo',
      signal: formatPercentSignal('Clique no proximo passo', conversion.postSessionToNextStep, counts.nextStepClicked, counts.postSessionViewed),
      diagnosis:
        conversion.postSessionToNextStep !== null && conversion.postSessionToNextStep < 50
          ? 'O CTA final pode estar fraco ou a continuidade nao esta evidente o suficiente.'
          : 'O pos-sessao esta incentivando continuidade em faixa razoavel.',
      action: 'Reforcar o texto de continuidade, destacar o proximo dia e reduzir ambiguidade no modal final.',
      severity:
        conversion.postSessionToNextStep === null
          ? 'Baixa'
          : conversion.postSessionToNextStep < 35
            ? 'Alta'
            : conversion.postSessionToNextStep < 50
              ? 'Media'
              : 'Baixa',
      kpi: 'next_step_click_rate',
      sortOrder: 6,
    },
    {
      id: 'blocked_feature',
      stage: 'Bloqueio de ferramentas',
      signal:
        counts.blockedFeatureClicked > 0
          ? `Bloqueios acionados: ${counts.blockedFeatureClicked}`
          : 'Bloqueios acionados: baixo ou inexistente',
      diagnosis:
        counts.blockedFeatureClicked >= Math.max(3, counts.sessionStarted)
          ? 'Existe curiosidade alta pelas areas bloqueadas. Isso e bom, mas pode virar frustracao se a missao atual nao estiver forte.'
          : 'O bloqueio esta em faixa controlada e nao parece competir demais com o fluxo principal.',
      action: 'Melhorar explicacao do bloqueio e reforcar por que a missao atual vem antes.',
      severity: counts.blockedFeatureClicked >= Math.max(3, counts.sessionStarted) ? 'Media' : 'Baixa',
      kpi: 'blocked_feature_clicks',
      sortOrder: 7,
    },
    {
      id: 'week_summary',
      stage: 'Week Summary',
      signal: formatPercentSignal('Conclusao da Week Summary', conversion.weekSummaryViewToComplete, counts.weekSummaryCompleted, counts.weekSummaryViewed),
      diagnosis:
        conversion.weekSummaryViewToComplete !== null && conversion.weekSummaryViewToComplete < 80
          ? 'O resumo pode nao estar comunicando progresso e desbloqueio com impacto suficiente.'
          : 'A Week Summary esta conseguindo fechar a percepcao de evolucao.',
      action: 'Melhorar copy, destaque do desbloqueio e CTA de transicao para o proximo nivel.',
      severity:
        conversion.weekSummaryViewToComplete === null
          ? 'Baixa'
          : conversion.weekSummaryViewToComplete < 60
            ? 'Media'
            : conversion.weekSummaryViewToComplete < 80
              ? 'Baixa'
              : 'Baixa',
      kpi: 'week_summary_completion_rate',
      sortOrder: 8,
    },
  ];

  const severityWeight: Record<BeginnerPriorityItem['severity'], number> = {
    Critica: 0,
    Alta: 1,
    Media: 2,
    Baixa: 3,
  };

  return items.sort((left, right) => {
    const severityDiff = severityWeight[left.severity] - severityWeight[right.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    return left.sortOrder - right.sortOrder;
  });
};

const buildBeginnerOperationSnapshot = (
  snapshot: BeginnerFunnelSnapshot,
  priorities: BeginnerPriorityItem[],
): BeginnerOperationSnapshot => {
  const topPriority = priorities[0] || null;
  const dontTouch = [
    'Nao mexer em conteudo novo.',
    'Nao abrir o intermediario ainda.',
    'Nao adicionar novas telas.',
    'Nao refatorar a arquitetura agora.',
  ];

  if (!topPriority || topPriority.severity === 'Baixa') {
    return {
      weeklyDecision: null,
      dontTouch,
      quickContext: null,
    };
  }

  const quickContextMap: Record<string, string | null> = {
    day2_return:
      snapshot.conversion.day2ReturnRate !== null
        ? `Principal alerta do funil: Retorno no Dia 2 em ${snapshot.conversion.day2ReturnRate}%.`
        : null,
    session_completion:
      snapshot.conversion.sessionStartToComplete !== null
        ? `Principal queda do funil: Sessao iniciada -> concluida em ${snapshot.conversion.sessionStartToComplete}%.`
        : null,
    questions_completion:
      snapshot.conversion.questionsStartToComplete !== null
        ? `Principal queda do funil: Questoes iniciadas -> concluidas em ${snapshot.conversion.questionsStartToComplete}%.`
        : null,
    onboarding_to_session:
      snapshot.conversion.onboardingToSessionStart !== null
        ? `Principal alerta do funil: Onboarding -> primeira sessao em ${snapshot.conversion.onboardingToSessionStart}%.`
        : null,
    session_to_questions:
      snapshot.conversion.sessionCompleteToQuestionsStart !== null
        ? `Principal queda do funil: Sessao concluida -> questoes iniciadas em ${snapshot.conversion.sessionCompleteToQuestionsStart}%.`
        : null,
    post_session_next_step:
      snapshot.conversion.postSessionToNextStep !== null
        ? `Principal queda do funil: Pos-sessao -> proximo passo em ${snapshot.conversion.postSessionToNextStep}%.`
        : null,
    blocked_feature:
      snapshot.counts.blockedFeatureClicked > 0
        ? `Sinal de tensao atual: ${snapshot.counts.blockedFeatureClicked} cliques em areas bloqueadas.`
        : null,
    week_summary:
      snapshot.conversion.weekSummaryViewToComplete !== null
        ? `Sinal atual: Week Summary concluida em ${snapshot.conversion.weekSummaryViewToComplete}%.`
        : null,
  };

  return {
    weeklyDecision: {
      focus: topPriority.stage,
      hypothesis: topPriority.diagnosis,
      action: topPriority.action,
      kpi: topPriority.kpi,
    },
    dontTouch,
    quickContext: quickContextMap[topPriority.id] || null,
  };
};

const buildIntermediateOperationSnapshot = (
  snapshot: IntermediateSnapshot,
  priorities: IntermediatePriorityItem[],
): IntermediateOperationSnapshot => {
  const topPriority = priorities[0] || null;
  const dontTouch = [
    'Nao liberar novas ferramentas agora.',
    'Nao abrir o modo avancado.',
    'Nao adicionar mais escolhas manuais na home.',
    'Nao refatorar toda a experiencia do intermediario de uma vez.',
  ];

  if (!topPriority || topPriority.severity === 'Baixa') {
    return {
      weeklyDecision: null,
      dontTouch,
      quickContext: null,
    };
  }

  const quickContextMap: Record<string, string | null> = {
    continue_automatic:
      snapshot.conversion.continueAutomaticRate !== null
        ? `Sinal principal: continuar automatico em ${snapshot.conversion.continueAutomaticRate}%.`
        : null,
    day_plan_completion:
      snapshot.conversion.dayPlanCompletionRate !== null
        ? `Sinal principal: plano do dia concluido em ${snapshot.conversion.dayPlanCompletionRate}%.`
        : null,
    recommended_tool_usage:
      snapshot.conversion.recommendedToolUsageRate !== null
        ? `Sinal principal: uso de ferramenta recomendada em ${snapshot.conversion.recommendedToolUsageRate}%.`
        : null,
    tool_bounce:
      snapshot.conversion.toolBounceRate !== null
        ? `Principal tensao atual: bounce de ferramenta em ${snapshot.conversion.toolBounceRate}%.`
        : null,
    next_day_return:
      snapshot.conversion.nextDayReturnRate !== null
        ? `Sinal principal: retorno no dia seguinte em ${snapshot.conversion.nextDayReturnRate}%.`
        : null,
    manual_choice_balance:
      snapshot.conversion.manualChoiceRate !== null
        ? `Leitura atual: escolha manual em ${snapshot.conversion.manualChoiceRate}%.`
        : null,
    overload_signal:
      snapshot.counts.overloadSignal > 0
        ? `Alerta atual: ${snapshot.counts.overloadSignal} sinal(is) de overload no intermediario.`
        : null,
  };

  return {
    weeklyDecision: {
      focus: topPriority.stage,
      hypothesis: topPriority.diagnosis,
      action: topPriority.action,
      kpi: topPriority.kpi,
    },
    dontTouch,
    quickContext: quickContextMap[topPriority.id] || null,
  };
};

const getGlobalPriorityCategory = (phase: GlobalPriorityItem['phase'], kpi: string): GlobalPriorityItem['category'] => {
  if (kpi === 'day2_return_rate' || kpi === 'next_day_return_rate') {
    return 'Retencao';
  }

  if (
    kpi === 'session_completion_rate' ||
    kpi === 'questions_completion_rate' ||
    kpi === 'session_started_rate' ||
    kpi === 'questions_start_rate' ||
    kpi === 'next_step_click_rate' ||
    kpi === 'day_plan_completion_rate'
  ) {
    return 'Core Loop';
  }

  if (
    phase === 'intermediate' &&
    (kpi === 'continue_automatic_rate' ||
      kpi === 'recommended_tool_usage_rate' ||
      kpi === 'tool_bounce_rate' ||
      kpi === 'manual_choice_rate' ||
      kpi === 'intermediate_overload_signal')
  ) {
    return 'Autonomia';
  }

  return 'Experiencia Secundaria';
};

const buildGlobalPriorityTable = (
  beginnerPriorities: BeginnerPriorityItem[],
  intermediatePriorities: IntermediatePriorityItem[],
): GlobalPriorityItem[] => {
  const normalizedBeginner: GlobalPriorityItem[] = beginnerPriorities.map((item) => ({
    ...item,
    id: `beginner:${item.id}`,
    phase: 'beginner',
    phaseLabel: 'Iniciante',
    category: getGlobalPriorityCategory('beginner', item.kpi),
  }));

  const normalizedIntermediate: GlobalPriorityItem[] = intermediatePriorities.map((item) => ({
    ...item,
    id: `intermediate:${item.id}`,
    phase: 'intermediate',
    phaseLabel: 'Intermediario',
    category: getGlobalPriorityCategory('intermediate', item.kpi),
  }));

  const severityWeight: Record<GlobalPriorityItem['severity'], number> = {
    Critica: 0,
    Alta: 1,
    Media: 2,
    Baixa: 3,
  };
  const phaseWeight: Record<GlobalPriorityItem['phase'], number> = {
    beginner: 0,
    intermediate: 1,
  };
  const categoryWeight: Record<GlobalPriorityItem['category'], number> = {
    Retencao: 0,
    'Core Loop': 1,
    Autonomia: 2,
    'Experiencia Secundaria': 3,
  };

  return [...normalizedBeginner, ...normalizedIntermediate].sort((left, right) => {
    const severityDiff = severityWeight[left.severity] - severityWeight[right.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    const phaseDiff = phaseWeight[left.phase] - phaseWeight[right.phase];
    if (phaseDiff !== 0) {
      return phaseDiff;
    }

    const categoryDiff = categoryWeight[left.category] - categoryWeight[right.category];
    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    return left.sortOrder - right.sortOrder;
  });
};

const buildGlobalOperationSnapshot = (priorities: GlobalPriorityItem[]): GlobalOperationSnapshot => {
  const topPriority = priorities.find((item) => item.severity !== 'Baixa') || null;

  if (!topPriority) {
    return {
      weeklyDecision: null,
      dontTouch: [
        'Nao abrir novas frentes sem sinal real de problema.',
        'Nao otimizar o intermediario se o iniciante estiver estavel.',
        'Nao criar conteudo novo so para preencher roadmap.',
      ],
      quickContext: null,
    };
  }

  const dontTouch =
    topPriority.phase === 'beginner'
      ? [
          'Ignorar ajustes secundarios do intermediario nesta semana.',
          'Nao criar conteudo novo antes de estabilizar a base do funil.',
          'Nao abrir modo avancado ou novas telas agora.',
        ]
      : [
          'Nao refatorar o iniciante se ele estiver estavel.',
          'Nao abrir mais ferramentas ou escolhas manuais no intermediario.',
          'Nao iniciar o avancado antes de estabilizar autonomia guiada.',
        ];

  return {
    weeklyDecision: {
      phaseLabel: topPriority.phaseLabel,
      focus: topPriority.stage,
      why: topPriority.diagnosis,
      action: topPriority.action,
      kpi: topPriority.kpi,
    },
    dontTouch,
    quickContext: `Maior prioridade atual: ${topPriority.phaseLabel} -> ${topPriority.stage}. ${topPriority.signal}`,
  };
};

const getGlobalKpiLabel = (kpi: string): string => {
  const labels: Record<string, string> = {
    day2_return_rate: 'Retorno no Dia 2',
    next_day_return_rate: 'Retorno no dia seguinte',
    session_completion_rate: 'Conclusao da sessao',
    questions_completion_rate: 'Conclusao das questoes',
    session_started_rate: 'Inicio da primeira sessao',
    questions_start_rate: 'Entrada em questoes',
    next_step_click_rate: 'Clique no proximo passo',
    blocked_feature_clicks: 'Clique em bloqueios',
    week_summary_completion_rate: 'Conclusao da Week Summary',
    continue_automatic_rate: 'Continuar automatico',
    day_plan_completion_rate: 'Plano do dia concluido',
    recommended_tool_usage_rate: 'Uso de ferramenta recomendada',
    tool_bounce_rate: 'Bounce de ferramenta',
    manual_choice_rate: 'Escolha manual',
    intermediate_overload_signal: 'Sinal de overload',
  };

  return labels[kpi] || kpi;
};

const getGlobalKpiValue = (
  kpi: string,
  beginnerSnapshot: BeginnerFunnelSnapshot,
  intermediateSnapshot: IntermediateSnapshot,
): number | null => {
  const beginnerMap: Record<string, number | null> = {
    day2_return_rate: beginnerSnapshot.conversion.day2ReturnRate,
    session_completion_rate: beginnerSnapshot.conversion.sessionStartToComplete,
    questions_completion_rate: beginnerSnapshot.conversion.questionsStartToComplete,
    session_started_rate: beginnerSnapshot.conversion.onboardingToSessionStart,
    questions_start_rate: beginnerSnapshot.conversion.sessionCompleteToQuestionsStart,
    next_step_click_rate: beginnerSnapshot.conversion.postSessionToNextStep,
    blocked_feature_clicks: beginnerSnapshot.counts.blockedFeatureClicked,
    week_summary_completion_rate: beginnerSnapshot.conversion.weekSummaryViewToComplete,
  };

  const intermediateMap: Record<string, number | null> = {
    next_day_return_rate: intermediateSnapshot.conversion.nextDayReturnRate,
    continue_automatic_rate: intermediateSnapshot.conversion.continueAutomaticRate,
    day_plan_completion_rate: intermediateSnapshot.conversion.dayPlanCompletionRate,
    recommended_tool_usage_rate: intermediateSnapshot.conversion.recommendedToolUsageRate,
    tool_bounce_rate: intermediateSnapshot.conversion.toolBounceRate,
    manual_choice_rate: intermediateSnapshot.conversion.manualChoiceRate,
    intermediate_overload_signal: intermediateSnapshot.counts.overloadSignal,
  };

  return beginnerMap[kpi] ?? intermediateMap[kpi] ?? null;
};

const isLowerBetterGlobalKpi = (kpi: string): boolean =>
  kpi === 'tool_bounce_rate' || kpi === 'blocked_feature_clicks' || kpi === 'intermediate_overload_signal';

const createGlobalWeeklyRecord = (
  priority: GlobalPriorityItem,
  beginnerSnapshot: BeginnerFunnelSnapshot,
  intermediateSnapshot: IntermediateSnapshot,
): GlobalWeeklyRecord => ({
  weekKey: getWeekKey(),
  capturedAt: new Date().toISOString(),
  phase: priority.phase,
  phaseLabel: priority.phaseLabel,
  focus: priority.stage,
  action: priority.action,
  kpi: priority.kpi,
  kpiLabel: getGlobalKpiLabel(priority.kpi),
  kpiValue: getGlobalKpiValue(priority.kpi, beginnerSnapshot, intermediateSnapshot),
  severity: priority.severity,
});

const buildGlobalWeeklyScorecard = (
  priorities: GlobalPriorityItem[],
  beginnerSnapshot: BeginnerFunnelSnapshot,
  intermediateSnapshot: IntermediateSnapshot,
): GlobalWeeklyScorecard => {
  const focusPriority = priorities.find((item) => item.severity !== 'Baixa') || priorities[0] || null;

  if (!focusPriority) {
    return {
      previousWeek: null,
      currentWeek: null,
      change: {
        status: 'Sem historico',
        summary: 'Ainda nao ha dados suficientes para registrar um foco semanal do produto.',
      },
    };
  }

  const currentWeekKey = getWeekKey();
  const currentRecord = createGlobalWeeklyRecord(focusPriority, beginnerSnapshot, intermediateSnapshot);
  const existingRecords = getStoredGlobalWeeklyRecords().sort((left, right) => left.weekKey.localeCompare(right.weekKey));
  const currentWeekIndex = existingRecords.findIndex((record) => record.weekKey === currentWeekKey);

  if (currentWeekIndex >= 0) {
    existingRecords[currentWeekIndex] = currentRecord;
  } else {
    existingRecords.push(currentRecord);
  }

  saveGlobalWeeklyRecords(existingRecords);

  const previousWeek = existingRecords
    .filter((record) => record.weekKey !== currentWeekKey)
    .sort((left, right) => right.weekKey.localeCompare(left.weekKey))[0] || null;

  if (!previousWeek) {
    return {
      previousWeek: null,
      currentWeek: currentRecord,
      change: {
        status: 'Sem historico',
        summary: `Primeira semana registrada: foco atual em ${currentRecord.focus}.`,
      },
    };
  }

  if (previousWeek.kpi === currentRecord.kpi && previousWeek.kpiValue !== null && currentRecord.kpiValue !== null) {
    const delta = currentRecord.kpiValue - previousWeek.kpiValue;
    const improved = isLowerBetterGlobalKpi(currentRecord.kpi) ? delta < 0 : delta > 0;
    const worsened = isLowerBetterGlobalKpi(currentRecord.kpi) ? delta > 0 : delta < 0;

    if (delta === 0) {
      const repeatedHighSeverity =
        previousWeek.focus === currentRecord.focus &&
        (currentRecord.severity === 'Critica' || currentRecord.severity === 'Alta');

      return {
        previousWeek,
        currentWeek: currentRecord,
        change: {
          status: 'Estavel',
          summary: repeatedHighSeverity
            ? `${currentRecord.focus} continua ${currentRecord.severity.toLowerCase()} pela segunda semana.`
            : `${currentRecord.kpiLabel} ficou estavel em ${formatMetricValue(currentRecord.kpi, currentRecord.kpiValue)}.`,
        },
      };
    }

    return {
      previousWeek,
      currentWeek: currentRecord,
      change: {
        status: improved ? 'Melhorou' : worsened ? 'Piorou' : 'Mudou',
        summary: `${currentRecord.kpiLabel} ${improved ? 'foi de' : worsened ? 'foi de' : 'mudou de'} ${formatMetricValue(currentRecord.kpi, previousWeek.kpiValue)} para ${formatMetricValue(currentRecord.kpi, currentRecord.kpiValue)}.`,
      },
    };
  }

  return {
    previousWeek,
    currentWeek: currentRecord,
    change: {
      status: 'Mudou',
      summary: `A prioridade mudou de ${previousWeek.focus} para ${currentRecord.focus}.`,
    },
  };
};

export const analytics = {
  trackEvent,
  trackBeginnerEvent: (
    name: BeginnerAnalyticsEventName,
    payload?: Record<string, unknown>,
    options?: { userEmail?: string }
  ) => trackEvent(name, payload, options),
  trackIntermediateEvent: (
    name: IntermediateAnalyticsEventName,
    payload?: Record<string, unknown>,
    options?: { userEmail?: string }
  ) => trackEvent(name, payload, options),
  trackAdvancedEvent: (
    name: AdvancedAnalyticsEventName,
    payload?: Record<string, unknown>,
    options?: { userEmail?: string }
  ) => trackEvent(name, payload, options),
  getEvents,
  getBeginnerFunnelSnapshot: () => buildBeginnerFunnelSnapshot(getEvents()),
  getBeginnerPriorityTable: () => buildBeginnerPriorityTable(buildBeginnerFunnelSnapshot(getEvents())),
  getBeginnerOperationSnapshot: () => {
    const snapshot = buildBeginnerFunnelSnapshot(getEvents());
    const priorities = buildBeginnerPriorityTable(snapshot);
    return buildBeginnerOperationSnapshot(snapshot, priorities);
  },
  getIntermediateSnapshot: () => buildIntermediateSnapshot(getEvents()),
  getIntermediatePriorityTable: () => buildIntermediatePriorityTable(buildIntermediateSnapshot(getEvents())),
  getIntermediateOperationSnapshot: () => {
    const snapshot = buildIntermediateSnapshot(getEvents());
    const priorities = buildIntermediatePriorityTable(snapshot);
    return buildIntermediateOperationSnapshot(snapshot, priorities);
  },
  getAdvancedSnapshot: () => buildAdvancedSnapshot(getEvents()),
  getAdvancedPriorityTable: () =>
    buildAdvancedPriorityTable(buildAdvancedSnapshot(getEvents())).map(({ id: _id, signal: _signal, sortOrder: _sortOrder, ...item }) => item),
  getAdvancedOperationSnapshot: () => {
    const snapshot = buildAdvancedSnapshot(getEvents());
    const priorities = buildAdvancedPriorityTable(snapshot);
    return buildAdvancedOperationSnapshot(snapshot, priorities);
  },
  getDepartmentDecisionSnapshot: () => buildDepartmentDecisionSnapshot(getEvents()),
  getAdvancedWeeklyScorecard: () => {
    const snapshot = buildAdvancedSnapshot(getEvents());
    const priorities = buildAdvancedPriorityTable(snapshot);
    return buildAdvancedWeeklyScorecard(snapshot, priorities);
  },
  getGlobalPriorityTable: () => {
    const beginnerSnapshot = buildBeginnerFunnelSnapshot(getEvents());
    const intermediateSnapshot = buildIntermediateSnapshot(getEvents());
    const beginnerPriorities = buildBeginnerPriorityTable(beginnerSnapshot);
    const intermediatePriorities = buildIntermediatePriorityTable(intermediateSnapshot);
    return buildGlobalPriorityTable(beginnerPriorities, intermediatePriorities);
  },
  getGlobalOperationSnapshot: () => {
    const beginnerSnapshot = buildBeginnerFunnelSnapshot(getEvents());
    const intermediateSnapshot = buildIntermediateSnapshot(getEvents());
    const beginnerPriorities = buildBeginnerPriorityTable(beginnerSnapshot);
    const intermediatePriorities = buildIntermediatePriorityTable(intermediateSnapshot);
    const priorities = buildGlobalPriorityTable(beginnerPriorities, intermediatePriorities);
    return buildGlobalOperationSnapshot(priorities);
  },
  getGlobalWeeklyScorecard: () => {
    const beginnerSnapshot = buildBeginnerFunnelSnapshot(getEvents());
    const intermediateSnapshot = buildIntermediateSnapshot(getEvents());
    const beginnerPriorities = buildBeginnerPriorityTable(beginnerSnapshot);
    const intermediatePriorities = buildIntermediatePriorityTable(intermediateSnapshot);
    const priorities = buildGlobalPriorityTable(beginnerPriorities, intermediatePriorities);
    return buildGlobalWeeklyScorecard(priorities, beginnerSnapshot, intermediateSnapshot);
  },
  clearEvents: () => localStorage.removeItem(STORAGE_KEY),
};
