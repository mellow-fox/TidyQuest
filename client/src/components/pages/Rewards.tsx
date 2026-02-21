import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CoinIcon } from '../icons/UIIcons';
import { useTranslation } from '../../hooks/useTranslation';

interface Reward {
  id: number;
  title: string;
  description?: string | null;
  costCoins: number;
  isPreset?: boolean;
}

interface Redemption {
  id: number;
  title: string;
  costCoins: number;
  redeemedAt: string;
  status: string;
}

interface RewardsProps {
  language?: string;
  rewards: Reward[];
  mine: Redemption[];
  userCoins: number;
  onRedeem: (rewardId: number) => Promise<void>;
  onCancel: (redemptionId: number) => Promise<void>;
}

export function Rewards({ language, rewards, mine, userCoins, onRedeem, onCancel }: RewardsProps) {
  const { t } = useTranslation(language);
  const [pendingRewardId, setPendingRewardId] = useState<number | null>(null);
  const [spendFx, setSpendFx] = useState<{ amount: number; key: number } | null>(null);
  const [refundFx, setRefundFx] = useState<{ amount: number; key: number } | null>(null);
  const previousStatuses = useRef<Record<number, string>>({});

  const pendingReward = useMemo(() => rewards.find((r) => r.id === pendingRewardId) || null, [pendingRewardId, rewards]);

  const presetKeyByTitle: Record<string, string> = {
    'movie night pick': 'movie_night',
    'ice cream treat': 'ice_cream',
    'stay up 30 min': 'late_bedtime',
    'game time bonus': 'game_bonus',
    'choose dinner': 'choose_dinner',
    'park adventure': 'park_adventure',
    'no-chore pass': 'chore_pass',
    'family board game': 'board_game',
  };

  const rewardTitleByName = (title: string): string => {
    const k = presetKeyByTitle[title.toLowerCase()];
    if (k) return t(`rewardsPreset.${k}.title`);
    return title;
  };

  const rewardTitle = (r: Reward): string => {
    return rewardTitleByName(r.title);
  };

  const rewardDesc = (r: Reward): string => {
    const k = presetKeyByTitle[r.title.toLowerCase()];
    if (k) return t(`rewardsPreset.${k}.desc`);
    return r.description || t('rewards.noDescription');
  };

  const confirmRedeem = async () => {
    if (!pendingReward) return;
    await onRedeem(pendingReward.id);
    setSpendFx({ amount: pendingReward.costCoins, key: Date.now() });
    setPendingRewardId(null);
  };

  useEffect(() => {
    if (!spendFx) return;
    const id = window.setTimeout(() => setSpendFx(null), 1500);
    return () => window.clearTimeout(id);
  }, [spendFx]);

  useEffect(() => {
    const prev = previousStatuses.current;
    for (const r of mine) {
      if (prev[r.id] === 'requested' && r.status === 'rejected') {
        setRefundFx({ amount: r.costCoins, key: Date.now() + r.id });
        break;
      }
    }
    const next: Record<number, string> = {};
    mine.forEach((r) => {
      next[r.id] = r.status;
    });
    previousStatuses.current = next;
  }, [mine]);

  useEffect(() => {
    if (!refundFx) return;
    const id = window.setTimeout(() => setRefundFx(null), 1800);
    return () => window.clearTimeout(id);
  }, [refundFx]);

  const statusLabel = (status: string): string => {
    if (status === 'requested') return t('rewards.statusPending');
    if (status === 'approved') return t('rewards.statusApproved');
    if (status === 'rejected') return t('rewards.statusRejected');
    if (status === 'cancelled') return t('rewards.statusCancelled');
    return status;
  };

  const statusStyle = (status: string): CSSProperties => {
    if (status === 'approved') return { color: '#15803D', backgroundColor: '#DCFCE7', border: '1px solid #86EFAC' };
    if (status === 'rejected') return { color: '#B91C1C', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' };
    if (status === 'cancelled') return { color: '#374151', backgroundColor: '#E5E7EB', border: '1px solid #D1D5DB' };
    return { color: 'var(--warm-accent)', backgroundColor: 'var(--warm-accent-light)', border: '1px solid var(--warm-accent)' };
  };

  return (
    <div className="page-enter" style={{ display: 'grid', gap: 16 }}>
      <style>{`
        @keyframes coinSpendFloat {
          0% { opacity: 0; transform: translateY(12px) scale(0.9); }
          20% { opacity: 1; transform: translateY(0px) scale(1); }
          100% { opacity: 0; transform: translateY(-26px) scale(1.04); }
        }
        @keyframes coinRefundFloat {
          0% { opacity: 0; transform: translateY(10px) scale(0.95); }
          20% { opacity: 1; transform: translateY(0px) scale(1); }
          100% { opacity: 0; transform: translateY(-24px) scale(1.04); }
        }
      `}</style>
      <div className="tq-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CoinIcon />
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-text)' }}>{userCoins} {t('settings.coins')}</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600, marginTop: 4 }}>{t('rewards.balanceHint')}</div>
      </div>

      <div className="tq-card rewards-catalog-card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 900, color: 'var(--warm-text)' }}>{t('rewards.catalog')}</h3>
        <div className="rewards-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {rewards.map((r) => {
            const canBuy = userCoins >= r.costCoins;
            return (
              <div key={r.id} style={{ border: '1.5px solid var(--warm-border)', borderRadius: 14, padding: 12, backgroundColor: 'var(--warm-bg-subtle)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-text)', marginBottom: 4 }}>{rewardTitle(r)}</div>
                <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600, minHeight: 32 }}>{rewardDesc(r)}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--warm-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <CoinIcon /> {r.costCoins}
                  </div>
                  <button
                    className="tq-btn tq-btn-primary"
                    style={{ padding: '6px 10px', fontSize: 11, opacity: canBuy ? 1 : 0.6 }}
                    disabled={!canBuy}
                    onClick={() => setPendingRewardId(r.id)}
                  >
                    {canBuy ? t('rewards.redeem') : t('rewards.notEnough')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tq-card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 900, color: 'var(--warm-text)' }}>{t('rewards.myRequests')}</h3>
        {mine.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('rewards.noRequests')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {mine.map((m) => (
              <div key={m.id} className="rewards-my-row" style={{ border: '1.5px solid var(--warm-border)', borderRadius: 12, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--warm-text)' }}>{rewardTitleByName(m.title)}</div>
                  <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 700 }}>{new Date(m.redeemedAt).toLocaleString()}</div>
                </div>
                <div className="rewards-my-row-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--warm-accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>- {m.costCoins} <CoinIcon /></div>
                  <span style={{ ...statusStyle(m.status), fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {statusLabel(m.status)}
                  </span>
                  {m.status === 'requested' && (
                    <button className="tq-btn tq-btn-secondary" onClick={() => onCancel(m.id)} style={{ padding: '4px 8px', fontSize: 10 }}>
                      {t('rewards.cancelRequest')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {pendingReward && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, backgroundColor: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="tq-card rewards-confirm-modal" style={{ width: 380, maxWidth: 'calc(100vw - 24px)', padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--warm-text)', marginBottom: 6 }}>{t('rewards.confirmTitle')}</div>
            <div style={{ fontSize: 12, color: 'var(--warm-text-light)', fontWeight: 600, marginBottom: 14 }}>
              {t('rewards.confirmText').replace('{reward}', rewardTitle(pendingReward)).replace('{coins}', String(pendingReward.costCoins))}
            </div>
            <div className="rewards-confirm-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="tq-btn tq-btn-secondary" onClick={() => setPendingRewardId(null)} style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.cancel')}</button>
              <button className="tq-btn tq-btn-primary" onClick={confirmRedeem} style={{ padding: '6px 12px', fontSize: 12 }}>{t('rewards.confirmBuy')}</button>
            </div>
          </div>
        </div>
      )}
      {spendFx && (
        <div key={spendFx.key} style={{ position: 'fixed', top: 88, right: 80, zIndex: 121, animation: 'coinSpendFloat 1.4s ease forwards', backgroundColor: 'var(--warm-accent-light)', border: '1.5px solid var(--warm-accent)', borderRadius: 14, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 900, color: 'var(--warm-accent)' }}>
          -{spendFx.amount} <CoinIcon />
        </div>
      )}
      {refundFx && (
        <div key={refundFx.key} style={{ position: 'fixed', top: 126, right: 80, zIndex: 121, animation: 'coinRefundFloat 1.7s ease forwards', backgroundColor: '#DCFCE7', border: '1.5px solid #16A34A', borderRadius: 14, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 900, color: '#166534' }}>
          +{refundFx.amount} <CoinIcon />
        </div>
      )}
    </div>
  );
}
