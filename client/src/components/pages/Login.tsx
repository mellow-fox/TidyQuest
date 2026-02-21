import { useState, useEffect } from 'react';
import { SparkleIcon } from '../icons/UIIcons';
import { useTranslation } from '../../hooks/useTranslation';
import { api } from '../../hooks/useApi';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
}

export function Login({ onLogin, onSwitchToRegister }: LoginProps) {
  const initialLang = (() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('tidyquest_auth_lang') : null;
    if (saved && ['en', 'fr', 'de', 'es', 'it'].includes(saved)) return saved;
    const browser = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
    return ['en', 'fr', 'de', 'es', 'it'].includes(browser) ? browser : 'en';
  })();
  const [authLanguage, setAuthLanguage] = useState(initialLang);
  const { t } = useTranslation(authLanguage);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

  useEffect(() => {
    api.getRegistrationStatus()
      .then((s) => setRegistrationEnabled(s.registrationEnabled))
      .catch(() => {});
  }, []);

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
      backgroundColor: '#FFF9F2',
    }}>
      <div className="tq-card auth-card" style={{ padding: 40, width: 380, maxWidth: 'calc(100vw - 24px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
            border: '1.5px solid #FDBA74',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SparkleIcon />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#3D2F1E', margin: 0 }}>TidyQuest</h1>
          <p style={{ fontSize: 12, color: '#B0A090', fontWeight: 600, marginTop: 4 }}>{t('auth.welcomeBack')}</p>
          <select
            value={authLanguage}
            onChange={(e) => {
              const v = e.target.value;
              setAuthLanguage(v);
              localStorage.setItem('tidyquest_auth_lang', v);
            }}
            style={{
              marginTop: 10, padding: '6px 10px', borderRadius: 10, border: '1.5px solid #F0E6D9',
              fontSize: 12, fontFamily: 'Nunito', fontWeight: 700, color: '#6B5B4A', backgroundColor: '#FFFBF5',
            }}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
            <option value="it">Italiano</option>
          </select>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#8A7A6A', display: 'block', marginBottom: 6 }}>{t('auth.username')}</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #F0E6D9',
                fontSize: 14, fontFamily: 'Nunito', fontWeight: 600, color: '#3D2F1E',
                outline: 'none', backgroundColor: '#FFFBF5',
              }}
              placeholder={t('auth.usernamePlaceholder')}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#8A7A6A', display: 'block', marginBottom: 6 }}>{t('auth.password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #F0E6D9',
                fontSize: 14, fontFamily: 'Nunito', fontWeight: 600, color: '#3D2F1E',
                outline: 'none', backgroundColor: '#FFFBF5',
              }}
              placeholder={t('auth.passwordPlaceholder')}
            />
          </div>

          {error && <div style={{ fontSize: 12, color: '#E25A5A', fontWeight: 700, marginBottom: 14, textAlign: 'center' }}>{error}</div>}

          <button type="submit" className="tq-btn tq-btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: 15, justifyContent: 'center' }}>
            {loading ? t('auth.loggingIn') : t('auth.logIn')}
          </button>
        </form>

        {registrationEnabled && (
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button onClick={onSwitchToRegister}
              style={{
                background: 'none', border: 'none', color: '#F97316', fontSize: 13,
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
