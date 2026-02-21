import { useEffect, useState } from 'react';
import { UserAvatar } from '../shared/UserAvatar';
import { EffortDots } from '../shared/EffortDots';
import { Toggle } from '../shared/Toggle';
import { BellIcon, DownloadIcon, UploadIcon, LockIcon, CoinIcon } from '../icons/UIIcons';
import { AVATAR_PRESETS } from '../icons/AvatarPresets';
import { useTranslation } from '../../hooks/useTranslation';
import type { User } from '../../hooks/useAuth';
import { api } from '../../hooks/useApi';

interface FamilyUser {
  id: number;
  displayName: string;
  role?: 'admin' | 'member' | 'child';
  avatarColor: string;
  avatarType?: string;
  avatarPreset?: string;
  avatarPhotoUrl?: string;
  coins: number;
  currentStreak: number;
  language?: string;
  goalCoins?: number | null;
  goalStartAt?: string | null;
  goalEndAt?: string | null;
}

interface SettingsProps {
  user: User;
  family: FamilyUser[];
  onToggleVacation: (enabled: boolean) => void;
  onUpdateRole: (userId: number, role: 'admin' | 'member' | 'child') => void;
  onAddMember: (data: { username: string; password: string; displayName: string; role: 'child' }) => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
  onUpdateMemberProfile: (userId: number, data: { avatarType?: string; avatarColor?: string; avatarPreset?: string | null; language?: string }) => Promise<void>;
  onChangePassword: (userId: number, data: { currentPassword?: string; newPassword: string }) => Promise<void>;
  coinsByEffort: Record<number, number>;
  onSaveCoinsByEffort: (values: Record<number, number>) => Promise<void>;
  onResetCoinsByEffort: () => Promise<void>;
  theme: 'orange' | 'blue' | 'rose' | 'night';
  onChangeTheme: (theme: 'orange' | 'blue' | 'rose' | 'night') => void;
  onExport: () => void;
  onImport: () => void;
}

const COLORS = ['#F97316', '#9B72CF', '#4AABDE', '#5CB85C', '#D4A017', '#E25A5A', '#38BDF8', '#EC4899'];

