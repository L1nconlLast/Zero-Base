import { Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';

interface ProfileHeroProps {
  displayName: string;
  email: string;
  avatarIcon: string;
  avatarUrl: string;
}

const iconEmojiMap: Record<string, string> = {
  brain: '🧠',
  book: '📘',
  target: '🎯',
  zap: '⚡',
  flame: '🔥',
  crown: '👑',
  rocket: '🚀',
  lightbulb: '💡',
  grad: '🎓',
  star: '⭐',
  award: '🏅',
  trophy: '🏆',
};

export default function ProfileHero({ displayName, email, avatarIcon, avatarUrl }: ProfileHeroProps) {
  const emoji = iconEmojiMap[avatarIcon] || iconEmojiMap.brain;

  return (
    <section style={containerStyle}>
      <div style={avatarFrameStyle}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={avatarImageStyle} />
        ) : (
          <span style={emojiStyle}>{emoji}</span>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={badgeStyle}>
          <Sparkles size={13} />
          Perfil 2.0
        </div>
        <h2 style={titleStyle}>{displayName || 'Estudante'}</h2>
        <p style={subtitleStyle}>{email || 'conta@zero-base.app'}</p>
      </div>
    </section>
  );
}

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: 16,
  borderRadius: 16,
  border: '1px solid var(--border-default)',
  background: 'linear-gradient(135deg,var(--bg-card-soft) 0%, var(--bg-card) 65%, var(--bg-card-soft) 100%)',
};

const avatarFrameStyle: CSSProperties = {
  width: 62,
  height: 62,
  borderRadius: 18,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-card)',
  display: 'grid',
  placeItems: 'center',
  overflow: 'hidden',
  flexShrink: 0,
};

const avatarImageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const emojiStyle: CSSProperties = {
  fontSize: 30,
  lineHeight: 1,
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 11,
  fontWeight: 700,
  marginBottom: 6,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 23,
  lineHeight: 1.05,
  color: 'var(--text-primary)',
};

const subtitleStyle: CSSProperties = {
  margin: '5px 0 0',
  fontSize: 13,
  color: 'var(--text-muted)',
};
