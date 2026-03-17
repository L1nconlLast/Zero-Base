import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  BookOpen,
  Target,
  Zap,
  Flame,
  Crown,
  Rocket,
  Lightbulb,
  GraduationCap,
  Star,
  Award,
  Trophy,
  Bell,
  Palette,
  Clock,
  Shield,
  Trash2,
  Download,
  Camera,
  Upload,
  Check,
  Lock,
  Sun,
  Moon,
  Globe,
  AlignJustify,
  TrendingUp,
  Timer,
  FileText,
  BarChart2,
  User,
  Settings,
  Sparkles,
  CalendarDays,
  Pencil,
  Save,
  CheckCircle,
  BellRing,
  LayoutDashboard,
  Sunset,
  Sunrise,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { UserData } from '../types';
import { supabase } from '../services/supabase.client';
import ProfileV2 from '../components/profile/ProfileV2';
import ProfileStatsV2 from '../components/profile/ProfileStatsV2';

type PrefThemeValues = 'Claro' | 'Escuro' | 'Sistema';
type PrefLanguageValues = 'Português' | 'English' | 'Español';
type PrefDensityValues = 'Compacto' | 'Normal' | 'Espaçoso';
type PrefTimeValues = 'Manhã' | 'Tarde' | 'Noite' | 'Madrugada';
type ThemeMode = 'light' | 'dark' | 'system';
type Lang = 'pt' | 'en' | 'es';
type Density = 'compact' | 'normal' | 'spacious';
type Period = 'morning' | 'afternoon' | 'night' | 'late_night';

type ProfileLoadResponse = {
  profile?: {
    displayName?: string | null;
    display_name?: string | null;
    email?: string | null;
    avatarIcon?: string | null;
    avatar_icon?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    theme?: ThemeMode;
    language?: Lang;
    density?: Density;
    preferredPeriod?: Period;
    preferred_period?: Period;
  };
  notifications?: {
    studyReminders?: boolean;
    study_reminders?: boolean;
    unlockedAchievements?: boolean;
    unlocked_achievements?: boolean;
    groupActivity?: boolean;
    group_activity?: boolean;
    weeklyReport?: boolean;
    weekly_report?: boolean;
    reminderTime?: string | null;
    reminder_time?: string | null;
    timezone?: string | null;
  };
  stats?: {
    currentStreakDays?: number;
    totalMinutes365?: number;
    totalSessions365?: number;
    ranking?: number;
  };
  achievements?: Array<{
    key: string;
    title?: string;
    description?: string;
    unlocked?: boolean;
    unlockedAt?: string | null;
    unlocked_at?: string | null;
    progress?: number;
    progressTarget?: number;
    progress_target?: number;
    xpReward?: number;
  }>;
  heatmap?: Array<{
    date: string;
    minutes: number;
    sessions: number;
    logins: number;
    level: 0 | 1 | 2 | 3 | 4;
  }>;
};

const PROFILE_CACHE_KEY = 'zb_profile_cache_v2';

const themeLabelFromMode = (value: ThemeMode): PrefThemeValues => {
  if (value === 'dark') return 'Escuro';
  if (value === 'light') return 'Claro';
  return 'Sistema';
};

const themeModeFromLabel = (value: PrefThemeValues): ThemeMode => {
  if (value === 'Escuro') return 'dark';
  if (value === 'Claro') return 'light';
  return 'system';
};

const langLabelFromCode = (value: Lang): PrefLanguageValues => {
  if (value === 'en') return 'English';
  if (value === 'es') return 'Español';
  return 'Português';
};

const langCodeFromLabel = (value: PrefLanguageValues): Lang => {
  if (value === 'English') return 'en';
  if (value === 'Español') return 'es';
  return 'pt';
};

const densityLabelFromCode = (value: Density): PrefDensityValues => {
  if (value === 'compact') return 'Compacto';
  if (value === 'spacious') return 'Espaçoso';
  return 'Normal';
};

const densityCodeFromLabel = (value: PrefDensityValues): Density => {
  if (value === 'Compacto') return 'compact';
  if (value === 'Espaçoso') return 'spacious';
  return 'normal';
};

const periodLabelFromCode = (value: Period): PrefTimeValues => {
  if (value === 'morning') return 'Manhã';
  if (value === 'night') return 'Noite';
  if (value === 'late_night') return 'Madrugada';
  return 'Tarde';
};

const periodCodeFromLabel = (value: PrefTimeValues): Period => {
  if (value === 'Manhã') return 'morning';
  if (value === 'Noite') return 'night';
  if (value === 'Madrugada') return 'late_night';
  return 'afternoon';
};

const getStoredAuthToken = (): string | null => {
  return localStorage.getItem('token') || localStorage.getItem('auth_token');
};

const getAccessToken = async (): Promise<string | null> => {
  const session = await supabase?.auth.getSession();
  return session?.data?.session?.access_token || getStoredAuthToken();
};

const getAuthHeaders = async (isJson = true): Promise<Record<string, string>> => {
  const token = await getAccessToken();
  return {
    ...(isJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const apiGet = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { headers: await getAuthHeaders(false) });
  if (!response.ok) throw new Error(`${response.status}`);
  return (await response.json()) as T;
};

const apiPost = async <T,>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: await getAuthHeaders(true),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return (await response.json()) as T;
};

