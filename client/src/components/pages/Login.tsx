import { useState, useEffect, useRef } from 'react';
import { SparkleIcon } from '../icons/UIIcons';
import { useTranslation } from '../../hooks/useTranslation';
import { api } from '../../hooks/useApi';
import UserAvatar from '../shared/UserAvatar';

interface LoginUser {
  username: string;
  displayName: string;
  avatarColor: string;
  avatarType: string;
  avatarPreset?: string;
  avatarPhotoUrl?: string;
}

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
}

export function Login({ onLogin, onSwitchToRegister }: LoginProps) {
  const initialLang = (() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('tidyquest_auth_lang') : null;
    if (saved && ['en', 'fr', 'de', 'es', 'it', 'nl'].includes(saved)) return saved;
    const browser = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
    return ['en', 'fr', 'de', 'es', 'it', 'nl'].includes(browser) ? browser : 'en';
  })();
  const [authLanguage, setAuthLanguage] = useState(initialLang);
  const { t } = useTranslation(authLanguage);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [avatarUsers, setAvatarUsers] = useState<LoginUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getRegistrationStatus()
      .then((s) => setRegistrationEnabled(s.registrationEnabled))
      .catch(() => {});
    api.getLoginAvatars()
      .then((users) => setAvatarUsers(users))
      .catch(() => {});
  }, []);

  const handleAvatarClick = (user: LoginUser) => {
    setUsername(user.username);
    setSelectedUser(user.username);
    setError('');
    setPassword('');
    setTimeout(() => passwordRef.current?.focus(), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(username.trim(), password);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--warm-bg)',
    }}>
      <div className="tq-card auth-card" style={{ padding: 40, width: 380, maxWidth: 'calc(100vw - 24px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, margin: '0 auto 14px',
            background: 'var(--warm-streak-bg)',
            border: '1.5px solid var(--warm-streak-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SparkleIcon />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--warm-text)', margin: 0 }}>TidyQuest</h1>
          <p style={{ fontSize: 12, color: 'var(--warm-text-light)', fontWeight: 600, marginTop: 4 }}>{t('auth.welcomeBack')}</p>
          <select
            value={authLanguage}
            onChange={(e) => {
              const v = e.target.value;
              setAuthLanguage(v);
              localStorage.setItem('tidyquest_auth_lang', v);
            }}
            style={{
              marginTop: 10, padding: '6px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)',
              fontSize: 12, fontFamily: 'Nunito', fontWeight: 700, color: 'var(--warm-text-secondary)', backgroundColor: 'var(--warm-bg-subtle)',
            }}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
            <option value="it">Italiano</option>
            <option value="nl">Nederlands</option>
          </select>
        </div>

        {avatarUsers.length > 0 && !selectedUser && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-light)', textAlign: 'center', marginBottom: 12 }}>
              {t('auth.selectUser')}
            </p>
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12,
            }}>
              {avatarUsers.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => handleAvatarClick(u)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '10px 8px', borderRadius: 14, border: '1.5px solid var(--warm-border)',
                    backgroundColor: 'var(--warm-bg-subtle)', cursor: 'pointer',
                    minWidth: 72, transition: 'all 0.15s ease', fontFamily: 'Nunito',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--warm-accent)';
                    e.currentTarget.style.backgroundColor = 'var(--warm-accent-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--warm-border)';
                    e.currentTarget.style.backgroundColor = 'var(--warm-bg-subtle)';
                  }}
                >
                  <UserAvatar
                    name={u.displayName}
                    color={u.avatarColor}
                    size={48}
                    avatarType={u.avatarType as any}
                    avatarPreset={u.avatarPreset}
                    avatarPhotoUrl={u.avatarPhotoUrl}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text)' }}>
                    {u.displayName}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setSelectedUser('')}
                style={{
                  background: 'none', border: 'none', color: 'var(--warm-text-light)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Nunito',
                  textDecoration: 'underline',
                }}
              >
                {t('auth.orTypeUsername')}
              </button>
            </div>
          </div>
        )}

        {(selectedUser !== null || avatarUsers.length === 0) && (
          <form onSubmit={handleSubmit}>
            {selectedUser && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                {(() => {
                  const u = avatarUsers.find((a) => a.username === selectedUser);
                  if (!u) return null;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <UserAvatar
                        name={u.displayName}
                        color={u.avatarColor}
                        size={56}
                        avatarType={u.avatarType as any}
                        avatarPreset={u.avatarPreset}
                        avatarPhotoUrl={u.avatarPhotoUrl}
                      />
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-text)' }}>{u.displayName}</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedUser(null); setUsername(''); setPassword(''); setError(''); }}
                        style={{
                          background: 'none', border: 'none', color: 'var(--warm-text-light)',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Nunito',
                          textDecoration: 'underline',
                        }}
                      >
                        {t('auth.switchUser')}
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {!selectedUser && (
              <div style={{ marginBottom: 14 }}>
                <label className="tq-label" style={{ textTransform: 'none' }}>{t('auth.username')}</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)}
                  className="tq-input" style={{ backgroundColor: 'var(--warm-bg-subtle)' }}
                  placeholder={t('auth.usernamePlaceholder')}
                />
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <label className="tq-label" style={{ textTransform: 'none' }}>{t('auth.password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                ref={passwordRef}
                className="tq-input" style={{ backgroundColor: 'var(--warm-bg-subtle)' }}
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>

            {error && <div style={{ fontSize: 12, color: 'var(--warm-badge-text)', fontWeight: 700, marginBottom: 14, textAlign: 'center' }}>{error}</div>}

            <button type="submit" className="tq-btn tq-btn-primary tq-btn-lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? t('auth.loggingIn') : t('auth.logIn')}
            </button>
          </form>
        )}

        {registrationEnabled && (
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button onClick={onSwitchToRegister}
              style={{
                background: 'none', border: 'none', color: 'var(--warm-accent)', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito',
              }}>
              {t('auth.createAccount')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
