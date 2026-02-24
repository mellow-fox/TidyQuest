import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface User {
  id: number;
  displayName: string;
  role?: string;
  avatarColor: string;
  avatarType?: string;
  avatarPreset?: string;
  avatarPhotoUrl?: string;
  coinPercentage?: number;
}

interface AdminCompleteModalProps {
  task: {
    id: number;
    name: string;
    assignmentMode?: 'first' | 'shared' | 'custom';
    assignedUsers?: User[];
    assignedToChildren?: boolean;
    effectiveAssignedUserIds?: number[];
    sharedCompletions?: Array<{ userId: number; displayName: string }>;
    completedTodayBy?: { userId: number; displayName: string } | null;
  };
  allUsers: User[];
  language?: string;
  onConfirm: (userIds: number[]) => Promise<void>;
  onClose: () => void;
}

export function AdminCompleteModal({ task, allUsers, language, onConfirm, onClose }: AdminCompleteModalProps) {
  const { t } = useTranslation(language);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Determine candidate users
  const effectiveIds = task.effectiveAssignedUserIds || [];
  let candidates: User[];
  if (effectiveIds.length > 0) {
    candidates = allUsers.filter(u => effectiveIds.includes(u.id));
  } else if (task.assignedToChildren) {
    candidates = allUsers.filter(u => u.role === 'child' || u.role === undefined);
  } else {
    candidates = allUsers;
  }

  const isSharedOrCustom = task.assignmentMode === 'shared' || task.assignmentMode === 'custom';
  const completedUserIds = (task.sharedCompletions || []).map(c => c.userId);
  // For first mode: if task already completed, no one can be selected
  const firstModeCompleted = !isSharedOrCustom && !!task.completedTodayBy;
  // Build a map of userId → coinPercentage from assignedUsers
  const percentageByUser = new Map<number, number>();
  for (const u of task.assignedUsers || []) {
    if (u.coinPercentage !== undefined) percentageByUser.set(u.id, u.coinPercentage);
  }

  const toggleUser = (userId: number) => {
    if (completedUserIds.includes(userId)) return;
    if (isSharedOrCustom) {
      setSelected(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    } else {
      setSelected(prev => prev.includes(userId) ? [] : [userId]);
    }
  };

  const handleConfirm = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      await onConfirm(selected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--warm-card)',
          borderRadius: 20,
          padding: 28,
          width: 380,
          maxWidth: '92vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          border: '1.5px solid var(--warm-border)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--warm-text)', marginBottom: 6 }}>
          {t('admin.whoDidThisTask')}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warm-text-muted)', marginBottom: 18 }}>
          {task.name}
        </div>

        {firstModeCompleted ? (
          <div style={{
            padding: '12px 16px', borderRadius: 12,
            backgroundColor: 'var(--warm-bg-subtle)', border: '1.5px solid var(--warm-border)',
            fontSize: 13, color: 'var(--warm-text-muted)', fontWeight: 600,
          }}>
            {t('admin.alreadyCompletedBy').replace('{name}', task.completedTodayBy!.displayName)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {candidates.map(user => {
              const alreadyDone = completedUserIds.includes(user.id);
              const isSelected = selected.includes(user.id);
              return (
                <label
                  key={user.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 14,
                    border: `1.5px solid ${isSelected ? 'var(--warm-accent)' : alreadyDone ? 'var(--warm-border-subtle)' : 'var(--warm-border)'}`,
                    backgroundColor: isSelected ? 'var(--warm-accent-light)' : alreadyDone ? 'var(--warm-bg-subtle)' : 'var(--warm-bg-input)',
                    cursor: alreadyDone ? 'default' : 'pointer',
                    opacity: alreadyDone ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => !alreadyDone && toggleUser(user.id)}
                >
                  {isSharedOrCustom ? (
                    <input
                      type="checkbox"
                      checked={isSelected || alreadyDone}
                      readOnly
                      disabled={alreadyDone}
                      style={{ accentColor: 'var(--warm-accent)', width: 16, height: 16, cursor: alreadyDone ? 'default' : 'pointer' }}
                    />
                  ) : (
                    <input
                      type="radio"
                      checked={isSelected}
                      readOnly
                      style={{ accentColor: 'var(--warm-accent)', width: 16, height: 16, cursor: 'pointer' }}
                    />
                  )}
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      backgroundColor: user.avatarColor || '#F59E0B',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
                    }}
                  >
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warm-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {user.displayName}
                      {task.assignmentMode === 'custom' && percentageByUser.has(user.id) && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: 'var(--warm-accent)',
                          backgroundColor: 'var(--warm-accent-light)', borderRadius: 8,
                          padding: '1px 6px',
                        }}>
                          {percentageByUser.get(user.id)}%
                        </span>
                      )}
                    </div>
                    {alreadyDone && (
                      <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 600 }}>
                        ✓ {t('admin.alreadyCompletedBy').replace('{name}', '')}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="tq-btn tq-btn-secondary"
            style={{ padding: '8px 18px', fontSize: 13 }}
          >
            {t('common.cancel')}
          </button>
          {!firstModeCompleted && (
            <button
              onClick={handleConfirm}
              disabled={selected.length === 0 || loading}
              className="tq-btn tq-btn-primary"
              style={{
                padding: '8px 20px', fontSize: 13,
                opacity: selected.length === 0 ? 0.5 : 1,
              }}
            >
              {t('admin.confirmCompletion')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
