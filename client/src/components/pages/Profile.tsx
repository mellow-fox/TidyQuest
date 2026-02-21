import { useState, useRef } from 'react';
import { UserAvatar } from '../shared/UserAvatar';
import { AVATAR_PRESETS, AvatarPresetIcon } from '../icons/AvatarPresets';
import { GlobeIcon } from '../icons/UIIcons';
import { api } from '../../hooks/useApi';
import { useTranslation } from '../../hooks/useTranslation';
import type { User } from '../../hooks/useAuth';

const COLORS = [
  '#F97316', '#EF4444', '#EC4899', '#A855F7',
  '#6366F1', '#3B82F6', '#06B6D4', '#10B981',
  '#84CC16', '#F59E0B', '#78716C', '#64748B',
];

interface ProfileProps {
  user: User;
  onSave: () => void;
  onLogout: () => void;
}

export function Profile({ user, onSave, onLogout }: ProfileProps) {
  const { t } = useTranslation(user.language);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarType, setAvatarType] = useState<'letter' | 'preset' | 'photo'>(user.avatarType || 'letter');
  const [avatarColor, setAvatarColor] = useState(user.avatarColor);
  const [avatarPreset, setAvatarPreset] = useState(user.avatarPreset || 'cat');
  const [avatarPhotoUrl, setAvatarPhotoUrl] = useState(user.avatarPhotoUrl);
  const [language, setLanguage] = useState(user.language);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile(user.id, {
        displayName,
        avatarType,
        avatarColor,
        avatarPreset: avatarType === 'preset' ? avatarPreset : undefined,
        language,
      });
      setSaved(true);
      onSave();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const result = await api.uploadAvatar(user.id, file);
      setAvatarType('photo');
      setAvatarPhotoUrl(result.avatarPhotoUrl);
      onSave();
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

  const tabs: Array<{ key: 'letter' | 'preset' | 'photo'; label: string }> = [
    { key: 'letter', label: t('profile.letterMode') },
    { key: 'preset', label: t('profile.characterMode') },
    { key: 'photo', label: t('profile.photoMode') },
  ];

  return (
    <div className="page-enter" style={{ maxWidth: 520 }}>
      <div className="tq-card" style={{ padding: 32 }}>
        {/* Avatar preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <UserAvatar
            name={displayName}
            color={avatarColor}
            size={80}
            avatarType={avatarType}
            avatarPreset={avatarPreset}
            avatarPhotoUrl={avatarPhotoUrl}
          />
        </div>

        {/* Display name */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>
            {t('profile.displayName')}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 12,
              border: '1.5px solid var(--warm-border)', fontSize: 14, fontWeight: 700,
              color: 'var(--warm-text)', fontFamily: 'Nunito', backgroundColor: 'var(--warm-bg-input)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Avatar mode tabs */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>
            {t('profile.avatarMode')}
          </label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setAvatarType(tab.key)}
                className="tq-btn"
                style={{
                  flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 700,
                  backgroundColor: avatarType === tab.key ? 'var(--warm-accent)' : 'var(--warm-accent-light)',
                  color: avatarType === tab.key ? '#fff' : 'var(--warm-accent)',
                  border: avatarType === tab.key ? 'none' : '1.5px solid var(--warm-border)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Letter mode: color picker */}
          {avatarType === 'letter' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 12, border: avatarColor === c ? `3px solid ${c}` : '2px solid var(--warm-border)',
                    backgroundColor: c, cursor: 'pointer', outline: 'none',
                    boxShadow: avatarColor === c ? `0 0 0 3px ${c}33` : 'none',
                  }}
                />
              ))}
            </div>
          )}

          {/* Preset mode: grid of animal faces */}
          {avatarType === 'preset' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
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
          )}

          {/* Photo mode: upload button */}
          {avatarType === 'photo' && (
            <div style={{ textAlign: 'center' }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              <button
                className="tq-btn"
                onClick={() => fileRef.current?.click()}
                style={{
                  padding: '10px 24px', backgroundColor: 'var(--warm-accent-light)', color: 'var(--warm-accent)',
                  fontSize: 13, fontWeight: 700, border: '1.5px solid var(--warm-border)',
                }}
              >
                {t('profile.uploadPhoto')}
              </button>
              {avatarPhotoUrl && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#B0A090', fontWeight: 600 }}>
                  Photo uploaded
                </div>
              )}
            </div>
          )}
        </div>

        {/* Language */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>
            {t('profile.language')}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GlobeIcon />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                border: '1.5px solid var(--warm-border)', fontSize: 14, fontWeight: 700,
                color: 'var(--warm-text)', fontFamily: 'Nunito', backgroundColor: 'var(--warm-bg-input)',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="en">English</option>
              <option value="fr">Fran{'\u00E7'}ais</option>
              <option value="de">Deutsch</option>
              <option value="es">Espa{'\u00F1'}ol</option>
              <option value="it">Italiano</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 24, display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' }}>
            {t('settings.passwordSection')}
          </label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('settings.currentPassword')} style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito', backgroundColor: 'var(--warm-bg-input)', color: 'var(--warm-text)' }} />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('settings.newPassword')} style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito', backgroundColor: 'var(--warm-bg-input)', color: 'var(--warm-text)' }} />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('settings.confirmPassword')} style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito', backgroundColor: 'var(--warm-bg-input)', color: 'var(--warm-text)' }} />
          <button className="tq-btn tq-btn-secondary" onClick={handlePasswordChange} style={{ width: 'fit-content', padding: '8px 12px', fontSize: 12 }}>
            {t('settings.updatePassword')}
          </button>
          {passwordMsg && <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>{passwordMsg}</div>}
        </div>

        {/* Save */}
        <button
          className="tq-btn tq-btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 800 }}
        >
          {saving ? t('common.loading') : saved ? t('profile.saved') : t('profile.save')}
        </button>
        <button
          className="tq-btn tq-btn-secondary"
          onClick={onLogout}
          style={{ width: '100%', padding: '10px', fontSize: 13, fontWeight: 800, marginTop: 10 }}
        >
          {t('profile.logout')}
        </button>
      </div>
    </div>
  );
}
