import React, { useState } from 'react';
import HealthBar from '../shared/HealthBar';
import RingGauge from '../shared/RingGauge';
import UserAvatar from '../shared/UserAvatar';
import { FireIcon, CoinIcon, CheckIcon } from '../icons/UIIcons';
import { getRoomIcon } from '../icons/RoomIcons';
import { TaskIcon } from '../icons/TaskIcons';
import { getHealthColor } from '../../utils/health';
import { useTranslation } from '../../hooks/useTranslation';
import { AdminCompleteModal } from '../shared/AdminCompleteModal';
import { api } from '../../hooks/useApi';

/* ── Types ── */

interface Room {
  id: number;
  name: string;
  roomType: string;
  color: string;
  accentColor: string;
  health: number;
  taskCount: number;
  criticalCount: number;
}

interface Quest {
  id: number;
  name: string;
  translationKey?: string;
  iconKey?: string;
  health: number;
  effort: number;
  roomId: number;
  roomName: string;
  roomColor: string;
  roomAccent: string;
  lastCompletedAt: string | null;
  isSeasonal: boolean;
  frequencyDays: number;
  dueDate?: string;
  dueInDays?: number;
  assignedToChildren?: boolean;
  effectiveAssignedUserId?: number | null;
  effectiveAssignedUserIds?: number[];
  assignedUsers?: Array<{ id: number; displayName: string; avatarColor: string; avatarType?: string; avatarPreset?: string; avatarPhotoUrl?: string }>;
  assignmentMode?: 'first' | 'shared';
  sharedCompletions?: Array<{ userId: number; displayName: string }>;
  completedTodayBy?: { userId: number; displayName: string; avatarColor: string } | null;
}

interface CurrentUser {
  id: number;
  role?: 'admin' | 'member' | 'child';
  displayName: string;
  coins: number;
  goalCoins?: number | null;
  currentStreak: number;
  avatarColor: string;
  lastActiveDate?: string | null;
}

interface ActivityEntry {
  displayName: string;
  avatarColor: string;
  avatarType?: string;
  avatarPreset?: string;
  avatarPhotoUrl?: string;
  taskName: string;
  translationKey?: string;
  roomId: number;
  roomName: string;
  completedAt: string;
  coinsEarned: number;
}

interface FamilyMember {
  id: number;
  displayName: string;
  avatarColor: string;
  avatarType?: string;
  avatarPreset?: string;
  avatarPhotoUrl?: string;
  coins: number;
  currentStreak: number;
  points: number;
}

interface DashboardProps {
  data: {
    houseHealth: number;
    rooms: Room[];
    todaysQuests: Quest[];
    nextTasks: Quest[];
    myGoal?: { goalCoins: number; currentCoins: number; progress: number; goalStartAt?: string | null; goalEndAt?: string | null } | null;
    childrenGoals?: Array<{ id: number; displayName: string; role: string; coins: number; currentCoins?: number; goalCoins: number | null; progress: number | null; goalStartAt?: string | null; goalEndAt?: string | null }>;
    pendingRewardRequests?: Array<{ id: number; title: string; displayName: string; costCoins: number; redeemedAt: string; status: 'requested' | 'approved' | 'rejected' }>;
    currentUser: CurrentUser;
    recentActivity: ActivityEntry[];
  };
  family: FamilyMember[];
  users?: Array<{ id: number; displayName: string; role: string; avatarColor: string; avatarType?: string; avatarPreset?: string; avatarPhotoUrl?: string }>;
  language?: string;
  onCompleteTask: (taskId: number) => void;
  onRefresh?: () => void;
  onNavigateToRoom: (roomId: number) => void;
  onNavigateToActivity: () => void;
  onRewardRequestAction: (id: number, status: 'approved' | 'rejected') => void | Promise<void>;
}

/* ── Component ── */

