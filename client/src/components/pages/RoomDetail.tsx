import { useState } from 'react';
import { HealthBar } from '../shared/HealthBar';
import { RingGauge } from '../shared/RingGauge';
import { EffortDots } from '../shared/EffortDots';
import { getRoomIcon } from '../icons/RoomIcons';
import { TaskIcon, TASK_ICON_OPTIONS } from '../icons/TaskIcons';
import { CheckIcon, BackIcon, PlusIcon, CoinIcon } from '../icons/UIIcons';
import { getRoomHealth } from '../../utils/health';
import { api } from '../../hooks/useApi';
import { useTranslation } from '../../hooks/useTranslation';
import { AdminCompleteModal } from '../shared/AdminCompleteModal';

const FREQ_UNITS = [
  { label: 'hours', toDays: 1 / 24 },
  { label: 'days', toDays: 1 },
  { label: 'weeks', toDays: 7 },
  { label: 'months', toDays: 30 },
  { label: 'years', toDays: 365 },
];

function daysToFreq(days: number): { value: number; unit: string } {
  if (days >= 365 && days % 365 === 0) return { value: days / 365, unit: 'years' };
  if (days >= 30 && days % 30 === 0) return { value: days / 30, unit: 'months' };
  if (days >= 7 && days % 7 === 0) return { value: days / 7, unit: 'weeks' };
  if (days >= 1) return { value: days, unit: 'days' };
  return { value: Math.round(days * 24), unit: 'hours' };
}

function freqToDays(value: number, unit: string): number {
  const u = FREQ_UNITS.find(f => f.label === unit);
  return value * (u?.toDays || 1);
}

function formatFreq(days: number, t: (key: string) => string): string {
  const { value, unit } = daysToFreq(days);
  const short = t(`unitsShort.${unit}`);
  return `${value}${short}`;
}

function healthColor(value: number): string {
  if (value >= 70) return '#22C55E';
  if (value >= 40) return '#F59E0B';
  return '#EF4444';
}

function getNextDueDate(lastCompletedAt: string | null, frequencyDays: number): Date {
  if (!lastCompletedAt) return new Date();
  const last = new Date(lastCompletedAt);
  return new Date(last.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
}

function formatNextDue(lastCompletedAt: string | null, frequencyDays: number, t: (k: string) => string, language?: string): { text: string; color: string } {
  const nextDue = getNextDueDate(lastCompletedAt, frequencyDays);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate());
  const diffDays = Math.round((dueStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return { text: t('roomDetail.overdue'), color: '#EF4444' };
  if (diffDays === 0) return { text: t('roomDetail.today'), color: '#F59E0B' };
  if (diffDays === 1) return { text: t('roomDetail.tomorrow'), color: '#F59E0B' };
  const localeMap: Record<string, string> = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT' };
  const locale = localeMap[language || 'en'] || 'en-US';
  const text = nextDue.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return { text, color: diffDays <= 7 ? '#F59E0B' : '#22C55E' };
}

type SortKey = 'name' | 'health' | 'effort' | 'frequency' | 'coins' | 'assigned' | 'dueDate';

interface CompletedTodayBy {
  completionId: number;
  userId: number;
  displayName: string;
  avatarColor: string;
  avatarType?: string;
  avatarPreset?: string;
  avatarPhotoUrl?: string;
}

interface Task {
  id: number; name: string; translationKey?: string; health: number; frequencyDays: number;
  effort: number; notes?: string | null; isSeasonal: boolean; lastCompletedAt: string | null; iconKey?: string;
  assignedToChildren?: boolean;
  assignedUserIds?: number[];
  assignedUsers?: Array<{ id: number; displayName: string; avatarColor: string; avatarType?: string; avatarPreset?: string; avatarPhotoUrl?: string; coinPercentage?: number }>;
  effectiveAssignedUserIds?: number[];
  completedTodayBy?: CompletedTodayBy | null;
  assignmentMode?: 'first' | 'shared' | 'custom';
  sharedCompletions?: Array<{ userId: number; displayName: string; completionId: number }>;
}

interface RoomDetailProps {
  room: {
    id: number; name: string; roomType: string; color: string; accentColor: string;
    assignedUserId?: number | null;
    tasks: Task[];
  };
  language?: string;
  isAdmin: boolean;
  currentUserId?: number;
  currentUserRole?: 'admin' | 'member' | 'child';
  users?: Array<{ id: number; displayName: string; role: string; avatarColor: string; avatarType?: string; avatarPreset?: string; avatarPhotoUrl?: string }>;
  coinsByEffort?: Record<number, number>;
  onCompleteTask: (taskId: number) => void;
  onBack: () => void;
  onRefresh?: () => void;
}

function FrequencyPicker({ value, unit, onChange, t }: {
  value: number; unit: string;
  onChange: (v: number, u: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <input type="number" min={1} max={999} value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1), unit)}
        style={{
          width: 52, padding: '6px 8px', borderRadius: 8, border: '1.5px solid var(--warm-border)',
          fontSize: 12, fontFamily: 'Nunito', fontWeight: 700, color: 'var(--warm-text)',
          outline: 'none', backgroundColor: 'var(--warm-bg-input)', textAlign: 'center',
        }} />
      <select value={unit} onChange={(e) => onChange(value, e.target.value)}
        style={{
          padding: '6px 8px', borderRadius: 8, border: '1.5px solid var(--warm-border)',
          fontSize: 12, fontFamily: 'Nunito', fontWeight: 600, color: 'var(--warm-text)',
          backgroundColor: 'var(--warm-bg-input)', outline: 'none', cursor: 'pointer',
        }}>
        {FREQ_UNITS.map((f) => (
          <option key={f.label} value={f.label}>{t(`units.${f.label}`)}</option>
        ))}
      </select>
    </div>
  );
}

