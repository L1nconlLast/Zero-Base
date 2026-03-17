import { Award, BookOpen, Brain, Crown, Flame, GraduationCap, Lightbulb, Rocket, Star, Target, Trophy, Upload, Zap, type LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import type { CSSProperties } from 'react';

type AvatarOption = {
  id: string;
  Icon: LucideIcon;
  color: string;
};

const avatarOptions: AvatarOption[] = [
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

interface ProfileAvatarCardProps {
  avatarIcon: string;
  avatarUrl: string;
  onSelectAvatar: (avatarIcon: string) => void;
  onUploadAvatar: (file: File) => Promise<void>;
}

export default function ProfileAvatarCard({ avatarIcon, avatarUrl, onSelectAvatar, onUploadAvatar }: ProfileAvatarCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <article style={cardStyle}>
      <header style={headerStyle}>
        <h3 style={titleStyle}>Avatar</h3>
      </header>

      <div style={previewStyle}>
        {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>🧠</span>}
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, textTransform: 'capitalize' }}>{avatarIcon}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Escolha um ícone ou envie uma foto.</div>
        </div>
      </div>

      <div style={gridStyle}>
        {avatarOptions.map((option) => {
          const selected = option.id === avatarIcon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectAvatar(option.id)}
              style={{
                ...optionButtonStyle,
                border: `1.5px solid ${selected ? option.color : 'var(--border-default)'}`,
                background: selected ? `${option.color}18` : 'var(--bg-card-soft)',
                boxShadow: selected ? `0 0 0 2px ${option.color}20` : 'none',
              }}
            >
              <option.Icon size={16} color={selected ? option.color : '#64748b'} />
            </button>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void onUploadAvatar(file);
          event.target.value = '';
        }}
      />

      <button type="button" onClick={() => fileInputRef.current?.click()} style={uploadButtonStyle}>
        <Upload size={14} />
        Enviar foto (máx. 2MB)
      </button>
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
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  color: 'var(--text-primary)',
};

const previewStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  border: '1px solid var(--border-default)',
  borderRadius: 14,
  padding: 10,
  marginBottom: 12,
  background: 'var(--bg-card-soft)',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(40px,1fr))',
  gap: 8,
  marginBottom: 12,
};

const optionButtonStyle: CSSProperties = {
  aspectRatio: '1',
  borderRadius: 12,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
};

const uploadButtonStyle: CSSProperties = {
  width: '100%',
  border: '1.5px dashed var(--border-default)',
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 12,
  color: 'var(--text-primary)',
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  background: 'var(--bg-card)',
  cursor: 'pointer',
};