const Dashboard: React.FC<DashboardProps> = ({
  data,
  family,
  users,
  language,
  onCompleteTask,
  onRefresh,
  onNavigateToRoom,
  onNavigateToActivity,
  onRewardRequestAction,
}) => {
  const { taskName, roomDisplayName, timeAgo, t } = useTranslation(language);
  const { houseHealth, rooms, todaysQuests, nextTasks, myGoal, childrenGoals = [], pendingRewardRequests = [], currentUser, recentActivity } = data;
  const [adminModalQuest, setAdminModalQuest] = useState<Quest | null>(null);
  const localeMap: Record<string, string> = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT' };
  const locale = localeMap[language || 'en'] || 'en-US';

  const sortedRooms = [...rooms].sort((a, b) => a.health - b.health);
  const roomTypeById = new Map(rooms.map((r) => [r.id, r.roomType]));
  const totalTasks = rooms.reduce((s, r) => s + r.taskCount, 0);
  const totalCritical = rooms.reduce((s, r) => s + r.criticalCount, 0);
  const sortedFamily = [...family].sort((a, b) => b.points - a.points);
  const coinsSortedFamily = [...family].sort((a, b) => b.coins - a.coins);
  const todayIso = new Date().toISOString().slice(0, 10);
  const streakDoneToday = currentUser.lastActiveDate === todayIso;

  const healthMessage =
    houseHealth >= 70
      ? t('dashboard.healthGreat')
      : houseHealth >= 40
        ? t('dashboard.healthMedium')
        : t('dashboard.healthLow');

  return (
    <>
    <div
      className="dashboard-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 310px',
        gap: 20,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      {/* ── Column 1 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* House Health Card */}
        <div
          className="tq-card"
          style={{
            padding: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            background: 'var(--warm-streak-bg)',
          }}
        >
          <RingGauge value={houseHealth} size={130} strokeWidth={11} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--warm-text-light)',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {t('dashboard.houseHealth')}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--warm-text-secondary)',
                marginBottom: 14,
                lineHeight: 1.4,
              }}
            >
              {healthMessage}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: t('dashboard.roomsCount'), value: rooms.length, color: 'var(--warm-accent)' },
                { label: t('dashboard.tasksCount'), value: totalTasks, color: '#4AABDE' },
                { label: t('dashboard.criticalCount'), value: totalCritical, color: 'var(--warm-badge-text)' },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--warm-card)',
                    borderRadius: 14,
                    padding: '10px 8px',
                    textAlign: 'center',
                    border: '1.5px solid var(--warm-border)',
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 700 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Quests Card */}
        <div className="tq-card" style={{ padding: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--warm-text)', margin: 0 }}>
              {t('dashboard.todaysQuests')}
            </h3>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                backgroundColor: 'var(--warm-badge-bg)',
                color: 'var(--warm-badge-text)',
                padding: '4px 12px',
                borderRadius: 99,
              }}
            >
              {todaysQuests.length} {t('dashboard.pending')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todaysQuests.slice(0, 6).map((q) => {
              const isAdminOrMember = currentUser.role === 'admin' || currentUser.role === 'member';
              const hasAssignees = (q.effectiveAssignedUserIds && q.effectiveAssignedUserIds.length > 0) || q.assignedToChildren;
              // Determine done button state
              let btnDisabled = false;
              let btnLabel = t('roomDetail.done');
              if (q.assignmentMode === 'shared') {
                const myCompletion = q.sharedCompletions?.find(c => c.userId === currentUser.id);
                if (myCompletion && !isAdminOrMember) {
                  btnDisabled = true;
                  btnLabel = t('app.doneBy').replace('{name}', t('common.you') || 'You');
                }
              } else if (q.completedTodayBy) {
                if (!isAdminOrMember || !hasAssignees) {
                  btnDisabled = true;
                  btnLabel = t('app.doneBy').replace('{name}', q.completedTodayBy.displayName);
                }
              } else if (!isAdminOrMember) {
                if (q.effectiveAssignedUserId !== null && q.effectiveAssignedUserId !== undefined) {
                  if (q.effectiveAssignedUserId !== currentUser.id) {
                    btnDisabled = true;
                    btnLabel = t('app.notAssigned');
                  }
                }
              }
              const handleQuestDone = () => {
                if (btnDisabled) return;
                if (isAdminOrMember && hasAssignees) {
                  setAdminModalQuest(q);
                } else {
                  onCompleteTask(q.id);
                }
              };
              return (
                <div
                  key={q.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 16,
                    backgroundColor: 'var(--warm-bg-subtle)',
                    border: '1.5px solid var(--warm-border)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      backgroundColor: q.roomColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: `1.5px solid ${q.roomAccent}44`,
                    }}
                  >
                    <TaskIcon iconKey={q.iconKey} size={24} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warm-text)' }}>
                      {taskName(q.name, q.translationKey)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                      {roomDisplayName(q.roomName, roomTypeById.get(q.roomId) || '')}
                      {q.lastCompletedAt ? ` \u00B7 ${timeAgo(q.lastCompletedAt)}` : ''}
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <HealthBar value={q.health} height={6} showLabel={false} />
                    </div>
                  </div>
                  <button
                    onClick={handleQuestDone}
                    disabled={btnDisabled}
                    className={btnDisabled ? 'tq-btn' : 'tq-btn tq-btn-primary'}
                    style={{
                      padding: '8px 14px',
                      fontSize: 12,
                      ...(btnDisabled ? {
                        opacity: 0.55,
                        cursor: 'default',
                        backgroundColor: 'var(--warm-bg-subtle)',
                        border: '1.5px solid var(--warm-border)',
                        color: 'var(--warm-text-muted)',
                        boxShadow: 'none',
                      } : {
                        backgroundColor: 'var(--warm-accent)',
                        color: '#fff',
                        boxShadow: '0 4px 14px var(--warm-primary-shadow)',
                      }),
                    }}
                  >
                    {btnDisabled ? btnLabel : <><CheckIcon /> {btnLabel}</>}
                  </button>
                </div>
              );
            })}
            {todaysQuests.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--warm-text-light)', fontWeight: 700, padding: '8px 4px' }}>
                {t('dashboard.noQuests')}
              </div>
            )}
          </div>
        </div>

        {/* Next Tasks Card */}
        <div className="tq-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--warm-text)', margin: '0 0 12px' }}>
            {t('dashboard.nextTasks')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nextTasks.slice(0, 6).map((q) => {
              return (
                <div key={q.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 14, backgroundColor: 'var(--warm-bg-subtle)', border: '1.5px solid var(--warm-border)',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 12, backgroundColor: q.roomColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    border: `1.5px solid ${q.roomAccent}44`,
                  }}><TaskIcon iconKey={q.iconKey} size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warm-text)' }}>{taskName(q.name, q.translationKey)}</div>
                    <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                      {roomDisplayName(q.roomName, roomTypeById.get(q.roomId) || '')}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--warm-streak-subtext)', backgroundColor: 'var(--warm-accent-light)', border: '1px solid var(--warm-streak-border)', borderRadius: 999, padding: '3px 8px' }}>
                    {t('calendar.inDays').replace('{days}', `${q.dueInDays || 0}`)}
                  </div>
                </div>
              );
            })}
            {nextTasks.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--warm-text-light)', fontWeight: 700, padding: '8px 4px' }}>
                {t('calendar.allCaughtUp')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Column 2: Rooms ── */}
      <div className="tq-card" style={{ padding: 20, alignSelf: 'start' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--warm-text)', margin: 0 }}>
            {t('nav.rooms')}
          </h3>
          <span style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>
            {t('dashboard.sortedUrgency')}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sortedRooms.map((room) => {
            const RoomIcon = getRoomIcon(room.roomType || room.name);
            return (
              <div
                key={room.id}
                className="tq-card tq-card-hover"
                style={{ cursor: 'pointer' }}
                onClick={() => onNavigateToRoom(room.id)}
              >
                <div style={{ padding: '16px 18px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        backgroundColor: room.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1.5px solid ${room.accentColor}33`,
                      }}
                    >
                      <RoomIcon />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-text)' }}>
                        {roomDisplayName(room.name, room.roomType)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                        {room.taskCount} {t('rooms.tasks')}
                        {room.criticalCount > 0 && (
                          <span style={{ color: 'var(--warm-badge-text)', fontWeight: 800 }}>
                            {' '}
                            &middot; {room.criticalCount} {t('dashboard.criticalCount')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: getHealthColor(room.health),
                      }}
                    >
                      {room.health}%
                    </div>
                  </div>
                  <HealthBar value={room.health} height={8} showLabel={false} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Column 3: Widgets ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Streak Card */}
        <div
          className="tq-card"
          style={{
            padding: 20,
            background: 'var(--warm-streak-bg)',
            borderColor: 'var(--warm-streak-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: 'var(--warm-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid var(--warm-streak-border)',
              }}
            >
              <FireIcon />
            </div>
            <div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: 'var(--warm-streak-text)',
                  lineHeight: 1,
                }}
              >
                {currentUser.currentStreak}
              </div>
              <div style={{ fontSize: 12, color: 'var(--warm-streak-subtext)', fontWeight: 700 }}>
                {t('dashboard.dayStreak')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor:
                    i < (currentUser.currentStreak % 7 || 7)
                      ? 'var(--warm-accent)'
                      : 'var(--warm-streak-border)',
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--warm-streak-subtext)',
              marginTop: 10,
              fontWeight: 600,
            }}
          >
            {streakDoneToday ? t('dashboard.streakDoneToday') : t('dashboard.keepStreak')}
          </div>
        </div>

        <div className="tq-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-text)' }}>{t('dashboard.coinsStatusTitle')}</div>
            <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '3px 8px', backgroundColor: 'var(--warm-accent-light)', color: 'var(--warm-accent)', border: '1px solid var(--warm-accent)' }}>
              {coinsSortedFamily.length}
            </span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {coinsSortedFamily.slice(0, 6).map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserAvatar name={u.displayName} color={u.avatarColor} size={28} avatarType={u.avatarType as any} avatarPreset={u.avatarPreset} avatarPhotoUrl={u.avatarPhotoUrl} />
                <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--warm-text)' }}>{u.displayName}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: 'var(--warm-coin)' }}>
                  {u.coins} <CoinIcon />
                </div>
              </div>
            ))}
          </div>
        </div>

        {myGoal && (
          <div className="tq-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-text)', marginBottom: 6 }}>{t('dashboard.myGoal')}</div>
            <div style={{ fontSize: 12, color: 'var(--warm-text-muted)', fontWeight: 700, marginBottom: 8 }}>
              {myGoal.currentCoins}/{myGoal.goalCoins} {t('leaderboard.points')}
            </div>
            {(myGoal.goalStartAt || myGoal.goalEndAt) && (
              <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 700, marginBottom: 8 }}>
                {(myGoal.goalStartAt ? new Date(myGoal.goalStartAt).toLocaleDateString(locale) : '...')} - {(myGoal.goalEndAt ? new Date(myGoal.goalEndAt).toLocaleDateString(locale) : '...')}
              </div>
            )}
            <HealthBar value={myGoal.progress} height={8} showLabel={false} />
          </div>
        )}

        {currentUser.role === 'admin' && childrenGoals.length > 0 && (
          <div className="tq-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-text)', marginBottom: 8 }}>{t('dashboard.childrenGoals')}</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {childrenGoals.map((cg) => (
                <div key={cg.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--warm-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--warm-text-secondary)' }}>
                    <span>{cg.displayName}</span>
                    <span>{cg.goalCoins ? `${cg.currentCoins ?? cg.coins}/${cg.goalCoins}` : t('dashboard.noGoal')}</span>
                  </div>
                  {(cg.goalStartAt || cg.goalEndAt) && (
                    <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 700, marginTop: 2 }}>
                      {(cg.goalStartAt ? new Date(cg.goalStartAt).toLocaleDateString(locale) : '...')} - {(cg.goalEndAt ? new Date(cg.goalEndAt).toLocaleDateString(locale) : '...')}
                    </div>
                  )}
                  {cg.goalCoins && <HealthBar value={cg.progress || 0} height={6} showLabel={false} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentUser.role === 'admin' && (
          <div className="tq-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-text)' }}>{t('dashboard.rewardRequestsTitle')}</div>
              <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '3px 8px', backgroundColor: 'var(--warm-accent-light)', color: 'var(--warm-accent)', border: '1px solid var(--warm-accent)' }}>
                {pendingRewardRequests.length}
              </span>
            </div>
            {pendingRewardRequests.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>
                {t('dashboard.rewardRequestEmpty')}
              </div>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              {pendingRewardRequests.slice(0, 6).map((rr) => (
                <div key={rr.id} style={{ border: '1px solid var(--warm-border)', backgroundColor: 'var(--warm-bg-subtle)', borderRadius: 12, padding: '8px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-text)' }}>{rr.displayName}</div>
                  <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 700 }}>{rr.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 700 }}>
                      {timeAgo(rr.redeemedAt)}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, color: 'var(--warm-accent)' }}>
                        <CoinIcon /> {rr.costCoins}
                      </span>
                      <button className="tq-btn tq-btn-secondary" onClick={() => onRewardRequestAction(rr.id, 'approved')} style={{ padding: '4px 7px', fontSize: 10 }}>
                        {t('dashboard.approve')}
                      </button>
                      <button className="tq-btn" onClick={() => onRewardRequestAction(rr.id, 'rejected')} style={{ padding: '4px 7px', fontSize: 10, backgroundColor: 'var(--warm-danger-bg)', color: 'var(--warm-danger)', border: '1.5px solid var(--warm-danger-border)' }}>
                        {t('dashboard.reject')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mini Leaderboard */}
        <div className="tq-card" style={{ padding: 20 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: 'var(--warm-text)',
              margin: '0 0 12px',
            }}
          >
            {t('leaderboard.thisWeek')}
          </h3>
          {sortedFamily.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 0',
                borderBottom:
                  i < sortedFamily.length - 1 ? '1px solid var(--warm-border)' : 'none',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  backgroundColor: i === 0 ? 'var(--warm-accent-light)' : 'var(--warm-bg-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 900,
                  color: i === 0 ? 'var(--warm-accent)' : 'var(--warm-text-light)',
                  border: i === 0 ? '1.5px solid var(--warm-accent)' : '1px solid var(--warm-border)',
                }}
              >
                #{i + 1}
              </div>
              <UserAvatar name={u.displayName} color={u.avatarColor} size={32} avatarType={u.avatarType as any} avatarPreset={u.avatarPreset} avatarPhotoUrl={u.avatarPhotoUrl} />
              <div
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--warm-text)',
                }}
              >
                {u.displayName}
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--warm-accent)' }}>
                {u.points}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="tq-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: 'var(--warm-text)',
                margin: 0,
              }}
            >
              {t('dashboard.recentActivity')}
            </h3>
            <button
              className="tq-btn tq-btn-secondary"
              onClick={onNavigateToActivity}
              style={{ padding: '6px 12px', fontSize: 11 }}
            >
              {t('dashboard.more')}
            </button>
          </div>
          {recentActivity.slice(0, 5).map((h, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 0',
                borderBottom: i < 4 ? '1px solid var(--warm-border-subtle)' : 'none',
              }}
            >
              <UserAvatar name={h.displayName} color={h.avatarColor} size={28} avatarType={h.avatarType as any} avatarPreset={h.avatarPreset} avatarPhotoUrl={h.avatarPhotoUrl} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warm-text)' }}>
                  {taskName(h.taskName, h.translationKey)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                  {t('history.by')} {h.displayName}
                </div>
                <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                  {roomDisplayName(h.roomName, roomTypeById.get(h.roomId) || '')} &middot; {timeAgo(h.completedAt)}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--warm-coin)',
                }}
              >
                +{h.coinsEarned} <CoinIcon />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    {adminModalQuest && (
      <AdminCompleteModal
        task={adminModalQuest}
        allUsers={(users || []) as any[]}
        language={language}
        onConfirm={async (userIds) => {
          for (const uid of userIds) {
            await api.completeTask(adminModalQuest.id, uid);
          }
          setAdminModalQuest(null);
          onRefresh?.();
        }}
        onClose={() => setAdminModalQuest(null)}
      />
    )}
  </>
  );
};

export default Dashboard;
