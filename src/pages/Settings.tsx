import React from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  Download,
  Upload,
  Link2,
  X,
  Moon,
  Sun,
  Info,
  Trophy,
  Clock,
  Star,
  Flame,
  Target,
  UserCircle2,
  Medal,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HardDrive,
  Brain,
  TrendingUp,
  Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ThemeSelector } from '../components/Layout/ThemeSelector';
import ExportSection from '../components/Settings/ExportSection';
import { UserData } from '../types';
import { MATERIAS_CONFIG, MateriaTipo } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import { getLevelByPoints, getProgressToNextLevel } from '../data/levels';

const ringThemeStyle = {
  '--tw-ring-color': 'var(--color-primary)',
} as unknown as React.CSSProperties;

const isImageAvatar = (avatar?: string) => Boolean(avatar && (/^data:image\//i.test(avatar) || /^https?:\/\//i.test(avatar)));

interface SettingsPageProps {
  userData: UserData;
  userName?: string;
  userEmail?: string;
  profileAvatar?: string;
  profileExamGoal?: string;
  profileExamDate?: string;
  preferredStudyTrack: 'enem' | 'concursos' | 'hibrido';
  darkMode: boolean;
  currentTheme: string;
  weeklyGoalMinutes: number;
  onToggleDarkMode: () => void;
  onSelectTheme: (theme: string) => void;
  profileSyncStatus: 'local' | 'syncing' | 'synced' | 'error';
  lastProfileSyncAt?: string | null;
  lastProfileSavedAt?: string | null;
  profileChangeHistory?: Array<{ at: string; summary: string }>;
  onSaveProfile: (payload: {
    name: string;
    avatar: string;
    examGoal: string;
    examDate: string;
    preferredTrack: 'enem' | 'concursos' | 'hibrido';
  }) => Promise<{ success: boolean; message: string }>;
  onImportData: (data: UserData) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  userData,
  userName,
  userEmail,
  profileAvatar,
  profileExamGoal,
  profileExamDate,
  preferredStudyTrack,
  darkMode,
  currentTheme,
  weeklyGoalMinutes,
  onToggleDarkMode,
  onSelectTheme,
  profileSyncStatus,
  lastProfileSyncAt,
  lastProfileSavedAt,
  profileChangeHistory = [],
  onSaveProfile,
  onImportData,
}) => {
  const [draftName, setDraftName] = React.useState(userName || '');
  const [draftAvatar, setDraftAvatar] = React.useState(profileAvatar || '🧑‍⚕️');
  const [avatarUrlInput, setAvatarUrlInput] = React.useState('');
  const [draftExamGoal, setDraftExamGoal] = React.useState(profileExamGoal || '');
  const [draftExamDate, setDraftExamDate] = React.useState(profileExamDate || '');
  const [draftPreferredTrack, setDraftPreferredTrack] = React.useState<'enem' | 'concursos' | 'hibrido'>(preferredStudyTrack);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const avatarFileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => setDraftName(userName || ''), [userName]);
  React.useEffect(() => setDraftAvatar(profileAvatar || '🧑‍⚕️'), [profileAvatar]);
  React.useEffect(() => {
    if (profileAvatar && /^https?:\/\//i.test(profileAvatar)) {
      setAvatarUrlInput(profileAvatar);
      return;
    }
    setAvatarUrlInput('');
  }, [profileAvatar]);
  React.useEffect(() => setDraftExamGoal(profileExamGoal || ''), [profileExamGoal]);
  React.useEffect(() => setDraftExamDate(profileExamDate || ''), [profileExamDate]);
  React.useEffect(() => setDraftPreferredTrack(preferredStudyTrack), [preferredStudyTrack]);

  const sessions = userData.sessions || userData.studyHistory || [];
  const levelInfo = getLevelByPoints(userData.totalPoints);
  const levelProgress = getProgressToNextLevel(userData.totalPoints);
  const weeklyStudiedMinutes = Object.values(userData.weekProgress || {}).reduce((sum, day) => sum + (day?.minutes || 0), 0);
  const weeklyGoalProgress = weeklyGoalMinutes > 0 ? Math.min(100, Math.round((weeklyStudiedMinutes / weeklyGoalMinutes) * 100)) : 0;

  const recentAchievements = React.useMemo(() => {
    return userData.achievements
      .slice(-3)
      .reverse()
      .map((id) => ACHIEVEMENTS.find((achievement) => achievement.id === id))
      .filter((achievement): achievement is NonNullable<typeof achievement> => Boolean(achievement));
  }, [userData.achievements]);

  const displayName = draftName || userName || 'Estudante';
  const displayEmail = userEmail || 'conta@medicina-do-zero.app';
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const avatarValue = draftAvatar || avatarInitial;
  const avatarIsImage = isImageAvatar(avatarValue);

  const avatarOptions = ['🧑‍⚕️', '👩‍⚕️', '👨‍⚕️', '🧠', '📚', '🎯', '⚡', '🔥'];

  const hasProfileChanges =
    draftName !== (userName || '') ||
    draftAvatar !== (profileAvatar || '🧑‍⚕️') ||
    draftExamGoal !== (profileExamGoal || '') ||
    draftExamDate !== (profileExamDate || '') ||
    draftPreferredTrack !== preferredStudyTrack;

  const handleDiscardProfileChanges = () => {
    setDraftName(userName || '');
    setDraftAvatar(profileAvatar || '🧑‍⚕️');
    setDraftExamGoal(profileExamGoal || '');
    setDraftExamDate(profileExamDate || '');
    setDraftPreferredTrack(preferredStudyTrack);
    toast('Alterações descartadas.');
  };

  const handleSaveProfileChanges = async () => {
    const normalizedName = draftName.trim();
    if (normalizedName.length < 3) {
      toast.error('Nome deve ter no mínimo 3 caracteres.');
      return;
    }

    if (draftExamDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(`${draftExamDate}T00:00:00`);
      if (selectedDate < today) {
        toast.error('A data da prova deve ser hoje ou futura.');
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const result = await onSaveProfile({
        name: normalizedName,
        avatar: draftAvatar,
        examGoal: draftExamGoal.trim(),
        examDate: draftExamDate,
        preferredTrack: draftPreferredTrack,
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
        reader.readAsDataURL(selectedFile);
      });

      if (!dataUrl.startsWith('data:image/')) {
        toast.error('Formato de imagem não suportado.');
        return;
      }

      setDraftAvatar(dataUrl);
      setAvatarUrlInput('');
      toast.success('Foto de perfil selecionada.');
    } catch {
      toast.error('Não foi possível processar a imagem.');
    }
  };

  const handleApplyAvatarUrl = () => {
    const normalizedUrl = avatarUrlInput.trim();

    if (!normalizedUrl) {
      toast.error('Cole a URL da imagem antes de aplicar.');
      return;
    }

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      toast.error('A URL precisa começar com http:// ou https://');
      return;
    }

    setDraftAvatar(normalizedUrl);
    toast.success('URL de foto aplicada.');
  };

  const profileSyncMeta =
    profileSyncStatus === 'syncing'
      ? {
          label: 'Sincronizando perfil...',
          className: 'text-amber-600 dark:text-amber-300',
          icon: Loader2,
          spin: true,
        }
      : profileSyncStatus === 'synced'
        ? {
            label: `Perfil sincronizado${lastProfileSyncAt ? ` em ${new Date(lastProfileSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}`,
            className: 'text-emerald-600 dark:text-emerald-300',
            icon: CheckCircle2,
            spin: false,
          }
        : profileSyncStatus === 'error'
          ? {
              label: 'Erro ao sincronizar perfil',
              className: 'text-rose-600 dark:text-rose-300',
              icon: AlertTriangle,
              spin: false,
            }
          : {
              label: 'Perfil salvo localmente',
              className: 'text-slate-600 dark:text-slate-300',
              icon: HardDrive,
              spin: false,
            };

  const ProfileSyncIcon = profileSyncMeta.icon;

  const stats = [
    {
      label: 'Pontos Totais',
      value: userData.totalPoints.toLocaleString(),
      icon: Star,
      color: 'text-yellow-500',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      label: 'Nível Atual',
      value: `Nível ${userData.level}`,
      icon: Trophy,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Conquistas',
      value: userData.achievements.length,
      icon: Medal,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Sequência',
      value: `${userData.currentStreak || userData.streak || 0} dias`,
      icon: Flame,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: 'Sessões',
      value: sessions.length,
      icon: Clock,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
  ];

  const subjectMinutes = React.useMemo(() => {
    const base = Object.keys(MATERIAS_CONFIG).reduce<Record<string, number>>((acc, subject) => {
      acc[subject] = 0;
      return acc;
    }, {});

    sessions.forEach((session) => {
      const subject = session.subject || 'Outra';
      base[subject] = (base[subject] || 0) + (session.minutes || session.duration || 0);
    });

    return base;
  }, [sessions]);

  const cognitiveDiagnosis = React.useMemo(() => {
    const entries = Object.entries(subjectMinutes)
      .filter(([subject]) => subject !== 'Outra')
      .sort((a, b) => b[1] - a[1]);

    return {
      strengths: entries.filter(([, minutes]) => minutes > 0).slice(0, 2),
      weaknesses: [...entries].reverse().slice(0, 2),
    };
  }, [subjectMinutes]);

  const weeklyEvolution = React.useMemo(() => {
    const dayOrder: Array<{ key: keyof UserData['weekProgress']; label: string }> = [
      { key: 'segunda', label: 'Seg' },
      { key: 'terca', label: 'Ter' },
      { key: 'quarta', label: 'Qua' },
      { key: 'quinta', label: 'Qui' },
      { key: 'sexta', label: 'Sex' },
      { key: 'sabado', label: 'Sáb' },
      { key: 'domingo', label: 'Dom' },
    ];

    const maxMinutes = Math.max(
      1,
      ...dayOrder.map((day) => userData.weekProgress?.[day.key]?.minutes || 0)
    );

    return dayOrder.map((day) => {
      const minutes = userData.weekProgress?.[day.key]?.minutes || 0;
      return {
        label: day.label,
        minutes,
        percentage: Math.round((minutes / maxMinutes) * 100),
      };
    });
  }, [userData.weekProgress]);

  const aiRecommendation = React.useMemo(() => {
    const weakSubject = cognitiveDiagnosis.weaknesses[0]?.[0] as MateriaTipo | undefined;
    const topicBySubject: Record<MateriaTipo, string> = {
      Anatomia: 'Sistema Osteomuscular',
      Fisiologia: 'Regulação Hormonal',
      Farmacologia: 'Farmacocinética',
      Patologia: 'Processo Inflamatório',
      Bioquímica: 'Metabolismo Energético',
      Histologia: 'Tecido Epitelial',
      Outra: 'Revisão de base geral',
    };

    const fallbackSubject: MateriaTipo = 'Bioquímica';
    const subject = weakSubject || fallbackSubject;

    return {
      subject,
      topic: topicBySubject[subject],
    };
  }, [cognitiveDiagnosis.weaknesses]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <SettingsIcon className="w-7 h-7 text-gray-600 dark:text-gray-300" />
          </div>
          Configurações
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 ml-1">
          Personalize sua experiência de estudos
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-xl font-bold">
                {avatarIsImage ? (
                  <img src={avatarValue} alt={displayName} className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  avatarValue
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{displayName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{displayEmail}</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-1 inline-flex items-center gap-1">
                  <UserCircle2 className="w-3.5 h-3.5" /> {levelInfo.title} • Nível {levelInfo.level}
                </p>
                <p className={`text-[11px] mt-1 inline-flex items-center gap-1 ${profileSyncMeta.className}`}>
                  <ProfileSyncIcon className={`w-3.5 h-3.5 ${profileSyncMeta.spin ? 'animate-spin' : ''}`} />
                  {profileSyncMeta.label}
                </p>
                {lastProfileSavedAt && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Última alteração salva em {new Date(lastProfileSavedAt).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            <div className="min-w-[220px]">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Progresso para próximo nível</p>
              <div className="mt-2 h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, Math.round(levelProgress.percentage)))}%`, backgroundColor: 'var(--color-primary)' }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {levelProgress.current}/{levelProgress.required} XP nesta faixa
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3 space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Nome exibido</label>
              <input
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                placeholder="Como deseja ser chamado(a)"
              />
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3 space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Avatar</label>
              <div className="flex flex-wrap gap-2">
                {avatarOptions.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => setDraftAvatar(avatar)}
                    className={`h-9 w-9 rounded-lg border text-lg flex items-center justify-center transition ${
                      avatarValue === avatar
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-1">
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="relative h-12 w-12 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden"
                    title="Escolher foto"
                  >
                    {avatarIsImage ? (
                      <img src={avatarValue} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="h-full w-full flex items-center justify-center text-lg">{avatarValue}</span>
                    )}
                    <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Camera className="w-3 h-3" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Escolher foto (máx. 2MB)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="url"
                      value={avatarUrlInput}
                      onChange={(event) => setAvatarUrlInput(event.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                      placeholder="https://..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyAvatarUrl}
                    className="px-2.5 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    Aplicar
                  </button>
                </div>

                {avatarIsImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftAvatar('🧑‍⚕️');
                      setAvatarUrlInput('');
                    }}
                    className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-300"
                  >
                    <X className="w-3.5 h-3.5" />
                    Remover foto
                  </button>
                )}

                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Para alterar nome e foto: edite acima e clique em <strong>Salvar perfil</strong> no fim do card.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                <Target className="w-3.5 h-3.5" /> Meta semanal
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                {weeklyStudiedMinutes}/{weeklyGoalMinutes} min • {weeklyGoalProgress}%
              </p>
              <div className="mt-2 h-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${weeklyGoalProgress}%` }} />
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Preferências da prova</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={draftExamGoal}
                  onChange={(event) => setDraftExamGoal(event.target.value)}
                  className="px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white"
                  placeholder="Objetivo (ex: ENEM Medicina)"
                />
                <input
                  type="date"
                  value={draftExamDate}
                  onChange={(event) => setDraftExamDate(event.target.value)}
                  className="px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <select
                value={draftPreferredTrack}
                onChange={(event) => setDraftPreferredTrack(event.target.value as 'enem' | 'concursos' | 'hibrido')}
                className="w-full px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white"
              >
                <option value="enem">Trilha principal: ENEM</option>
                <option value="concursos">Trilha principal: Concursos</option>
                <option value="hibrido">Trilha principal: Híbrido</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-3 mt-4">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">Conquistas recentes</p>
            {recentAchievements.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Conclua sessões para desbloquear conquistas.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {recentAchievements.map((achievement) => (
                  <div key={achievement.id} className="text-xs text-gray-700 dark:text-gray-200">
                    🏆 {achievement.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                <Brain className="w-3.5 h-3.5" /> Diagnóstico cognitivo
              </p>

              <div className="mt-2 space-y-2 text-xs">
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">Forças</p>
                  {cognitiveDiagnosis.strengths.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Complete mais sessões para mapear forças.</p>
                  ) : (
                    cognitiveDiagnosis.strengths.map(([subject, minutes]) => (
                      <p key={subject} className="text-gray-700 dark:text-gray-200">✔ {subject} ({minutes} min)</p>
                    ))
                  )}
                </div>

                <div>
                  <p className="font-semibold text-rose-700 dark:text-rose-300">Fragilidades</p>
                  {cognitiveDiagnosis.weaknesses.map(([subject, minutes]) => (
                    <p key={subject} className="text-gray-700 dark:text-gray-200">⚠ {subject} ({minutes} min)</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 p-3">
              <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 inline-flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Evolução semanal
              </p>
              <div className="mt-2 space-y-1.5">
                {weeklyEvolution.map((day) => (
                  <div key={day.label} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                    <span className="w-8">{day.label}</span>
                    <div className="h-2 flex-1 rounded bg-sky-100 dark:bg-sky-900/40 overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${day.percentage}%` }} />
                    </div>
                    <span className="w-12 text-right">{day.minutes}m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-3 mt-4">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">🧠 Mentor IA — próxima recomendação</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{aiRecommendation.subject}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">→ {aiRecommendation.topic}</p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 mt-4">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Histórico de alterações de perfil</p>
            {profileChangeHistory.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Nenhuma alteração registrada ainda.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {profileChangeHistory.slice(0, 5).map((item) => (
                  <p key={`${item.at}-${item.summary}`} className="text-xs text-slate-600 dark:text-slate-300">
                    {new Date(item.at).toLocaleString('pt-BR')} • {item.summary}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={handleDiscardProfileChanges}
              disabled={!hasProfileChanges || isSavingProfile}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleSaveProfileChanges}
              disabled={!hasProfileChanges || isSavingProfile}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {isSavingProfile ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
                {darkMode
                  ? <Moon className="w-5 h-5 text-indigo-500" />
                  : <Sun className="w-5 h-5 text-amber-500" />
                }
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Modo Escuro</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Reduz o cansaço visual em ambientes escuros</p>
              </div>
            </div>
            <button
              onClick={onToggleDarkMode}
              aria-label={darkMode ? 'Desativar modo escuro' : 'Ativar modo escuro'}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                darkMode ? '' : 'bg-gray-200 dark:bg-gray-600'
              }`}
              style={
                darkMode
                  ? {
                      ...ringThemeStyle,
                      backgroundColor: 'var(--color-primary)',
                    }
                  : ringThemeStyle
              }
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="p-3 bg-pink-50 dark:bg-pink-900/30 rounded-xl">
              <Palette className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Tema de Cores</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Escolha a cor principal da interface</p>
            </div>
          </div>
          <ThemeSelector currentTheme={currentTheme} onSelectTheme={onSelectTheme} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
              <Download className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Backup de Dados</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Exporte ou importe seus dados de estudo</p>
            </div>
          </div>
          <ExportSection userData={userData} onImport={onImportData} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <Info className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Informações</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Versão 2.0.0</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`${stat.bg} rounded-xl p-4 flex flex-col gap-1`}
              >
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