const uploadAvatarApi = async (file: File): Promise<string> => {
  const token = await getAccessToken();
  const form = new FormData();
  form.append('file', file);

  const response = await fetch('/api/profile/avatar/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!response.ok) throw new Error(`upload_failed_${response.status}`);
  const data = (await response.json()) as { avatarUrl?: string };
  return data.avatarUrl || '';
};

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

/* ─── PALETTE ─────────────────────────────────────────────── */
const getPalette = (isDark: boolean) => ({
  bg: isDark ? '#0f172a' : '#f8f9fc',
  surface: isDark ? '#1e293b' : '#ffffff',
  card: isDark ? '#1e293b' : '#ffffff',
  border: isDark ? '#334155' : '#e8ecf3',
  border2: isDark ? '#475569' : '#d1d9e6',
  accent: '#f97316',
  indigo: '#6366f1',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
  blue: '#3b82f6',
  text: isDark ? '#f8fafc' : '#0f172a',
  sub: isDark ? '#94a3b8' : '#475569',
  muted: isDark ? '#64748b' : '#94a3b8',
  soft: isDark ? '#334155' : '#f1f5f9',
  soft2: isDark ? '#475569' : '#e2e8f0',
});

const L = getPalette(false); // fallback static theme (claro)


/* ─── DATA ────────────────────────────────────────────────── */
const AVATAR_ICONS = [
  { id: 'brain', Icon: Brain, color: '#6366f1' },
  { id: 'book', Icon: BookOpen, color: '#2563eb' },
  { id: 'target', Icon: Target, color: '#dc2626' },
  { id: 'zap', Icon: Zap, color: '#d97706' },
  { id: 'flame', Icon: Flame, color: '#f97316' },
  { id: 'crown', Icon: Crown, color: '#b45309' },
  { id: 'rocket', Icon: Rocket, color: '#7c3aed' },
  { id: 'lightbulb', Icon: Lightbulb, color: '#ca8a04' },
  { id: 'grad', Icon: GraduationCap, color: '#0891b2' },
  { id: 'star', Icon: Star, color: '#f59e0b' },
  { id: 'award', Icon: Award, color: '#16a34a' },
  { id: 'trophy', Icon: Trophy, color: '#d97706' },
];

const ACHIEVEMENTS = [
  { id: 1, Icon: Flame, name: 'Primeira Chama', desc: 'Complete sua primeira sessão', xp: 50, done: true, date: '12 Jan', color: '#f97316' },
  { id: 2, Icon: CalendarDays, name: '7 Dias Seguidos', desc: 'Streak de uma semana completa', xp: 150, done: true, date: '19 Jan', color: '#6366f1' },
  { id: 3, Icon: Trophy, name: 'Top 100', desc: 'Entre no top 100 do ranking', xp: 300, done: true, date: '25 Jan', color: '#d97706' },
  { id: 4, Icon: Lightbulb, name: 'Mestre das Questões', desc: 'Responda 500 questões', xp: 400, done: false, need: '247 / 500 questões', color: '#6366f1' },
  { id: 5, Icon: Rocket, name: 'Maratona', desc: 'Estude 10h em um único dia', xp: 500, done: false, need: 'Recorde: 4h 12min', color: '#7c3aed' },
  { id: 6, Icon: Star, name: 'Lenda', desc: 'Alcance o nível 10', xp: 1000, done: false, need: 'Nível 2 / 10', color: '#d97706' },
];

const PROVAS = ['ENEM', 'FUVEST', 'UNICAMP', 'PUC', 'ITA', 'IME', 'Concurso', 'Direito', 'Engenharia'];
const TRILHAS = ['ENEM', 'Ciências da Natureza', 'Matemática', 'Linguagens', 'Ciências Humanas', 'Concurso', 'Direito', 'Engenharia'];

/* ─── UTILS ──────────────────────────────────────────────── */
function Counter({ to, duration = 1000 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let cur = 0;
    const step = to / (duration / 16);
    const id = setInterval(() => {
      cur = Math.min(cur + step, to);
      setVal(Math.floor(cur));
      if (cur >= to) {
        clearInterval(id);
      }
    }, 16);

    return () => clearInterval(id);
  }, [to, duration]);

  return <>{val}</>;
}

/* ─── XP RING ─────────────────────────────────────────────── */
function XPRing({ current = 555, max = 2000, color = L.accent, size = 116 }: { current?: number; max?: number; color?: string; size?: number }) {
  const [prog, setProg] = useState(0);
  const pct = max > 0 ? current / max : 0;
  const r = 46;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    const t = setTimeout(() => setProg(pct), 400);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={L.soft2} strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - prog)}
          style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <div style={{ fontSize: 9, color: L.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Nível</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: L.text, lineHeight: 1, fontFamily: "'Syne',sans-serif" }}>2</div>
        <div style={{ fontSize: 9, color, fontWeight: 700 }}>{Math.round(pct * 100)}%</div>
      </div>
    </div>
  );
}

