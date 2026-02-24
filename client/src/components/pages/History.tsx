import { useState, useEffect } from 'react';
import { UserAvatar } from '../shared/UserAvatar';
import { CoinIcon } from '../icons/UIIcons';
import { api } from '../../hooks/useApi';
import { useTranslation } from '../../hooks/useTranslation';

export function History({ language, isAdmin }: { language?: string; isAdmin?: boolean }) {
  const { taskName, t, roomDisplayName, timeAgo } = useTranslation(language);
  const [history, setHistory] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);
  const limit = 20;

  const loadHistory = () => {
    api.history(limit, offset).then((data) => {
      setHistory(data.history);
      setTotal(data.total);
    });
  };

  useEffect(() => {
    loadHistory();
  }, [offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async (id: number) => {
    await api.cancelCompletion(id);
    setConfirmCancel(null);
    loadHistory();
  };

  return (
    <div className="page-enter" style={{ maxWidth: 750 }}>
      <div className="tq-card" style={{ padding: 22 }}>
        <div className="history-table-scroll">
          <div className="history-header" style={{
            display: 'grid', gridTemplateColumns: isAdmin ? '44px 1fr 120px 100px 80px 60px' : '44px 1fr 120px 100px 80px',
            gap: 12, padding: '0 8px 14px', borderBottom: '1.5px solid #F0E6D9',
            fontSize: 11, fontWeight: 800, color: '#B0A090', textTransform: 'uppercase', letterSpacing: 1,
          }}>
            <div></div>
            <div>{t('history.task')}</div>
            <div>{t('history.room')}</div>
            <div>{t('history.when')}</div>
            <div style={{ textAlign: 'right' }}>{t('history.earned')}</div>
            {isAdmin && <div></div>}
          </div>

          {history.map((h) => {
            const isDuo = h.participants && h.participants.length > 1;
            const byName = isDuo
              ? h.participants.map((p: any) => p.displayName).join(' & ')
              : h.displayName;
            return (
            <div key={h.id} className="history-row" style={{
              display: 'grid', gridTemplateColumns: isAdmin ? '44px 1fr 120px 100px 80px 60px' : '44px 1fr 120px 100px 80px',
              gap: 12, padding: '14px 8px', alignItems: 'center',
              borderBottom: '1px solid #F5EDE3',
            }}>
              {isDuo ? (
                <div style={{ position: 'relative', width: 44, height: 34, flexShrink: 0 }}>
                  {h.participants.map((p: any, i: number) => (
                    <div key={p.id} style={{ position: 'absolute', left: i * 14, top: 0, zIndex: h.participants.length - i, outline: '2px solid var(--warm-card)', borderRadius: '50%' }}>
                      <UserAvatar name={p.displayName} color={p.avatarColor} size={28} avatarType={p.avatarType} avatarPreset={p.avatarPreset} avatarPhotoUrl={p.avatarPhotoUrl} />
                    </div>
                  ))}
                </div>
              ) : (
                <UserAvatar name={h.displayName} color={h.avatarColor} size={34} avatarType={h.avatarType} avatarPreset={h.avatarPreset} avatarPhotoUrl={h.avatarPhotoUrl} />
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#3D2F1E' }}>{taskName(h.taskName, h.translationKey)}</div>
                <div style={{ fontSize: 11, color: '#B0A090', fontWeight: 600 }}>{t('history.by')} {byName}</div>
                <div className="history-mobile-meta">{roomDisplayName(h.roomName, h.roomType || '')} · {timeAgo(h.completedAt)}</div>
              </div>
              <div className="history-col-room" style={{ fontSize: 13, color: '#6B5B4A', fontWeight: 600 }}>{roomDisplayName(h.roomName, h.roomType || '')}</div>
              <div className="history-col-when" style={{ fontSize: 12, color: '#B0A090', fontWeight: 600 }}>{timeAgo(h.completedAt)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', fontSize: 13, fontWeight: 800, color: '#F59E0B' }}>
                +{h.coinsEarned} <CoinIcon />
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {confirmCancel === h.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => handleCancel(h.id)} style={{ background: 'none', border: '1px solid #EF4444', borderRadius: 8, padding: '3px 7px', fontSize: 10, fontWeight: 700, color: '#EF4444', cursor: 'pointer', fontFamily: 'Nunito' }}>✓</button>
                      <button onClick={() => setConfirmCancel(null)} style={{ background: 'none', border: '1px solid #B0A090', borderRadius: 8, padding: '3px 7px', fontSize: 10, fontWeight: 700, color: '#B0A090', cursor: 'pointer', fontFamily: 'Nunito' }}>✗</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmCancel(h.id)} title={t('history.cancel')} style={{ background: 'none', border: '1px solid #E2D5C5', borderRadius: 8, padding: '3px 8px', fontSize: 13, cursor: 'pointer', opacity: 0.6 }}>🗑</button>
                  )}
                </div>
              )}
            </div>
            );
          })}

          {history.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#B0A090', fontWeight: 600, fontSize: 14 }}>
              {t('history.noActivity')}
            </div>
          )}
        </div>

        {total > limit && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '18px 0 4px' }}>
            <button className="tq-btn tq-btn-secondary" disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              style={{ padding: '8px 18px', fontSize: 12, opacity: offset === 0 ? 0.4 : 1 }}>
              {t('history.previous')}
            </button>
            <span style={{ fontSize: 12, color: '#B0A090', fontWeight: 600, padding: '8px 0' }}>
              {offset + 1}-{Math.min(offset + limit, total)} {t('history.of')} {total}
            </span>
            <button className="tq-btn tq-btn-secondary" disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
              style={{ padding: '8px 18px', fontSize: 12, opacity: offset + limit >= total ? 0.4 : 1 }}>
              {t('history.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
