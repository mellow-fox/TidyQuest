import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { api } from './hooks/useApi';
import { Sidebar } from './components/layout/Sidebar';
import { PageHeader } from './components/layout/PageHeader';
import { ConfettiEffect } from './components/shared/ConfettiEffect';
import Dashboard from './components/pages/Dashboard';
import { RoomsList } from './components/pages/RoomsList';
import { RoomDetail } from './components/pages/RoomDetail';
import { Calendar } from './components/pages/Calendar';
import { Leaderboard } from './components/pages/Leaderboard';
import { History } from './components/pages/History';
import { Settings } from './components/pages/Settings';
import { Profile } from './components/pages/Profile';
import { Login } from './components/pages/Login';
import { Register } from './components/pages/Register';
import { Achievements } from './components/pages/Achievements';
import { Rewards } from './components/pages/Rewards';
import { useTranslation } from './hooks/useTranslation';

function AppContent() {
  const { user, loading, login, register, logout, refreshUser } = useAuth();
  const browserLang = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
  // Always call useTranslation unconditionally (React hooks rule) — use user's language if known, else browser lang
  const { t } = useTranslation(user?.language ?? browserLang);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [family, setFamily] = useState<any[]>([]);
  const [familySettings, setFamilySettings] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('week');
  const [completions, setCompletions] = useState<any[]>([]);
  const [coinsByEffort, setCoinsByEffort] = useState<Record<number, number>>({ 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 });
  const [achievementsData, setAchievementsData] = useState<any>(null);
  const [rewardsData, setRewardsData] = useState<{ rewards: any[]; mine: any[] }>({ rewards: [], mine: [] });
  const [theme, setTheme] = useState<'orange' | 'blue' | 'rose' | 'night'>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('tidyquest_theme') : null;
    return (saved === 'blue' || saved === 'rose' || saved === 'night') ? saved : 'orange';
  });
  const [vacationConfig, setVacationConfig] = useState<{ vacationMode: boolean; vacationStartDate: string | null; vacationEndDate: string | null } | null>(null);
  const vacationUpdatePending = useRef(false);
  const dashboardLoadInFlight = useRef<Promise<void> | null>(null);
  const roomsRefreshInFlight = useRef<Promise<void> | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [taskErrorMsg, setTaskErrorMsg] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshRooms = useCallback(async () => {
    if (roomsRefreshInFlight.current) return roomsRefreshInFlight.current;
    const p = (async () => {
      try {
        const roomsData = await api.getRooms();
        setRooms(roomsData);
      } catch { /* ignore */ }
    })().finally(() => {
      roomsRefreshInFlight.current = null;
    });
    roomsRefreshInFlight.current = p;
    return p;
  }, []);

  const loadDashboard = useCallback(async () => {
    if (dashboardLoadInFlight.current) return dashboardLoadInFlight.current;
    const p = (async () => {
      try {
        const [dash, lb, hist, users, coinCfg, ach, roomsData] = await Promise.all([
          api.dashboard(),
          api.leaderboard(leaderboardPeriod),
          api.history(50, 0),
          api.getUsers(),
          api.getCoinsConfig(),
          api.achievements(),
          api.getRooms(),
        ]);
        setDashboardData(dash);
        if (dash.vacation && !vacationUpdatePending.current) setVacationConfig(dash.vacation);
        setRooms(roomsData);
        setLeaderboard(lb);
        setFamily(lb);
        setFamilySettings(users);
        setCompletions(hist.history || []);
        setCoinsByEffort(coinCfg.coinsByEffort || { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 });
        setAchievementsData(ach);
      } catch { /* not logged in */ }
    })().finally(() => {
      dashboardLoadInFlight.current = null;
    });
    dashboardLoadInFlight.current = p;
    return p;
  }, [leaderboardPeriod]);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user, loadDashboard]);

  // Selectively refresh data when navigating to pages that need fresh data
  useEffect(() => {
    if (!user) return;
    const path = location.pathname;
    if (path === '/') {
      loadDashboard();
    } else if (path === '/rooms' || path.startsWith('/rooms/')) {
      refreshRooms();
    }
    if (path === '/rewards') {
      loadRewards();
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll every 15s to reflect other users' actions without requiring F5
  useEffect(() => {
    if (!user) return;
    const isDashboardPath = location.pathname === '/';
    const isRoomsPath = location.pathname === '/rooms' || location.pathname.startsWith('/rooms/');
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      if (isDashboardPath) loadDashboard();
      if (isRoomsPath) refreshRooms();
    };
    const interval = setInterval(tick, 15000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [user, location.pathname, loadDashboard, refreshRooms]);

  const loadRewards = useCallback(async () => {
    try {
      const data = await api.getRewards();
      setRewardsData(data);
    } catch {
      setRewardsData({ rewards: [], mine: [] });
    }
  }, []);

  useEffect(() => {
    if (user) loadRewards();
  }, [user, loadRewards]);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'orange') {
      html.removeAttribute('data-theme');
    } else {
      html.setAttribute('data-theme', theme);
    }
    localStorage.setItem('tidyquest_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.title = 'TidyQuest';
  }, []);

  useEffect(() => {
    if (user && (location.pathname === '/login' || location.pathname === '/register')) {
      navigate('/', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  const handleCompleteTask = async (taskId: number) => {
    try {
      setConfetti(true);
      await api.completeTask(taskId);
      refreshUser();
      await refreshRooms();
      setTimeout(() => setConfetti(false), 2200);
    } catch (err) {
      setConfetti(false);
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'already_done_today') {
        setTaskErrorMsg(t('app.alreadyDoneToday'));
      } else if (msg === 'already_done_by_other') {
        setTaskErrorMsg(t('app.alreadyDoneByOther'));
      } else if (msg === 'not_assigned') {
        setTaskErrorMsg(t('app.notAssigned'));
      } else {
        setTaskErrorMsg(msg || t('common.error'));
      }
      setTimeout(() => setTaskErrorMsg(null), 3500);
    }
  };

  const handleLeaderboardPeriodChange = async (period: 'week' | 'month' | 'quarter' | 'year') => {
    setLeaderboardPeriod(period);
    const lb = await api.leaderboard(period);
    setLeaderboard(lb);
  };

  const handleExport = async () => {
    const data = await api.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tidyquest-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data || typeof data !== 'object' || !Array.isArray(data.users) || !Array.isArray(data.rooms)) {
          alert('Invalid backup file: missing users or rooms data.');
          return;
        }
        await api.importData(data);
        await loadDashboard();
      } catch (err) {
        alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--warm-bg)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--warm-text-light)' }}>{t('common.loading')}...</div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'register') {
      return <Register onRegister={register} onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <Login onLogin={login} onSwitchToRegister={() => setAuthView('register')} />;
  }

  const localeMap: Record<string, string> = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT' };
  const today = new Date().toLocaleDateString(localeMap[user.language] || 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Build flat tasks list for calendar
  const allTasks = rooms.flatMap((r: any) =>
    (r.tasks || []).map((t: any) => ({ ...t, roomName: r.name, roomType: r.roomType }))
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--warm-bg)' }}>
      <ConfettiEffect show={confetti} />

      {/* Task error toast */}
      {taskErrorMsg && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: '#EF4444', color: '#fff',
          padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 15,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {taskErrorMsg}
        </div>
      )}

      {/* Mobile hamburger menu */}
      <button
        onClick={() => setIsMobileSidebarOpen(true)}
        className="mobile-only hamburger-menu"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 40,
          background: 'var(--warm-card)',
          border: '1.5px solid var(--warm-border)',
          borderRadius: 12,
          width: 44,
          height: 44,
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px var(--warm-shadow)',
        }}
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      <Sidebar
        user={user}
        isMobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <main style={{ marginLeft: 240, flex: 1, padding: '28px 36px', maxWidth: 1320, backgroundColor: 'var(--warm-bg)' }} className="main-content">
        <Routes>
          <Route path="/" element={
            <>
              <PageHeader title={t('nav.home')} subtitle={today} user={user} onCoinsClick={() => navigate('/rewards')} onStreakClick={() => navigate('/achievements')} />
              {dashboardData && (
                <Dashboard
                  data={dashboardData}
                  family={family}
                  users={familySettings}
                  language={user.language}
                  onCompleteTask={handleCompleteTask}
                  onRefresh={loadDashboard}
                  onNavigateToRoom={(id) => navigate(`/rooms/${id}`)}
                  onNavigateToActivity={() => navigate('/activity')}
                  onRewardRequestAction={async (id, status) => {
                    await api.updateRedemptionStatus(id, status);
                    await Promise.all([loadDashboard(), loadRewards()]);
                  }}
                />
              )}
            </>
          } />

          <Route path="/rooms" element={
            <>
              <PageHeader title={t('nav.rooms')} subtitle={`${rooms.length} ${t('app.roomsConfigured')}`} user={user} onCoinsClick={() => navigate('/rewards')} onStreakClick={() => navigate('/achievements')} />
              <RoomsList rooms={rooms} language={user.language} onSelectRoom={(id) => navigate(`/rooms/${id}`)}
                isAdmin={user.role === 'admin'}
                users={familySettings}
                onCreateRoom={async (data) => {
                  await api.createRoom({ name: data.name, roomType: data.roomType, color: data.color, accentColor: data.accentColor, tasks: data.tasks, assignedUserId: data.assignedUserId });
                  void refreshRooms();
                }}
                onDeleteRoom={async (roomId) => {
                  await api.deleteRoom(roomId);
                  void refreshRooms();
                }}
                onAssignRoom={async (roomId, assignedUserId, force) => {
                  await api.updateRoom(roomId, { assignedUserId, ...(force ? { force: true } : {}) });
                  void refreshRooms();
                }}
              />
            </>
          } />

          <Route path="/rooms/:id" element={
            <RoomDetailWrapper rooms={rooms} user={user} users={familySettings} coinsByEffort={coinsByEffort} onCompleteTask={handleCompleteTask} onRefresh={refreshRooms} />
          } />

          <Route path="/calendar" element={
            <>
              <PageHeader title={t('nav.calendar')} subtitle={t('app.calendarSubtitle')} user={user} onCoinsClick={() => navigate('/rewards')} onStreakClick={() => navigate('/achievements')} />
              <Calendar completions={completions} tasks={allTasks} language={user.language} />
            </>
          } />

          <Route path="/leaderboard" element={
            <>
              <PageHeader title={t('app.leaderboardTitle')} subtitle={t('app.leaderboardSubtitle')} user={user} onCoinsClick={() => navigate('/rewards')} onStreakClick={() => navigate('/achievements')} />
              <Leaderboard users={leaderboard} language={user.language} period={leaderboardPeriod} onPeriodChange={handleLeaderboardPeriodChange} />
            </>
          } />

          <Route path="/activity" element={
            <>
              <PageHeader title={t('nav.activity')} subtitle={t('app.activitySubtitle')} user={user} onCoinsClick={() => navigate('/rewards')} onStreakClick={() => navigate('/achievements')} />
              <History language={user.language} isAdmin={user.role === 'admin'} />
            </>
          } />
          <Route path="/history" element={
            <>
              <PageHeader title={t('nav.activity')} subtitle={t('app.activitySubtitle')} user={user} onCoinsClick={() => navigate('/rewards')} onStreakClick={() => navigate('/achievements')} />
              <History language={user.language} isAdmin={user.role === 'admin'} />
            </>
          } />

          <Route path="/profile" element={
            <>
              <PageHeader title={t('nav.profile')} subtitle={t('app.profileSubtitle')} user={user} onCoinsClick={() => navigate('/rewards')} onStreakClick={() => navigate('/achievements')} />
              <Profile user={user} onSave={async () => { await refreshUser(); }} onLogout={() => { logout(); navigate('/login', { replace: true }); }} />
            </>
          } />

          <Route path="/settings" element={
            <>
              <PageHeader title={t('nav.settings')} subtitle={t('app.settingsSubtitle')} user={user} onCoinsClick={() => navigate('/rewards')} onStreakClick={() => navigate('/achievements')} />
              <Settings
                user={user}
                family={familySettings}
                vacationConfig={vacationConfig ?? undefined}
                onUpdateVacation={async (data) => {
                  vacationUpdatePending.current = true;
                  try {
                    const updated = await api.updateVacationConfig(data);
                    setVacationConfig(updated);
                  } finally {
                    vacationUpdatePending.current = false;
                  }
                }}
                onUpdateRole={async (targetUserId, role) => {
                  await api.updateUserRole(targetUserId, role);
                  setFamilySettings(await api.getUsers());
                  await refreshUser();
                }}
                onAddMember={async (member) => {
                  await api.createUser(member);
                  setFamilySettings(await api.getUsers());
                }}
                onDeleteUser={async (targetUserId) => {
                  await api.deleteUser(targetUserId);
                  setFamilySettings(await api.getUsers());
                  await refreshUser();
                  await loadDashboard();
                }}
                onUpdateMemberProfile={async (memberUserId, profile) => {
                  await api.updateProfile(memberUserId, profile);
                  setFamilySettings(await api.getUsers());
                  if (memberUserId === user.id) {
                    await refreshUser();
                  }
                }}
                onChangePassword={async (targetUserId, payload) => {
                  await api.updatePassword(targetUserId, payload);
                }}
                coinsByEffort={coinsByEffort}
                onSaveCoinsByEffort={async (values) => {
                  const updated = await api.updateCoinsConfig({ coinsByEffort: values });
                  setCoinsByEffort(updated.coinsByEffort);
                }}
                onResetCoinsByEffort={async () => {
                  const updated = await api.updateCoinsConfig({ useDefault: true });
                  setCoinsByEffort(updated.coinsByEffort);
                }}
                theme={theme}
                onChangeTheme={setTheme}
                onExport={handleExport}
                onImport={handleImport}
                onAdjustCoins={async (userId: number, amount: number) => {
                  await api.adjustCoins(userId, amount);
                  setFamilySettings(await api.getUsers());
                }}
              />
            </>
          } />
          <Route path="/achievements" element={
            <>
              <PageHeader title={t('nav.achievements')} subtitle={t('app.achievementsSubtitle')} user={user} onCoinsClick={() => navigate('/rewards')} onStreakClick={() => navigate('/achievements')} />
              <Achievements data={achievementsData} language={user.language} />
            </>
          } />
          <Route path="/rewards" element={
            <>
              <PageHeader title={t('nav.rewards')} subtitle={t('app.rewardsSubtitle')} user={user} onCoinsClick={() => navigate('/rewards')} onStreakClick={() => navigate('/achievements')} />
              <Rewards
                language={user.language}
                rewards={rewardsData.rewards}
                mine={rewardsData.mine}
                userCoins={user.coins}
                onRedeem={async (rewardId: number) => {
                  await api.redeemReward(rewardId);
                  await refreshUser();
                  await loadDashboard();
                  await loadRewards();
                }}
                onCancel={async (redemptionId: number) => {
                  await api.cancelRedemption(redemptionId);
                  await refreshUser();
                  await loadDashboard();
                  await loadRewards();
                }}
              />
            </>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function RoomDetailWrapper({ rooms, user, users, coinsByEffort, onCompleteTask, onRefresh }: { rooms: any[]; user: any; users?: any[]; coinsByEffort: Record<number, number>; onCompleteTask: (id: number) => void; onRefresh: () => void }) {
  const navigate = useNavigate();
  const { t, roomDisplayName } = useTranslation(user?.language || 'en');
  const { id: idParam } = useParams<{ id: string }>();
  const id = parseInt(idParam || '0');
  const room = rooms.find((r) => r.id === id);

  if (!room) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#B0A090', fontWeight: 600 }}>
        {t('rooms.roomNotFound')}
        <button onClick={() => navigate('/rooms')} className="tq-btn tq-btn-secondary"
          style={{ padding: '8px 18px', fontSize: 13, marginLeft: 10 }}>
          {t('rooms.backToRooms')}
        </button>
      </div>
    );
  }

  return (
    <>
      <PageHeader title={roomDisplayName(room.name, room.roomType)} subtitle={`${room.tasks?.length || 0} ${t('rooms.tasksTracked')}`} user={user} onCoinsClick={() => navigate('/rewards')} onStreakClick={() => navigate('/achievements')} />
      <RoomDetail room={room} language={user?.language} isAdmin={user?.role === 'admin'} currentUserId={user?.id} currentUserRole={user?.role} users={users} coinsByEffort={coinsByEffort} onCompleteTask={onCompleteTask} onBack={() => navigate('/rooms')} onRefresh={onRefresh} />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
