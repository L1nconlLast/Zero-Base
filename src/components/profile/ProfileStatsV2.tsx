import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { getProfileSettingsCopy, type ProfileSettingsLocale } from './profileSettingsCopy';

type Heat = {
  date: string;
  minutes: number;
  sessions: number;
  logins: number;
  level: 0 | 1 | 2 | 3 | 4;
};

type Props = {
  heatmap: Heat[];
  streakDays?: number;
  totalHours?: number;
  sessions?: number;
  ranking?: number;
  totalMinutes?: number;
  daysWithActivity?: number;
  locale?: ProfileSettingsLocale;
};

function levelColor(level: number) {
  if (level === 0) return '#e2e8f0';
  if (level === 1) return '#bfdbfe';
  if (level === 2) return '#93c5fd';
  if (level === 3) return '#60a5fa';
  return '#2563eb';
}

function buildLast365Days() {
  const out: string[] = [];
  const now = new Date();
  for (let i = 364; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default function ProfileStatsV2({
  heatmap,
  streakDays = 0,
  totalHours = 0,
  sessions = 0,
  ranking = 0,
  totalMinutes = 0,
  daysWithActivity = 0,
  locale = 'pt',
}: Props) {
  const copy = getProfileSettingsCopy(locale);
  const days = useMemo(() => buildLast365Days(), []);
  const byDate = useMemo(() => new Map(heatmap.map((h) => [h.date, h])), [heatmap]);

  const totals = useMemo(() => {
    const activeHeatDays = heatmap.filter((entry) => entry.minutes > 0 || entry.sessions > 0);
    return {
      minutes: totalMinutes || heatmap.reduce((acc, entry) => acc + (entry.minutes || 0), 0),
      sessionsCount: sessions || heatmap.reduce((acc, entry) => acc + (entry.sessions || 0), 0),
      activeDaysCount: daysWithActivity || activeHeatDays.length,
    };
  }, [daysWithActivity, heatmap, sessions, totalMinutes]);

  const hasActivity = totals.minutes > 0 || totals.sessionsCount > 0 || totals.activeDaysCount > 0;

  return (
    <section style={{ display: 'grid', gap: 14, animation: 'fadeUp .3s ease' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
          gap: 10,
        }}
        className="four-col"
      >
        <KpiCard
          title={copy.stats.streakTitle}
          value={`${streakDays} ${copy.stats.daysUnit}`}
          subtitle={copy.stats.streakSubtitle}
        />
        <KpiCard title={copy.stats.hoursTitle} value={`${totalHours}${copy.stats.hoursUnit}`} subtitle={copy.stats.hoursSubtitle} />
        <KpiCard title={copy.stats.sessionsTitle} value={`${sessions}`} subtitle={copy.stats.sessionsSubtitle} />
        <KpiCard title={copy.stats.rankingTitle} value={`${ranking}`} subtitle={copy.stats.rankingSubtitle} />
      </div>

      <article style={cardStyle}>
        <header style={headerRow}>
          <h3 style={titleStyle}>{copy.stats.activityTitle}</h3>
          <small style={mutedStyle}>{copy.stats.activitySubtitle}</small>
        </header>

        {hasActivity ? (
          <>
            <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(53, 11px)',
                  gridAutoRows: '11px',
                  gap: 4,
                  minWidth: 53 * 11 + 52 * 4,
                }}
              >
                {days.map((d) => {
                  const item = byDate.get(d);
                  const lv = item?.level ?? 0;
                  return (
                    <div
                      key={d}
                      title={`${d} • ${item?.minutes ?? 0}min • ${item?.sessions ?? 0}`}
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: 2,
                        background: levelColor(lv),
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 10,
                color: 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              <span>{copy.stats.less}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2, 3, 4].map((l) => (
                  <span key={l} style={{ width: 12, height: 12, borderRadius: 2, background: levelColor(l), display: 'inline-block' }} />
                ))}
              </div>
              <span>{copy.stats.more}</span>
            </div>
          </>
        ) : (
          <div style={emptyStateStyle}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>{copy.stats.noActivityTitle}</strong>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
              {copy.stats.noActivityBody}
            </p>
          </div>
        )}
      </article>

      <article style={cardStyle}>
        <header style={headerRow}>
          <h3 style={titleStyle}>{copy.stats.summaryTitle}</h3>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
          <MiniStat label={copy.stats.totalMinutes} value={`${totals.minutes} min`} />
          <MiniStat label={copy.stats.totalSessions} value={`${totals.sessionsCount}`} />
          <MiniStat label={copy.stats.activeDays} value={`${totals.activeDaysCount}`} />
        </div>
      </article>
    </section>
  );
}

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <article
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 14,
        padding: 12,
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>{title}</div>
      <div style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, marginTop: 4 }}>{value}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{subtitle}</div>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        padding: 12,
        background: 'var(--bg-card-soft)',
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 16,
  padding: 14,
};

const headerRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  color: 'var(--text-primary)',
};

const mutedStyle: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 12,
};

const emptyStateStyle: CSSProperties = {
  border: '1px dashed var(--border-default)',
  borderRadius: 14,
  padding: 18,
  background: 'var(--bg-card-soft)',
};
