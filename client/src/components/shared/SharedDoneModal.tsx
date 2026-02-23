import { useState, useEffect } from 'react';
import { UserAvatar } from './UserAvatar';
import { api } from '../../hooks/useApi';
import { useTranslation } from '../../hooks/useTranslation';

interface User {
  id: number;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarType: string;
  avatarPreset: string | null;
  avatarPhotoUrl: string | null;
  role: string;
}

interface SharedDoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (participants: Array<{ userId: number; percentage: number }>) => void;
  taskName: string;
  language?: string;
  allowCustomPercentage?: boolean;
}

export function SharedDoneModal({ isOpen, onClose, onComplete, taskName, language, allowCustomPercentage = false }: SharedDoneModalProps) {
  const { t } = useTranslation(language || 'en');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Array<{ userId: number; percentage: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.getUsers()
        .then(setUsers)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([]);
    }
  }, [isOpen]);

  const toggleUser = (userId: number) => {
    const isSelected = selectedUsers.some(u => u.userId === userId);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.userId !== userId));
    } else {
      const newSelected = [...selectedUsers, { userId, percentage: 0 }];
      // When allowCustomPercentage is false, always use equal split
      if (!allowCustomPercentage) {
        equalSplit(newSelected);
      } else {
        setSelectedUsers(newSelected);
      }
    }
  };

  const equalSplit = (usersList: Array<{ userId: number; percentage: number }>) => {
    if (usersList.length === 0) return;
    const share = Math.floor(100 / usersList.length);
    const remainder = 100 - share * usersList.length;
    const updated = usersList.map((u, i) => ({
      ...u,
      percentage: share + (i === usersList.length - 1 ? remainder : 0)
    }));
    setSelectedUsers(updated);
  };

  const updatePercentage = (userId: number, percentage: number) => {
    const newSelected = selectedUsers.map(u => 
      u.userId === userId ? { ...u, percentage: Math.max(0, Math.min(100, percentage)) } : u
    );
    setSelectedUsers(newSelected);
  };

  const totalPercentage = selectedUsers.reduce((sum, u) => sum + u.percentage, 0);
  const isValid = selectedUsers.length > 0 && (totalPercentage === 100 || !allowCustomPercentage);

  const handleComplete = () => {
    if (isValid) {
      onComplete(selectedUsers);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div className="tq-card" style={{ width: 420, maxHeight: '85vh', overflow: 'hidden', boxSizing: 'border-box' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 28, maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--warm-text)', margin: '0 0 4px' }}>
            {t('task.sharedDone')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--warm-text-light)', fontWeight: 600, marginBottom: 20 }}>
            {taskName}
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--warm-text-muted)' }}>
              {t('common.loading')}...
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--warm-text-muted)', marginBottom: 10 }}>
                {t('task.selectParticipants')}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {users.map(user => {
                  const isSelected = selectedUsers.some(u => u.userId === user.id);
                  return (
                    <div key={user.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      borderRadius: 12, border: isSelected ? '1.5px solid var(--warm-accent)' : '1.5px solid var(--warm-border)',
                      backgroundColor: isSelected ? 'var(--warm-bg-warm)' : 'transparent',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }} onClick={() => toggleUser(user.id)}>
                      <input type="checkbox" checked={isSelected} readOnly style={{ accentColor: 'var(--warm-accent)' }} />
                      <UserAvatar name={user.displayName} color={user.avatarColor} size={32} avatarType={user.avatarType as 'letter' | 'preset' | 'photo'} avatarPreset={user.avatarPreset} avatarPhotoUrl={user.avatarPhotoUrl} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warm-text)' }}>
                          {user.displayName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 600 }}>
                          @{user.username}
                        </div>
                      </div>
                      {isSelected && allowCustomPercentage && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={selectedUsers.find(u => u.userId === user.id)?.percentage || 0}
                            onChange={(e) => {
                              e.stopPropagation();
                              updatePercentage(user.id, parseInt(e.target.value) || 0);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: 56, padding: '6px 8px', borderRadius: 8,
                              border: '1.5px solid var(--warm-border)', fontSize: 13,
                              fontFamily: 'Nunito', fontWeight: 700, textAlign: 'right',
                              outline: 'none', backgroundColor: 'var(--warm-bg-input)',
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--warm-text-muted)' }}>%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedUsers.length > 0 && allowCustomPercentage && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: 10,
                  backgroundColor: totalPercentage === 100 ? 'var(--health-green-bg)' : 'var(--warm-bg-subtle)',
                  marginBottom: 20,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warm-text-muted)' }}>
                    {t('task.totalPercentage')}:
                  </span>
                  <span style={{
                    fontSize: 14, fontWeight: 800,
                    color: totalPercentage === 100 ? 'var(--health-green)' : 'var(--warm-danger)',
                  }}>
                    {totalPercentage}%
                  </span>
                </div>
              )}

              {selectedUsers.length > 1 && allowCustomPercentage && (
                <button
                  onClick={() => equalSplit(selectedUsers)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, color: 'var(--warm-accent)',
                    marginBottom: 20, padding: 0,
                  }}
                >
                  {t('task.equalSplit')}
                </button>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="tq-btn tq-btn-secondary" onClick={onClose}
                  style={{ padding: '10px 22px', fontSize: 13 }}>{t('common.cancel')}</button>
                <button 
                  className="tq-btn tq-btn-primary" 
                  onClick={handleComplete}
                  disabled={!isValid}
                  style={{ 
                    padding: '10px 22px', 
                    fontSize: 13,
                    opacity: isValid ? 1 : 0.5,
                    cursor: isValid ? 'pointer' : 'not-allowed',
                  }}
                >
                  {t('task.complete')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
