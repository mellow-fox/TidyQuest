import { UserAvatar } from '../shared/UserAvatar';
import { FireIcon, CoinIcon } from '../icons/UIIcons';
import { useTranslation } from '../../hooks/useTranslation';

interface LeaderboardProps {
  users: Array<{ id: number; displayName: string; avatarColor: string; avatarType?: string; avatarPreset?: string; avatarPhotoUrl?: string; coins: number; currentStreak: number; points: number }>;
  period: 'week' | 'month' | 'quarter' | 'year';
  language?: string;
  onPeriodChange: (period: 'week' | 'month' | 'quarter' | 'year') => void;
}

export function Leaderboard({ users, period, language, onPeriodChange }: LeaderboardProps) {
  const { t } = useTranslation(language);
  const sorted = [...users].sort((a, b) => b.points - a.points);

  // Podium order: 2nd, 1st, 3rd
  const podium = [sorted[1], sorted[0], sorted[2]].filter(Boolean);
  const podiumHeights = [100, 140, 75];
  const podiumRanks = [2, 1, 3];
  const podiumGradients = [
    'linear-gradient(180deg, #E2E8F0, #94A3B8)',
    'linear-gradient(180deg, #FDE68A, #F59E0B)',
    'linear-gradient(180deg, #FED7AA, #EA580C)',
  ];

  return (
    <div className="page-enter tq-page-medium">
      {/* Period Toggle */}
      <div style={{
        display: 'flex', gap: 4, backgroundColor: 'var(--warm-accent-light)', borderRadius: 14,
        padding: 4, marginBottom: 24, width: 'fit-content', border: '1.5px solid var(--warm-border)',
      }}>
        {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
          <button key={p} onClick={() => onPeriodChange(p)}
            className="tq-btn"
            style={{
              padding: '10px 16px', borderRadius: 11,
              backgroundColor: period === p ? 'var(--warm-accent)' : 'transparent',
              fontSize: 13, fontWeight: 800,
              color: period === p ? '#fff' : 'var(--warm-text-light)',
            }}>
            {p === 'week'
              ? t('leaderboard.thisWeek')
              : p === 'month'
                ? t('leaderboard.thisMonth')
                : p === 'quarter'
                  ? t('leaderboard.thisQuarter')
                  : t('leaderboard.thisYear')}
          </button>
        ))}
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="tq-card" style={{ padding: 32, marginBottom: 20, background: 'var(--warm-streak-bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 24, marginBottom: 8 }}>
            {podium.map((u, i) => (
              <div key={u.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 150 }}>
                <UserAvatar name={u.displayName} color={u.avatarColor} size={52} avatarType={u.avatarType as any} avatarPreset={u.avatarPreset} avatarPhotoUrl={u.avatarPhotoUrl} />
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-text)', marginTop: 6, marginBottom: 6 }}>{u.displayName}</div>
                <div style={{
                  width: '100%', height: podiumHeights[i], borderRadius: '18px 18px 0 0',
                  background: podiumGradients[i],
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#fff', opacity: 0.8 }}>#{podiumRanks[i]}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{u.points}</div>
                  <div style={{ fontSize: 10, color: '#ffffff99', fontWeight: 700 }}>{t('leaderboard.points')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats List */}
      {sorted.map((u, i) => (
        <div key={u.id} className="tq-card" style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: 'var(--card-padding)', marginBottom: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: i === 0 ? 'var(--warm-accent-light)' : 'var(--warm-bg-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900, color: i === 0 ? 'var(--warm-accent)' : 'var(--warm-text-light)',
            border: i === 0 ? '1.5px solid var(--warm-accent)' : '1px solid var(--warm-border)',
          }}>#{i + 1}</div>
          <UserAvatar name={u.displayName} color={u.avatarColor} size={44} avatarType={u.avatarType as any} avatarPreset={u.avatarPreset} avatarPhotoUrl={u.avatarPhotoUrl} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--warm-text)' }}>{u.displayName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                <FireIcon /> {u.currentStreak}d {t('leaderboard.streak')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                <CoinIcon /> {u.coins}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--warm-accent)' }}>{u.points}</div>
        </div>
      ))}

      {sorted.length === 0 && (
        <div className="tq-card tq-empty-state">
          {t('leaderboard.noData')}
        </div>
      )}
    </div>
  );
}
