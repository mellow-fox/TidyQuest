import { useState } from 'react';
import { UserAvatar } from '../shared/UserAvatar';
import { AVATAR_PRESETS, AvatarPresetIcon } from '../icons/avatars';
import { GlobeIcon } from '../icons/UIIcons';
import { api } from '../../hooks/useApi';
import { useTranslation } from '../../hooks/useTranslation';
import type { User } from '../../hooks/useAuth';


interface ProfileProps {
  user: User;
  onSave: () => void;
  onLogout: () => void;
}

export function Profile({ user, onSave, onLogout }: ProfileProps) {
  const { t } = useTranslation(user.language);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarColor] = useState(user.avatarColor);
  const [avatarPreset, setAvatarPreset] = useState(user.avatarPreset || 'cyberKnight');
  const [language, setLanguage] = useState(user.language);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile(user.id, {
        displayName,
        avatarType: 'preset',
        avatarColor,
        avatarPreset,
        language,
      });
      setSaved(true);
      onSave();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMsg('');
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setPasswordMsg(t('settings.passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      await api.updatePassword(user.id, { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg(t('settings.passwordUpdated'));
    } catch (err: any) {
      setPasswordMsg(err?.message || t('settings.passwordUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter tq-page-narrow">
      <div className="tq-card" style={{ padding: 'var(--space-3xl)' }}>
        {/* Avatar preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <UserAvatar
            name={displayName}
            color={avatarColor}
            size={80}
            avatarType="preset"
            avatarPreset={avatarPreset}
          />
        </div>

        {/* Display name */}
        <div style={{ marginBottom: 24 }}>
          <label className="tq-label">
            {t('profile.displayName')}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="tq-input" style={{ fontWeight: 700 }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="tq-label">
            {t('profile.avatarMode')}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
            {Object.entries(AVATAR_PRESETS).map(([id]) => (
              <button
                key={id}
                onClick={() => setAvatarPreset(id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: 8, borderRadius: 14, cursor: 'pointer', outline: 'none',
                  border: avatarPreset === id ? '2.5px solid var(--warm-accent)' : '1.5px solid var(--warm-border)',
                  backgroundColor: avatarPreset === id ? 'var(--warm-accent-light)' : 'var(--warm-bg-subtle)',
                  boxShadow: avatarPreset === id ? '0 0 0 3px var(--warm-primary-shadow)' : 'none',
                }}
              >
                <AvatarPresetIcon presetId={id} size={44} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-muted)' }}>{t(`avatars.${id}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div style={{ marginBottom: 28 }}>
          <label className="tq-label">
            {t('profile.language')}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GlobeIcon />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="tq-input" style={{ flex: 1, fontWeight: 700, cursor: 'pointer' }}
            >
              <option value="en">English</option>

              <option value="bg">Български</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 24, display: 'grid', gap: 8 }}>
          <label className="tq-label">
            {t('settings.passwordSection')}
          </label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('settings.currentPassword')} className="tq-input" />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('settings.newPassword')} className="tq-input" />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('settings.confirmPassword')} className="tq-input" />
          <button className="tq-btn tq-btn-secondary tq-btn-sm" onClick={handlePasswordChange} style={{ width: 'fit-content' }}>
            {t('settings.updatePassword')}
          </button>
          {passwordMsg && <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>{passwordMsg}</div>}
        </div>

        {/* Save */}
        <button
          className="tq-btn tq-btn-primary tq-btn-lg"
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', fontWeight: 800 }}
        >
          {saving ? t('common.loading') : saved ? t('profile.saved') : t('profile.save')}
        </button>
        <button
          className="tq-btn tq-btn-secondary tq-btn-md"
          onClick={onLogout}
          style={{ width: '100%', fontWeight: 800, marginTop: 10 }}
        >
          {t('profile.logout')}
        </button>
      </div>
    </div>
  );
}
