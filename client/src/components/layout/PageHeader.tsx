import { FireIcon, CoinIcon } from '../icons/UIIcons';
import type { User } from '../../hooks/useAuth';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  user: User;
  rightContent?: React.ReactNode;
  onCoinsClick?: () => void;
  onStreakClick?: () => void;
}

export function PageHeader({ title, subtitle, user, rightContent, onCoinsClick, onStreakClick }: PageHeaderProps) {
  return (
    <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--warm-text)', margin: 0, letterSpacing: -0.5 }}>
          {title}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--warm-text-light)', fontWeight: 600, marginTop: 3 }}>
          {subtitle}
        </p>
      </div>
      <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {rightContent}
        <div
          onClick={onStreakClick}
          role={onStreakClick ? 'button' : undefined}
          tabIndex={onStreakClick ? 0 : -1}
          onKeyDown={(e) => {
            if (!onStreakClick) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onStreakClick();
            }
          }}
          style={{
          display: 'flex', alignItems: 'center', gap: 6,
          backgroundColor: 'var(--warm-accent-light)', borderRadius: 14, padding: '8px 16px',
          border: '1.5px solid var(--warm-streak-border)',
          cursor: onStreakClick ? 'pointer' : 'default',
        }}>
          <FireIcon />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-streak-text)' }}>{user.currentStreak}</span>
        </div>
        <div
          onClick={onCoinsClick}
          role={onCoinsClick ? 'button' : undefined}
          tabIndex={onCoinsClick ? 0 : -1}
          onKeyDown={(e) => {
            if (!onCoinsClick) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCoinsClick();
            }
          }}
          style={{
          display: 'flex', alignItems: 'center', gap: 6,
          backgroundColor: 'var(--warm-accent-light)', borderRadius: 14, padding: '8px 16px',
          border: '1.5px solid var(--warm-streak-border)',
          cursor: onCoinsClick ? 'pointer' : 'default',
        }}>
          <CoinIcon />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-streak-text)' }}>{user.coins}</span>
        </div>
      </div>
    </div>
  );
}