export function Settings({
  user,
  family,
  onToggleVacation,
  onUpdateRole,
  onAddMember,
  onDeleteUser,
  onUpdateMemberProfile,
  onChangePassword,
  coinsByEffort,
  onSaveCoinsByEffort,
  onResetCoinsByEffort,
  theme,
  onChangeTheme,
  onExport,
  onImport,
}: SettingsProps) {
  const { t } = useTranslation(user.language);
  const isAdmin = user.role === 'admin';
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [coinsDraft, setCoinsDraft] = useState<Record<number, number>>(coinsByEffort);
  const [memberEditOpen, setMemberEditOpen] = useState<Record<number, boolean>>({});
  const [memberPassword, setMemberPassword] = useState<Record<number, string>>({});
  const [memberPasswordMsg, setMemberPasswordMsg] = useState<Record<number, string>>({});
  const [memberGoals, setMemberGoals] = useState<Record<number, Array<{ id: number; title: string; goalCoins: number; startAt?: string | null; endAt?: string | null }>>>({});
  const [goalDraft, setGoalDraft] = useState<Record<number, { title: string; goalCoins: string; endAt: string }>>({});
  const [rewardsAdmin, setRewardsAdmin] = useState<Array<{ id: number; title: string; description?: string | null; costCoins: number; isActive?: boolean; isPreset?: boolean }>>([]);
  const [rewardRequests, setRewardRequests] = useState<Array<{ id: number; title: string; displayName: string; costCoins: number; redeemedAt: string; status: string }>>([]);
  const [rewardDraft, setRewardDraft] = useState({ title: '', description: '', costCoins: '30' });
  const [memberProfile, setMemberProfile] = useState<Record<number, {
    language: string;
    avatarType: 'letter' | 'preset';
    avatarColor: string;
    avatarPreset: string;
  }>>({});
  const [memberProfileMsg, setMemberProfileMsg] = useState<Record<number, string>>({});
  const [memberGoalMsg, setMemberGoalMsg] = useState<Record<number, string>>({});
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifChatId, setNotifChatId] = useState('');
  const [notifToken, setNotifToken] = useState('');
  const [notifTime, setNotifTime] = useState('09:00');
  const [notifTypes, setNotifTypes] = useState({ taskDue: true, rewardRequest: true, achievementUnlocked: true });
  const [notifHasToken, setNotifHasToken] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');

  const localeMap: Record<string, string> = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT' };
  const locale = localeMap[user.language || 'en'] || 'en-US';

  const formatDate = (isoDate?: string | null): string => {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(locale);
  };

  const rewardStatusLabel = (status: string): string => {
    if (status === 'requested') return t('rewards.statusPending');
    if (status === 'approved') return t('rewards.statusApproved');
    if (status === 'rejected') return t('rewards.statusRejected');
    if (status === 'cancelled') return t('rewards.statusCancelled');
    return status;
  };

  const rewardPresetKeyByTitle: Record<string, string> = {
    'movie night pick': 'movie_night',
    'ice cream treat': 'ice_cream',
    'stay up 30 min': 'late_bedtime',
    'game time bonus': 'game_bonus',
    'choose dinner': 'choose_dinner',
    'park adventure': 'park_adventure',
    'no-chore pass': 'chore_pass',
    'family board game': 'board_game',
  };

  const rewardTitle = (r: { title: string; isPreset?: boolean }): string => {
    const k = rewardPresetKeyByTitle[r.title.toLowerCase()];
    if (k) return t(`rewardsPreset.${k}.title`);
    return r.title;
  };

  const rewardDesc = (r: { title: string; description?: string | null; isPreset?: boolean }): string => {
    const k = rewardPresetKeyByTitle[r.title.toLowerCase()];
    if (k) return t(`rewardsPreset.${k}.desc`);
    return r.description || '-';
  };

  useEffect(() => {
    setCoinsDraft(coinsByEffort);
  }, [coinsByEffort]);

  useEffect(() => {
    if (!isAdmin) return;
    api.getRegistrationConfig()
      .then((cfg) => setRegistrationEnabled(cfg.registrationEnabled))
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    api.getNotificationsConfig()
      .then((cfg) => {
        setNotifEnabled(!!cfg.enabled);
        setNotifChatId(cfg.chatId || '');
        setNotifTime(cfg.notificationTime || '09:00');
        setNotifTypes(cfg.notificationTypes || { taskDue: true, rewardRequest: true, achievementUnlocked: true });
        setNotifHasToken(!!cfg.hasToken);
      })
      .catch(() => {});
  }, [isAdmin]);

  const loadAdminGoals = async () => {
    if (!isAdmin) return;
    const entries = await Promise.all(
      family.filter((u) => u.id !== user.id && u.role !== 'admin').map(async (u) => ({ userId: u.id, goals: await api.getUserGoals(u.id) }))
    );
    const next: Record<number, Array<{ id: number; title: string; goalCoins: number; startAt?: string | null; endAt?: string | null }>> = {};
    entries.forEach((e) => { next[e.userId] = e.goals; });
    setMemberGoals(next);
  };

  const loadRewardsAdmin = async () => {
    if (!isAdmin) return;
    const data = await api.getRewardsAdmin();
    setRewardsAdmin(data.rewards || []);
    setRewardRequests(data.redemptions || []);
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadAdminGoals();
    void loadRewardsAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, family.length]);

  const resetMemberForm = () => {
    setShowAddMember(false);
    setNewMemberName('');
    setNewMemberUsername('');
    setNewMemberPassword('');
  };

  const initMemberProfile = (u: FamilyUser) => {
    setMemberProfile((prev) => ({
      ...prev,
      [u.id]: prev[u.id] || {
        language: u.language || 'en',
        avatarType: u.avatarType === 'preset' ? 'preset' : 'letter',
        avatarColor: u.avatarColor || '#F97316',
        avatarPreset: u.avatarPreset || 'cat',
      },
    }));
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !newMemberUsername.trim() || !newMemberPassword.trim()) return;
    await onAddMember({
      displayName: newMemberName.trim(),
      username: newMemberUsername.trim(),
      password: newMemberPassword,
      role: 'child',
    });
    resetMemberForm();
  };

  const handleSaveChildProfile = async (u: FamilyUser) => {
    const p = memberProfile[u.id];
    if (!p) return;
    await onUpdateMemberProfile(u.id, {
      language: p.language,
      avatarType: p.avatarType,
      avatarColor: p.avatarColor,
      avatarPreset: p.avatarType === 'preset' ? p.avatarPreset : null,
    });
    setMemberProfileMsg((prev) => ({ ...prev, [u.id]: t('common.saved') }));
    window.setTimeout(() => {
      setMemberProfileMsg((prev) => ({ ...prev, [u.id]: '' }));
    }, 2000);
  };

  const handleSetChildPassword = async (u: FamilyUser) => {
    const pwd = memberPassword[u.id] || '';
    if (!pwd.trim()) return;
    try {
      await onChangePassword(u.id, { newPassword: pwd });
      setMemberPassword((prev) => ({ ...prev, [u.id]: '' }));
      setMemberPasswordMsg((prev) => ({ ...prev, [u.id]: t('settings.passwordUpdated') }));
    } catch (err: any) {
      setMemberPasswordMsg((prev) => ({ ...prev, [u.id]: err?.message || t('settings.passwordUpdateFailed') }));
    }
  };

  const handleAddGoal = async (u: FamilyUser) => {
    const d = goalDraft[u.id] || { title: '', goalCoins: '', endAt: '' };
    if (!d.title.trim() || !d.goalCoins.trim()) return;
    const goalCoins = Math.max(1, Math.round(Number(d.goalCoins)));
    await api.createUserGoal(u.id, {
      title: d.title.trim(),
      goalCoins,
      startAt: null,
      endAt: d.endAt ? `${d.endAt}T23:59:59.999Z` : null,
    });
    setGoalDraft((prev) => ({ ...prev, [u.id]: { title: '', goalCoins: '', endAt: '' } }));
    await loadAdminGoals();
  };

  const handleDeleteGoal = async (goalId: number, userId: number) => {
    try {
      await api.deleteGoal(goalId);
      await loadAdminGoals();
      setMemberGoalMsg((prev) => ({ ...prev, [userId]: t('settings.goalDeleted') }));
    } catch (err: any) {
      setMemberGoalMsg((prev) => ({ ...prev, [userId]: err?.message || t('settings.goalDeleteFailed') }));
    }
    window.setTimeout(() => {
      setMemberGoalMsg((prev) => ({ ...prev, [userId]: '' }));
    }, 2500);
  };

  const handleCreateReward = async () => {
    if (!rewardDraft.title.trim() || !rewardDraft.costCoins.trim()) return;
    await api.createReward({
      title: rewardDraft.title.trim(),
      description: rewardDraft.description.trim(),
      costCoins: Math.max(1, Math.round(Number(rewardDraft.costCoins))),
    });
    setRewardDraft({ title: '', description: '', costCoins: '30' });
    await loadRewardsAdmin();
  };

  const handleSeedRewards = async () => {
    const presets = [
      { title: 'Movie Night Pick', description: 'Choisir le film du soir en famille.', costCoins: 40 },
      { title: 'Ice Cream Treat', description: 'Une glace ou un dessert special.', costCoins: 30 },
      { title: 'Stay Up 30 Min', description: 'Se coucher 30 minutes plus tard.', costCoins: 35 },
      { title: 'Game Time Bonus', description: '30 minutes de jeu supplementaire.', costCoins: 50 },
      { title: 'Choose Dinner', description: 'Choisir le menu du diner.', costCoins: 45 },
      { title: 'Park Adventure', description: 'Sortie au parc en mode aventure.', costCoins: 60 },
      { title: 'No-Chore Pass', description: 'Une tache au choix sautee cette semaine.', costCoins: 80 },
      { title: 'Family Board Game', description: 'Choisir un jeu de societe pour la soiree.', costCoins: 25 },
    ];
    const existing = new Set(rewardsAdmin.map((r) => r.title.toLowerCase()));
    for (const p of presets) {
      if (!existing.has(p.title.toLowerCase())) {
        await api.createReward(p);
      }
    }
    await loadRewardsAdmin();
  };

  const saveNotifications = async () => {
    setNotifMsg('');
    try {
      if (notifEnabled && !notifChatId.trim()) {
        setNotifMsg(t('settings.telegramChatIdRequired'));
        return;
      }
      if (notifEnabled && !notifHasToken && !notifToken.trim()) {
        setNotifMsg(t('settings.telegramTokenRequired'));
        return;
      }

      const payload: {
        enabled: boolean;
        chatId: string;
        notificationTime: string;
        notificationTypes: { taskDue: boolean; rewardRequest: boolean; achievementUnlocked: boolean };
        botToken?: string;
      } = {
        enabled: notifEnabled,
        chatId: notifChatId.trim(),
        notificationTime: notifTime,
        notificationTypes: notifTypes,
      };
      if (notifToken.trim()) payload.botToken = notifToken.trim();
      const next = await api.updateNotificationsConfig(payload);
      setNotifEnabled(next.enabled);
      setNotifChatId(next.chatId || '');
      setNotifTime(next.notificationTime || '09:00');
      setNotifTypes(next.notificationTypes || { taskDue: true, rewardRequest: true, achievementUnlocked: true });
      setNotifHasToken(next.hasToken);
      setNotifToken('');
      setNotifMsg(t('settings.notificationsSaved'));
    } catch (err: any) {
      setNotifMsg(err?.message || t('settings.notificationsSaveFailed'));
    }
  };

  const testNotifications = async () => {
    setNotifMsg('');
    try {
      await api.sendNotificationsTest({
        chatId: notifChatId.trim() || undefined,
        botToken: notifToken.trim() || undefined,
      });
      setNotifMsg(t('settings.notificationsTestSent'));
    } catch (err: any) {
      setNotifMsg(err?.message || t('settings.notificationsTestFailed'));
    }
  };

  const saveCoins = async () => {
    await onSaveCoinsByEffort(coinsDraft);
  };

  const resetCoins = async () => {
    await onResetCoinsByEffort();
    setCoinsDraft({ 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 });
  };

  return (
    <div className="page-enter settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 980 }}>
      <div className="tq-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-text)', margin: '0 0 18px' }}>{t('settings.general')}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: isAdmin ? 'none' : '1px solid var(--warm-border)' }}>
          <BellIcon />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-text)' }}>{t('settings.notifications')}</div>
            <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('settings.notificationsDesc')}</div>
          </div>
          <Toggle checked={notifEnabled} onChange={isAdmin ? setNotifEnabled : () => {}} />
        </div>
        {isAdmin && (
          <div style={{ display: 'grid', gap: 8, marginTop: 10, marginBottom: 8, padding: 10, border: '1px solid var(--warm-border)', borderRadius: 10 }}>
            {notifEnabled ? (
              <>
                <div style={{ display: 'grid', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-muted)' }}>{t('settings.notificationTime')}</label>
                  <input
                    type="time"
                    value={notifTime}
                    onChange={(e) => setNotifTime(e.target.value || '09:00')}
                    style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}
                  />
                </div>
                <input
                  value={notifChatId}
                  onChange={(e) => setNotifChatId(e.target.value)}
                  placeholder={t('settings.telegramChatId')}
                  style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}
                />
                <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 700 }}>{t('settings.telegramChatIdHint')}</div>
                <input
                  type="password"
                  value={notifToken}
                  onChange={(e) => setNotifToken(e.target.value)}
                  placeholder={notifHasToken ? t('settings.telegramTokenConfigured') : t('settings.telegramToken')}
                  style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}
                />
                <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 700 }}>{t('settings.telegramTokenHint')}</div>
                <div style={{ display: 'grid', gap: 6, marginTop: 2 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={notifTypes.taskDue}
                      onChange={(e) => setNotifTypes((prev) => ({ ...prev, taskDue: e.target.checked }))}
                      style={{ marginRight: 6 }}
                    />
                    {t('settings.notificationTypeTaskDue')}
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={notifTypes.rewardRequest}
                      onChange={(e) => setNotifTypes((prev) => ({ ...prev, rewardRequest: e.target.checked }))}
                      style={{ marginRight: 6 }}
                    />
                    {t('settings.notificationTypeRewardRequest')}
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={notifTypes.achievementUnlocked}
                      onChange={(e) => setNotifTypes((prev) => ({ ...prev, achievementUnlocked: e.target.checked }))}
                      style={{ marginRight: 6 }}
                    />
                    {t('settings.notificationTypeAchievementUnlocked')}
                  </label>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 700 }}>
                {t('settings.notificationsDisabledHint')}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {notifEnabled && (
                <>
                  <button className="tq-btn tq-btn-secondary" onClick={saveNotifications} style={{ padding: '6px 10px', fontSize: 11 }}>
                    {t('common.save')}
                  </button>
                  <button className="tq-btn tq-btn-secondary" onClick={testNotifications} style={{ padding: '6px 10px', fontSize: 11 }}>
                    {t('settings.sendTestNotification')}
                  </button>
                </>
              )}
            </div>
            {notifMsg && <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 700 }}>{notifMsg}</div>}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--warm-border)' }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, var(--warm-accent), var(--warm-accent-light))', border: '1px solid var(--warm-border)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-text)' }}>{t('settings.theme')}</div>
            <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('settings.themeDesc')}</div>
          </div>
          <select
            value={theme}
            onChange={(e) => onChangeTheme(e.target.value as 'orange' | 'blue' | 'rose' | 'night')}
            style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}
          >
            <option value="orange">{t('settings.themeOrange')}</option>
            <option value="blue">{t('settings.themeBlue')}</option>
            <option value="rose">{t('settings.themeRose')}</option>
            <option value="night">{t('settings.themeNight')}</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="8" r="4" stroke="#B0A090" strokeWidth="1.5" fill="none" />
            <path d="M5 17L6.5 13H13.5L15 17" stroke="#B0A090" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-text)' }}>{t('settings.vacationMode')}</div>
            <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('settings.vacationDesc')}</div>
          </div>
          <Toggle checked={!!user.isVacationMode} onChange={isAdmin ? onToggleVacation : () => {}} />
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: '1px solid var(--warm-border)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a4 4 0 0 1 4 4v1h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1V6a4 4 0 0 1 4-4zm0 1.5A2.5 2.5 0 0 0 7.5 6v1h5V6A2.5 2.5 0 0 0 10 3.5z" fill="#B0A090" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-text)' }}>{t('settings.registrationEnabled')}</div>
              <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('settings.registrationEnabledDesc')}</div>
            </div>
            <Toggle
              checked={registrationEnabled}
              onChange={async (val) => {
                setRegistrationEnabled(val);
                await api.updateRegistrationConfig({ registrationEnabled: val }).catch(() => {
                  setRegistrationEnabled(!val);
                });
              }}
            />
          </div>
        )}
        {!isAdmin && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 700 }}>
            {t('settings.adminRequired')}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="tq-card settings-admin-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-text)', margin: '0 0 12px' }}>{t('settings.coinsPerEffort')}</h3>
          <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600, marginBottom: 10 }}>{t('settings.coinsPerEffortDesc')}</div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map((e) => (
                <div key={e} className="coins-effort-row" style={{ display: 'grid', gridTemplateColumns: '120px 1fr 130px', alignItems: 'center', gap: 10, backgroundColor: 'var(--warm-bg-subtle)', border: '1.5px solid var(--warm-border)', borderRadius: 12, padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-muted)' }}>{t('roomDetail.effort')} {e}</div>
                  <div className="coins-effort-dots"><EffortDots effort={e} /></div>
                  <div className="coins-effort-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CoinIcon />
                    <input
                      type="number"
                    min={0}
                    value={coinsDraft[e] ?? coinsByEffort[e] ?? e * 5}
                    onChange={(ev) => setCoinsDraft((prev) => ({ ...prev, [e]: Math.max(0, parseInt(ev.target.value || '0', 10)) }))}
                    title={`${t('roomDetail.effort')} ${e}`}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="tq-btn tq-btn-primary" onClick={saveCoins} style={{ padding: '7px 12px', fontSize: 12 }}>{t('common.save')}</button>
            <button className="tq-btn tq-btn-secondary" onClick={resetCoins} style={{ padding: '7px 12px', fontSize: 12 }}>{t('settings.useDefaultCoins')}</button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="tq-card settings-admin-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-text)', margin: '0 0 12px' }}>{t('settings.goalsSection')}</h3>
          <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600, marginBottom: 10 }}>{t('settings.goalsSectionDesc')}</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {family
              .filter((u) => u.id !== user.id && u.role !== 'admin')
              .map((u) => (
                <div key={u.id} style={{ backgroundColor: 'var(--warm-bg-subtle)', border: '1.5px solid var(--warm-border)', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-text)', marginBottom: 8 }}>{u.displayName}</div>
                  <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
                    {(memberGoals[u.id] || []).map((g) => (
                      <div key={g.id} className="goal-member-row" style={{ display: 'grid', gridTemplateColumns: '1.4fr 120px 120px auto', gap: 8, alignItems: 'center', padding: '6px 8px', borderRadius: 10, backgroundColor: 'var(--warm-bg-warm)', border: '1px solid var(--warm-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--warm-text)' }}>{g.title}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--warm-accent)', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><CoinIcon /> {g.goalCoins}</div>
                        <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 700 }}>{formatDate(g.endAt)}</div>
                        <button className="tq-btn" onClick={() => handleDeleteGoal(g.id, u.id)} style={{ padding: '4px 8px', fontSize: 10, backgroundColor: 'var(--warm-danger-bg)', color: 'var(--warm-danger)', border: '1.5px solid var(--warm-danger-border)' }}>
                          {t('common.delete')}
                        </button>
                      </div>
                    ))}
                  </div>
                  {memberGoalMsg[u.id] && (
                    <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>{memberGoalMsg[u.id]}</div>
                  )}
                  <div className="goal-member-form" style={{ display: 'grid', gridTemplateColumns: '1.4fr 100px 130px auto', gap: 8 }}>
                    <input
                      value={goalDraft[u.id]?.title || ''}
                      onChange={(e) => setGoalDraft((prev) => ({ ...prev, [u.id]: { ...(prev[u.id] || { title: '', goalCoins: '', endAt: '' }), title: e.target.value } }))}
                      placeholder={t('settings.goalTitle')}
                      style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}
                    />
                    <input
                      type="number"
                      min={1}
                      value={goalDraft[u.id]?.goalCoins || ''}
                      onChange={(e) => setGoalDraft((prev) => ({ ...prev, [u.id]: { ...(prev[u.id] || { title: '', goalCoins: '', endAt: '' }), goalCoins: e.target.value } }))}
                      placeholder={t('settings.goalCoins')}
                      style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}
                    />
                    <input
                      type="date"
                      className="goal-member-end-date"
                      value={goalDraft[u.id]?.endAt || ''}
                      onChange={(e) => setGoalDraft((prev) => ({ ...prev, [u.id]: { ...(prev[u.id] || { title: '', goalCoins: '', endAt: '' }), endAt: e.target.value } }))}
                      title={t('settings.goalEnd')}
                      lang={locale}
                      style={{ minWidth: 0, padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}
                    />
                    <button className="tq-btn tq-btn-secondary" onClick={() => handleAddGoal(u)} style={{ padding: '6px 10px', fontSize: 11 }}>{t('settings.addGoal')}</button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="tq-card settings-admin-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-text)', margin: '0 0 12px' }}>{t('settings.rewardsSection')}</h3>
          <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600, marginBottom: 10 }}>{t('settings.rewardsSectionDesc')}</div>
          <div className="rewards-add-form" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 100px auto auto', gap: 8, marginBottom: 10 }}>
            <input value={rewardDraft.title} onChange={(e) => setRewardDraft((p) => ({ ...p, title: e.target.value }))} placeholder={t('settings.rewardTitle')} style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }} />
            <input value={rewardDraft.description} onChange={(e) => setRewardDraft((p) => ({ ...p, description: e.target.value }))} placeholder={t('settings.rewardDesc')} style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }} />
            <input type="number" min={1} value={rewardDraft.costCoins} onChange={(e) => setRewardDraft((p) => ({ ...p, costCoins: e.target.value }))} placeholder={t('settings.rewardCost')} style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }} />
            <button className="tq-btn tq-btn-secondary" onClick={handleSeedRewards} style={{ padding: '6px 10px', fontSize: 11 }}>{t('settings.addPresetRewards')}</button>
            <button className="tq-btn tq-btn-primary" onClick={handleCreateReward} style={{ padding: '6px 10px', fontSize: 11 }}>{t('settings.create')}</button>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {rewardsAdmin.map((r) => (
              <div key={r.id} className="rewards-list-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 80px auto', gap: 8, alignItems: 'center', border: '1px solid var(--warm-border)', borderRadius: 10, padding: '8px 10px', backgroundColor: r.isActive ? 'var(--warm-bg-subtle)' : 'var(--warm-bg-warm)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-text)' }}>{rewardTitle(r)}</div>
                <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{rewardDesc(r)}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-accent)', display: 'flex', alignItems: 'center', gap: 4 }}><CoinIcon /> {r.costCoins}</div>
                <button className="tq-btn" onClick={async () => { await api.deleteReward(r.id); await loadRewardsAdmin(); }} style={{ padding: '4px 8px', fontSize: 10, backgroundColor: 'var(--warm-danger-bg)', color: 'var(--warm-danger)', border: '1.5px solid var(--warm-danger-border)' }}>{t('common.delete')}</button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800, color: 'var(--warm-text)' }}>{t('settings.rewardRequests')}</h4>
            <div style={{ display: 'grid', gap: 6 }}>
              {rewardRequests.map((rr) => (
                <div key={rr.id} className="rewards-requests-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 90px 110px 130px', gap: 8, alignItems: 'center', border: '1px solid var(--warm-border)', borderRadius: 10, padding: '8px 10px', backgroundColor: 'var(--warm-bg-subtle)' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-text)' }}>{rr.displayName}</div>
                  <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>{rewardTitle(rr)}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--warm-accent)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><CoinIcon /> {rr.costCoins}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: rr.status === 'approved' ? '#15803D' : rr.status === 'rejected' ? '#B91C1C' : rr.status === 'cancelled' ? '#374151' : 'var(--warm-text-light)' }}>{rewardStatusLabel(rr.status)}</div>
                  <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 700 }}>{formatDate(rr.redeemedAt)}</div>
                </div>
              ))}
              {rewardRequests.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('settings.noRewardRequests')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="tq-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-text)', margin: '0 0 18px' }}>{t('settings.dataPrivacy')}</h3>
        {[
          { icon: <DownloadIcon />, title: t('settings.exportData'), desc: t('settings.exportDesc'), btn: t('settings.download'), action: onExport },
          { icon: <UploadIcon />, title: t('settings.importData'), desc: t('settings.importDesc'), btn: t('settings.upload'), action: onImport },
          { icon: <LockIcon />, title: t('settings.privacy'), desc: t('settings.privacyDesc'), btn: null, action: null },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < 2 ? '1px solid var(--warm-border)' : 'none' }}>
            {s.icon}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-text)' }}>{s.title}</div>
              <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{s.desc}</div>
            </div>
            {s.btn && (
              <button className="tq-btn" onClick={isAdmin ? s.action! : () => {}} disabled={!isAdmin} style={{ padding: '7px 16px', backgroundColor: 'var(--warm-accent-light)', color: 'var(--warm-accent)', fontSize: 12, border: '1.5px solid var(--warm-accent)' }}>
                {s.btn}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="tq-card settings-admin-card family-members-card" style={{ padding: 24, gridColumn: '1 / -1' }}>
        <div className="family-members-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-text)', margin: 0 }}>{t('settings.familyMembers')}</h3>
          <button className="tq-btn tq-btn-primary" onClick={() => isAdmin && setShowAddMember(true)} disabled={!isAdmin} style={{ padding: '7px 18px', fontSize: 12, opacity: isAdmin ? 1 : 0.5 }}>
            + {t('settings.addMember')}
          </button>
        </div>
        {showAddMember && (
          <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, backgroundColor: 'var(--warm-bg-warm)', border: '1.5px solid var(--warm-border)' }}>
            <div className="family-members-add-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 8 }}>
              <input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder={t('settings.memberDisplayName')} style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }} />
              <input value={newMemberUsername} onChange={(e) => setNewMemberUsername(e.target.value)} placeholder={t('settings.memberUsername')} style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }} />
              <input value={newMemberPassword} onChange={(e) => setNewMemberPassword(e.target.value)} type="password" placeholder={t('settings.memberPassword')} style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }} />
              <button className="tq-btn tq-btn-secondary" onClick={resetMemberForm} style={{ padding: '8px 12px', fontSize: 12 }}>{t('common.cancel')}</button>
              <button className="tq-btn tq-btn-primary" onClick={handleAddMember} style={{ padding: '8px 12px', fontSize: 12 }}>{t('settings.create')}</button>
            </div>
          </div>
        )}
        <div className="family-members-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {family.map((u) => (
            <div key={u.id} className="family-member-card" style={{ backgroundColor: 'var(--warm-bg-warm)', borderRadius: 16, border: '1.5px solid var(--warm-border)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <UserAvatar name={u.displayName} color={u.avatarColor} size={44} avatarType={u.avatarType as any} avatarPreset={u.avatarPreset} avatarPhotoUrl={u.avatarPhotoUrl} />
                <div style={{ flex: 1 }}>
                  <div className="family-member-title-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-text)' }}>{u.displayName}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5,
                    color: u.role === 'admin' ? '#C2410C' : u.role === 'member' ? '#0369A1' : '#8A7A6A',
                    backgroundColor: u.role === 'admin' ? '#FFF1E5' : u.role === 'member' ? '#EAF6FF' : '#F4EEE7',
                    border: `1px solid ${u.role === 'admin' ? '#FDBA74' : u.role === 'member' ? '#BAE6FD' : '#E2D5C5'}`,
                    borderRadius: 999, padding: '2px 7px',
                  }}>
                      {u.role === 'admin' ? t('settings.roleAdmin') : u.role === 'member' ? t('settings.roleMember') : t('settings.roleChild')}
                  </span>
                  </div>
                  <div className="family-member-stats" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{u.coins} {t('settings.coins')}</span>
                    <span style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{u.currentStreak}d {t('settings.streak')}</span>
                  </div>
                </div>
              </div>
              {isAdmin && u.id !== user.id && (
                <div className="family-member-actions" style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <select
                    value={u.role || 'member'}
                    onChange={(e) => onUpdateRole(u.id, e.target.value as 'admin' | 'member' | 'child')}
                    style={{ padding: '6px 8px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito', fontSize: 11 }}
                  >
                    <option value="admin">{t('settings.roleAdmin')}</option>
                    <option value="member">{t('settings.roleMember')}</option>
                    <option value="child">{t('settings.roleChild')}</option>
                  </select>
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => {
                        initMemberProfile(u);
                        setMemberEditOpen((prev) => ({ ...prev, [u.id]: !prev[u.id] }));
                      }}
                      className="tq-btn tq-btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 11 }}
                    >
                      {t('settings.manageMember')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(t('settings.deleteUserConfirm').replace('{user}', u.displayName))) {
                        onDeleteUser(u.id);
                      }
                    }}
                    className="tq-btn"
                    style={{ padding: '5px 10px', fontSize: 11, backgroundColor: 'var(--warm-danger-bg)', color: 'var(--warm-danger)', border: '1.5px solid var(--warm-danger-border)' }}
                  >
                    {t('settings.deleteUser')}
                  </button>
                </div>
              )}
              {isAdmin && u.role !== 'admin' && memberEditOpen[u.id] && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--warm-border)', display: 'grid', gap: 8 }}>
                  <select value={memberProfile[u.id]?.language || 'en'} onChange={(e) => setMemberProfile((prev) => ({ ...prev, [u.id]: { ...prev[u.id], language: e.target.value } }))} style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="es">Español</option>
                    <option value="it">Italiano</option>
                  </select>
                  <select value={memberProfile[u.id]?.avatarType || 'letter'} onChange={(e) => setMemberProfile((prev) => ({ ...prev, [u.id]: { ...prev[u.id], avatarType: e.target.value as 'letter' | 'preset' } }))} style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}>
                    <option value="letter">{t('profile.letterMode')}</option>
                    <option value="preset">{t('profile.characterMode')}</option>
                  </select>
                  {(memberProfile[u.id]?.avatarType || 'letter') === 'letter' ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {COLORS.map((c) => (
                        <button key={c} onClick={() => setMemberProfile((prev) => ({ ...prev, [u.id]: { ...prev[u.id], avatarColor: c } }))} style={{ width: 20, height: 20, borderRadius: 8, border: (memberProfile[u.id]?.avatarColor || '#F97316') === c ? '2px solid #3D2F1E' : '1px solid transparent', backgroundColor: c }} />
                      ))}
                    </div>
                  ) : (
                    <select value={memberProfile[u.id]?.avatarPreset || 'cat'} onChange={(e) => setMemberProfile((prev) => ({ ...prev, [u.id]: { ...prev[u.id], avatarPreset: e.target.value } }))} style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}>
                      {Object.keys(AVATAR_PRESETS).map((id) => (
                        <option key={id} value={id}>{t(`avatars.${id}`)}</option>
                      ))}
                    </select>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="tq-btn tq-btn-primary" onClick={() => handleSaveChildProfile(u)} style={{ padding: '6px 10px', fontSize: 11 }}>{t('common.save')}</button>
                    {memberProfileMsg[u.id] && (
                      <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>{memberProfileMsg[u.id]}</div>
                    )}
                  </div>
                  <div className="member-edit-password-row" style={{ display: 'flex', gap: 8 }}>
                    <input type="password" value={memberPassword[u.id] || ''} onChange={(e) => setMemberPassword((prev) => ({ ...prev, [u.id]: e.target.value }))} placeholder={t('settings.newPassword')} style={{ flex: 1, padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }} />
                    <button className="tq-btn tq-btn-secondary" onClick={() => handleSetChildPassword(u)} style={{ padding: '6px 10px', fontSize: 11 }}>{t('settings.resetPassword')}</button>
                  </div>
                  {memberPasswordMsg[u.id] && (
                    <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>{memberPasswordMsg[u.id]}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
