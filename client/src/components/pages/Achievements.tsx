import { SparkleIcon, FireIcon, CoinIcon, StarIcon } from '../icons/UIIcons';
import { useTranslation } from '../../hooks/useTranslation';

function AchievementIcon({ type }: { type: string }) {
  if (type === 'fire') return <FireIcon />;
  if (type === 'coin') return <CoinIcon />;
  if (type === 'star') return <StarIcon />;
  if (type === 'crown') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M3 15L5 6L10 10L15 6L17 15H3Z" fill="#F59E0B" />
      </svg>
    );
  }
  if (type === 'broom') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <rect x="9" y="2" width="2" height="10" rx="1" fill="#B45309" />
        <path d="M6 12H14L13 18H7L6 12Z" fill="#F59E0B" />
        <line x1="8" y1="13" x2="8" y2="17" stroke="#B45309" strokeWidth="0.5" />
        <line x1="10" y1="13" x2="10" y2="17" stroke="#B45309" strokeWidth="0.5" />
        <line x1="12" y1="13" x2="12" y2="17" stroke="#B45309" strokeWidth="0.5" />
      </svg>
    );
  }
  if (type === 'heart') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M10 16L5.5 11.8C4 10.3 4 8 5.5 6.5C6.8 5.2 9 5.2 10 6.5C11 5.2 13.2 5.2 14.5 6.5C16 8 16 10.3 14.5 11.8L10 16Z" fill="#F87171" />
      </svg>
    );
  }
  if (type === 'shield') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L4 5V10C4 14 7 17 10 18C13 17 16 14 16 10V5L10 2Z" fill="#60A5FA" />
        <path d="M9 11L7.5 9.5L8.5 8.5L9 9L11.5 6.5L12.5 7.5L9 11Z" fill="#fff" />
      </svg>
    );
  }
  if (type === 'rocket') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M10 3C10 3 14 6 14 12L12 14H8L6 12C6 6 10 3 10 3Z" fill="#F59E0B" />
        <circle cx="10" cy="9" r="2" fill="#fff" />
        <path d="M8 14L7 17H9L8 14Z" fill="#EF4444" />
        <path d="M12 14L13 17H11L12 14Z" fill="#EF4444" />
      </svg>
    );
  }
  if (type === 'diamond') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M10 3L16 8L10 17L4 8L10 3Z" fill="#A78BFA" />
        <path d="M4 8H16L10 3L4 8Z" fill="#C4B5FD" />
        <line x1="10" y1="3" x2="10" y2="17" stroke="#7C3AED" strokeWidth="0.5" opacity="0.3" />
      </svg>
    );
  }
  return <SparkleIcon />;
}

interface AchRow {
  id: string;
  titleKey?: string;
  title?: string;
  descKey?: string;
  description?: string;
  icon: string;
  threshold: number;
  value: number;
  progress: number;
  unlocked: boolean;
}

interface AchUser {
  id: number;
  displayName: string;
  role: 'admin' | 'member' | 'child';
  avatarColor: string;
  achievements: AchRow[];
}

interface Props {
  data: { me: AchUser; family: AchUser[] } | null;
  language?: string;
}

export function Achievements({ data, language }: Props) {
  const { t } = useTranslation(language);
  if (!data) return null;

  const renderUser = (u: AchUser) => {
    const unlocked = u.achievements.filter(a => a.unlocked);
    const locked = u.achievements.filter(a => !a.unlocked);

    return (
      <div key={u.id} className="tq-card tq-card-padded">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: 'var(--warm-text)', margin: 0 }}>{u.displayName}</h3>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--warm-accent)', backgroundColor: 'var(--warm-accent-light)', padding: '4px 12px', borderRadius: 99 }}>
            {unlocked.length}/{u.achievements.length}
          </span>
        </div>
        {unlocked.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10, marginBottom: locked.length > 0 ? 16 : 0 }}>
            {unlocked.map((a) => (
              <div key={a.id} style={{
                borderRadius: 14, padding: 12, border: '1.5px solid var(--warm-streak-border)',
                backgroundColor: 'var(--warm-accent-light)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <AchievementIcon type={a.icon} />
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--warm-text)' }}>{a.titleKey ? t(a.titleKey) : a.title}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 600, marginBottom: 6 }}>{a.descKey ? t(a.descKey) : a.description}</div>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--health-bar-track)', overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: '100%', height: '100%', background: 'var(--health-green)' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 700 }}>
                  {a.value}/{a.threshold}
                </div>
              </div>
            ))}
          </div>
        )}
        {locked.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
            {locked.map((a) => (
              <div key={a.id} style={{
                borderRadius: 14, padding: 12, border: '1.5px solid var(--warm-border)',
                backgroundColor: 'var(--warm-bg-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <AchievementIcon type={a.icon} />
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--warm-text)' }}>{a.titleKey ? t(a.titleKey) : a.title}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 600, marginBottom: 6 }}>{a.descKey ? t(a.descKey) : a.description}</div>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--health-bar-track)', overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${a.progress}%`, height: '100%', background: 'var(--warm-coin)' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 700 }}>
                  {a.value}/{a.threshold}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-enter" style={{ display: 'grid', gap: 16 }}>
      {renderUser(data.me)}
      {data.family.length > 0 && (
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-text-muted)' }}>{t('achievements.familyProgress')}</div>
      )}
      {data.family.map(renderUser)}
    </div>
  );
}
