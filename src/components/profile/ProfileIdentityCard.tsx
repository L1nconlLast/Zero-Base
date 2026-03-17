import type { CSSProperties } from 'react';

interface ProfileIdentityCardProps {
  displayName: string;
  email: string;
  onChangeDisplayName: (value: string) => void;
}

export default function ProfileIdentityCard({ displayName, email, onChangeDisplayName }: ProfileIdentityCardProps) {
  return (
    <article style={cardStyle}>
      <header style={headerStyle}>
        <h3 style={titleStyle}>Identidade</h3>
        <span style={pillStyle}>Conta verificada</span>
      </header>

      <label style={labelStyle} htmlFor="profile-display-name">Nome exibido</label>
      <input
        id="profile-display-name"
        value={displayName}
        onChange={(event) => onChangeDisplayName(event.target.value)}
        style={inputStyle}
        placeholder="Como você quer aparecer"
      />

      <label style={{ ...labelStyle, marginTop: 12 }} htmlFor="profile-email">Email</label>
      <input id="profile-email" value={email || 'conta@zero-base.app'} readOnly style={{ ...inputStyle, background: 'var(--bg-card-soft)', color: 'var(--text-muted)' }} />
    </article>
  );
}

const cardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 16,
  padding: 14,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
  gap: 10,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  color: 'var(--text-primary)',
};

const pillStyle: CSSProperties = {
  fontSize: 11,
  color: '#15803d',
  background: '#ecfdf5',
  border: '1px solid #bbf7d0',
  borderRadius: 999,
  padding: '4px 8px',
  fontWeight: 700,
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: 'var(--text-muted)',
  marginBottom: 6,
  fontWeight: 600,
};

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid var(--border-default)',
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--text-primary)',
  background: 'var(--bg-card)',
};
