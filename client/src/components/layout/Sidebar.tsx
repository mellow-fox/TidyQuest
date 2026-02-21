import { NavLink, useNavigate } from 'react-router-dom';
import { HomeIcon, RoomsIcon, TrophyIcon, CalendarIcon, ActivityIcon, AchievementsIcon, SettingsIcon, RewardsIcon } from '../icons/NavIcons';
import { FireIcon, CoinIcon, SparkleIcon } from '../icons/UIIcons';
import { UserAvatar } from '../shared/UserAvatar';
import { useTranslation } from '../../hooks/useTranslation';
import type { User } from '../../hooks/useAuth';

interface SidebarProps {
  user: User;
  isMobileOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/rooms', label: 'Rooms', Icon: RoomsIcon },
  { to: '/leaderboard', label: 'Board', Icon: TrophyIcon },
  { to: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { to: '/activity', label: 'Activity', Icon: ActivityIcon },
  { to: '/rewards', label: 'Rewards', Icon: RewardsIcon },
  { to: '/achievements', label: 'Achievements', Icon: AchievementsIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
];

export function Sidebar({ user, isMobileOpen = false, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(user.language);

  const handleNavClick = () => {
    // Close mobile sidebar when navigating
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 49,
            display: 'none',
          }}
          className="mobile-overlay"
        />
      )}

      <nav
        style={{
          width: 240,
          minHeight: '100vh',
          backgroundColor: 'var(--warm-sidebar)',
          borderRight: '1.5px solid var(--warm-sidebar-border)',
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 50,
          transition: 'transform 0.3s ease',
        }}
        className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
      >
      {/* Logo */}
      <div style={{ padding: '0 20px', marginBottom: 36, display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 14,
          background: 'var(--warm-sidebar-active)',
          border: '1.5px solid var(--warm-sidebar-user-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SparkleIcon />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--warm-text)', letterSpacing: -0.5 }}>TidyQuest</div>
          <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {t('nav.tagline')}
          </div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="mobile-only"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--warm-text-muted)',
              fontSize: 24,
              cursor: 'pointer',
              padding: 4,
              display: 'none',
            }}
            aria-label="Close menu"
          >
            ×
          </button>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={{ textDecoration: 'none' }}
            onClick={handleNavClick}
          >
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 16px', borderRadius: 14,
                backgroundColor: isActive ? 'var(--warm-sidebar-active)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--warm-accent)' : '3px solid transparent',
                transition: 'all 0.15s ease',
              }}>
                <span style={{ flexShrink: 0 }}><item.Icon active={isActive} /></span>
                <span style={{
                  fontSize: 14, fontWeight: isActive ? 800 : 600,
                  color: isActive ? 'var(--warm-accent)' : 'var(--warm-text-muted)',
                }}>{t(`nav.${item.label.toLowerCase()}`)}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>

      {/* User Card */}
      <div style={{ padding: '0 14px' }}>
        <div
          onClick={() => navigate('/profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
            backgroundColor: 'var(--warm-sidebar-user-bg)', borderRadius: 16, border: '1.5px solid var(--warm-sidebar-user-border)',
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}
        >
          <UserAvatar
            name={user.displayName}
            color={user.avatarColor}
            size={38}
            avatarType={user.avatarType}
            avatarPreset={user.avatarPreset}
            avatarPhotoUrl={user.avatarPhotoUrl}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--warm-text)' }}>{user.displayName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                <CoinIcon /> {user.coins}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                <FireIcon /> {user.currentStreak}d
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
