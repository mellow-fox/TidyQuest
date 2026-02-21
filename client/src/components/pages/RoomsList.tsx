import { useState, useEffect } from 'react';
import HealthBar from '../shared/HealthBar';
import { getRoomIcon } from '../icons/RoomIcons';
import { TaskIcon, TASK_ICON_OPTIONS } from '../icons/TaskIcons';
import { PlusIcon, TrashIcon } from '../icons/UIIcons';
import { getHealthColor, getRoomHealth } from '../../utils/health';
import { ROOM_COLORS } from '../../utils/colors';
import { api } from '../../hooks/useApi';
import { useTranslation } from '../../hooks/useTranslation';

const ROOM_TYPES = [
  { type: 'kitchen' },
  { type: 'bedroom' },
  { type: 'bathroom' },
  { type: 'living' },
  { type: 'office' },
  { type: 'garage' },
  { type: 'laundry' },
  { type: 'other' },
];

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

interface TaskConfig {
  name: string;
  translationKey?: string;
  iconKey?: string;
  freqValue: number;
  freqUnit: string;
  effort: number;
  isSeasonal: boolean;
  selected: boolean;
  initialHealth: number;
}

interface RoomsListProps {
  rooms: Array<{
    id: number;
    name: string;
    roomType: string;
    color: string;
    accentColor: string;
    health: number;
    tasks: Array<{ id: number; name: string; translationKey?: string; iconKey?: string; health: number }>;
  }>;
  language?: string;
  isAdmin: boolean;
  onSelectRoom: (roomId: number) => void;
  onCreateRoom: (data: { name: string; roomType: string; color: string; accentColor: string; tasks: any[] }) => void;
  onDeleteRoom: (roomId: number) => Promise<void>;
}

