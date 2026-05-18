import { NavLink, useNavigate } from 'react-router-dom';
import { HomeIcon, RoomsIcon, TrophyIcon, CalendarIcon, ActivityIcon, AchievementsIcon, SettingsIcon, RewardsIcon, ShoppingListIcon } from '../icons/NavIcons';
import { FireIcon, CoinIcon, SparkleIcon } from '../icons/UIIcons';
import { UserAvatar } from '../shared/UserAvatar';
import { useTranslation } from '../../hooks/useTranslation';
import type { User } from '../../hooks/useAuth';

interface SidebarProps {
  user: User;
  isMobileOpen?: boolean;
  onClose?: () => void;
  gamificationEnabled?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

const navItems = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/rooms', label: 'Rooms', Icon: RoomsIcon },
  { to: '/shopping-list', label: 'shopping-list', Icon: ShoppingListIcon },
  { to: '/leaderboard', label: 'Board', Icon: TrophyIcon },
  { to: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { to: '/activity', label: 'Activity', Icon: ActivityIcon },
  { to: '/rewards', label: 'Rewards', Icon: RewardsIcon },
  { to: '/achievements', label: 'Achievements', Icon: AchievementsIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
];

const GAMIFICATION_ROUTES = new Set(['/leaderboard', '/rewards', '/achievements']);

export function Sidebar({ user, isMobileOpen = false, onClose, gamificationEnabled = true, collapsed = false, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(user.language);
  const effectiveCollapsed = isMobileOpen ? false : collapsed;

  const handleNavClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  return (
    <>
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
          width: effectiveCollapsed ? 60 : 240,
          minHeight: '100vh',
          backgroundColor: 'var(--warm-sidebar)',
          borderRight: '1.5px solid var(--warm-sidebar-border)',
          padding: effectiveCollapsed ? '24px 8px' : '24px 0',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 50,
          transition: 'width 0.3s ease, padding 0.3s ease',
        }}
        className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
      >
        <div style={{ padding: effectiveCollapsed ? '0 8px' : '0 20px', marginBottom: effectiveCollapsed ? 8 : 36, display: 'flex', alignItems: 'center', justifyContent: effectiveCollapsed ? 'center' : 'flex-start', gap: effectiveCollapsed ? 0 : 12, position: 'relative' }}>
          {effectiveCollapsed && onToggle ? (
            <button
              onClick={onToggle}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                borderRadius: 8,
                color: 'var(--warm-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Expand sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10h14M3 5h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          ) : (
            <>
              <div style={{
                width: 42, height: 42, borderRadius: 14,
                background: 'var(--warm-sidebar-active)',
                border: '1.5px solid var(--warm-sidebar-user-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <SparkleIcon />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--warm-text)', letterSpacing: -0.5 }}>TidyQuest</div>
                <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  {t('nav.tagline')}
                </div>
              </div>
              {onToggle && (
                <button
                  onClick={onToggle}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 8,
                    color: 'var(--warm-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 'auto',
                  }}
                  aria-label="Collapse sidebar"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 10h14M3 5h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </>
          )}
          {onClose && !effectiveCollapsed && (
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

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: effectiveCollapsed ? '0 8px' : '0 12px' }}>
          {navItems.filter((item) => gamificationEnabled || !GAMIFICATION_ROUTES.has(item.to)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={{ textDecoration: 'none' }}
              onClick={handleNavClick}
            >
              {({ isActive }) => (
                <div
                  title={effectiveCollapsed ? t(`nav.${item.label.toLowerCase()}`) : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: effectiveCollapsed ? '11px 0' : '11px 16px',
                    justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                    borderRadius: 14,
                    backgroundColor: isActive ? 'var(--warm-sidebar-active)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--warm-accent)' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                  }}>
                  <span style={{ flexShrink: 0 }}><item.Icon active={isActive} /></span>
                  {!effectiveCollapsed && (
                    <span style={{
                      fontSize: 14, fontWeight: isActive ? 800 : 600,
                      color: isActive ? 'var(--warm-accent)' : 'var(--warm-text-muted)',
                    }}>{t(`nav.${item.label.toLowerCase()}`)}</span>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        <div style={{ padding: effectiveCollapsed ? '0 8px' : '0 14px' }}>
          <div
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', gap: effectiveCollapsed ? 0 : 10,
              padding: effectiveCollapsed ? '8px' : '12px 14px',
              justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
              backgroundColor: 'var(--warm-sidebar-user-bg)', borderRadius: 16, border: '1.5px solid var(--warm-sidebar-user-border)',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            <UserAvatar
              name={user.displayName}
              color={user.avatarColor}
              size={effectiveCollapsed ? 28 : 38}
              avatarType={user.avatarType}
              avatarPreset={user.avatarPreset}
              avatarPhotoUrl={user.avatarPhotoUrl}
            />
            {!effectiveCollapsed && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--warm-text)' }}>{user.displayName}</div>
                {gamificationEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                      <CoinIcon /> {user.coins}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                      <FireIcon /> {user.currentStreak}d
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