/* ─── AVATAR DISPLAY ─────────────────────────────────────── */
function AvatarDisplay({ iconId, photo, size = 72, color = L.accent }: { iconId: string; photo: string | null; size?: number; color?: string }) {
  const found = AVATAR_ICONS.find((a) => a.id === iconId);
  const Ic = found?.Icon || Brain;
  const c = found?.color || color;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: `${c}14`,
        border: `2.5px solid ${c}33`,
        boxShadow: `0 0 0 4px ${c}0e, 0 4px 20px ${c}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {photo ? <img src={photo} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Ic size={size * 0.42} color={c} strokeWidth={1.8} />}
    </div>
  );
}

/* ─── CARD ───────────────────────────────────────────────── */
function Card({ children, style = {}, accentTop }: { children: React.ReactNode; style?: React.CSSProperties; accentTop?: string }) {
  return (
    <div
      style={{
        background: L.surface,
        border: `1px solid ${L.border}`,
        borderRadius: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,.04), 0 4px 24px rgba(0,0,0,.04)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {accentTop && <div style={{ height: 3, background: `linear-gradient(90deg,${accentTop},${accentTop}88)`, borderRadius: '20px 20px 0 0' }} />}
      {children}
    </div>
  );
}

/* ─── SECTION LABEL ──────────────────────────────────────── */
function SLabel({ color = L.accent, icon: Icon, children }: { color?: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 18 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: `${color}14`,
          border: `1px solid ${color}28`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={13} color={color} strokeWidth={2.2} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color }}>{children}</span>
    </div>
  );
}

/* ─── FIELD WRAPPER ──────────────────────────────────────── */
function Field({ label, children, mb = 16 }: { label: React.ReactNode; children: React.ReactNode; mb?: number }) {
  return (
    <div style={{ marginBottom: mb }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: L.sub, display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

/* ─── INPUT ──────────────────────────────────────────────── */
function Input({
  value,
  onChange,
  readOnly,
  placeholder,
  type = 'text',
  style = {},
}: {
  value: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  readOnly?: boolean;
  placeholder?: string;
  type?: string;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      className="pf-input"
      style={{
        width: '100%',
        background: readOnly ? L.soft : L.surface,
        border: `1px solid ${L.border2}`,
        borderRadius: 12,
        padding: '10px 14px',
        color: readOnly ? L.muted : L.text,
        fontSize: 13.5,
        cursor: readOnly ? 'not-allowed' : 'text',
        ...style,
      }}
    />
  );
}

/* ─── SELECT ─────────────────────────────────────────────── */
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="pf-input"
      style={{
        width: '100%',
        background: L.surface,
        border: `1px solid ${L.border2}`,
        borderRadius: 12,
        padding: '10px 14px',
        color: L.text,
        fontSize: 13.5,
        appearance: 'none',
        cursor: 'pointer',
      }}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

function HeatmapGrid({ data, palette }: { data: NonNullable<ProfileLoadResponse['heatmap']>; palette: ReturnType<typeof getPalette> }) {
  const map = new Map(data.map((day) => [day.date, day.level]));
  const days: string[] = [];
  const now = new Date();

  for (let i = 364; i >= 0; i -= 1) {
    const dt = new Date(now);
    dt.setDate(now.getDate() - i);
    days.push(dt.toISOString().slice(0, 10));
  }

  const levelColor = (level: number): string => {
    if (level === 0) return palette.soft2;
    if (level === 1) return '#c7d2fe';
    if (level === 2) return '#93c5fd';
    if (level === 3) return '#60a5fa';
    return '#2563eb';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(53, 10px)', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
      {days.map((date) => {
        const level = map.get(date) ?? 0;
        return (
          <div
            key={date}
            title={`${date} • nível ${level}`}
            style={{ width: 10, height: 10, borderRadius: 2, background: levelColor(level), flexShrink: 0 }}
          />
        );
      })}
    </div>
  );
}

/* ─── TOGGLE ──────────────────────────────────────────────── */
function Toggle({ on, color = L.indigo, onToggle }: { on: boolean; color?: string; onToggle?: (next: boolean) => void }) {
  return (
    <div
      onClick={() => onToggle?.(!on)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: on ? color : L.border2,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background .2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 20 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .2s',
          boxShadow: '0 1px 4px rgba(0,0,0,.2)',
        }}
      />
    </div>
  );
}

function mapTrackFromTrilha(value: string): 'enem' | 'concursos' | 'hibrido' {
  if (value.toLowerCase().includes('enem')) {
    return 'enem';
  }

  if (value.toLowerCase().includes('direito') || value.toLowerCase().includes('engenharia') || value.toLowerCase().includes('concurso')) {
    return 'hibrido';
  }

  return 'concursos';
}

/* ══════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════ */
export default function SettingsPage({
  userData,
  userName,
  userEmail,
  profileAvatar,
  profileExamGoal,
  profileExamDate,
  preferredStudyTrack,
  darkMode,
  weeklyGoalMinutes,
  onToggleDarkMode,
  onSelectTheme,
  onSaveProfile,
}: SettingsPageProps) {
  const initialAvatar = useMemo(
    () => AVATAR_ICONS.find((item) => item.id === profileAvatar)?.id || 'brain',
    [profileAvatar],
  );
  const initialPhoto = useMemo(
    () => (profileAvatar && (/^data:image\//i.test(profileAvatar) || /^https?:\/\//i.test(profileAvatar)) ? profileAvatar : null),
    [profileAvatar],
  );

  const [avatarId, setAvatarId] = useState(initialAvatar);
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [name, setName] = useState(userName || 'Lin');
  const [prova, setProva] = useState(profileExamGoal || 'ENEM');
  const [trilha, setTrilha] = useState(preferredStudyTrack === 'enem' ? 'ENEM' : preferredStudyTrack === 'hibrido' ? 'Concurso' : 'Direito');
  const [dataProva, setData] = useState(profileExamDate || '');
  const [metaMin, setMeta] = useState(weeklyGoalMinutes || 1230);
  const [editMeta, setEditMeta] = useState(false);
  const [metaTmp, setMetaTmp] = useState(String(weeklyGoalMinutes || 1230));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [tab, setTab] = useState('perfil');
  const [mounted, setMounted] = useState(false);
  const [hoverAch, setHoverAch] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState(userEmail || '');
  const [heatmap, setHeatmap] = useState<NonNullable<ProfileLoadResponse['heatmap']>>([]);
  const [cloudAchievements, setCloudAchievements] = useState<NonNullable<ProfileLoadResponse['achievements']>>([]);
  const [statsSummary, setStatsSummary] = useState<{ streakDays?: number; totalHours?: number; sessions?: number; ranking?: number }>({});
  const [notifStudy, setNotifStudy] = useState(true);
  const [notifAchievements, setNotifAchievements] = useState(true);
  const [notifGroup, setNotifGroup] = useState(false);
  const [notifWeekly, setNotifWeekly] = useState(true);

  const [prefTheme, setPrefTheme] = useState<PrefThemeValues>(darkMode ? 'Escuro' : 'Claro');
  const [prefLang, setPrefLang] = useState<PrefLanguageValues>('Português');
  const [prefDensity, setPrefDensity] = useState<PrefDensityValues>('Normal');
  const [prefTime, setPrefTime] = useState<PrefTimeValues>('Tarde');


  const theme = getPalette(darkMode);
  const accent = theme.accent;
  const studiedMin = useMemo(
    () => Object.values(userData.weekProgress || {}).reduce((acc, day) => acc + (day?.minutes || 0), 0),
    [userData.weekProgress],
  );
  const sessionsCount = (userData.sessions || userData.studyHistory || []).length;
  const metaPct = metaMin > 0 ? Math.min(100, (studiedMin / metaMin) * 100) : 0;

  const stats = useMemo(
    () => [
      {
        label: 'Streak',
        val: statsSummary.streakDays ?? userData.currentStreak ?? userData.streak ?? 0,
        unit: 'dias',
        Icon: Flame,
        color: '#f97316',
        bg: '#fff7ed',
        border: '#fed7aa',
      },
      {
        label: 'Horas Estudadas',
        val: statsSummary.totalHours ?? Math.floor((userData.totalPoints || 0) / 10),
        unit: 'horas',
        Icon: Timer,
        color: '#6366f1',
        bg: '#eef2ff',
        border: '#c7d2fe',
      },
      {
        label: 'Simulados',
        val: statsSummary.sessions ?? sessionsCount,
        unit: 'sessões',
        Icon: FileText,
        color: '#16a34a',
        bg: '#f0fdf4',
        border: '#bbf7d0',
      },
      {
        label: 'Ranking',
        val: statsSummary.ranking ?? Math.max(1, 120 - (userData.level || 1) * 3),
        unit: 'global',
        Icon: BarChart2,
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
      },
    ],
    [sessionsCount, statsSummary.ranking, statsSummary.sessions, statsSummary.streakDays, statsSummary.totalHours, userData.currentStreak, userData.level, userData.streak, userData.totalPoints],
  );

  useEffect(() => {
    const storedTheme = localStorage.getItem('settings-pref-theme') as 'Claro' | 'Escuro' | 'Sistema' | null;
    const storedLang = localStorage.getItem('settings-pref-lang') as 'Português' | 'English' | 'Español' | null;
    const storedDensity = localStorage.getItem('settings-pref-density') as 'Compacto' | 'Normal' | 'Espaçoso' | null;
    const storedTime = localStorage.getItem('settings-pref-time') as 'Manhã' | 'Tarde' | 'Noite' | 'Madrugada' | null;

    if (storedTheme) {
      setPrefTheme(storedTheme);
    }
    if (storedLang) {
      setPrefLang(storedLang);
    }
    if (storedDensity) {
      setPrefDensity(storedDensity);
    }
    if (storedTime) {
      setPrefTime(storedTime);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => setMounted(true), 80);
  }, []);

  useEffect(() => {
    if (prefTheme === 'Claro' && darkMode) {
      onToggleDarkMode();
    }
    if (prefTheme === 'Escuro' && !darkMode) {
      onToggleDarkMode();
    }

    if (prefTheme !== 'Sistema') {
      onSelectTheme(prefTheme.toLowerCase());
    }

    localStorage.setItem('settings-pref-theme', prefTheme);
    localStorage.setItem('settings-pref-lang', prefLang);
    localStorage.setItem('settings-pref-density', prefDensity);
    localStorage.setItem('settings-pref-time', prefTime);
  }, [prefTheme, prefLang, prefDensity, prefTime, darkMode, onToggleDarkMode, onSelectTheme]);

  useEffect(() => {
    setName(userName || 'Lin');
  }, [userName]);

  useEffect(() => {
    setEmail(userEmail || '');
  }, [userEmail]);

  useEffect(() => {
    setProva(profileExamGoal || 'ENEM');
  }, [profileExamGoal]);

  useEffect(() => {
    setData(profileExamDate || '');
  }, [profileExamDate]);

  useEffect(() => {
    setMeta(weeklyGoalMinutes || 1230);
    setMetaTmp(String(weeklyGoalMinutes || 1230));
  }, [weeklyGoalMinutes]);

  useEffect(() => {
    setAvatarId(initialAvatar);
    setPhoto(initialPhoto);
  }, [initialAvatar, initialPhoto]);

  useEffect(() => {
    let alive = true;

    const hydrateFromPayload = (data: ProfileLoadResponse) => {
      const profile = data.profile || {};
      const notifications = data.notifications || {};
      const loadedName = profile.displayName || profile.display_name || '';
      const loadedEmail = profile.email || '';
      const loadedAvatarIcon = profile.avatarIcon || profile.avatar_icon || 'brain';
      const loadedAvatarUrl = profile.avatarUrl || profile.avatar_url || '';
      const loadedTheme = profile.theme || 'system';
      const loadedLang = profile.language || 'pt';
      const loadedDensity = profile.density || 'normal';
      const loadedPeriod = profile.preferredPeriod || profile.preferred_period || 'morning';

      setName(loadedName || userName || 'Lin');
      setEmail(loadedEmail || userEmail || '');
      setAvatarId(loadedAvatarIcon);
      setPhoto(loadedAvatarUrl || null);

      setPrefTheme(themeLabelFromMode(loadedTheme));
      setPrefLang(langLabelFromCode(loadedLang));
      setPrefDensity(densityLabelFromCode(loadedDensity));
      setPrefTime(periodLabelFromCode(loadedPeriod));

      setNotifStudy(Boolean(notifications.studyReminders ?? notifications.study_reminders ?? true));
      setNotifAchievements(Boolean(notifications.unlockedAchievements ?? notifications.unlocked_achievements ?? true));
      setNotifGroup(Boolean(notifications.groupActivity ?? notifications.group_activity ?? false));
      setNotifWeekly(Boolean(notifications.weeklyReport ?? notifications.weekly_report ?? true));

      setHeatmap(data.heatmap || []);
      setCloudAchievements(data.achievements || []);

      const totalMinutes = Number(data.stats?.totalMinutes365 || 0);
      setStatsSummary({
        streakDays: Number(data.stats?.currentStreakDays || 0),
        totalHours: Math.floor(totalMinutes / 60),
        sessions: Number(data.stats?.totalSessions365 || 0),
        ranking: Number(data.stats?.ranking || Math.max(1, 120 - (userData.level || 1) * 3)),
      });
    };

    const load = async () => {
      setLoadingProfile(true);
      try {
        const data = await apiGet<ProfileLoadResponse>('/api/profile/load');
        if (!alive) return;
        hydrateFromPayload(data);
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
      } catch {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (!cached || !alive) return;

        try {
          const cachedPayload = JSON.parse(cached) as ProfileLoadResponse;
          hydrateFromPayload(cachedPayload);
        } catch {
          // noop: cache corrompido
        }
      } finally {
        if (alive) setLoadingProfile(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [userData.level, userEmail, userName]);

  useEffect(() => {
    const run = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const key = `zb_login_tracked_${today}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      try {
        await apiPost('/api/activity/track', { date: today, loginCount: 1 });
      } catch {
        // sem bloqueio de UX
      }
    };
    void run();
  }, []);

  const mark = () => setDirty(true);

  const applyDocumentPreferences = () => {
    localStorage.setItem('settings-pref-theme', prefTheme);

    const resolvedTheme = prefTheme === 'Escuro'
      ? 'dark'
      : prefTheme === 'Claro'
        ? 'light'
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.setAttribute('lang', langCodeFromLabel(prefLang));
  };

  const parsePreferredTrack = (track: string): 'enem' | 'concursos' | 'hibrido' => {
    if (track === 'enem' || track === 'hibrido' || track === 'concursos') {
      return track;
    }
    return mapTrackFromTrilha(trilha);
  };

  async function handleSave() {
    const localPayload = {
      name: name.trim() || 'Estudante',
      avatar: photo || avatarId,
      examGoal: prova,
      examDate: dataProva,
      preferredTrack: mapTrackFromTrilha(trilha),
    };

    const cloudPayload = {
      displayName: name.trim() || 'Estudante',
      email: email || undefined,
      avatarIcon: avatarId,
      avatarUrl: photo || null,
      theme: themeModeFromLabel(prefTheme),
      language: langCodeFromLabel(prefLang),
      density: densityCodeFromLabel(prefDensity),
      preferredPeriod: periodCodeFromLabel(prefTime),
    };

    let cloudOk = false;
    let localOk = false;
    let feedbackMessage = 'Perfil salvo com sucesso!';
    setSavingProfile(true);

    try {
      try {
        await apiPost('/api/profile/save', cloudPayload);
        cloudOk = true;
      } catch {
        localStorage.setItem(
          PROFILE_CACHE_KEY,
          JSON.stringify({
            profile: {
              displayName: cloudPayload.displayName,
              email: cloudPayload.email || '',
              avatarIcon: cloudPayload.avatarIcon,
              avatarUrl: cloudPayload.avatarUrl,
              theme: cloudPayload.theme,
              language: cloudPayload.language,
              density: cloudPayload.density,
              preferredPeriod: cloudPayload.preferredPeriod,
            },
          } as ProfileLoadResponse),
        );
      }

      const result = await onSaveProfile({
        ...localPayload,
        preferredTrack: parsePreferredTrack(localPayload.preferredTrack),
      });

      localOk = Boolean(result.success);
      feedbackMessage = result.message || feedbackMessage;

      if (cloudOk || localOk) {
        applyDocumentPreferences();
        setDirty(false);
        setSaved(true);
        toast.success(cloudOk ? feedbackMessage : 'Perfil salvo localmente (modo fallback).');
        setTimeout(() => setSaved(false), 2500);
        return;
      }

      toast.error(feedbackMessage || 'Não foi possível salvar o perfil.');
    } catch {
      toast.error('Erro ao salvar perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveNotifications() {
    setSavingNotifications(true);
    try {
      await apiPost('/api/profile/notifications', {
        studyReminders: notifStudy,
        unlockedAchievements: notifAchievements,
        groupActivity: notifGroup,
        weeklyReport: notifWeekly,
      });
      toast.success('Notificações salvas com sucesso!');
      setDirty(false);
    } catch {
      localStorage.setItem(
        `${PROFILE_CACHE_KEY}:notifications`,
        JSON.stringify({
          studyReminders: notifStudy,
          unlockedAchievements: notifAchievements,
          groupActivity: notifGroup,
          weeklyReport: notifWeekly,
        }),
      );
      toast.error('Falha na API. Preferências mantidas localmente.');
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    if (photo && photo.startsWith('blob:')) {
      URL.revokeObjectURL(photo);
    }

    const localPreview = URL.createObjectURL(file);
    setPhoto(localPreview);
    mark();

    try {
      const uploadedUrl = await uploadAvatarApi(file);
      if (uploadedUrl) {
        setPhoto(uploadedUrl);
        toast.success('Avatar enviado e sincronizado!');
      }
    } catch {
      toast.error('Upload em nuvem indisponível. Avatar salvo localmente.');
    }

  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      return;
    }

    await handleAvatarUpload(f);
    e.target.value = '';
  }

  const achievementVisual = useMemo(
    () => ({
      first_session: { Icon: Flame, color: '#f97316', fallbackName: 'Primeira Chama', fallbackDesc: 'Complete sua primeira sessão', fallbackXp: 50 },
      streak_7: { Icon: CalendarDays, color: '#6366f1', fallbackName: '7 Dias Seguidos', fallbackDesc: 'Streak de uma semana completa', fallbackXp: 150 },
      top_100: { Icon: Trophy, color: '#d97706', fallbackName: 'Top 100', fallbackDesc: 'Entre no top 100 do ranking', fallbackXp: 300 },
      default: { Icon: Award, color: '#16a34a', fallbackName: 'Conquista', fallbackDesc: 'Continue evoluindo para desbloquear.', fallbackXp: 100 },
    }),
    [],
  );

  const achievementsForView = useMemo(() => {
    if (!cloudAchievements.length) {
      return ACHIEVEMENTS.map((item) => ({
        id: item.id,
        key: `local-${item.id}`,
        name: item.name,
        desc: item.desc,
        xp: item.xp,
        done: item.done,
        need: item.need,
        date: item.date,
        Icon: item.Icon,
        color: item.color,
      }));
    }

    return cloudAchievements.map((item, index) => {
      const visual = achievementVisual[item.key as keyof typeof achievementVisual] || achievementVisual.default;
      const unlockedAt = item.unlockedAt || item.unlocked_at || null;
      const target = Number(item.progressTarget ?? item.progress_target ?? 1);
      const progress = Number(item.progress ?? 0);

      return {
        id: index + 1,
        key: item.key,
        name: item.title || visual.fallbackName,
        desc: item.description || visual.fallbackDesc,
        xp: Number(item.xpReward || visual.fallbackXp),
        done: Boolean(item.unlocked),
        need: `${progress} / ${target}`,
        date: unlockedAt ? new Date(unlockedAt).toLocaleDateString('pt-BR') : undefined,
        Icon: visual.Icon,
        color: visual.color,
      };
    });
  }, [achievementVisual, cloudAchievements]);

  const daysLeft = dataProva
    ? Math.max(0, Math.round((new Date(dataProva).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const TABS = [
    { key: 'perfil', label: 'Perfil', Icon: User },
    { key: 'estatísticas', label: 'Estatísticas', Icon: BarChart2 },
    { key: 'conquistas', label: 'Conquistas', Icon: Trophy },
    { key: 'preferências', label: 'Preferências', Icon: Settings },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: theme.bg, minHeight: '100vh', color: theme.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px;}
        input,select,button,textarea{font-family:'DM Sans',sans-serif;outline:none;}
        select option{background:#fff;color:#0f172a;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes badgePop{0%{opacity:0;transform:scale(.9) translateY(8px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .pf-input{transition:border-color .2s,box-shadow .2s;}
        .pf-input:focus{border-color:${accent}!important;box-shadow:0 0 0 3px ${accent}18!important;}
        .tab-btn{transition:all .18s;} .tab-btn:hover{background:${theme.soft}!important;}
        .av-chip{transition:all .15s;cursor:pointer;} .av-chip:hover{transform:scale(1.1);}
        .ach-card{transition:all .22s;cursor:default;} .ach-card:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.1)!important;}
        .stat-card{transition:transform .2s,box-shadow .2s;} .stat-card:hover{transform:translateY(-4px);box-shadow:0 12px 36px rgba(0,0,0,.09)!important;}
        .btn{transition:all .18s;cursor:pointer;} .btn:hover{filter:brightness(.96);}
        .btn-primary{transition:all .18s;cursor:pointer;} .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px ${accent}44!important;}
        .save-float{animation:slideUp .3s ease;}
        .toast{animation:slideUp .3s ease;}
        @media(max-width:780px){
          .hero-inner{flex-direction:column!important;align-items:flex-start!important;}
          .two-col{grid-template-columns:1fr!important;}
          .four-col{grid-template-columns:1fr 1fr!important;}
        }
      `}</style>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: 'radial-gradient(#94a3b820 1px,transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1080, margin: '0 auto', padding: '36px 24px 100px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 32,
            opacity: mounted ? 1 : 0,
            animation: mounted ? 'fadeUp .5s ease both' : '',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent, animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: L.muted, letterSpacing: 1.6, textTransform: 'uppercase' }}>Zero Base · Meu Perfil</span>
              {loadingProfile && <span style={{ fontSize: 10.5, color: accent, fontWeight: 700 }}>Sincronizando...</span>}
            </div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 30, fontWeight: 800, color: L.text, letterSpacing: '-0.8px', lineHeight: 1.1 }}>
              Configurações de perfil
            </h1>
            <p style={{ fontSize: 13.5, color: L.sub, marginTop: 5 }}>Gerencie sua identidade, metas e preferências de estudo</p>
          </div>
          {dirty && (
            <div style={{ display: 'flex', gap: 8, animation: 'fadeIn .2s ease' }}>
              <button
                className="btn"
                onClick={() => setDirty(false)}
                style={{ padding: '9px 18px', borderRadius: 12, border: `1px solid ${L.border2}`, background: L.surface, color: L.sub, fontSize: 13, fontWeight: 600 }}
              >
                Descartar
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={savingProfile}
                style={{
                  padding: '9px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: accent,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  boxShadow: `0 4px 14px ${accent}44`,
                  opacity: savingProfile ? 0.75 : 1,
                }}
              >
                <Save size={14} />{savingProfile ? 'Salvando...' : 'Salvar perfil'}
              </button>
            </div>
          )}
        </div>

        <div style={{ opacity: mounted ? 1 : 0, animation: mounted ? 'fadeUp .5s .08s ease both' : '', marginBottom: 24 }}>
          <Card accentTop={accent}>
            <div className="hero-inner" style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '28px 32px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <XPRing current={userData.totalPoints || 555} max={Math.max((userData.level || 2) * 1000, 2000)} color={accent} size={108} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AvatarDisplay iconId={avatarId} photo={photo} size={66} />
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: accent,
                    border: '2px solid #fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,.2)',
                  }}
                >
                  <Camera size={11} color="#fff" strokeWidth={2.5} />
                </button>
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: L.text, letterSpacing: '-0.5px' }}>{name}</h2>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${accent}12`, color: accent, border: `1px solid ${accent}28` }}>
                    NÍV. {userData.level || 1}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                    Estudante
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 20,
                      background: '#fef3c7',
                      color: '#d97706',
                      border: '1px solid #fde68a',
                    }}
                  >
                    <Sparkles size={10} />Sincronizado
                  </span>
                </div>
                <p style={{ fontSize: 13, color: L.muted, marginBottom: 14 }}>{email || userEmail || 'conta@zero-base.app'}</p>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11.5, color: L.sub, fontWeight: 600 }}>Progresso para próximo nível</span>
                    <span style={{ fontSize: 11.5, color: accent, fontWeight: 700 }}>{userData.totalPoints || 0} XP</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 20, background: L.soft2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 20,
                        width: `${Math.min(100, (((userData.totalPoints || 0) % 1000) / 1000) * 100)}%`,
                        background: `linear-gradient(90deg,${accent},#f59e0b)`,
                        boxShadow: `0 0 10px ${accent}44`,
                        transition: 'width 1.2s cubic-bezier(.4,0,.2,1)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {stats.map((s) => (
                  <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '12px 16px', minWidth: 76 }}>
                    <s.Icon size={18} color={s.color} strokeWidth={2} style={{ marginBottom: 5 }} />
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: s.color, fontWeight: 600, marginTop: 2, opacity: 0.8 }}>{s.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 3,
            marginBottom: 26,
            background: L.surface,
            borderRadius: 14,
            padding: 5,
            border: `1px solid ${L.border}`,
            width: 'fit-content',
            opacity: mounted ? 1 : 0,
            animation: mounted ? 'fadeUp .5s .16s ease both' : '',
          }}
        >
          {TABS.map(({ key, label, Icon: TabIcon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                className="tab-btn"
                onClick={() => setTab(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 18px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  background: active ? theme.surface : 'transparent',
                  color: active ? theme.text : theme.muted,
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.06)' : 'none',
                }}
              >
                <TabIcon size={14} strokeWidth={active ? 2.4 : 2} color={active ? accent : theme.muted} />
                {label}
              </button>
            );
          })}
        </div>

        {tab === 'perfil' && (
          <ProfileV2
            displayName={name}
            email={email || userEmail || ''}
            avatarIcon={avatarId}
            avatarUrl={photo || ''}
            onChangeDisplayName={(value) => {
              setName(value);
              mark();
            }}
            onSelectAvatar={(value) => {
              setAvatarId(value);
              setPhoto(null);
              mark();
            }}
            onUploadAvatar={handleAvatarUpload}
            onSave={handleSave}
            saving={savingProfile}
          />
        )}

        {tab === 'estatísticas' && (
          <ProfileStatsV2
            heatmap={heatmap}
            streakDays={statsSummary.streakDays || 0}
            totalHours={statsSummary.totalHours || 0}
            sessions={statsSummary.sessions || 0}
            ranking={statsSummary.ranking || 0}
          />
        )}

        {tab === 'conquistas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16, animation: 'fadeUp .3s ease' }}>
            {achievementsForView.map((a, i) => (
              <div
                key={a.key}
                className="ach-card"
                onMouseEnter={() => setHoverAch(a.id)}
                onMouseLeave={() => setHoverAch(null)}
                style={{
                  background: a.done ? L.surface : L.soft,
                  border: `1.5px solid ${a.done ? `${a.color}33` : L.border}`,
                  borderRadius: 18,
                  padding: '20px 22px',
                  opacity: a.done ? 1 : 0.75,
                  boxShadow: a.done && hoverAch === a.id ? `0 12px 40px ${a.color}18` : '0 2px 12px rgba(0,0,0,.05)',
                  animation: `badgePop .4s ${i * 0.06}s ease both`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {a.done && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${a.color},${a.color}66)` }} />}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      flexShrink: 0,
                      background: a.done ? `${a.color}14` : L.soft2,
                      border: `1.5px solid ${a.done ? `${a.color}33` : L.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: a.done ? `0 0 16px ${a.color}22` : 'none',
                      position: 'relative',
                    }}
                  >
                    <a.Icon size={22} color={a.done ? a.color : L.muted} strokeWidth={1.8} />
                    {!a.done && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.7)', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={13} color={L.muted} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: a.done ? L.text : L.sub }}>{a.name}</div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: a.done ? a.color : L.muted,
                          background: a.done ? `${a.color}14` : L.soft2,
                          borderRadius: 20,
                          padding: '2px 9px',
                          border: `1px solid ${a.done ? `${a.color}28` : L.border}`,
                        }}
                      >
                        +{a.xp} XP
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: L.muted, marginBottom: a.done ? 6 : 8, lineHeight: 1.5 }}>{a.desc}</div>
                    {a.done ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: L.green, fontWeight: 600 }}>
                        <CheckCircle size={12} />Desbloqueado {a.date ? `em ${a.date}` : ''}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: L.muted }}>
                        <Lock size={11} />{a.need}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'preferências' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, animation: 'fadeUp .3s ease' }} className="two-col">
            <Card accentTop={L.indigo} style={{ padding: '26px 28px' }}>
              <SLabel color={L.indigo} icon={Bell}>Notificações</SLabel>
              {[
                { label: 'Lembretes de estudo', desc: 'Aviso diário na hora configurada', Icon: BellRing, on: notifStudy, setter: setNotifStudy },
                { label: 'Conquistas desbloqueadas', desc: 'Notifique ao ganhar badges', Icon: Award, on: notifAchievements, setter: setNotifAchievements },
                { label: 'Atividade do grupo', desc: 'Mensagens e novidades nos grupos', Icon: Bell, on: notifGroup, setter: setNotifGroup },
                { label: 'Relatório semanal', desc: 'Resumo de desempenho todo domingo', Icon: FileText, on: notifWeekly, setter: setNotifWeekly },
              ].map((n, i) => (
                <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: i < 3 ? `1px solid ${L.border}` : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: n.on ? '#eef2ff' : L.soft, border: `1px solid ${n.on ? '#c7d2fe' : L.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <n.Icon size={15} color={n.on ? L.indigo : L.muted} strokeWidth={1.8} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: L.text }}>{n.label}</div>
                    <div style={{ fontSize: 11.5, color: L.muted }}>{n.desc}</div>
                  </div>
                  <Toggle
                    on={n.on}
                    color={L.indigo}
                    onToggle={(next) => {
                      n.setter(next);
                      mark();
                    }}
                  />
                </div>
              ))}
              <button
                className="btn-primary"
                onClick={() => {
                  void handleSaveNotifications();
                }}
                disabled={savingNotifications}
                style={{
                  marginTop: 14,
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: L.indigo,
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  opacity: savingNotifications ? 0.7 : 1,
                }}
              >
                {savingNotifications ? 'Salvando notificações...' : 'Salvar notificações'}
              </button>
            </Card>

            <Card accentTop={accent} style={{ padding: '26px 28px' }}>
              <SLabel color={accent} icon={Palette}>Aparência</SLabel>
              {[
                { label: 'Tema', opts: [{ l: 'Claro', Icon: Sun }, { l: 'Escuro', Icon: Moon }, { l: 'Sistema', Icon: Globe }], value: prefTheme, setValue: setPrefTheme },
                { label: 'Idioma', opts: [{ l: 'Português', Icon: Globe }, { l: 'English', Icon: Globe }, { l: 'Español', Icon: Globe }], value: prefLang, setValue: setPrefLang },
                { label: 'Densidade', opts: [{ l: 'Compacto', Icon: Minus }, { l: 'Normal', Icon: AlignJustify }, { l: 'Espaçoso', Icon: LayoutDashboard }], value: prefDensity, setValue: setPrefDensity },
              ].map((f) => (
                <Field key={f.label} label={f.label}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {f.opts.map((o) => (
                      <button
                        key={`${f.label}-${o.l}`}
                        onClick={() => {
                          if (f.label === 'Tema') {
                            setPrefTheme(o.l as PrefThemeValues);
                          }
                          if (f.label === 'Idioma') {
                            setPrefLang(o.l as PrefLanguageValues);
                          }
                          if (f.label === 'Densidade') {
                            setPrefDensity(o.l as PrefDensityValues);
                          }
                          mark();
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          borderRadius: 10,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          border: `1.5px solid ${f.value === o.l ? `${accent}55` : theme.border}`,
                          background: f.value === o.l ? `${accent}0e` : theme.soft,
                          color: f.value === o.l ? accent : theme.sub,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          transition: 'all .15s',
                        }}
                      >
                        <o.Icon size={12} strokeWidth={2} />
                        {o.l}
                      </button>
                    ))}
                  </div>
                </Field>
              ))}
              <div style={{ borderTop: `1px solid ${L.border}`, paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: L.sub, marginBottom: 9 }}>Horário preferido</div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {[
                    { l: 'Manhã', Icon: Sunrise },
                    { l: 'Tarde', Icon: Sun },
                    { l: 'Noite', Icon: Sunset },
                    { l: 'Madrugada', Icon: Moon },
                  ].map(({ l, Icon: HIcon }) => (
                    <button
                      key={l}
                      onClick={() => {
                        setPrefTime(l as PrefTimeValues);
                        mark();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1.5px solid ${prefTime === l ? `${accent}55` : theme.border}`,
                        background: prefTime === l ? `${accent}0e` : theme.soft,
                        color: prefTime === l ? accent : theme.sub,
                        transition: 'all .15s',
                      }}
                    >
                      <HIcon size={12} strokeWidth={2} />
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card accentTop={L.red} style={{ padding: '26px 28px', gridColumn: '1 / -1' }}>
              <SLabel color={L.red} icon={Shield}>Segurança & Conta</SLabel>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Exportar meus dados', Icon: Download, color: L.indigo, bg: '#eef2ff', border: '#c7d2fe' },
                  { label: 'Redefinir progresso', Icon: Timer, color: L.amber, bg: '#fffbeb', border: '#fde68a' },
                  { label: 'Excluir conta', Icon: Trash2, color: L.red, bg: '#fef2f2', border: '#fecaca' },
                ].map((b) => (
                  <button
                    key={b.label}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 20px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      border: `1.5px solid ${b.border}`,
                      background: b.bg,
                      color: b.color,
                    }}
                  >
                    <b.Icon size={15} strokeWidth={2} />
                    {b.label}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {dirty && !saved && (
          <div
            className="save-float"
            style={{
              position: 'fixed',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: L.surface,
              border: `1.5px solid ${L.border}`,
              borderRadius: 18,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 8px 40px rgba(0,0,0,.14), 0 2px 10px rgba(0,0,0,.06)',
              zIndex: 100,
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent, animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: L.text }}>Alterações não salvas</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn"
                onClick={() => setDirty(false)}
                style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${L.border2}`, background: L.soft, color: L.sub, fontSize: 13, fontWeight: 600 }}
              >
                Descartar
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={savingProfile}
                style={{
                  padding: '8px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: accent,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  boxShadow: `0 4px 14px ${accent}44`,
                  opacity: savingProfile ? 0.75 : 1,
                }}
              >
                <Save size={14} />{savingProfile ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {saved && (
          <div
            className="toast"
            style={{
              position: 'fixed',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: 14,
              padding: '12px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,.1)',
              zIndex: 100,
            }}
          >
            <CheckCircle size={16} color={L.green} />
            <span style={{ fontSize: 13, fontWeight: 600, color: L.green }}>Perfil salvo com sucesso!</span>
          </div>
        )}
      </div>
    </div>
  );
}