function EffortPicker({ effort, onChange }: { effort: number; onChange: (e: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((e) => (
        <button key={e} onClick={() => onChange(e)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 1,
            opacity: e <= effort ? 1 : 0.3,
          }}>
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L8.5 5H12.5L9.5 7.5L10.5 11.5L7 9L3.5 11.5L4.5 7.5L1.5 5H5.5L7 1Z"
              fill={e <= effort ? '#F59E0B' : 'none'}
              stroke={e <= effort ? '#F59E0B' : '#E2D5C5'}
              strokeWidth={e <= effort ? '0.5' : '1'} />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function RoomDetail({ room, language, isAdmin, currentUserId, currentUserRole, users, coinsByEffort, onCompleteTask, onBack, onRefresh }: RoomDetailProps) {
  const { taskName: translateTask, roomDisplayName, timeAgo, t } = useTranslation(language);
  const [animatedTask, setAnimatedTask] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', notes: '', freqValue: 7, freqUnit: 'days', effort: 1, health: 100, iconKey: 'sparkle', assignmentType: 'none' as 'none' | 'users', assignmentUserIds: [] as number[], assignmentMode: 'first' as 'first' | 'shared' | 'custom', assignmentPercentages: {} as Record<number, number> });
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newFreqValue, setNewFreqValue] = useState(7);
  const [newFreqUnit, setNewFreqUnit] = useState('days');
  const [newTaskEffort, setNewTaskEffort] = useState(2);
  const [newTaskHealth, setNewTaskHealth] = useState(100);
  const [newTaskIconKey, setNewTaskIconKey] = useState('sparkle');
  const [newAssignmentType, setNewAssignmentType] = useState<'none' | 'users'>('none');
  const [newAssignmentUserIds, setNewAssignmentUserIds] = useState<number[]>([]);
  const [newAssignmentMode, setNewAssignmentMode] = useState<'first' | 'shared' | 'custom'>('first');
  const [newAssignmentPercentages, setNewAssignmentPercentages] = useState<Record<number, number>>({});
  const [sortKey, setSortKey] = useState<SortKey>('health');
  const [sortAsc, setSortAsc] = useState(true);

  const [adminModalTask, setAdminModalTask] = useState<Task | null>(null);

  // Initialize percentages evenly for custom mode
  const initPercentages = (userIds: number[]): Record<number, number> => {
    if (userIds.length === 0) return {};
    const base = Math.floor(100 / userIds.length);
    const remainder = 100 - base * userIds.length;
    const result: Record<number, number> = {};
    userIds.forEach((id, i) => { result[id] = base + (i === 0 ? remainder : 0); });
    return result;
  };

  const health = getRoomHealth(room.tasks);
  const RoomIcon = getRoomIcon(room.roomType);

  const sortedTasks = [...room.tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'health': cmp = a.health - b.health; break;
      case 'effort': cmp = a.effort - b.effort; break;
      case 'frequency': cmp = a.frequencyDays - b.frequencyDays; break;
      case 'coins': cmp = (coinsByEffort?.[a.effort] ?? a.effort * 5) - (coinsByEffort?.[b.effort] ?? b.effort * 5); break;
      case 'assigned': cmp = (a.assignedUsers?.length ?? 0) - (b.assignedUsers?.length ?? 0); break;
      case 'dueDate': cmp = getNextDueDate(a.lastCompletedAt, a.frequencyDays).getTime() - getNextDueDate(b.lastCompletedAt, b.frequencyDays).getTime(); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortAsc(!sortAsc); }
    else { setSortKey(key); setSortAsc(true); }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortAsc ? ' \u25B2' : ' \u25BC';
  };

  const handleComplete = (task: Task) => {
    const isAdminOrMember = currentUserRole === 'admin' || currentUserRole === 'member';
    const hasAssignees = (task.effectiveAssignedUserIds && task.effectiveAssignedUserIds.length > 0) || task.assignedToChildren;
    if (isAdminOrMember && hasAssignees) {
      setAdminModalTask(task);
    } else {
      setAnimatedTask(task.id);
      onCompleteTask(task.id);
      setTimeout(() => setAnimatedTask(null), 2200);
    }
  };

  const handleAdminModalConfirm = async (userIds: number[]) => {
    if (!adminModalTask) return;
    for (const uid of userIds) {
      await api.completeTask(adminModalTask.id, uid);
    }
    setAdminModalTask(null);
    setAnimatedTask(adminModalTask.id);
    onRefresh?.();
    setTimeout(() => setAnimatedTask(null), 2200);
  };

  const startEdit = (task: Task) => {
    const { value, unit } = daysToFreq(task.frequencyDays);
    const assignmentType: 'none' | 'users' =
      (task.assignedUserIds && task.assignedUserIds.length > 0) ? 'users' : 'none';
    const assignmentUserIds = task.assignedUserIds || [];
    const assignmentPercentages: Record<number, number> = {};
    for (const u of task.assignedUsers || []) {
      assignmentPercentages[u.id] = u.coinPercentage ?? 0;
    }
    setEditingTask(task.id);
    setEditForm({ name: task.name, notes: task.notes || '', freqValue: value, freqUnit: unit, effort: task.effort, health: task.health, iconKey: task.iconKey || 'sparkle', assignmentType, assignmentUserIds, assignmentMode: task.assignmentMode || 'first', assignmentPercentages });
  };

  const saveEdit = async () => {
    if (!editingTask) return;
    const frequencyDays = freqToDays(editForm.freqValue, editForm.freqUnit);
    const assignmentPayload =
      editForm.assignmentType === 'users' ? { assignedToChildren: false, assignedUserIds: editForm.assignmentUserIds } :
      { assignedToChildren: false, assignedUserIds: [] };
    const assignedUserPercentages = editForm.assignmentMode === 'custom' ? editForm.assignmentPercentages : undefined;
    await api.updateTask(editingTask, { name: editForm.name, notes: editForm.notes, frequencyDays, effort: editForm.effort, health: editForm.health, iconKey: editForm.iconKey, assignmentMode: editForm.assignmentMode, assignedUserPercentages, ...assignmentPayload });
    setEditingTask(null);
    onRefresh?.();
  };

  // Determine if Done button should be disabled for a task
  function getDoneButtonState(task: Task): { disabled: boolean; label: string } {
    if (currentUserRole !== 'admin' && currentUserRole !== 'member') {
      const effectiveIds = task.effectiveAssignedUserIds;
      if (effectiveIds && effectiveIds.length > 0 && currentUserId !== undefined) {
        if (!effectiveIds.includes(currentUserId)) {
          return { disabled: true, label: t('app.notAssigned') };
        }
      }
    }

    if (task.assignmentMode === 'shared' || task.assignmentMode === 'custom') {
      // In shared/custom mode: disabled only if current user has already completed their part
      const myCompletion = task.sharedCompletions?.find(c => c.userId === currentUserId);
      if (myCompletion) {
        return { disabled: true, label: t('app.doneBy').replace('{name}', t('common.you') || 'You') };
      }
      // Also disabled if all users have completed (task fully done)
      if (task.sharedCompletions && task.assignedUsers && task.sharedCompletions.length >= task.assignedUsers.length) {
        return { disabled: true, label: t('roomDetail.done') };
      }
      return { disabled: false, label: t('roomDetail.done') };
    }

    // First mode (default): if anyone completed today, blocked
    if (task.completedTodayBy) {
      return { disabled: true, label: t('app.doneBy').replace('{name}', task.completedTodayBy.displayName) };
    }
    return { disabled: false, label: t('roomDetail.done') };
  }

  const deleteTask = async (taskId: number) => {
    await api.deleteTask(taskId);
    setEditingTask(null);
    onRefresh?.();
  };

  const addTask = async () => {
    if (!newTaskName.trim()) return;
    const frequencyDays = freqToDays(newFreqValue, newFreqUnit);
    const assignmentPayload =
      newAssignmentType === 'users' ? { assignedToChildren: false, assignedUserIds: newAssignmentUserIds } :
      { assignedToChildren: false, assignedUserIds: [] };
    const assignedUserPercentages = newAssignmentMode === 'custom' ? newAssignmentPercentages : undefined;
    await api.createTask(room.id, {
      name: newTaskName.trim(),
      notes: newTaskNotes.trim() || undefined,
      frequencyDays,
      effort: newTaskEffort,
      health: newTaskHealth,
      iconKey: newTaskIconKey,
      assignmentMode: newAssignmentMode,
      assignedUserPercentages,
      ...assignmentPayload,
    });
    setNewTaskName('');
    setNewTaskNotes('');
    setNewFreqValue(7);
    setNewFreqUnit('days');
    setNewTaskEffort(2);
    setNewTaskHealth(100);
    setNewTaskIconKey('sparkle');
    setNewAssignmentType('none');
    setNewAssignmentUserIds([]);
    setNewAssignmentMode('first');
    setNewAssignmentPercentages({});
    setShowAddTask(false);
    onRefresh?.();
  };

  const colStyle = (key: SortKey): React.CSSProperties => ({
    cursor: 'pointer', userSelect: 'none',
    color: sortKey === key ? 'var(--warm-accent)' : 'var(--warm-text-light)',
  });

  return (
    <>
    <div className="page-enter">
      {/* Header */}
      <div className="tq-card room-detail-hero" style={{
        padding: 28, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 28,
        background: `linear-gradient(135deg, ${room.color}88, ${room.color}33)`,
        borderColor: `${room.accentColor}44`,
      }}>
        <RingGauge value={health} size={110} strokeWidth={10} />
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 6 }}><RoomIcon /></div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--warm-text)', margin: '0 0 4px' }}>{roomDisplayName(room.name, room.roomType)}</h2>
          <div style={{ fontSize: 13, color: 'var(--warm-text-muted)', fontWeight: 600 }}>{room.tasks.length} {t('rooms.tasksTracked')}</div>
        </div>
        <button onClick={onBack} className="tq-btn tq-btn-secondary"
          style={{ padding: '8px 18px', fontSize: 13 }}>
          <BackIcon /> {t('rooms.backToRooms')}
        </button>
      </div>

      {/* Task Table */}
      <div className="tq-card" style={{ padding: 22 }}>
        <div className="room-table-scroll room-detail-scroll">
        {/* Column Headers (sortable) */}
        <div className="room-table-header" style={{
          display: 'grid', gridTemplateColumns: '1fr 150px 100px 85px 70px 110px 150px 220px',
          gap: 12, padding: '0 8px 14px', borderBottom: '1.5px solid var(--warm-border)',
          fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1,
        }}>
          <div style={colStyle('name')} onClick={() => handleSort('name')}>{t('history.task')}{sortIndicator('name')}</div>
          <div style={colStyle('health')} onClick={() => handleSort('health')}>{t('rooms.health')}{sortIndicator('health')}</div>
          <div style={colStyle('frequency')} onClick={() => handleSort('frequency')}>{t('roomDetail.frequency')}{sortIndicator('frequency')}</div>
          <div style={colStyle('effort')} onClick={() => handleSort('effort')}>{t('roomDetail.effort')}{sortIndicator('effort')}</div>
          <div style={colStyle('coins')} onClick={() => handleSort('coins')}>{t('roomDetail.coins')}{sortIndicator('coins')}</div>
          <div style={colStyle('dueDate')} onClick={() => handleSort('dueDate')}>{t('roomDetail.nextDue')}{sortIndicator('dueDate')}</div>
          <div style={colStyle('assigned')} onClick={() => handleSort('assigned')}>{t('roomDetail.assigned')}{sortIndicator('assigned')}</div>
          <div style={{ textAlign: 'right', color: 'var(--warm-text-light)' }}>{t('roomDetail.actions')}</div>
        </div>

        {sortedTasks.map((task) => (
          <div key={task.id}>
            {editingTask === task.id ? (
              <div style={{
                padding: '16px 8px', borderBottom: '1px solid var(--warm-border-subtle)',
                backgroundColor: 'var(--warm-bg-warm)', borderRadius: 12,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 70 }}>{t('roomDetail.name')}</label>
                    <input value={editForm.name}
                      onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--warm-border)',
                        fontSize: 13, fontFamily: 'Nunito', fontWeight: 700, color: 'var(--warm-text)',
                        outline: 'none', backgroundColor: 'var(--warm-bg-input)',
                      }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 70 }}>{t('roomDetail.notes')}</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder={t('roomDetail.optionalNotes')}
                      rows={2}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--warm-border)',
                        fontSize: 12, fontFamily: 'Nunito', fontWeight: 600, color: 'var(--warm-text)',
                        outline: 'none', backgroundColor: 'var(--warm-bg-input)', resize: 'vertical',
                      }}
                    />
                  </div>
                  <div className="task-edit-form" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-light)' }}>{t('roomDetail.every')}</label>
                      <FrequencyPicker value={editForm.freqValue} unit={editForm.freqUnit}
                        t={t}
                        onChange={(v, u) => setEditForm(f => ({ ...f, freqValue: v, freqUnit: u }))} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-light)' }}>{t('roomDetail.effort')}</label>
                      <EffortPicker effort={editForm.effort} onChange={(e) => setEditForm(f => ({ ...f, effort: e }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 58 }}>{t('rooms.health')}</label>
                    <div style={{ width: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={10}
                          value={editForm.health}
                          onChange={(e) => setEditForm((f) => ({ ...f, health: parseInt(e.target.value, 10) }))}
                          style={{ flex: 1, accentColor: healthColor(editForm.health) }}
                        />
                        <span style={{ fontSize: 11, fontWeight: 800, color: healthColor(editForm.health), minWidth: 32, textAlign: 'right' }}>
                          {editForm.health}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--warm-text-light)', fontWeight: 600, marginTop: 2 }}>
                        <span>{t('rooms.dirty')}</span><span>{t('rooms.clean')}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 58 }}>{t('roomDetail.icon')}</label>
                    <select
                      value={editForm.iconKey}
                      onChange={(e) => setEditForm((f) => ({ ...f, iconKey: e.target.value }))}
                      style={{ padding: '5px 8px', borderRadius: 8, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito', fontSize: 11 }}
                    >
                      {TASK_ICON_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>{t(`taskIcons.${opt.key}`)}</option>
                      ))}
                    </select>
                  </div>
                  {/* Task assignment — only show if room has no room-level assignment */}
                  {!room.assignedUserId && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 58 }}>{t('rooms.assignRoom')}</label>
                        <select
                          value={editForm.assignmentType}
                          onChange={(e) => setEditForm(f => ({ ...f, assignmentType: e.target.value as 'none' | 'users', assignmentUserIds: [], assignmentMode: 'first' }))}
                          style={{
                            padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--warm-border)',
                            fontSize: 12, fontFamily: 'Nunito', fontWeight: 600, color: 'var(--warm-text)',
                            backgroundColor: 'var(--warm-bg-input)', outline: 'none', cursor: 'pointer',
                          }}
                        >
                          <option value="none">{t('rooms.noAssignment')}</option>
                          <option value="users">{t('rooms.specificUsers')}</option>
                        </select>
                      </div>
                      {editForm.assignmentType === 'users' && (
                        <>
                          <div style={{ marginLeft: 70, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {(users || []).map(u => {
                              const checked = editForm.assignmentUserIds.includes(u.id);
                              return (
                                <label key={u.id} style={{
                                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                                  padding: '5px 10px', borderRadius: 20,
                                  border: `1.5px solid ${checked ? 'var(--warm-accent)' : 'var(--warm-border)'}`,
                                  backgroundColor: checked ? 'var(--warm-accent-light)' : 'var(--warm-bg-input)',
                                  fontSize: 12, fontWeight: 700, color: checked ? 'var(--warm-accent)' : 'var(--warm-text)',
                                  fontFamily: 'Nunito', transition: 'all 0.15s ease',
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => setEditForm(f => {
                                      const newIds = checked
                                        ? f.assignmentUserIds.filter(id => id !== u.id)
                                        : [...f.assignmentUserIds, u.id];
                                      return {
                                        ...f,
                                        assignmentUserIds: newIds,
                                        assignmentPercentages: f.assignmentMode === 'custom' ? initPercentages(newIds) : f.assignmentPercentages,
                                      };
                                    })}
                                    style={{ display: 'none' }}
                                  />
                                  {checked && <span style={{ fontSize: 10 }}>✓</span>}
                                  {u.displayName}
                                </label>
                              );
                            })}
                          </div>
                          {editForm.assignmentUserIds.length >= 2 && (
                            <>
                              <div style={{ marginLeft: 70, display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 58 }}>Mode</label>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {(['first', 'shared', 'custom'] as const).map(mode => (
                                    <button
                                      key={mode}
                                      onClick={() => {
                                        const newPercentages = mode === 'custom' ? initPercentages(editForm.assignmentUserIds) : editForm.assignmentPercentages;
                                        setEditForm(f => ({ ...f, assignmentMode: mode, assignmentPercentages: newPercentages }));
                                      }}
                                      style={{
                                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                        border: `1.5px solid ${editForm.assignmentMode === mode ? 'var(--warm-accent)' : 'var(--warm-border)'}`,
                                        backgroundColor: editForm.assignmentMode === mode ? 'var(--warm-accent-light)' : 'transparent',
                                        color: editForm.assignmentMode === mode ? 'var(--warm-accent)' : 'var(--warm-text-light)',
                                        cursor: 'pointer', fontFamily: 'Nunito',
                                      }}
                                    >
                                      {mode === 'first' ? t('rooms.modeFirst') : mode === 'shared' ? t('rooms.modeShared') : t('rooms.modeCustom')}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {editForm.assignmentMode === 'custom' && (() => {
                                const total = editForm.assignmentUserIds.reduce((s, id) => s + (editForm.assignmentPercentages[id] ?? 0), 0);
                                const totalOk = total === 100;
                                return (
                                  <div style={{ marginLeft: 70, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                    {editForm.assignmentUserIds.map(uid => {
                                      const u = (users || []).find(x => x.id === uid);
                                      if (!u) return null;
                                      return (
                                        <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warm-text)', minWidth: 80 }}>{u.displayName}</span>
                                          <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={editForm.assignmentPercentages[uid] ?? 0}
                                            onChange={(e) => setEditForm(f => ({ ...f, assignmentPercentages: { ...f.assignmentPercentages, [uid]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) } }))}
                                            style={{ width: 52, padding: '4px 8px', borderRadius: 8, border: '1.5px solid var(--warm-border)', fontSize: 12, fontFamily: 'Nunito', fontWeight: 700, textAlign: 'center', backgroundColor: 'var(--warm-bg-input)', color: 'var(--warm-text)' }}
                                          />
                                          <span style={{ fontSize: 12, color: 'var(--warm-text-light)' }}>%</span>
                                        </div>
                                      );
                                    })}
                                    <div style={{ fontSize: 11, fontWeight: 700, color: totalOk ? '#22C55E' : '#EF4444' }}>
                                      {t('rooms.totalPercentage').replace('{total}', String(total))} {totalOk ? '✓' : '✗'}
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {(() => {
                    const editCustomTotal = editForm.assignmentMode === 'custom'
                      ? editForm.assignmentUserIds.reduce((s, id) => s + (editForm.assignmentPercentages[id] ?? 0), 0)
                      : 100;
                    const editSaveDisabled = editForm.assignmentMode === 'custom' && editCustomTotal !== 100;
                    return (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                        <button onClick={() => deleteTask(task.id)}
                          style={{
                            background: 'none', border: '1.5px solid var(--warm-danger-border)', borderRadius: 10,
                            padding: '6px 14px', fontSize: 11, fontWeight: 700, color: 'var(--warm-danger)',
                            cursor: 'pointer', fontFamily: 'Nunito',
                          }}>{t('roomDetail.deleteTask')}</button>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setEditingTask(null)} className="tq-btn tq-btn-secondary"
                            style={{ padding: '6px 16px', fontSize: 12 }}>{t('common.cancel')}</button>
                          <button onClick={saveEdit} disabled={editSaveDisabled} className="tq-btn tq-btn-primary"
                            style={{ padding: '6px 16px', fontSize: 12, opacity: editSaveDisabled ? 0.5 : 1 }}>{t('common.save')}</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="room-task-row" style={{
                display: 'grid', gridTemplateColumns: '1fr 150px 100px 85px 70px 110px 150px 220px',
                gap: 12, padding: '16px 8px', alignItems: 'center',
                borderBottom: '1px solid var(--warm-border-subtle)',
                backgroundColor: animatedTask === task.id ? 'var(--health-green-bg)' : 'transparent',
                transition: 'all 0.3s ease', borderRadius: 12,
              }}>
                <div className="room-task-main" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 34, height: 34, borderRadius: 11,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--warm-bg-subtle)', border: '1px solid var(--warm-border)',
                    flexShrink: 0,
                    marginLeft: -8,
                    alignSelf: 'center',
                  }}>
                    <TaskIcon iconKey={task.iconKey} size={24} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-text)' }}>
                      {translateTask(task.name, task.translationKey)}
                    </div>
                    {task.notes && (
                      <div style={{ fontSize: 11, color: 'var(--warm-text-muted)', fontWeight: 600, marginTop: 2 }}>
                        {task.notes}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                      {timeAgo(task.lastCompletedAt)}{task.isSeasonal ? ` · ${t('roomDetail.seasonal')}` : ''}
                    </div>
                  </div>
                </div>
                <div className="room-task-health"><HealthBar value={animatedTask === task.id ? 100 : task.health} height={8} animate={animatedTask === task.id} /></div>
                <div className="room-task-frequency" style={{ fontSize: 13, color: 'var(--warm-text-secondary)', fontWeight: 600 }}>{t('roomDetail.every')} {formatFreq(task.frequencyDays, t)}</div>
                <div className="room-task-effort"><EffortDots effort={task.effort} /></div>
                <div className="room-task-coins" style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-accent)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <CoinIcon />{coinsByEffort?.[task.effort] ?? task.effort * 5}
                </div>
                {(() => { const { text, color } = formatNextDue(task.lastCompletedAt, task.frequencyDays, t, language); return (
                  <div className="room-task-due" style={{ fontSize: 12, fontWeight: 700, color }}>{text}</div>
                ); })()}
                <div className="room-task-assigned" style={{ fontSize: 12, color: 'var(--warm-text-secondary)', fontWeight: 600 }}>
                  {task.assignedUsers && task.assignedUsers.length > 0
                    ? <span>
                        {task.assignmentMode === 'custom'
                          ? task.assignedUsers.map(u => `${u.displayName} (${u.coinPercentage ?? 0}%)`).join(' + ')
                          : task.assignedUsers.map(u => u.displayName).join(' + ')
                        }
                        {(task.assignmentMode === 'shared' || task.assignmentMode === 'custom') && task.assignedUsers && task.assignedUsers.length >= 2 && (
                          <div style={{ fontSize: 10, color: 'var(--warm-text-light)', fontWeight: 600, marginTop: 2 }}>
                            {task.assignmentMode === 'shared' ? t('rooms.modeShared') : t('rooms.modeCustom')} · {task.sharedCompletions?.length || 0}/{task.assignedUsers.length} {t('rooms.done')}
                          </div>
                        )}
                      </span>
                    : room.assignedUserId
                      ? (() => {
                          const roomOwner = (users || []).find(u => u.id === room.assignedUserId);
                          return roomOwner
                            ? <span style={{ color: 'var(--warm-text-light)', fontStyle: 'italic' }}>{roomOwner.displayName}</span>
                            : <span style={{ color: 'var(--warm-text-light)', opacity: 0.5 }}>—</span>;
                        })()
                      : <span style={{ color: 'var(--warm-text-light)', opacity: 0.5 }}>—</span>
                  }
                </div>
                <div className="room-task-actions" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  {isAdmin && (
                    <>
                      <button onClick={() => startEdit(task)}
                        style={{
                          background: 'none', border: '1.5px solid var(--warm-border)', borderRadius: 10,
                          padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--warm-text-muted)',
                          cursor: 'pointer', fontFamily: 'Nunito',
                        }}>{t('common.edit')}</button>
                      <button onClick={() => deleteTask(task.id)}
                        style={{
                          background: 'none', border: '1.5px solid var(--warm-danger-border)', borderRadius: 10,
                          padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--warm-danger)',
                          cursor: 'pointer', fontFamily: 'Nunito',
                        }}>&times;</button>
                    </>
                  )}
                  {isAdmin && task.completedTodayBy?.completionId && (
                    <button
                      onClick={async () => {
                        await api.cancelCompletion(task.completedTodayBy!.completionId);
                        onRefresh?.();
                      }}
                      title={t('roomDetail.reset')}
                      style={{
                        background: 'none', border: '1.5px solid var(--warm-border)', borderRadius: 10,
                        padding: '6px 8px', fontSize: 13, cursor: 'pointer', fontFamily: 'Nunito',
                      }}
                    >🔄</button>
                  )}
                  {(() => {
                    const btn = getDoneButtonState(task);
                    return (
                      <button
                        onClick={() => !btn.disabled && handleComplete(task)}
                        disabled={btn.disabled}
                        className={btn.disabled ? 'tq-btn' : 'tq-btn tq-btn-primary'}
                        style={{
                          padding: '6px 14px', fontSize: 12,
                          ...(btn.disabled ? {
                            opacity: 0.55, cursor: 'default',
                            backgroundColor: 'var(--warm-bg-subtle)',
                            border: '1.5px solid var(--warm-border)',
                            color: 'var(--warm-text-muted)',
                          } : {}),
                        }}
                      >
                        {btn.disabled ? btn.label : <><CheckIcon /> {btn.label}</>}
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        ))}
        </div>{/* end room-table-scroll */}

        {/* Add Task */}
        {isAdmin && showAddTask ? (
          <div style={{
            padding: '16px 8px', borderTop: '1px solid var(--warm-border-subtle)',
            backgroundColor: 'var(--warm-bg-warm)', borderRadius: 12, marginTop: 4,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 70 }}>{t('roomDetail.name')}</label>
                <input value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder={t('roomDetail.taskName')}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--warm-border)',
                    fontSize: 13, fontFamily: 'Nunito', fontWeight: 700, color: 'var(--warm-text)',
                    outline: 'none', backgroundColor: 'var(--warm-bg-input)',
                  }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 70 }}>{t('roomDetail.notes')}</label>
                <textarea value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder={t('roomDetail.optionalNotes')}
                  rows={2}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--warm-border)',
                    fontSize: 12, fontFamily: 'Nunito', fontWeight: 600, color: 'var(--warm-text)',
                    outline: 'none', backgroundColor: 'var(--warm-bg-input)', resize: 'vertical',
                  }} />
              </div>
              <div className="task-add-form" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-light)' }}>{t('roomDetail.every')}</label>
                  <FrequencyPicker value={newFreqValue} unit={newFreqUnit}
                    t={t}
                    onChange={(v, u) => { setNewFreqValue(v); setNewFreqUnit(u); }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-text-light)' }}>{t('roomDetail.effort')}</label>
                  <EffortPicker effort={newTaskEffort} onChange={setNewTaskEffort} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 58 }}>{t('rooms.health')}</label>
                <div style={{ width: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={10}
                      value={newTaskHealth}
                      onChange={(e) => setNewTaskHealth(parseInt(e.target.value, 10))}
                      style={{ flex: 1, accentColor: healthColor(newTaskHealth) }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 800, color: healthColor(newTaskHealth), minWidth: 32, textAlign: 'right' }}>
                      {newTaskHealth}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--warm-text-light)', fontWeight: 600, marginTop: 2 }}>
                    <span>{t('rooms.dirty')}</span><span>{t('rooms.clean')}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 58 }}>{t('roomDetail.icon')}</label>
                <select
                  value={newTaskIconKey}
                  onChange={(e) => setNewTaskIconKey(e.target.value)}
                  style={{ padding: '5px 8px', borderRadius: 8, border: '1.5px solid var(--warm-border)', fontFamily: 'Nunito', fontSize: 11 }}
                >
                  {TASK_ICON_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>{t(`taskIcons.${opt.key}`)}</option>
                  ))}
                </select>
              </div>
              {!room.assignedUserId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 58 }}>{t('rooms.assignRoom')}</label>
                    <select
                      value={newAssignmentType}
                      onChange={(e) => { setNewAssignmentType(e.target.value as 'none' | 'users'); setNewAssignmentUserIds([]); setNewAssignmentMode('first'); }}
                      style={{
                        padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--warm-border)',
                        fontSize: 12, fontFamily: 'Nunito', fontWeight: 600, color: 'var(--warm-text)',
                        backgroundColor: 'var(--warm-bg-input)', outline: 'none', cursor: 'pointer',
                      }}
                    >
                      <option value="none">{t('rooms.noAssignment')}</option>
                      <option value="users">{t('rooms.specificUsers')}</option>
                    </select>
                  </div>
                  {newAssignmentType === 'users' && (
                    <>
                      <div style={{ marginLeft: 70, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(users || []).map(u => {
                          const checked = newAssignmentUserIds.includes(u.id);
                          return (
                            <label key={u.id} style={{
                              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                              padding: '5px 10px', borderRadius: 20,
                              border: `1.5px solid ${checked ? 'var(--warm-accent)' : 'var(--warm-border)'}`,
                              backgroundColor: checked ? 'var(--warm-accent-light)' : 'var(--warm-bg-input)',
                              fontSize: 12, fontWeight: 700, color: checked ? 'var(--warm-accent)' : 'var(--warm-text)',
                              fontFamily: 'Nunito', transition: 'all 0.15s ease',
                            }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const newIds = checked
                                    ? newAssignmentUserIds.filter(id => id !== u.id)
                                    : [...newAssignmentUserIds, u.id];
                                  setNewAssignmentUserIds(newIds);
                                  if (newAssignmentMode === 'custom') setNewAssignmentPercentages(initPercentages(newIds));
                                }}
                                style={{ display: 'none' }}
                              />
                              {checked && <span style={{ fontSize: 10 }}>✓</span>}
                              {u.displayName}
                            </label>
                          );
                        })}
                      </div>
                      {newAssignmentUserIds.length >= 2 && (
                        <>
                          <div style={{ marginLeft: 70, display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', minWidth: 58 }}>Mode</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {(['first', 'shared', 'custom'] as const).map(mode => (
                                <button
                                  key={mode}
                                  onClick={() => {
                                    setNewAssignmentMode(mode);
                                    if (mode === 'custom') setNewAssignmentPercentages(initPercentages(newAssignmentUserIds));
                                  }}
                                  style={{
                                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                    border: `1.5px solid ${newAssignmentMode === mode ? 'var(--warm-accent)' : 'var(--warm-border)'}`,
                                    backgroundColor: newAssignmentMode === mode ? 'var(--warm-accent-light)' : 'transparent',
                                    color: newAssignmentMode === mode ? 'var(--warm-accent)' : 'var(--warm-text-light)',
                                    cursor: 'pointer', fontFamily: 'Nunito',
                                  }}
                                >
                                  {mode === 'first' ? t('rooms.modeFirst') : mode === 'shared' ? t('rooms.modeShared') : t('rooms.modeCustom')}
                                </button>
                              ))}
                            </div>
                          </div>
                          {newAssignmentMode === 'custom' && (() => {
                            const total = newAssignmentUserIds.reduce((s, id) => s + (newAssignmentPercentages[id] ?? 0), 0);
                            const totalOk = total === 100;
                            return (
                              <div style={{ marginLeft: 70, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                {newAssignmentUserIds.map(uid => {
                                  const u = (users || []).find(x => x.id === uid);
                                  if (!u) return null;
                                  return (
                                    <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warm-text)', minWidth: 80 }}>{u.displayName}</span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={newAssignmentPercentages[uid] ?? 0}
                                        onChange={(e) => setNewAssignmentPercentages(p => ({ ...p, [uid]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) }))}
                                        style={{ width: 52, padding: '4px 8px', borderRadius: 8, border: '1.5px solid var(--warm-border)', fontSize: 12, fontFamily: 'Nunito', fontWeight: 700, textAlign: 'center', backgroundColor: 'var(--warm-bg-input)', color: 'var(--warm-text)' }}
                                      />
                                      <span style={{ fontSize: 12, color: 'var(--warm-text-light)' }}>%</span>
                                    </div>
                                  );
                                })}
                                <div style={{ fontSize: 11, fontWeight: 700, color: totalOk ? '#22C55E' : '#EF4444' }}>
                                  {t('rooms.totalPercentage').replace('{total}', String(total))} {totalOk ? '✓' : '✗'}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              {(() => {
                const addCustomTotal = newAssignmentMode === 'custom'
                  ? newAssignmentUserIds.reduce((s, id) => s + (newAssignmentPercentages[id] ?? 0), 0)
                  : 100;
                const addSaveDisabled = newAssignmentMode === 'custom' && addCustomTotal !== 100;
                return (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setShowAddTask(false); setNewTaskName(''); setNewTaskNotes(''); setNewTaskHealth(100); setNewTaskIconKey('sparkle'); setNewAssignmentType('none'); setNewAssignmentUserIds([]); setNewAssignmentMode('first'); setNewAssignmentPercentages({}); }}
                      className="tq-btn tq-btn-secondary" style={{ padding: '6px 16px', fontSize: 12 }}>{t('common.cancel')}</button>
                    <button onClick={addTask} disabled={addSaveDisabled} className="tq-btn tq-btn-primary"
                      style={{ padding: '6px 16px', fontSize: 12, opacity: addSaveDisabled ? 0.5 : 1 }}>{t('roomDetail.addTask')}</button>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : isAdmin ? (
          <div style={{ padding: '14px 8px' }}>
            <button onClick={() => setShowAddTask(true)}
              style={{
                background: 'none', border: '1.5px dashed var(--warm-border)', borderRadius: 12,
                padding: '10px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, fontWeight: 700, color: 'var(--warm-text-light)', fontFamily: 'Nunito', width: '100%',
                justifyContent: 'center',
              }}>
              <PlusIcon /> {t('roomDetail.addTask')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
    {adminModalTask && (
      <AdminCompleteModal
        task={adminModalTask}
        allUsers={(users || []) as any[]}
        language={language}
        onConfirm={handleAdminModalConfirm}
        onClose={() => setAdminModalTask(null)}
      />
    )}
    </>
  );
}