export function RoomsList({ rooms, language, isAdmin, onSelectRoom, onCreateRoom, onDeleteRoom }: RoomsListProps) {
  const { taskName, t, roomName: translateRoomName, roomDisplayName } = useTranslation(language);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState('kitchen');
  const [roomName, setRoomName] = useState('');
  const [taskConfigs, setTaskConfigs] = useState<TaskConfig[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  const sortedRooms = [...rooms].sort(
    (a, b) => getRoomHealth(a.tasks as any) - getRoomHealth(b.tasks as any)
  );

  useEffect(() => {
    if (step === 2) {
      setLoadingTasks(true);
      api.getDefaultTasks(selectedType).then((defaults) => {
        setTaskConfigs(defaults.map((t) => {
          const { value, unit } = daysToFreq(t.frequencyDays);
          return {
            name: t.name,
            translationKey: (t as any).translationKey,
            iconKey: (t as any).iconKey || 'sparkle',
            freqValue: value,
            freqUnit: unit,
            effort: t.effort,
            isSeasonal: !!t.isSeasonal,
            selected: false,
            initialHealth: 100,
          };
        }));
        setLoadingTasks(false);
      }).catch(() => {
        setTaskConfigs([]);
        setLoadingTasks(false);
      });
    }
  }, [step, selectedType]);

  const handleCreate = () => {
    const name = roomName.trim() || translateRoomName(selectedType) || t('rooms.room');
    const colors = ROOM_COLORS[selectedType] || ROOM_COLORS.other;
    const selectedTasks = taskConfigs.filter(t => t.selected).map(t => ({
      name: t.name,
      translationKey: t.translationKey,
      iconKey: t.iconKey || 'sparkle',
      frequencyDays: freqToDays(t.freqValue, t.freqUnit),
      effort: t.effort,
      isSeasonal: t.isSeasonal,
      initialHealth: t.initialHealth,
    }));
    onCreateRoom({ name, roomType: selectedType, color: colors.bg, accentColor: colors.accent, tasks: selectedTasks });
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setStep(1);
    setRoomName('');
    setSelectedType('kitchen');
    setTaskConfigs([]);
    setNewTaskName('');
  };

  const updateTask = (idx: number, updates: Partial<TaskConfig>) => {
    setTaskConfigs(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t));
  };

  const addCustomTask = () => {
    if (!newTaskName.trim()) return;
    setTaskConfigs(prev => [...prev, {
      name: newTaskName.trim(),
      translationKey: undefined,
      iconKey: 'sparkle',
      freqValue: 1,
      freqUnit: 'weeks',
      effort: 2,
      isSeasonal: false,
      selected: true,
      initialHealth: 100,
    }]);
    setNewTaskName('');
  };

  const removeTask = (idx: number) => {
    setTaskConfigs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteRoom = async (roomId: number, roomName: string) => {
    const shouldDelete = window.confirm(t('rooms.deleteRoomConfirm').replace('{room}', roomName));
    if (!shouldDelete) return;
    await onDeleteRoom(roomId);
  };

  const healthLabel = (h: number): string =>
    h >= 70 ? t('rooms.healthHealthy') : h >= 40 ? t('rooms.healthNeedsAttention') : t('rooms.healthCritical');

  const taskBadgeStyle = (health: number): { bg: string; text: string; border: string } => {
    if (health >= 70) {
      return { bg: '#E8F6EC', text: '#166534', border: '#86EFAC' };
    }
    if (health >= 40) {
      return { bg: '#FFF7E6', text: '#92400E', border: '#FCD34D' };
    }
    return { bg: '#FDECEC', text: '#991B1B', border: '#FCA5A5' };
  };

  return (
    <>
      {isAdmin && (
        <div style={{ marginBottom: 20 }}>
          <button className="tq-btn tq-btn-primary"
            onClick={() => setShowModal(true)}
            style={{ padding: '10px 14px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M10 4V16M4 10H16" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>{t('rooms.addRoom')}</span>
          </button>
        </div>
      )}

      <div className="page-enter" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16,
      }}>
        {sortedRooms.map((room) => {
          const rh = room.health;
          const RoomIcon = getRoomIcon(room.roomType);
          return (
            <div key={room.id} className="tq-card tq-card-hover"
              onClick={() => onSelectRoom(room.id)}
              style={{ padding: 24, cursor: 'pointer', position: 'relative' }}>
              {isAdmin && (
                <button
                  className="tq-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRoom(room.id, room.name);
                  }}
                  aria-label={`${t('common.delete')} ${roomDisplayName(room.name, room.roomType)}`}
                  title={`${t('common.delete')} ${roomDisplayName(room.name, room.roomType)}`}
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: 26,
                    height: 26,
                    borderRadius: 9,
                    border: '1.5px solid var(--warm-danger-border)',
                    backgroundColor: 'var(--warm-danger-bg)',
                    color: 'var(--warm-danger)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <TrashIcon />
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 18,
                  backgroundColor: room.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${room.accentColor}33`,
                }}><RoomIcon /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--warm-text)' }}>{roomDisplayName(room.name, room.roomType)}</div>
                  <div style={{ fontSize: 12, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                    {room.tasks.length} {t('rooms.tasks')} &middot; {healthLabel(rh)}
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: getHealthColor(rh), marginRight: isAdmin ? 34 : 0 }}>{rh}%</div>
              </div>
              <HealthBar value={rh} height={10} showLabel={false} />
              <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                {room.tasks.map((t) => {
                  const badge = taskBadgeStyle(t.health);
                  return (
                    <div key={t.id} style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px 4px 6px', borderRadius: 10,
                      backgroundColor: badge.bg, color: badge.text,
                      border: `1px solid ${badge.border}`,
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{
                        width: 30, height: 30, borderRadius: 10,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.6)',
                        flexShrink: 0,
                        marginLeft: -5,
                      }}>
                        <TaskIcon iconKey={t.iconKey} size={21} />
                      </span>
                      <span>{taskName(t.name, t.translationKey)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {rooms.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--warm-text-light)', marginBottom: 8 }}>{t('rooms.noRoomsYet')}</div>
            <div style={{ fontSize: 13, color: 'var(--warm-text-light)' }}>{t('rooms.clickAddRoom')}</div>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={closeModal}>
          <div className="tq-card" style={{ width: step === 1 ? 480 : 680, maxHeight: '85vh', overflow: 'hidden', boxSizing: 'border-box' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 32, maxHeight: '85vh', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box' }}>

            {step === 1 ? (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--warm-text)', margin: '0 0 6px' }}>{t('rooms.addRoomTitle')}</h2>
                <p style={{ fontSize: 12, color: 'var(--warm-text-light)', fontWeight: 600, marginBottom: 20 }}>
                  {t('rooms.pickRoomType')}
                </p>

                <div className="room-type-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                  {ROOM_TYPES.map((rt) => {
                    const colors = ROOM_COLORS[rt.type] || ROOM_COLORS.other;
                    const Icon = getRoomIcon(rt.type);
                    const isSelected = selectedType === rt.type;
                    return (
                      <div key={rt.type}
                        onClick={() => setSelectedType(rt.type)}
                        style={{
                          padding: '14px 8px', borderRadius: 16, textAlign: 'center', cursor: 'pointer',
                          backgroundColor: isSelected ? colors.bg : 'var(--warm-bg-subtle)',
                          border: isSelected ? `2px solid ${colors.accent}` : '2px solid var(--warm-border)',
                          transition: 'all 0.15s ease',
                        }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12, margin: '0 auto 8px',
                          backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}><Icon /></div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? colors.accent : 'var(--warm-text-muted)' }}>
                          {translateRoomName(rt.type)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--warm-text-muted)', display: 'block', marginBottom: 6 }}>
                    {t('rooms.customNameOptional')}
                  </label>
                  <input value={roomName} onChange={(e) => setRoomName(e.target.value)}
                    placeholder={translateRoomName(selectedType)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--warm-border)',
                      fontSize: 14, fontFamily: 'Nunito', fontWeight: 600, color: 'var(--warm-text)',
                      outline: 'none', backgroundColor: 'var(--warm-bg-subtle)', boxSizing: 'border-box',
                    }} />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="tq-btn tq-btn-secondary" onClick={closeModal}
                    style={{ padding: '10px 22px', fontSize: 13 }}>{t('common.cancel')}</button>
                  <button className="tq-btn tq-btn-primary" onClick={() => setStep(2)}
                    style={{ padding: '10px 22px', fontSize: 13 }}>{t('rooms.nextConfigure')}</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <button onClick={() => setStep(1)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: 'var(--warm-text-light)', fontSize: 18, fontWeight: 700,
                  }}>&#8592;</button>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--warm-text)', margin: 0 }}>{t('rooms.configureTasks')}</h2>
                </div>
                <p style={{ fontSize: 12, color: 'var(--warm-text-light)', fontWeight: 600, marginBottom: 16 }}>
                  {t('rooms.configureTasksDesc')}
                </p>

                {loadingTasks ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'var(--warm-text-light)', fontWeight: 600 }}>{t('common.loading')}...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {taskConfigs.map((task, idx) => {
                      const healthColor = task.initialHealth >= 70 ? '#22C55E' : task.initialHealth >= 40 ? '#F59E0B' : '#EF4444';
                      return (
                        <div key={idx} style={{
                          padding: '14px 16px', borderRadius: 14,
                          backgroundColor: task.selected ? 'var(--warm-bg-subtle)' : 'var(--warm-bg-warm)',
                          border: task.selected ? '1.5px solid var(--warm-border)' : '1.5px solid var(--warm-border-subtle)',
                          opacity: task.selected ? 1 : 0.6,
                          transition: 'all 0.15s ease',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: task.selected ? 12 : 0 }}>
                            <input type="checkbox" checked={task.selected}
                              onChange={(e) => updateTask(idx, { selected: e.target.checked })}
                              style={{ width: 18, height: 18, accentColor: '#F97316', cursor: 'pointer' }} />
                            <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: 'var(--warm-text)', display: 'flex', alignItems: 'center', gap: 9 }}>
                              <span style={{
                                width: 32, height: 32, borderRadius: 10,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: 'var(--warm-bg-warm)', border: '1px solid var(--warm-border)',
                                flexShrink: 0,
                                marginLeft: -6,
                              }}>
                                <TaskIcon iconKey={task.iconKey} size={22} />
                              </span>
                              <span>{taskName(task.name, task.translationKey)}</span>
                            </div>
                            <button onClick={() => removeTask(idx)} style={{
                              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warm-text-light)',
                              fontSize: 18, fontWeight: 700, padding: '0 4px', lineHeight: 1,
                            }}>&times;</button>
                          </div>

                          {task.selected && (
                            <div className="task-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, paddingLeft: 28 }}>
                              {/* Current State */}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', textTransform: 'uppercase', marginBottom: 6 }}>
                                  {t('rooms.currentState')}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <input type="range" min={0} max={100} step={10}
                                    value={task.initialHealth}
                                    onChange={(e) => updateTask(idx, { initialHealth: parseInt(e.target.value) })}
                                    style={{ flex: 1, accentColor: healthColor }} />
                                  <span style={{ fontSize: 12, fontWeight: 800, color: healthColor, minWidth: 36, textAlign: 'right' }}>
                                    {task.initialHealth}%
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--warm-text-light)', fontWeight: 600, marginTop: 2 }}>
                                  <span>{t('rooms.dirty')}</span><span>{t('rooms.clean')}</span>
                                </div>
                              </div>

                              {/* Effort */}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', textTransform: 'uppercase', marginBottom: 6 }}>
                                  {t('roomDetail.effort')}
                                </div>
                                <div style={{ display: 'flex', gap: 2 }}>
                                  {[1, 2, 3, 4, 5].map((e) => (
                                    <button key={e} onClick={() => updateTask(idx, { effort: e })}
                                      style={{
                                        background: 'none', border: 'none', cursor: 'pointer', padding: 1,
                                        opacity: e <= task.effort ? 1 : 0.3,
                                        transform: e <= task.effort ? 'scale(1.1)' : 'scale(1)',
                                        transition: 'all 0.1s ease',
                                      }}>
                                      <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                                        <path d="M7 1L8.5 5H12.5L9.5 7.5L10.5 11.5L7 9L3.5 11.5L4.5 7.5L1.5 5H5.5L7 1Z"
                                          fill={e <= task.effort ? '#F59E0B' : 'none'}
                                          stroke={e <= task.effort ? '#F59E0B' : '#E2D5C5'}
                                          strokeWidth={e <= task.effort ? '0.5' : '1'} />
                                      </svg>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Frequency */}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', textTransform: 'uppercase', marginBottom: 6 }}>
                                  {t('roomDetail.frequency')}
                                </div>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                  <input type="number" min={1} max={999} value={task.freqValue}
                                    onChange={(e) => updateTask(idx, { freqValue: Math.max(1, parseInt(e.target.value) || 1) })}
                                    style={{
                                      width: 48, padding: '5px 6px', borderRadius: 8, border: '1.5px solid var(--warm-border)',
                                      fontSize: 12, fontFamily: 'Nunito', fontWeight: 700, color: 'var(--warm-text)',
                                      outline: 'none', backgroundColor: '#fff', textAlign: 'center',
                                    }} />
                                  <select value={task.freqUnit}
                                    onChange={(e) => updateTask(idx, { freqUnit: e.target.value })}
                                    style={{
                                      padding: '5px 6px', borderRadius: 8, border: '1.5px solid var(--warm-border)',
                                      fontSize: 11, fontFamily: 'Nunito', fontWeight: 600, color: 'var(--warm-text)',
                                      backgroundColor: '#fff', outline: 'none', cursor: 'pointer',
                                    }}>
                                    {FREQ_UNITS.map((f) => (
                                      <option key={f.label} value={f.label}>{t(`units.${f.label}`)}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Icon */}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--warm-text-light)', textTransform: 'uppercase', marginBottom: 6 }}>
                                  {t('rooms.icon')}
                                </div>
                                <select
                                  value={task.iconKey || 'sparkle'}
                                  onChange={(e) => updateTask(idx, { iconKey: e.target.value })}
                                  style={{
                                    width: '100%', padding: '5px 6px', borderRadius: 8, border: '1.5px solid var(--warm-border)',
                                    fontSize: 11, fontFamily: 'Nunito', fontWeight: 600, color: 'var(--warm-text)',
                                    backgroundColor: '#fff', outline: 'none', cursor: 'pointer',
                                  }}
                                >
                                  {TASK_ICON_OPTIONS.map((opt) => (
                                    <option key={opt.key} value={opt.key}>{t(`taskIcons.${opt.key}`)}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Custom Task */}
                    <div style={{
                      padding: '10px 16px', borderRadius: 14, border: '1.5px dashed var(--warm-border)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <PlusIcon />
                      <input value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
                        placeholder={t('rooms.addCustomTask')}
                        style={{
                          flex: 1, padding: '6px 0', border: 'none', outline: 'none',
                          fontSize: 13, fontFamily: 'Nunito', fontWeight: 600, color: 'var(--warm-text)',
                          backgroundColor: 'transparent',
                        }} />
                      <button onClick={addCustomTask} className="tq-btn tq-btn-secondary"
                        style={{ padding: '6px 14px', fontSize: 12 }}>{t('common.add')}</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--warm-text-light)', fontWeight: 600 }}>
                    {taskConfigs.filter(t => t.selected).length} {t('rooms.tasksSelected')}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="tq-btn tq-btn-secondary" onClick={closeModal}
                      style={{ padding: '10px 22px', fontSize: 13 }}>{t('common.cancel')}</button>
                    <button className="tq-btn tq-btn-primary" onClick={handleCreate}
                      disabled={taskConfigs.filter(t => t.selected).length === 0}
                      style={{ padding: '10px 22px', fontSize: 13 }}>{t('rooms.createRoom')}</button>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RoomsList;
