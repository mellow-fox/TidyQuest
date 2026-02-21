import { useState } from 'react';
import { HealthBar } from '../shared/HealthBar';
import { RingGauge } from '../shared/RingGauge';
import { EffortDots } from '../shared/EffortDots';
import { getRoomIcon } from '../icons/RoomIcons';
import { TaskIcon, TASK_ICON_OPTIONS } from '../icons/TaskIcons';
import { CheckIcon, BackIcon, PlusIcon } from '../icons/UIIcons';
import { getRoomHealth } from '../../utils/health';
import { api } from '../../hooks/useApi';
import { useTranslation } from '../../hooks/useTranslation';

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

type SortKey = 'name' | 'health' | 'effort' | 'frequency';

interface Task {
  id: number; name: string; translationKey?: string; health: number; frequencyDays: number;
  effort: number; notes?: string | null; isSeasonal: boolean; lastCompletedAt: string | null; iconKey?: string;
}

interface RoomDetailProps {
  room: {
    id: number; name: string; roomType: string; color: string; accentColor: string;
    tasks: Task[];
  };
  language?: string;
  isAdmin: boolean;
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

export function RoomDetail({ room, language, isAdmin, onCompleteTask, onBack, onRefresh }: RoomDetailProps) {
  const { taskName: translateTask, roomDisplayName, timeAgo, t } = useTranslation(language);
  const [animatedTask, setAnimatedTask] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', notes: '', freqValue: 7, freqUnit: 'days', effort: 1, health: 100, iconKey: 'sparkle' });
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newFreqValue, setNewFreqValue] = useState(7);
  const [newFreqUnit, setNewFreqUnit] = useState('days');
  const [newTaskEffort, setNewTaskEffort] = useState(2);
  const [newTaskHealth, setNewTaskHealth] = useState(100);
  const [newTaskIconKey, setNewTaskIconKey] = useState('sparkle');
  const [sortKey, setSortKey] = useState<SortKey>('health');
  const [sortAsc, setSortAsc] = useState(true);

  const health = getRoomHealth(room.tasks);
  const RoomIcon = getRoomIcon(room.roomType);

  const sortedTasks = [...room.tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'health': cmp = a.health - b.health; break;
      case 'effort': cmp = a.effort - b.effort; break;
      case 'frequency': cmp = a.frequencyDays - b.frequencyDays; break;
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

  const handleComplete = (taskId: number) => {
    setAnimatedTask(taskId);
    onCompleteTask(taskId);
    setTimeout(() => setAnimatedTask(null), 2200);
  };

  const startEdit = (task: Task) => {
    const { value, unit } = daysToFreq(task.frequencyDays);
    setEditingTask(task.id);
    setEditForm({ name: task.name, notes: task.notes || '', freqValue: value, freqUnit: unit, effort: task.effort, health: task.health, iconKey: task.iconKey || 'sparkle' });
  };

  const saveEdit = async () => {
    if (!editingTask) return;
    const frequencyDays = freqToDays(editForm.freqValue, editForm.freqUnit);
    await api.updateTask(editingTask, { name: editForm.name, notes: editForm.notes, frequencyDays, effort: editForm.effort, health: editForm.health, iconKey: editForm.iconKey });
    setEditingTask(null);
    onRefresh?.();
  };

  const deleteTask = async (taskId: number) => {
    await api.deleteTask(taskId);
    setEditingTask(null);
    onRefresh?.();
  };

  const addTask = async () => {
    if (!newTaskName.trim()) return;
    const frequencyDays = freqToDays(newFreqValue, newFreqUnit);
    await api.createTask(room.id, {
      name: newTaskName.trim(),
      notes: newTaskNotes.trim() || undefined,
      frequencyDays,
      effort: newTaskEffort,
      health: newTaskHealth,
      iconKey: newTaskIconKey,
    });
    setNewTaskName('');
    setNewTaskNotes('');
    setNewFreqValue(7);
    setNewFreqUnit('days');
    setNewTaskEffort(2);
    setNewTaskHealth(100);
    setNewTaskIconKey('sparkle');
    setShowAddTask(false);
    onRefresh?.();
  };

  const colStyle = (key: SortKey): React.CSSProperties => ({
    cursor: 'pointer', userSelect: 'none',
    color: sortKey === key ? 'var(--warm-accent)' : 'var(--warm-text-light)',
  });

  return (
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
          display: 'grid', gridTemplateColumns: '1fr 150px 100px 90px 160px',
          gap: 12, padding: '0 8px 14px', borderBottom: '1.5px solid var(--warm-border)',
          fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1,
        }}>
          <div style={colStyle('name')} onClick={() => handleSort('name')}>{t('history.task')}{sortIndicator('name')}</div>
          <div style={colStyle('health')} onClick={() => handleSort('health')}>{t('rooms.health')}{sortIndicator('health')}</div>
          <div style={colStyle('frequency')} onClick={() => handleSort('frequency')}>{t('roomDetail.frequency')}{sortIndicator('frequency')}</div>
          <div style={colStyle('effort')} onClick={() => handleSort('effort')}>{t('roomDetail.effort')}{sortIndicator('effort')}</div>
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
                      <button onClick={saveEdit} className="tq-btn tq-btn-primary"
                        style={{ padding: '6px 16px', fontSize: 12 }}>{t('common.save')}</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="room-task-row" style={{
                display: 'grid', gridTemplateColumns: '1fr 150px 100px 90px 160px',
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
                  <button onClick={() => handleComplete(task.id)} className="tq-btn tq-btn-primary"
                    style={{ padding: '6px 14px', fontSize: 12 }}>
                    <CheckIcon /> {t('roomDetail.done')}
                  </button>
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
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowAddTask(false); setNewTaskName(''); setNewTaskNotes(''); setNewTaskHealth(100); setNewTaskIconKey('sparkle'); }}
                  className="tq-btn tq-btn-secondary" style={{ padding: '6px 16px', fontSize: 12 }}>{t('common.cancel')}</button>
                <button onClick={addTask} className="tq-btn tq-btn-primary"
                  style={{ padding: '6px 16px', fontSize: 12 }}>{t('roomDetail.addTask')}</button>
              </div>
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
  );
}
