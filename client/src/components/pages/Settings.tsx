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
  isVacationMode?: number;
  vacationStartDate?: string | null;
  vacationEndDate?: string | null;
}

interface VacationConfig {
  vacationMode: boolean;
  vacationStartDate: string | null;
  vacationEndDate: string | null;
}

interface PendingCompletion {
  id: number;
  taskId: number;
  userId: number;
  completedAt: string;
  coinsEarned: number;
  taskName: string;
  translationKey?: string | null;
  roomId: number;
  roomName: string;
  displayName: string;
}

interface SettingsProps {
  user: User;
  family: FamilyUser[];
  vacationConfig?: VacationConfig;
  onUpdateVacation?: (data: { vacationMode?: boolean; vacationEndDate?: string | null }) => Promise<void>;
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
  onAdjustCoins?: (userId: number, amount: number) => Promise<void>;
  gamificationEnabled?: boolean;
  onGamificationChange?: (enabled: boolean) => void;
}

const COLORS = ['#F97316', '#9B72CF', '#4AABDE', '#5CB85C', '#D4A017', '#E25A5A', '#38BDF8', '#EC4899'];

export function Settings({
  user,
  family,
  vacationConfig,
  onUpdateVacation,
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
  onAdjustCoins,
  gamificationEnabled = true,
  onGamificationChange,
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
  const [editingRewardId, setEditingRewardId] = useState<number | null>(null);
  const [editingRewardCost, setEditingRewardCost] = useState('');
  const [memberProfile, setMemberProfile] = useState<Record<number, {
    language: string;
    avatarType: 'letter' | 'preset';
    avatarColor: string;
    avatarPreset: string;
  }>>({});
  const [memberProfileMsg, setMemberProfileMsg] = useState<Record<number, string>>({});
  const [memberGoalMsg, setMemberGoalMsg] = useState<Record<number, string>>({});
  const [coinAdjust, setCoinAdjust] = useState<Record<number, string>>({});
  const [coinAdjustMsg, setCoinAdjustMsg] = useState<Record<number, string>>({});
  const [memberVacation, setMemberVacation] = useState<Record<number, boolean>>({});
  const [vacationEnabled, setVacationEnabled] = useState(!!vacationConfig?.vacationMode);
  const [vacationEndDate, setVacationEndDate] = useState(vacationConfig?.vacationEndDate ?? null);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [strictModeEnabled, setStrictModeEnabled] = useState(false);
  const [pendingCompletions, setPendingCompletions] = useState<PendingCompletion[]>([]);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifChatId, setNotifChatId] = useState('');
  const [notifToken, setNotifToken] = useState('');
  const [notifTime, setNotifTime] = useState('09:00');
  const [notifTypes, setNotifTypes] = useState({ taskDue: true, rewardRequest: true, achievementUnlocked: true });
  const [notifHasToken, setNotifHasToken] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');
  const [ntfyEnabled, setNtfyEnabled] = useState(false);
  const [ntfyServerUrl, setNtfyServerUrl] = useState('https://ntfy.sh');
  const [ntfyTopic, setNtfyTopic] = useState('');
  const [ntfyToken, setNtfyToken] = useState('');
  const [ntfyHasToken, setNtfyHasToken] = useState(false);
  const [ntfyMsg, setNtfyMsg] = useState('');

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
    setVacationEnabled(!!vacationConfig?.vacationMode);
    setVacationEndDate(vacationConfig?.vacationEndDate ?? null);
  }, [vacationConfig?.vacationMode, vacationConfig?.vacationEndDate]);

  useEffect(() => {
    if (!isAdmin) return;
    api.getRegistrationConfig()
      .then((cfg) => setRegistrationEnabled(cfg.registrationEnabled))
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    api.getStrictModeConfig()
      .then((cfg) => setStrictModeEnabled(!!cfg.strictMode))
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
        setNtfyEnabled(!!cfg.ntfyEnabled);
        setNtfyServerUrl(cfg.ntfyServerUrl || 'https://ntfy.sh');
        setNtfyTopic(cfg.ntfyTopic || '');
        setNtfyHasToken(!!cfg.hasNtfyToken);
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

  const loadPendingCompletions = async () => {
    if (!isAdmin) return;
    const data = await api.getPendingCompletions();
    setPendingCompletions(data.pending || []);
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadAdminGoals();
    void loadRewardsAdmin();
    void loadPendingCompletions();
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

  const startRewardEdit = (r: { id: number; costCoins: number }) => {
    setEditingRewardId(r.id);
    setEditingRewardCost(String(r.costCoins));
  };

  const cancelRewardEdit = () => {
    setEditingRewardId(null);
    setEditingRewardCost('');
  };

  const saveRewardEdit = async (r: { id: number; title: string; description?: string | null; isActive?: boolean }) => {
    const parsed = Math.max(1, Math.round(Number(editingRewardCost)));
    if (!Number.isFinite(parsed)) return;
    await api.updateReward(r.id, {
      title: r.title,
      description: r.description || '',
      costCoins: parsed,
      isActive: r.isActive !== false,
    });
    cancelRewardEdit();
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

      const payload: Record<string, any> = {
        enabled: notifEnabled,
        chatId: notifChatId.trim(),
        notificationTime: notifTime,
        notificationTypes: notifTypes,
        ntfyEnabled,
        ntfyServerUrl: ntfyServerUrl.trim() || 'https://ntfy.sh',
        ntfyTopic: ntfyTopic.trim(),
      };
      if (notifToken.trim()) payload.botToken = notifToken.trim();
      if (ntfyToken.trim()) payload.ntfyToken = ntfyToken.trim();
      const next = await api.updateNotificationsConfig(payload);
      setNotifEnabled(next.enabled);
      setNotifChatId(next.chatId || '');
      setNotifTime(next.notificationTime || '09:00');
      setNotifTypes(next.notificationTypes || { taskDue: true, rewardRequest: true, achievementUnlocked: true });
      setNotifHasToken(next.hasToken);
      setNotifToken('');
      setNtfyEnabled(!!next.ntfyEnabled);
      setNtfyServerUrl(next.ntfyServerUrl || 'https://ntfy.sh');
      setNtfyTopic(next.ntfyTopic || '');
      setNtfyHasToken(!!next.hasNtfyToken);
      setNtfyToken('');
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
    <div className="page-enter settings-grid">
      <div className="tq-card tq-card-padded">
        <h3 className="tq-card-title">{t('settings.general')}</h3>
        {user.role !== 'child' && (<>
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
                    className="tq-input"
                    value={notifTime}
                    onChange={(e) => setNotifTime(e.target.value || '09:00')}
                  />
                </div>
                <input
                  className="tq-input"
                  value={notifChatId}
                  onChange={(e) => setNotifChatId(e.target.value)}
                  placeholder={t('settings.telegramChatId')}
                />
                <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 700 }}>{t('settings.telegramChatIdHint')}</div>
                <input
                  type="password"
                  className="tq-input"
                  value={notifToken}
                  onChange={(e) => setNotifToken(e.target.value)}
                  placeholder={notifHasToken ? t('settings.telegramTokenConfigured') : t('settings.telegramToken')}
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
                  {gamificationEnabled && (
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={notifTypes.rewardRequest}
                      onChange={(e) => setNotifTypes((prev) => ({ ...prev, rewardRequest: e.target.checked }))}
                      style={{ marginRight: 6 }}
                    />
                    {t('settings.notificationTypeRewardRequest')}
                  </label>
                  )}
                  {gamificationEnabled && (
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={notifTypes.achievementUnlocked}
                      onChange={(e) => setNotifTypes((prev) => ({ ...prev, achievementUnlocked: e.target.checked }))}
                      style={{ marginRight: 6 }}
                    />
                    {t('settings.notificationTypeAchievementUnlocked')}
                  </label>
                  )}
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
                  <button className="tq-btn tq-btn-secondary tq-btn-sm" onClick={saveNotifications}>
                    {t('common.save')}
                  </button>
                  <button className="tq-btn tq-btn-secondary tq-btn-sm" onClick={testNotifications}>
                    {t('settings.sendTestNotification')}
                  </button>
                </>
              )}
            </div>
            {notifMsg && <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 700 }}>{notifMsg}</div>}
          </div>
        )}
        {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--warm-border)' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2a7 7 0 0 0-7 7v3l-1.5 2h17L17 12V9a7 7 0 0 0-7-7z" stroke="var(--warm-text-light)" strokeWidth="1.5" fill="none"/><path d="M8 16a2 2 0 0 0 4 0" stroke="var(--warm-text-light)" strokeWidth="1.5" fill="none"/></svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-text)' }}>{t('settings.ntfyTitle')}</div>
            <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('settings.ntfyDesc')}</div>
          </div>
          <Toggle checked={ntfyEnabled} onChange={setNtfyEnabled} />
        </div>
        )}
        {isAdmin && (
          <div style={{ display: 'grid', gap: 8, marginTop: 10, marginBottom: 8, padding: 10, border: '1px solid var(--warm-border)', borderRadius: 10 }}>
            {ntfyEnabled ? (
              <>
                <div style={{ display: 'grid', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-muted)' }}>{t('settings.ntfyServerUrl')}</label>
                  <input
                    value={ntfyServerUrl}
                    onChange={(e) => setNtfyServerUrl(e.target.value)}
                    placeholder="https://ntfy.sh"
                    style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}
                  />
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-muted)' }}>{t('settings.ntfyTopic')}</label>
                  <input
                    value={ntfyTopic}
                    onChange={(e) => setNtfyTopic(e.target.value)}
                    placeholder={t('settings.ntfyTopicPlaceholder')}
                    style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}
                  />
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-muted)' }}>{t('settings.ntfyToken')}</label>
                  <input
                    type="password"
                    value={ntfyToken}
                    onChange={(e) => setNtfyToken(e.target.value)}
                    placeholder={ntfyHasToken ? t('settings.ntfyTokenConfigured') : t('settings.ntfyTokenPlaceholder')}
                    style={{ padding: '7px 10px', borderRadius: 10, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito' }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 700 }}>{t('settings.ntfyTokenHint')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="tq-btn tq-btn-secondary" onClick={saveNotifications} style={{ padding: '6px 10px', fontSize: 11 }}>
                    {t('common.save')}
                  </button>
                  <button className="tq-btn tq-btn-secondary" onClick={async () => {
                    setNtfyMsg('');
                    try {
                      await api.sendNotificationsTest({ provider: 'ntfy', ntfyServerUrl: ntfyServerUrl.trim() || undefined, ntfyTopic: ntfyTopic.trim() || undefined, ntfyToken: ntfyToken.trim() || undefined });
                      setNtfyMsg(t('settings.ntfyTestSent'));
                    } catch (err: any) {
                      setNtfyMsg(err?.message || t('settings.ntfyTestFailed'));
                    }
                  }} style={{ padding: '6px 10px', fontSize: 11 }}>
                    {t('settings.sendTestNotification')}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 700 }}>
                {t('settings.ntfyDisabledHint')}
              </div>
            )}
            {ntfyMsg && <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 700 }}>{ntfyMsg}</div>}
          </div>
        )}
        </>)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--warm-border)' }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, var(--warm-accent), var(--warm-accent-light))', border: '1px solid var(--warm-border)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-text)' }}>{t('settings.theme')}</div>
            <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('settings.themeDesc')}</div>
          </div>
          <select
            className="tq-input"
            value={theme}
            onChange={(e) => onChangeTheme(e.target.value as 'orange' | 'blue' | 'rose' | 'night')}
            style={{ width: 'auto', cursor: 'pointer' }}
          >
            <option value="orange">{t('settings.themeOrange')}</option>
            <option value="blue">{t('settings.themeBlue')}</option>
            <option value="rose">{t('settings.themeRose')}</option>
            <option value="night">{t('settings.themeNight')}</option>
          </select>
        </div>
        {isAdmin && (
        <div style={{ padding: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="8" r="4" stroke="#B0A090" strokeWidth="1.5" fill="none" />
              <path d="M5 17L6.5 13H13.5L15 17" stroke="#B0A090" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-text)' }}>{t('settings.vacationMode')}</div>
              <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('settings.vacationDesc')}</div>
              {vacationEnabled && vacationConfig?.vacationStartDate && (
                <div style={{ fontSize: 11, color: 'var(--warm-accent)', marginTop: 2 }}>
                  {t('settings.vacationSince')} {new Date(vacationConfig.vacationStartDate).toLocaleDateString(locale)}
                </div>
              )}
            </div>
            <Toggle
              checked={vacationEnabled}
              onChange={async (val) => {
                setVacationEnabled(val);
                if (!val) setVacationEndDate(null);
                void onUpdateVacation?.({ vacationMode: val }).catch(() => {
                  setVacationEnabled(!val);
                });
              }}
            />
          </div>
          {vacationEnabled && (
            <div style={{ marginTop: 10, paddingLeft: 34, display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--warm-text-light)' }}>
                {t('settings.vacationReturnDate')}
              </label>
              <input
                type="date"
                className="tq-input-compact"
                value={vacationEndDate ? vacationEndDate.slice(0, 10) : ''}
                min={new Date().toISOString().slice(0, 10)}
                onChange={async (e) => {
                  const val = e.target.value || null;
                  setVacationEndDate(val);
                  void onUpdateVacation?.({ vacationEndDate: val }).catch(() => {
                    setVacationEndDate(vacationConfig?.vacationEndDate ?? null);
                  });
                }}
              />
            </div>
          )}
          {/* Per-user vacation toggles */}
          <div style={{ marginTop: 14, paddingLeft: 34, display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warm-text-secondary)', marginBottom: 2 }}>{t('settings.perUserVacation')}</div>
            {family.filter((u) => u.role !== 'admin').map((u) => {
              const isOn = !!(memberVacation[u.id] ?? u.isVacationMode);
              return (
                <div key={u.id} style={{ padding: '8px 10px', borderRadius: 12, backgroundColor: 'var(--warm-bg-subtle)', border: '1px solid var(--warm-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UserAvatar name={u.displayName} color={u.avatarColor} size={28} avatarType={u.avatarType as any} avatarPreset={u.avatarPreset} avatarPhotoUrl={u.avatarPhotoUrl} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warm-text)' }}>{u.displayName}</div>
                      {isOn && u.vacationStartDate && (
                        <div style={{ fontSize: 10, color: 'var(--warm-accent)' }}>{t('settings.vacationSince')} {new Date(u.vacationStartDate).toLocaleDateString(locale)}</div>
                      )}
                    </div>
                    <Toggle checked={isOn} onChange={async (val) => {
                      setMemberVacation((prev) => ({ ...prev, [u.id]: val }));
                      try {
                        await api.updateUserVacation(u.id, { isVacationMode: val });
                      } catch {
                        setMemberVacation((prev) => ({ ...prev, [u.id]: !val }));
                      }
                    }} />
                  </div>
                  {isOn && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingLeft: 38 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--warm-text-light)', whiteSpace: 'nowrap' }}>
                        {t('settings.vacationReturnDate')}
                      </label>
                      <input
                        type="date"
                        className="tq-input-compact"
                        value={u.vacationEndDate ? u.vacationEndDate.slice(0, 10) : ''}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={async (e) => {
                          const val = e.target.value || null;
                          try {
                            await api.updateUserVacation(u.id, { vacationEndDate: val });
                          } catch { /* ignore */ }
                        }}
                        style={{ fontSize: 11 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}
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
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: '1px solid var(--warm-border)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 6h12M4 10h12M4 14h12" stroke="#B0A090" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M14 4l2 2-2 2" stroke="#B0A090" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-text)' }}>{t('settings.strictMode')}</div>
              <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('settings.strictModeDesc')}</div>
            </div>
            <Toggle
              checked={strictModeEnabled}
              onChange={async (val) => {
                setStrictModeEnabled(val);
                await api.updateStrictModeConfig({ strictMode: val }).catch(() => {
                  setStrictModeEnabled(!val);
                });
              }}
            />
          </div>
        )}
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: '1px solid var(--warm-border)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 1l2.5 5.5L18 7.5l-4 4 1 5.5L10 14.5 4.5 17l1-5.5-4-4 5.5-1z" fill="#B0A090" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warm-text)' }}>{t('settings.gamificationEnabled')}</div>
              <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('settings.gamificationEnabledDesc')}</div>
            </div>
            <Toggle
              checked={gamificationEnabled}
              onChange={async (val) => {
                onGamificationChange?.(val);
                await api.updateGamificationConfig({ gamificationEnabled: val }).catch(() => {
                  onGamificationChange?.(!val);
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

      {isAdmin && gamificationEnabled && (
        <div className="tq-card settings-admin-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-text)', margin: '0 0 12px' }}>{t('settings.pendingValidations')}</h3>
          <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600, marginBottom: 10 }}>{t('settings.pendingValidationsDesc')}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {pendingCompletions.map((pc) => (
              <div key={pc.id} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 110px auto auto', gap: 8, alignItems: 'center', border: '1px solid var(--warm-border)', borderRadius: 10, padding: '8px 10px', backgroundColor: 'var(--warm-bg-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-text)' }}>{pc.displayName}</div>
                <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>{pc.taskName}</div>
                <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>{formatDate(pc.completedAt)}</div>
                <button
                  className="tq-btn tq-btn-secondary"
                  style={{ padding: '5px 10px', fontSize: 11 }}
                  onClick={async () => {
                    await api.approveCompletion(pc.id);
                    await loadPendingCompletions();
                  }}
                >
                  {t('settings.approve')}
                </button>
                <button
                  className="tq-btn"
                  style={{ padding: '5px 10px', fontSize: 11, backgroundColor: 'var(--warm-danger-bg)', color: 'var(--warm-danger)', border: '1.5px solid var(--warm-danger-border)' }}
                  onClick={async () => {
                    await api.rejectPendingCompletion(pc.id);
                    await loadPendingCompletions();
                  }}
                >
                  {t('settings.reject')}
                </button>
              </div>
            ))}
            {pendingCompletions.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('settings.noPendingValidations')}</div>
            )}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="tq-card tq-card-padded settings-admin-card">
          <h3 className="tq-card-title">{t('settings.coinsPerEffort')}</h3>
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
                      className="tq-input"
                    min={0}
                    value={coinsDraft[e] ?? coinsByEffort[e] ?? e * 5}
                    onChange={(ev) => setCoinsDraft((prev) => ({ ...prev, [e]: Math.max(0, parseInt(ev.target.value || '0', 10)) }))}
                    title={`${t('roomDetail.effort')} ${e}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="tq-btn tq-btn-primary tq-btn-sm" onClick={saveCoins}>{t('common.save')}</button>
            <button className="tq-btn tq-btn-secondary tq-btn-sm" onClick={resetCoins}>{t('settings.useDefaultCoins')}</button>
          </div>
        </div>
      )}

      {isAdmin && gamificationEnabled && (
        <div className="tq-card tq-card-padded settings-admin-card">
          <h3 className="tq-card-title">{t('settings.goalsSection')}</h3>
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
                        <button className="tq-btn tq-btn-sm" onClick={() => handleDeleteGoal(g.id, u.id)} style={{ backgroundColor: 'var(--warm-danger-bg)', color: 'var(--warm-danger)', border: '1.5px solid var(--warm-danger-border)' }}>
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
                      className="tq-input"
                      value={goalDraft[u.id]?.title || ''}
                      onChange={(e) => setGoalDraft((prev) => ({ ...prev, [u.id]: { ...(prev[u.id] || { title: '', goalCoins: '', endAt: '' }), title: e.target.value } }))}
                      placeholder={t('settings.goalTitle')}
                    />
                    <input
                      type="number"
                      className="tq-input"
                      min={1}
                      value={goalDraft[u.id]?.goalCoins || ''}
                      onChange={(e) => setGoalDraft((prev) => ({ ...prev, [u.id]: { ...(prev[u.id] || { title: '', goalCoins: '', endAt: '' }), goalCoins: e.target.value } }))}
                      placeholder={t('settings.goalCoins')}
                    />
                    <input
                      type="date"
                      className="tq-input goal-member-end-date"
                      value={goalDraft[u.id]?.endAt || ''}
                      onChange={(e) => setGoalDraft((prev) => ({ ...prev, [u.id]: { ...(prev[u.id] || { title: '', goalCoins: '', endAt: '' }), endAt: e.target.value } }))}
                      title={t('settings.goalEnd')}
                      lang={locale}
                      style={{ minWidth: 0 }}
                    />
                    <button className="tq-btn tq-btn-secondary tq-btn-sm" onClick={() => handleAddGoal(u)}>{t('settings.addGoal')}</button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {isAdmin && gamificationEnabled && (
        <div className="tq-card tq-card-padded settings-admin-card">
          <h3 className="tq-card-title">{t('settings.rewardsSection')}</h3>
          <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600, marginBottom: 10 }}>{t('settings.rewardsSectionDesc')}</div>
          <div className="rewards-add-form" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 100px auto auto', gap: 8, marginBottom: 10 }}>
            <input className="tq-input" value={rewardDraft.title} onChange={(e) => setRewardDraft((p) => ({ ...p, title: e.target.value }))} placeholder={t('settings.rewardTitle')} />
            <input className="tq-input" value={rewardDraft.description} onChange={(e) => setRewardDraft((p) => ({ ...p, description: e.target.value }))} placeholder={t('settings.rewardDesc')} />
            <input className="tq-input" type="number" min={1} value={rewardDraft.costCoins} onChange={(e) => setRewardDraft((p) => ({ ...p, costCoins: e.target.value }))} placeholder={t('settings.rewardCost')} />
            <button className="tq-btn tq-btn-secondary tq-btn-sm" onClick={handleSeedRewards}>{t('settings.addPresetRewards')}</button>
            <button className="tq-btn tq-btn-primary tq-btn-sm" onClick={handleCreateReward}>{t('settings.create')}</button>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {rewardsAdmin.map((r) => (
              <div key={r.id} className="rewards-list-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 100px auto', gap: 8, alignItems: 'center', border: '1px solid var(--warm-border)', borderRadius: 10, padding: '8px 10px', backgroundColor: r.isActive ? 'var(--warm-bg-subtle)' : 'var(--warm-bg-warm)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-text)' }}>{rewardTitle(r)}</div>
                <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{rewardDesc(r)}</div>
                {editingRewardId === r.id ? (
                  <input
                    type="number"
                    min={1}
                    value={editingRewardCost}
                    onChange={(e) => setEditingRewardCost(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') await saveRewardEdit(r);
                      if (e.key === 'Escape') cancelRewardEdit();
                    }}
                    style={{ padding: '6px 8px', borderRadius: 8, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito', fontSize: 12 }}
                  />
                ) : (
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-accent)', display: 'flex', alignItems: 'center', gap: 4 }}><CoinIcon /> {r.costCoins}</div>
                )}
                {editingRewardId === r.id ? (
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="tq-btn tq-btn-primary" onClick={async () => { await saveRewardEdit(r); }} style={{ padding: '4px 8px', fontSize: 10 }}>{t('common.save')}</button>
                    <button className="tq-btn" onClick={cancelRewardEdit} style={{ padding: '4px 8px', fontSize: 10 }}>{t('common.cancel')}</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="tq-btn" onClick={() => startRewardEdit(r)} style={{ padding: '4px 8px', fontSize: 10 }}>{t('common.edit')}</button>
                    <button className="tq-btn" onClick={async () => { await api.deleteReward(r.id); await loadRewardsAdmin(); }} style={{ padding: '4px 8px', fontSize: 10, backgroundColor: 'var(--warm-danger-bg)', color: 'var(--warm-danger)', border: '1.5px solid var(--warm-danger-border)' }}>{t('common.delete')}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <h4 className="tq-card-title" style={{ fontSize: 13 }}>{t('settings.rewardRequests')}</h4>
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

      {isAdmin && (
      <div className="tq-card tq-card-padded">
        <h3 className="tq-card-title">{t('settings.dataPrivacy')}</h3>
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
              <button className="tq-btn tq-btn-sm" onClick={isAdmin ? s.action! : () => {}} disabled={!isAdmin} style={{ backgroundColor: 'var(--warm-accent-light)', color: 'var(--warm-accent)', border: '1.5px solid var(--warm-accent)' }}>
                {s.btn}
              </button>
            )}
          </div>
        ))}
      </div>
      )}

      <div className="tq-card tq-card-padded settings-admin-card family-members-card" style={{ gridColumn: '1 / -1' }}>
        <div className="family-members-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="tq-card-title" style={{ margin: 0 }}>{t('settings.familyMembers')}</h3>
          <button className="tq-btn tq-btn-primary tq-btn-sm" onClick={() => isAdmin && setShowAddMember(true)} disabled={!isAdmin} style={{ opacity: isAdmin ? 1 : 0.5 }}>
            + {t('settings.addMember')}
          </button>
        </div>
        {showAddMember && (
          <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, backgroundColor: 'var(--warm-bg-warm)', border: '1.5px solid var(--warm-border)' }}>
            <div className="family-members-add-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 8 }}>
              <input className="tq-input" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder={t('settings.memberDisplayName')} />
              <input className="tq-input" value={newMemberUsername} onChange={(e) => setNewMemberUsername(e.target.value)} placeholder={t('settings.memberUsername')} />
              <input className="tq-input" value={newMemberPassword} onChange={(e) => setNewMemberPassword(e.target.value)} type="password" placeholder={t('settings.memberPassword')} />
              <button className="tq-btn tq-btn-secondary tq-btn-sm" onClick={resetMemberForm}>{t('common.cancel')}</button>
              <button className="tq-btn tq-btn-primary tq-btn-sm" onClick={handleAddMember}>{t('settings.create')}</button>
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
                    className="tq-input"
                    value={u.role || 'member'}
                    onChange={(e) => onUpdateRole(u.id, e.target.value as 'admin' | 'member' | 'child')}
                    style={{ width: 'auto', cursor: 'pointer', fontSize: 11 }}
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
                      className="tq-btn tq-btn-secondary tq-btn-sm"
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
                    className="tq-btn tq-btn-sm"
                    style={{ backgroundColor: 'var(--warm-danger-bg)', color: 'var(--warm-danger)', border: '1.5px solid var(--warm-danger-border)' }}
                  >
                    {t('settings.deleteUser')}
                  </button>
                </div>
              )}
              {isAdmin && u.role !== 'admin' && memberEditOpen[u.id] && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--warm-border)', display: 'grid', gap: 8 }}>
                  <select className="tq-input" value={memberProfile[u.id]?.language || 'en'} onChange={(e) => setMemberProfile((prev) => ({ ...prev, [u.id]: { ...prev[u.id], language: e.target.value } }))} style={{ cursor: 'pointer' }}>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="es">Español</option>
                    <option value="it">Italiano</option>
                  </select>
                  <select className="tq-input" value={memberProfile[u.id]?.avatarType || 'letter'} onChange={(e) => setMemberProfile((prev) => ({ ...prev, [u.id]: { ...prev[u.id], avatarType: e.target.value as 'letter' | 'preset' } }))} style={{ cursor: 'pointer' }}>
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
                    <select className="tq-input" value={memberProfile[u.id]?.avatarPreset || 'cat'} onChange={(e) => setMemberProfile((prev) => ({ ...prev, [u.id]: { ...prev[u.id], avatarPreset: e.target.value } }))} style={{ cursor: 'pointer' }}>
                      {Object.keys(AVATAR_PRESETS).map((id) => (
                        <option key={id} value={id}>{t(`avatars.${id}`)}</option>
                      ))}
                    </select>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="tq-btn tq-btn-primary tq-btn-sm" onClick={() => handleSaveChildProfile(u)}>{t('common.save')}</button>
                    {memberProfileMsg[u.id] && (
                      <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>{memberProfileMsg[u.id]}</div>
                    )}
                  </div>
                  <div className="member-edit-password-row" style={{ display: 'flex', gap: 8 }}>
                    <input type="password" className="tq-input" value={memberPassword[u.id] || ''} onChange={(e) => setMemberPassword((prev) => ({ ...prev, [u.id]: e.target.value }))} placeholder={t('settings.newPassword')} style={{ flex: 1 }} />
                    <button className="tq-btn tq-btn-secondary tq-btn-sm" onClick={() => handleSetChildPassword(u)}>{t('settings.resetPassword')}</button>
                  </div>
                  {memberPasswordMsg[u.id] && (
                    <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>{memberPasswordMsg[u.id]}</div>
                  )}
                  {gamificationEnabled && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-light)' }}>{t('settings.coinsBalance')}: {u.coins}</span>
                    <input
                      type="number"
                      className="tq-input-compact"
                      value={coinAdjust[u.id] || ''}
                      onChange={(e) => setCoinAdjust((prev) => ({ ...prev, [u.id]: e.target.value }))}
                      placeholder={t('settings.adjustCoins')}
                      style={{ width: 80 }}
                    />
                    <button className="tq-btn tq-btn-secondary tq-btn-sm" onClick={async () => {
                      const amt = parseInt(coinAdjust[u.id] || '0');
                      if (!amt) return;
                      if (onAdjustCoins) {
                        await onAdjustCoins(u.id, amt);
                      } else {
                        await api.adjustCoins(u.id, amt);
                      }
                      setCoinAdjust((prev) => ({ ...prev, [u.id]: '' }));
                      setCoinAdjustMsg((prev) => ({ ...prev, [u.id]: `${amt > 0 ? '+' : ''}${amt} ✓` }));
                      setTimeout(() => setCoinAdjustMsg((prev) => ({ ...prev, [u.id]: '' })), 2000);
                    }}>{t('settings.adjustCoins')}</button>
                    {coinAdjustMsg[u.id] && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-accent)' }}>{coinAdjustMsg[u.id]}</span>}
                  </div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
