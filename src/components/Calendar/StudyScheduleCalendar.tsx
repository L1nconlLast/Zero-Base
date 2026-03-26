import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ModalidadeSelect from './ModalidadeSelect';
import DisciplinaSelect from './DisciplinaSelect';
import CronogramaHeader from './CronogramaHeader';
import CronogramaSummary from './CronogramaSummary';
import WeeklyGrid from './WeeklyGrid';
import TodayScheduleStatus from './TodayScheduleStatus';
import TodayExecutionCard from './TodayExecutionCard';
import DayPlanEditorModal from './DayPlanEditorModal';
import {
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  StickyNote,
  Sparkles,
  AlertCircle,
  Star,
  PauseCircle,
  Repeat2,
  Check,
  X,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';
import type {
  MateriaTipo,
  ScheduleEntry,
  StudyContextForToday,
  Weekday,
  WeeklyStudySchedule,
} from '../../types';
import { MATERIAS_CONFIG } from '../../types';
import { useStudySchedule } from '../../hooks/useStudySchedule';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { saasPlanningService } from '../../services/saasPlanning.service';
import {
  autoDistributeSubjects,
  buildStudyContextForToday,
  createDefaultWeeklyStudySchedule,
  getActiveDaysCount,
  getPaceCopy,
  getSuggestedAdjustment,
  getTodayCompletedSessions,
  getPlannedSubjectsCount,
  getRecentPaceState,
  resolveScheduledStudyFocus,
  getWeeklyPlanConfidenceState,
  getWeeklyCompletedSessions,
  getWeekdayFromDate,
  sanitizeWeeklyStudySchedule,
  toggleWeeklyDayAvailability,
  updateWeeklyDayPlan,
} from '../../services/studySchedule.service';
import {
  adjustPlanWithAi,
  createDefaultSmartProfile,
  generateBasePlan,
  type GeneratedPlanItem,
  type AiAdjustmentOutput,
  type SmartScheduleProfile,
} from '../../utils/smartScheduleEngine.ts';
import {
  getSuggestedContentPathBySubjectLabel,
  getSuggestedNextTopicAligned,
  getSuggestedTopicCopy,
} from '../../utils/contentTree';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEK_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const GRID_WEEK_DAYS = [
  { key: 1, label: 'SEG' },
  { key: 2, label: 'TER' },
  { key: 3, label: 'QUA' },
  { key: 4, label: 'QUI' },
  { key: 5, label: 'SEX' },
] as const;

const toDateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateInputValue = (value?: string | null): string => {
  if (!value) return '';
  if (DATE_INPUT_PATTERN.test(value)) return value;

  const brDateMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDateMatch) {
    const [, day, month, year] = brDateMatch;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return toDateStr(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const sanitizeSmartProfile = (profile: SmartScheduleProfile): SmartScheduleProfile => {
  const fallback = createDefaultSmartProfile();
  const validStudyStyle: SmartScheduleProfile['studyStyle'][] = ['teoria_questoes', 'questoes', 'pomodoro_25_5'];

  return {
    ...profile,
    examDate: normalizeDateInputValue(profile.examDate),
    hoursPerDay: Math.max(1, Math.min(10, Number(profile.hoursPerDay) || fallback.hoursPerDay)),
    desiredScore: Number(profile.desiredScore) || fallback.desiredScore,
    availableWeekDays: Array.isArray(profile.availableWeekDays) && profile.availableWeekDays.length > 0
      ? profile.availableWeekDays
      : fallback.availableWeekDays,
    studyStyle: validStudyStyle.includes(profile.studyStyle)
      ? profile.studyStyle
      : fallback.studyStyle,
  };
};

const getStudyTypeLabel = (studyType?: ScheduleEntry['studyType']): string => {
  if (studyType === 'teoria_questoes') return 'Teoria + Questões';
  if (studyType === 'questoes') return 'Questões';
  if (studyType === 'revisao') return 'Revisão';
  if (studyType === 'simulado') return 'Simulado';
  return 'Estudo';
};

const getWeekStart = (date: Date): Date => {
  const base = new Date(date);
  base.setHours(12, 0, 0, 0);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
  return base;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

interface StudyScheduleCalendarProps {
  userId?: string | null;
  weeklySchedule?: WeeklyStudySchedule;
  onChangeWeeklySchedule?: (schedule: WeeklyStudySchedule) => void;
  studyContextForToday?: StudyContextForToday;
  officialTodayActionCard?: {
    status: 'loading';
    title: string;
    description: string;
  } | {
    status: 'error';
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
  } | {
    status: 'empty';
    title: string;
    description: string;
    supportingText?: string;
    actionLabel: string;
    onAction: () => void;
  } | {
    status: 'ready';
    title: string;
    discipline: string;
    topic: string;
    reason: string;
    estimatedDurationMinutes: number;
    sessionTypeLabel: string;
    progressLabel?: string;
    supportingText?: string;
    ctaLabel: string;
    busy?: boolean;
    onAction: () => void;
  };
  weeklyCompletedSessions?: number;
  todayCompletedSessions?: number;
  completedWeekdays?: Partial<Record<Weekday, boolean>>;
  requestedEditDay?: Weekday | null;
  requestedEditNonce?: number;
}

interface EditableWeeklyRow {
  time: string;
  cells: string[];
}

const StudyScheduleCalendar: React.FC<StudyScheduleCalendarProps> = ({
  userId,
  weeklySchedule,
  onChangeWeeklySchedule,
  studyContextForToday,
  officialTodayActionCard,
  weeklyCompletedSessions,
  todayCompletedSessions,
  completedWeekdays,
  requestedEditDay,
  requestedEditNonce,
}) => {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const userScope = userId || 'default';
  const profileStorageKey = `smartScheduleProfile_${userScope}`;
  const autoGenerateKey = `smartScheduleAutoGenerate_${userScope}`;
  const weeklyScheduleStorageKey = `weeklyStudySchedule_${userScope}`;
  const initialSmartProfile = useMemo(() => createDefaultSmartProfile(), []);
  const defaultWeeklySchedule = useMemo(() => createDefaultWeeklyStudySchedule(), []);
  const [localWeeklySchedule, setLocalWeeklySchedule] = useLocalStorage<WeeklyStudySchedule>(
    weeklyScheduleStorageKey,
    defaultWeeklySchedule,
  );
  // Estados para o calendário
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  // Estados para selects
  const [modalidade, setModalidade] = useState<'enem' | 'concurso' | null>('enem');
  const [disciplina, setDisciplina] = useState<string | null>(null);
  // Estados para formulário
  const [formNote, setFormNote] = useState<string>('');
  const [weakTopicInput, setWeakTopicInput] = useState('Funções');
  const [missedDaysInput, setMissedDaysInput] = useState(0);
  const [hoursNowInput, setHoursNowInput] = useState(2);
  const [isPomodoroHelpOpen, setIsPomodoroHelpOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<Weekday | null>(null);
  const [swapSubjectInput, setSwapSubjectInput] = useState('Matemática');
  const smartProfileSectionRef = useRef<HTMLDivElement | null>(null);
  const weeklyGridSectionRef = useRef<HTMLDivElement | null>(null);
  const [smartProfile, setSmartProfile] = useLocalStorage<SmartScheduleProfile>(
    profileStorageKey,
    initialSmartProfile,
  );
  const {
    entries,
    scheduledDates,
    addEntry,
    updateEntry,
    removeEntry,
    toggleDone,
    applyAdaptiveSchedule,
    getEntriesForDate,
  } = useStudySchedule(userId);

  useEffect(() => {
    const sanitized = sanitizeWeeklyStudySchedule(localWeeklySchedule);
    if (JSON.stringify(sanitized) !== JSON.stringify(localWeeklySchedule)) {
      setLocalWeeklySchedule(sanitized);
    }
  }, [localWeeklySchedule, setLocalWeeklySchedule]);

  const effectiveWeeklySchedule = useMemo(
    () => sanitizeWeeklyStudySchedule(weeklySchedule ?? localWeeklySchedule),
    [localWeeklySchedule, weeklySchedule],
  );

  const handleWeeklyScheduleChange = useCallback(
    (nextSchedule: WeeklyStudySchedule) => {
      if (onChangeWeeklySchedule) {
        onChangeWeeklySchedule(nextSchedule);
        return;
      }

      setLocalWeeklySchedule(nextSchedule);
    },
    [onChangeWeeklySchedule, setLocalWeeklySchedule],
  );

  const effectiveStudyContextForToday = useMemo(
    () => studyContextForToday ?? buildStudyContextForToday(effectiveWeeklySchedule, today),
    [effectiveWeeklySchedule, studyContextForToday, today],
  );
  const todayEntries = useMemo(() => getEntriesForDate(todayStr), [getEntriesForDate, todayStr]);
  const officialTodayScheduleStatus = useMemo(() => {
    if (!officialTodayActionCard || officialTodayActionCard.status !== 'ready') {
      return null;
    }

    return resolveScheduledStudyFocus(entries, {
      subject: officialTodayActionCard.discipline,
      topic: officialTodayActionCard.topic,
      date: today,
    });
  }, [entries, officialTodayActionCard, today]);

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) || null;

  useEffect(() => {
    if (!requestedEditDay) {
      return;
    }

    setEditingDay(requestedEditDay);
  }, [requestedEditDay, requestedEditNonce]);

  useEffect(() => {
    if (!officialTodayActionCard || officialTodayActionCard.status !== 'ready') {
      return;
    }

    if (effectiveStudyContextForToday.state.type !== 'planned') {
      return;
    }

    if (officialTodayScheduleStatus?.matchedEntrySource === 'today') {
      return;
    }

    const todayAlreadyHasSyncedFocus = todayEntries.some((entry) => {
      const normalizedSubject = String(entry.subject || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
      const normalizedTopic = String(entry.topic || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

      return entry.date === todayStr
        && normalizedSubject === String(officialTodayActionCard.discipline || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
        && (!normalizedTopic || normalizedTopic === String(officialTodayActionCard.topic || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim());
    });

    if (todayAlreadyHasSyncedFocus) {
      return;
    }

    addEntry(todayStr, officialTodayActionCard.discipline, 'Bloco oficial sincronizado com o cronograma de hoje.', {
      topic: officialTodayActionCard.topic,
      studyType: 'questoes',
      status: 'pendente',
      source: 'motor',
      priority: 'alta',
      aiReason: officialTodayActionCard.reason,
    });
  }, [
    addEntry,
    effectiveStudyContextForToday.state,
    officialTodayActionCard,
    officialTodayScheduleStatus?.matchedEntrySource,
    todayEntries,
    todayStr,
  ]);

  useEffect(() => {
    setSmartProfile((current: SmartScheduleProfile) => {
      const sanitized = sanitizeSmartProfile(current);
      if (JSON.stringify(sanitized) === JSON.stringify(current)) {
        return current;
      }
      return sanitized;
    });
  }, [setSmartProfile]);

  // já declarado acima

  const disciplinas = useMemo<Record<'enem' | 'concurso', { id: string; label: string }[]>>(() => ({
    enem: [
      { id: 'port', label: 'Português' },
      { id: 'lit', label: 'Literatura' },
      { id: 'red', label: 'Redação' },
      { id: 'ing', label: 'Inglês' },
      { id: 'esp', label: 'Espanhol' },
      { id: 'art', label: 'Artes' },
      { id: 'edf', label: 'Educação Física' },
      { id: 'hist', label: 'História' },
      { id: 'geo', label: 'Geografia' },
      { id: 'fil', label: 'Filosofia' },
      { id: 'soc', label: 'Sociologia' },
      { id: 'fis', label: 'Física' },
      { id: 'qui', label: 'Química' },
      { id: 'bio', label: 'Biologia' },
      { id: 'mat', label: 'Matemática' },
    ],
    concurso: [
      { id: 'port', label: 'Português' },
      { id: 'raci', label: 'Raciocínio Lógico' },
      { id: 'info', label: 'Informática' },
      { id: 'admPub', label: 'Administração Pública' },
      { id: 'atual', label: 'Atualidades' },
      { id: 'dirConst', label: 'Direito Constitucional' },
      { id: 'dirAdm', label: 'Direito Administrativo' },
      { id: 'dirPen', label: 'Direito Penal' },
      { id: 'dirProcPen', label: 'Direito Processual Penal' },
      { id: 'dirCivil', label: 'Direito Civil' },
      { id: 'dirProcCivil', label: 'Direito Processual Civil' },
      { id: 'dirTrib', label: 'Direito Tributário' },
      { id: 'dirTrab', label: 'Direito do Trabalho' },
      { id: 'cont', label: 'Contabilidade' },
      { id: 'contPub', label: 'Contabilidade Pública' },
      { id: 'adm', label: 'Administração Geral' },
      { id: 'gestPes', label: 'Gestão de Pessoas' },
      { id: 'arquiv', label: 'Arquivologia' },
    ],
  }), []);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const selectedEntries = selectedDate ? getEntriesForDate(selectedDate) : [];

  const handleAdd = () => {
    if (!selectedDate || !disciplina) return;
    const selectedDisciplineLabel = modalidade
      ? disciplinas[modalidade].find((item) => item.id === disciplina)?.label
      : null;

    addEntry(selectedDate, selectedDisciplineLabel || disciplina, formNote, {
      source: 'manual',
      priority: 'normal',
      status: 'pendente',
    });
    setFormNote('');
  };

  const handleGenerateBaseSchedule = useCallback(() => {
    const horizonDays = 30;
    const generated = generateBasePlan(smartProfile, todayStr, horizonDays);

    if (userId) {
      void saasPlanningService
        .upsertProfile(userId, smartProfile)
        .then(() => saasPlanningService.upsertSubjectLevels(userId, smartProfile.subjectDifficulty))
        .catch(() => {
          // fallback local continua
        });
    }

    const futureEntries = entries.filter((entry) => entry.date >= todayStr && !entry.done);
    futureEntries.forEach((entry) => removeEntry(entry.id));

    generated.forEach((item: GeneratedPlanItem) => {
      addEntry(item.date, item.subject, undefined, {
        topic: item.topic,
        studyType: item.studyType,
        priority: item.priority,
        aiReason: item.aiReason,
        startTime: item.startTime,
        endTime: item.endTime,
        status: 'pendente',
        source: 'motor',
      });
    });

    setAiSummary([
      `Cronograma base gerado para ${horizonDays} dias.`,
      `Distribuição baseada em dificuldade, peso por matéria e dias disponíveis.`,
    ]);
  }, [addEntry, entries, removeEntry, smartProfile, todayStr, userId]);

  const handleAiAdjust = () => {
    applyAdaptiveSchedule(smartProfile.hoursPerDay);

    const adjusted: AiAdjustmentOutput = adjustPlanWithAi(entries.filter((entry) => entry.date >= todayStr), {
      missedDaysLastWeek: missedDaysInput,
      weakTopic: weakTopicInput,
      availableHoursNow: hoursNowInput,
    });

    adjusted.adjusted.forEach((entry: ScheduleEntry) => {
      updateEntry(entry.id, {
        date: entry.date,
        studyType: entry.studyType,
        priority: entry.priority,
        aiReason: entry.aiReason,
        source: 'ia',
      });
    });

    setAiSummary([
      'Cronograma adaptado automaticamente para os próximos 7 dias (faltas, dificuldade e carga diária).',
      ...adjusted.summary,
    ]);
  };

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    const hydrateProfileFromCloud = async () => {
      try {
        const cloudProfile = await saasPlanningService.getProfile(userId);
        if (cancelled || !cloudProfile) {
          return;
        }

        setSmartProfile((current: SmartScheduleProfile) => {
          const sanitizedCurrent = sanitizeSmartProfile(current);
          if (sanitizedCurrent.examDate) {
            return sanitizedCurrent;
          }
          return sanitizeSmartProfile(cloudProfile);
        });
      } catch {
        // fallback local
      }
    };

    void hydrateProfileFromCloud();

    return () => {
      cancelled = true;
    };
  }, [userId, setSmartProfile]);

  const handleCompleteBlock = () => {
    if (!selectedEntry) return;
    toggleDone(selectedEntry.id);
    updateEntry(selectedEntry.id, { status: 'concluido' });
    setSelectedEntryId(null);
  };

  const handlePostponeBlock = () => {
    if (!selectedEntry) return;
    const date = new Date(`${selectedEntry.date}T12:00:00`);
    date.setDate(date.getDate() + 1);
    const postponedDate = toDateStr(date.getFullYear(), date.getMonth(), date.getDate());

    updateEntry(selectedEntry.id, {
      date: postponedDate,
      status: 'adiado',
      done: false,
      aiReason: 'Bloco adiado manualmente para o próximo dia.',
    });
    setSelectedEntryId(null);
  };

  const handleSwapBlock = () => {
    if (!selectedEntry || !swapSubjectInput.trim()) return;
    updateEntry(selectedEntry.id, {
      subject: swapSubjectInput.trim(),
      status: 'pendente',
      done: false,
      aiReason: `Bloco trocado manualmente para ${swapSubjectInput.trim()}.`,
    });
    setSelectedEntryId(null);
  };

  const handleMarkAbsent = () => {
    if (!selectedEntry) return;

    updateEntry(selectedEntry.id, {
      status: 'adiado',
      done: false,
      aiReason: 'Aluno registrou falta neste bloco.',
    });

    applyAdaptiveSchedule(smartProfile.hoursPerDay);
    setAiSummary((previous) => [
      'Detectei uma falta e reequilibrei automaticamente o cronograma.',
      ...previous,
    ].slice(0, 4));
    setSelectedEntryId(null);
  };

  useEffect(() => {
    if (entries.length > 0) {
      return;
    }

    const shouldAutoGenerate = window.localStorage.getItem(autoGenerateKey) === 'true';
    if (!shouldAutoGenerate) {
      return;
    }

    handleGenerateBaseSchedule();
    window.localStorage.removeItem(autoGenerateKey);
  }, [entries.length, autoGenerateKey, handleGenerateBaseSchedule]);

  const selectedDateObj = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date(`${todayStr}T12:00:00`);
  const weekStart = getWeekStart(selectedDateObj);
  const weekDates = useMemo(() =>
    GRID_WEEK_DAYS.map((day, index) => {
      const date = addDays(weekStart, index);
      return {
        ...day,
        date: toDateStr(date.getFullYear(), date.getMonth(), date.getDate()),
      };
    }),
    [weekStart]);

  const timeSlots = useMemo(() => {
    const all = entries
      .map((entry) => entry.startTime)
      .filter((value): value is string => Boolean(value));
    const unique = [...new Set(all)].sort((a, b) => a.localeCompare(b));
    return unique.length > 0 ? unique.slice(0, 8) : ['08:00', '09:00', '10:00'];
  }, [entries]);

  const weekMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    entries.forEach((entry) => {
      if (!entry.startTime) return;
      map.set(`${entry.date}|${entry.startTime}`, entry);
    });
    return map;
  }, [entries]);

  const weeklyGrid = useMemo((): EditableWeeklyRow[] => {
    return timeSlots.map((slot) => ({
      time: slot,
      cells: weekDates.map((day) => weekMap.get(`${day.date}|${slot}`)?.subject || ''),
    }));
  }, [timeSlots, weekDates, weekMap]);

  const toNextHour = (time: string): string => {
    const [hourRaw, minuteRaw] = time.split(':').map((part) => Number(part));
    const hour = Number.isFinite(hourRaw) ? hourRaw : 8;
    const minute = Number.isFinite(minuteRaw) ? minuteRaw : 0;
    const nextHour = (hour + 1) % 24;
    return `${String(nextHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const updateGridCell = (rowIndex: number, colIndex: number, value: string) => {
    const slot = timeSlots[rowIndex];
    const day = weekDates[colIndex];
    if (!slot || !day) return;

    const normalizedValue = value.trim();
    const existingEntry = weekMap.get(`${day.date}|${slot}`);
    if (existingEntry) {
      if (!normalizedValue) {
        removeEntry(existingEntry.id);
      } else {
        updateEntry(existingEntry.id, { subject: normalizedValue, source: 'manual' });
      }
    } else if (normalizedValue) {
      addEntry(day.date, normalizedValue, undefined, {
        startTime: slot,
        endTime: toNextHour(slot),
        priority: 'normal',
        status: 'pendente',
        source: 'manual',
      });
    }
  };

  const updateGridTime = (rowIndex: number, value: string) => {
    const oldSlot = timeSlots[rowIndex];
    const normalizedValue = value.trim();
    if (!oldSlot || !normalizedValue) return;

    weekDates.forEach((day) => {
      const entry = weekMap.get(`${day.date}|${oldSlot}`);
      if (entry) {
        updateEntry(entry.id, {
          startTime: normalizedValue,
          endTime: toNextHour(normalizedValue),
          source: 'manual',
        });
      }
    });
  };

  const clearGrid = () => {
    weekDates.forEach((day) => {
      const dayEntries = getEntriesForDate(day.date);
      dayEntries
        .filter((entry) => Boolean(entry.startTime))
        .forEach((entry) => removeEntry(entry.id));
    });
  };

  const allDisciplineLabels = useMemo(() => {
    const values = new Set<string>();
    disciplinas.enem.forEach((item) => values.add(item.label));
    disciplinas.concurso.forEach((item) => values.add(item.label));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [disciplinas]);

  const weekdayOrder: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const weekdayLabels: Record<Weekday, string> = {
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };

  const todayWeekday = useMemo(() => getWeekdayFromDate(today), [today]);
  const activeDaysCount = useMemo(
    () => getActiveDaysCount(effectiveWeeklySchedule.availability),
    [effectiveWeeklySchedule.availability],
  );
  const plannedSubjectsCount = useMemo(
    () => getPlannedSubjectsCount(effectiveWeeklySchedule.weekPlan),
    [effectiveWeeklySchedule.weekPlan],
  );
  const currentWeekStart = useMemo(() => getWeekStart(today), [today]);
  const currentWeekEnd = useMemo(() => addDays(currentWeekStart, 6), [currentWeekStart]);
  const fallbackWeeklyCompletedSessions = useMemo(
    () => getWeeklyCompletedSessions(entries, currentWeekStart, currentWeekEnd),
    [currentWeekEnd, currentWeekStart, entries],
  );
  const fallbackTodayCompletedSessions = useMemo(
    () => getTodayCompletedSessions(entries, today),
    [entries, today],
  );
  const fallbackCompletedWeekdays = useMemo(
    () =>
      weekdayOrder.reduce((acc, day, index) => {
        const dayDate = addDays(currentWeekStart, index);
        const dayKey = toDateStr(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
        acc[day] = entries.some((entry) => entry.done && entry.date === dayKey);
        return acc;
      }, {} as Partial<Record<Weekday, boolean>>),
    [currentWeekStart, entries, weekdayOrder],
  );
  const effectiveWeeklyCompletedSessions = weeklyCompletedSessions ?? fallbackWeeklyCompletedSessions;
  const effectiveTodayCompletedSessions = todayCompletedSessions ?? fallbackTodayCompletedSessions;
  const effectiveCompletedWeekdays = completedWeekdays ?? fallbackCompletedWeekdays;
  const completedEntryDateKeys = useMemo(
    () =>
      entries
        .filter((entry) => entry.done)
        .map((entry) => entry.date),
    [entries],
  );
  const weeklyPlanConfidenceState = useMemo(
    () =>
      getWeeklyPlanConfidenceState(
        effectiveWeeklyCompletedSessions,
        effectiveWeeklySchedule.preferences.weeklyGoalSessions,
      ),
    [effectiveWeeklyCompletedSessions, effectiveWeeklySchedule.preferences.weeklyGoalSessions],
  );
  const recentPaceState = useMemo(
    () => getRecentPaceState(effectiveWeeklySchedule, completedEntryDateKeys, today),
    [completedEntryDateKeys, effectiveWeeklySchedule, today],
  );
  const recentTopicLabelsBySubject = useMemo(
    () =>
      entries.reduce((acc, entry) => {
        const subjectLabel = typeof entry.subject === 'string' ? entry.subject.trim() : '';
        const topicLabel = typeof entry.topic === 'string' ? entry.topic.trim() : '';

        if (!subjectLabel || !topicLabel) {
          return acc;
        }

        acc[subjectLabel] = acc[subjectLabel] ?? [];
        if (!acc[subjectLabel].includes(topicLabel)) {
          acc[subjectLabel].push(topicLabel);
        }

        return acc;
      }, {} as Record<string, string[]>),
    [entries],
  );
  const enrichedTodaySubjectLabels = useMemo(() => {
    if (effectiveStudyContextForToday.state.type !== 'planned') {
      return [];
    }

    return effectiveStudyContextForToday.state.subjectLabels.map((subjectLabel) =>
      getSuggestedContentPathBySubjectLabel(
        subjectLabel,
        undefined,
        recentTopicLabelsBySubject[subjectLabel] ?? [],
      ).shortLabel,
    );
  }, [effectiveStudyContextForToday.state, recentTopicLabelsBySubject]);
  const todaySuggestedTopic = useMemo(() => {
    if (effectiveStudyContextForToday.state.type !== 'planned') {
      return null;
    }

    const preferredFrontLabelBySubject = effectiveStudyContextForToday.state.subjectLabels.reduce((acc, subjectLabel) => {
      acc[subjectLabel] = getSuggestedContentPathBySubjectLabel(
        subjectLabel,
        undefined,
        recentTopicLabelsBySubject[subjectLabel] ?? [],
      ).frontLabel;
      return acc;
    }, {} as Record<string, string | undefined>);

    return getSuggestedNextTopicAligned({
      todaySubjectLabels: effectiveStudyContextForToday.state.subjectLabels,
      preferredFrontLabelBySubject,
      recentTopicLabelsBySubject,
    });
  }, [effectiveStudyContextForToday.state, recentTopicLabelsBySubject]);
  const todaySuggestedTopicCopy = useMemo(
    () =>
      todaySuggestedTopic
        ? getSuggestedTopicCopy({
            source: todaySuggestedTopic.source,
            topicLabel: todaySuggestedTopic.topicLabel,
            frontLabel: todaySuggestedTopic.frontLabel,
            subjectLabel: todaySuggestedTopic.subjectLabel,
            variant: 'today',
          })
        : undefined,
    [todaySuggestedTopic],
  );
  const todaySummaryContextLabel = useMemo(() => {
    if (enrichedTodaySubjectLabels.length === 0) {
      return undefined;
    }

    if (enrichedTodaySubjectLabels.length === 1) {
      return `Hoje: ${enrichedTodaySubjectLabels[0]}`;
    }

    return `Hoje: ${enrichedTodaySubjectLabels[0]} +${enrichedTodaySubjectLabels.length - 1}`;
  }, [enrichedTodaySubjectLabels]);
  const todayGridContextLabel = useMemo(() => {
    if (enrichedTodaySubjectLabels.length === 0) {
      return undefined;
    }

    if (enrichedTodaySubjectLabels.length === 1) {
      return enrichedTodaySubjectLabels[0];
    }

    return `${enrichedTodaySubjectLabels[0]} +${enrichedTodaySubjectLabels.length - 1}`;
  }, [enrichedTodaySubjectLabels]);
  const todayPlanConfidenceHint = useMemo(() => {
    if (effectiveStudyContextForToday.state.type !== 'planned') {
      return undefined;
    }

    const paceCopy = getPaceCopy({
      state: recentPaceState,
      date: today,
    });

    if (recentPaceState !== 'on_track' && paceCopy?.today) {
      return paceCopy.today;
    }

    if (
      weeklyPlanConfidenceState === 'below_pace'
    ) {
      return 'Hoje e um bom dia para retomar o plano';
    }

    return undefined;
  }, [effectiveStudyContextForToday.state.type, recentPaceState, today, weeklyPlanConfidenceState]);
  const continuityLabels = useMemo(
    () =>
      weekdayOrder.reduce((acc, day, index) => {
        if (index === 0) {
          return acc;
        }

        const previousDay = weekdayOrder[index - 1];
        if (
          effectiveCompletedWeekdays[previousDay]
          && effectiveWeeklySchedule.availability[day]
        ) {
          acc[day] = 'Em sequencia';
        }

        return acc;
      }, {} as Partial<Record<Weekday, string>>),
    [effectiveCompletedWeekdays, effectiveWeeklySchedule.availability, weekdayOrder],
  );
  const suggestedAdjustment = useMemo(
    () => getSuggestedAdjustment(recentPaceState),
    [recentPaceState],
  );

  const handleToggleWeeklyDay = useCallback(
    (day: Weekday, nextActive: boolean) => {
      handleWeeklyScheduleChange(toggleWeeklyDayAvailability(effectiveWeeklySchedule, day, nextActive));
    },
    [effectiveWeeklySchedule, handleWeeklyScheduleChange],
  );

  const handleSaveWeeklyDay = useCallback(
    ({ day, plan, active }: { day: Weekday; plan: { subjectLabels: string[] }; active: boolean }) => {
      let nextSchedule = updateWeeklyDayPlan(effectiveWeeklySchedule, day, plan.subjectLabels);
      nextSchedule = toggleWeeklyDayAvailability(nextSchedule, day, active);
      handleWeeklyScheduleChange(nextSchedule);
      setEditingDay(null);
    },
    [effectiveWeeklySchedule, handleWeeklyScheduleChange],
  );

  const handleAutoAdjustWeeklySchedule = useCallback(() => {
    if (allDisciplineLabels.length === 0) {
      setAiSummary([
        'Nenhuma disciplina disponível ainda para reorganizar a semana.',
      ]);
      toast('Nenhuma disciplina disponível ainda para reorganizar a semana.', { icon: 'ℹ️' });
      smartProfileSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const nextSchedule = autoDistributeSubjects(effectiveWeeklySchedule, allDisciplineLabels);
    handleWeeklyScheduleChange(nextSchedule);
    setAiSummary([
      'Redistribuí a semana usando apenas os dias ativos e respeitando o limite de sessões por dia.',
      'Você ainda pode editar qualquer dia manualmente depois do ajuste.',
    ]);
    toast.success('Seu cronograma foi reorganizado com base nas suas disciplinas.');
  }, [allDisciplineLabels, effectiveWeeklySchedule, handleWeeklyScheduleChange]);

  const handleSuggestedAdjustment = useCallback(
    (suggestion: NonNullable<typeof suggestedAdjustment>) => {
      if (suggestion.type === 'reduce_load') {
        setEditingDay(todayWeekday);
        return;
      }

      weeklyGridSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [suggestedAdjustment, todayWeekday],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CronogramaHeader
        onAutoAdjust={handleAutoAdjustWeeklySchedule}
        onEditPreferences={() => smartProfileSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />

      <CronogramaSummary
        activeDaysCount={activeDaysCount}
        plannedSubjectsCount={plannedSubjectsCount}
        defaultSessionDuration={effectiveWeeklySchedule.preferences.defaultSessionDurationMinutes}
        todayState={effectiveStudyContextForToday.state}
        todayContextLabel={todaySummaryContextLabel}
        weeklyCompletedSessions={effectiveWeeklyCompletedSessions}
        weeklyGoalSessions={effectiveWeeklySchedule.preferences.weeklyGoalSessions}
        weeklyPlanConfidenceState={weeklyPlanConfidenceState}
        recentPaceState={recentPaceState}
        onAutoAdjust={handleAutoAdjustWeeklySchedule}
      />

      <TodayScheduleStatus
        todayState={effectiveStudyContextForToday.state}
        todayCompletedSessions={effectiveTodayCompletedSessions}
        enrichedSubjectLabels={enrichedTodaySubjectLabels}
        suggestedTopicCopy={todaySuggestedTopicCopy}
        planConfidenceHint={todayPlanConfidenceHint}
        recentPaceState={recentPaceState}
        suggestedAdjustment={suggestedAdjustment}
        onAdjustSchedule={() => setEditingDay(todayWeekday)}
        onDefineSubjects={() => setEditingDay(todayWeekday)}
        onSuggestedAdjustment={handleSuggestedAdjustment}
      />

      {effectiveStudyContextForToday.state.type === 'planned' && officialTodayActionCard ? (
        <TodayExecutionCard
          card={officialTodayActionCard}
          scheduleStatus={officialTodayScheduleStatus}
          onAdjustToday={() => setEditingDay(todayWeekday)}
        />
      ) : null}

      <div ref={weeklyGridSectionRef}>
        <WeeklyGrid
          weekPlan={effectiveWeeklySchedule.weekPlan}
          availability={effectiveWeeklySchedule.availability}
          today={todayWeekday}
          completedDays={effectiveCompletedWeekdays}
          continuityLabels={continuityLabels}
          todayContextLabel={todayGridContextLabel}
          onEditDay={setEditingDay}
          onToggleDay={handleToggleWeeklyDay}
        />
      </div>

      <div
        ref={smartProfileSectionRef}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> Cronograma Inteligente
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Perfil + Regras + Ajuste IA</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="date"
            value={normalizeDateInputValue(smartProfile.examDate)}
            onChange={(event) => setSmartProfile((prev: SmartScheduleProfile) => ({ ...prev, examDate: event.target.value }))}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            title="Data da prova"
          />
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="hours-per-day" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Quantas horas por dia você tem disponível?
              </label>
              <button
                type="button"
                onClick={() => setIsPomodoroHelpOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Como funciona o Pomodoro?
              </button>
            </div>
            <div className="relative">
              <input
                id="hours-per-day"
                type="number"
                min={1}
                max={10}
                value={smartProfile.hoursPerDay}
                onChange={(event) => setSmartProfile((prev: SmartScheduleProfile) => ({ ...prev, hoursPerDay: Number(event.target.value || 1) }))}
                className="w-full pl-3 pr-10 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                placeholder="Ex: 2"
              />
              <span className="absolute inset-y-0 right-3 inline-flex items-center text-xs text-slate-500 dark:text-slate-400">h</span>
            </div>
          </div>
          <select
            value={smartProfile.studyStyle}
            onChange={(event) => setSmartProfile((prev: SmartScheduleProfile) => ({ ...prev, studyStyle: event.target.value as SmartScheduleProfile['studyStyle'] }))}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
          >
            <option value="teoria_questoes">Teoria + Questões</option>
            <option value="questoes">Só Questões</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={weakTopicInput}
            onChange={(event) => setWeakTopicInput(event.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            placeholder="Tópico com dificuldade (ex: Funções)"
          />
          <input
            type="number"
            min={0}
            max={7}
            value={missedDaysInput}
            onChange={(event) => setMissedDaysInput(Number(event.target.value || 0))}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            placeholder="Faltas nos últimos 7 dias"
          />
          <input
            type="number"
            min={1}
            max={10}
            value={hoursNowInput}
            onChange={(event) => setHoursNowInput(Number(event.target.value || 1))}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            placeholder="Horas disponíveis agora"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerateBaseSchedule}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Gerar cronograma base (30 dias)
          </button>
          <button
            type="button"
            onClick={handleAiAdjust}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Ajustar cronograma automaticamente
          </button>
        </div>

        {aiSummary.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Resumo do ajuste
            </p>
            {aiSummary.map((line) => (
              <p key={line} className="text-xs text-slate-700 dark:text-slate-200">• {line}</p>
            ))}
          </div>
        )}
      </div>

      {isPomodoroHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2"><BookOpen className="w-5 h-5" /> Como funciona o nosso Cronograma Pomodoro?</h4>
              <button
                type="button"
                onClick={() => setIsPomodoroHelpOpen(false)}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Fechar ajuda do Pomodoro"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              O método Pomodoro divide seu estudo em blocos de foco total e pausas curtas para manter alto rendimento sem exaustão.
            </p>
            <ul className="text-sm text-slate-700 dark:text-slate-200 space-y-1.5 list-disc pl-5">
              <li>Foco total: 25 minutos sem interrupções.</li>
              <li>Pausa curta: 5 minutos para respirar, hidratar e alongar.</li>
              <li>Pausa longa: após 4 ciclos, descanso maior de 15 a 30 minutos.</li>
            </ul>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-200">
              Basta informar quantas horas por dia você tem disponível. A plataforma converte isso automaticamente para blocos ideais de estudo.
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsPomodoroHelpOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm overflow-x-auto space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Grade semanal</h3>
        <div className="min-w-[700px]">
          <div className="grid grid-cols-6 gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div className="px-2 py-1">Horário</div>
            {weekDates.map((day) => (
              <div key={day.date} className="px-2 py-1 text-center">{day.label}</div>
            ))}
          </div>

          <div className="space-y-1 mt-1">
            {weeklyGrid.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid grid-cols-6 gap-1">
                <input
                  value={row.time}
                  onChange={(event) => updateGridTime(rowIndex, event.target.value)}
                  placeholder="08:00"
                  className="px-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                />

                {row.cells.map((cell, colIndex) => (
                  <input
                    key={`cell-${rowIndex}-${colIndex}`}
                    value={cell}
                    onChange={(event) => updateGridCell(rowIndex, colIndex, event.target.value)}
                    placeholder="Disciplina"
                    list="weekly-grid-disciplines"
                    className="min-h-[42px] px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <datalist id="weekly-grid-disciplines">
          {allDisciplineLabels.map((label) => (
            <option key={label} value={label} />
          ))}
        </datalist>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clearGrid}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-white inline-flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpar tudo
          </button>
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        {/* Nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEK_SHORT.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} />;
            const dateStr = toDateStr(viewYear, viewMonth, day);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const hasEntries = scheduledDates.has(dateStr);
            const dayEntries = hasEntries ? getEntriesForDate(dateStr) : [];
            const allDone = dayEntries.length > 0 && dayEntries.every((e) => e.done);
            const hasDelayed = dayEntries.some((entry) => !entry.done && entry.date < todayStr);
            const hasPriority = dayEntries.some((entry) => entry.priority === 'alta');

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`
                  relative flex flex-col items-center justify-center rounded-lg text-xs font-semibold transition aspect-square shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400
                  ${isSelected ? 'ring-2 ring-offset-1 text-white bg-slate-700 dark:bg-slate-200 dark:text-slate-900 shadow-md' : ''}
                  ${isToday && !isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
                  ${!isSelected && !isToday ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800' : ''}
                  ${allDone && !isSelected ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : ''}
                  ${hasDelayed && !isSelected ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' : ''}
                  ${hasEntries && !allDone && !isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
                style={isSelected ? { backgroundColor: 'var(--color-primary)' } : undefined}
              >
                {day}
                {hasEntries && (
                  <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${allDone ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                )}
                {hasPriority && !isSelected && (
                  <span
                    className="absolute top-0.5 right-0.5"
                    title="Esse estudo foi priorizado por dificuldade alta"
                  >
                    <Star className="w-3 h-3 text-amber-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /> Tem estudo</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Tudo concluído</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500" /> Atrasado</div>
          <div className="flex items-center gap-1.5"><Star className="w-3 h-3 text-amber-500" /> Prioridade IA</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm ring-2 ring-blue-400 ring-offset-1" /> Hoje</div>
        </div>
      </div>

      {/* Painel do dia selecionado */}
      {selectedDate && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            <span className="text-xs text-slate-400">
              {selectedEntries.length} {selectedEntries.length === 1 ? 'disciplina' : 'disciplinas'}
            </span>
          </div>

          {/* Formulário para adicionar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <ModalidadeSelect value={modalidade} onChange={v => { setModalidade(v as 'enem' | 'concurso' | null); setDisciplina(null); }} />
            <DisciplinaSelect
              modalidade={modalidade}
              value={disciplina}
              onChange={setDisciplina}
              disciplinas={modalidade ? disciplinas[modalidade] : []}
            />
            <input
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Nota (opcional)..."
              className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none border border-slate-200 dark:border-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-1.5 transition-shadow shadow-md bg-slate-700 dark:bg-slate-200 dark:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 hover:opacity-90"
              disabled={!disciplina}
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          {/* Lista de entradas do dia */}
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhuma disciplina agendada para este dia.</p>
          ) : (
            <div className="space-y-2">
              {selectedEntries.map((entry) => (
                <ScheduleEntryCard
                  key={entry.id}
                  entry={entry}
                  onToggle={() => toggleDone(entry.id)}
                  onRemove={() => removeEntry(entry.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {editingDay && (
        <DayPlanEditorModal
          open={Boolean(editingDay)}
          day={editingDay}
          dayLabel={weekdayLabels[editingDay]}
          initialPlan={effectiveWeeklySchedule.weekPlan[editingDay]}
          initialActive={effectiveWeeklySchedule.availability[editingDay]}
          allSubjects={allDisciplineLabels}
          onSave={handleSaveWeeklyDay}
          onClose={() => setEditingDay(null)}
        />
      )}

      {selectedEntry && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Bloco de estudo</h4>
              <button
                type="button"
                onClick={() => setSelectedEntryId(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm space-y-1">
              <p><strong>Matéria:</strong> {selectedEntry.subject}</p>
              <p><strong>Tópico:</strong> {selectedEntry.topic || 'Tópico livre'}</p>
              <p><strong>Horário:</strong> {selectedEntry.startTime || '--:--'} - {selectedEntry.endTime || '--:--'}</p>
              <p><strong>Tipo:</strong> {getStudyTypeLabel(selectedEntry.studyType)}</p>
            </div>

            <input
              value={swapSubjectInput}
              onChange={(event) => setSwapSubjectInput(event.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              placeholder="Trocar para matéria..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleCompleteBlock}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white inline-flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Concluir
              </button>
              <button
                type="button"
                onClick={handlePostponeBlock}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-white inline-flex items-center justify-center gap-1.5"
              >
                <PauseCircle className="w-3.5 h-3.5" /> Adiar
              </button>
              <button
                type="button"
                onClick={handleSwapBlock}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 inline-flex items-center justify-center gap-1.5"
              >
                <Repeat2 className="w-3.5 h-3.5" /> Trocar
              </button>
              <button
                type="button"
                onClick={handleMarkAbsent}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white inline-flex items-center justify-center gap-1.5"
              >
                <AlertOctagon className="w-3.5 h-3.5" /> Faltou
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Card individual ──────────────────────────────────────────
interface ScheduleEntryCardProps {
  entry: ScheduleEntry;
  onToggle: () => void;
  onRemove: () => void;
}

const ScheduleEntryCard: React.FC<ScheduleEntryCardProps> = ({ entry, onToggle, onRemove }) => {
  const cfg = MATERIAS_CONFIG[entry.subject as MateriaTipo] || {
    icon: '📚',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition ${entry.done
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          : `${cfg.bgColor} dark:bg-slate-800/70 ${cfg.borderColor} dark:border-slate-700`
        }`}
    >
      {/* Toggle */}
      <button onClick={onToggle} className="flex-shrink-0 transition">
        {entry.done ? (
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle className="w-5 h-5 text-slate-400 hover:text-blue-500" />
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold ${entry.done ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
            {cfg.icon} {entry.subject}
          </p>
          {entry.priority === 'alta' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Star className="w-2.5 h-2.5" /> Prioridade IA
            </span>
          )}
        </div>

        {(entry.topic || entry.studyType) && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {entry.topic ? `Tópico: ${entry.topic}` : 'Tópico livre'} • {getStudyTypeLabel(entry.studyType)}
          </p>
        )}

        {entry.aiReason && (
          <p className="text-[11px] text-indigo-600 dark:text-indigo-300 mt-0.5">
            {entry.aiReason}
          </p>
        )}

        {entry.note && (
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
            <StickyNote className="w-3 h-3 flex-shrink-0" /> {entry.note}
          </p>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default StudyScheduleCalendar;
