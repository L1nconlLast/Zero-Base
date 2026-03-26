import type { CSSProperties } from 'react';
import { getProfileSettingsCopy, type ProfileSettingsLocale } from './profileSettingsCopy';

interface ProfileIdentityCardProps {
  displayName: string;
  email: string;
  onChangeDisplayName: (value: string) => void;
  locale?: ProfileSettingsLocale;
}

export default function ProfileIdentityCard({
  displayName,
  email,
  onChangeDisplayName,
  locale = 'pt',
}: ProfileIdentityCardProps) {
  const copy = getProfileSettingsCopy(locale);

  return (
    <article style={cardStyle}>
      <header style={headerStyle}>
        <h3 style={titleStyle}>{copy.profile.identityTitle}</h3>
        <span style={pillStyle}>{copy.profile.verifiedAccount}</span>
      </header>

      <label style={labelStyle} htmlFor="profile-display-name">{copy.profile.displayName}</label>
      <input
        id="profile-display-name"
        value={displayName}
        onChange={(event) => onChangeDisplayName(event.target.value)}
        style={inputStyle}
        placeholder={copy.profile.displayNamePlaceholder}
      />

      <label style={{ ...labelStyle, marginTop: 12 }} htmlFor="profile-email">{copy.profile.email}</label>
      <input
        id="profile-email"
        value={email || copy.common.fallbackEmail}
        readOnly
        style={{ ...inputStyle, background: 'var(--bg-card-soft)', color: 'var(--text-muted)' }}
      />
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
  background: 'rgba(22, 163, 74, 0.1)',
  border: '1px solid rgba(22, 163, 74, 0.2)',
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
