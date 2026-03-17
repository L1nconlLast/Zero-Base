import type { CSSProperties } from 'react';
import ProfileAvatarCard from './ProfileAvatarCard';
import ProfileHero from './ProfileHero';
import ProfileIdentityCard from './ProfileIdentityCard';

interface ProfileV2Props {
  displayName: string;
  email: string;
  avatarIcon: string;
  avatarUrl: string;
  onChangeDisplayName: (value: string) => void;
  onSelectAvatar: (avatarIcon: string) => void;
  onUploadAvatar: (file: File) => Promise<void>;
  onSave: () => Promise<void>;
  saving: boolean;
}

export default function ProfileV2({
  displayName,
  email,
  avatarIcon,
  avatarUrl,
  onChangeDisplayName,
  onSelectAvatar,
  onUploadAvatar,
  onSave,
  saving,
}: ProfileV2Props) {
  return (
    <section style={{ display: 'grid', gap: 14, animation: 'fadeUp .3s ease' }}>
      <ProfileHero displayName={displayName} email={email} avatarIcon={avatarIcon} avatarUrl={avatarUrl} />

      <div style={gridStyle} className="two-col">
        <ProfileIdentityCard displayName={displayName} email={email} onChangeDisplayName={onChangeDisplayName} />
        <ProfileAvatarCard
          avatarIcon={avatarIcon}
          avatarUrl={avatarUrl}
          onSelectAvatar={onSelectAvatar}
          onUploadAvatar={onUploadAvatar}
        />
      </div>

      <div style={actionsStyle}>
        <button
          type="button"
          onClick={() => {
            void onSave();
          }}
          disabled={saving}
          style={{
            ...saveButtonStyle,
            opacity: saving ? 0.75 : 1,
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </div>
    </section>
  );
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 14,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
};

const saveButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 12,
  background: 'var(--color-primary, #2563eb)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  padding: '10px 18px',
};
