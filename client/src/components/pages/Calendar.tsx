import { TaskIcon } from '../icons/TaskIcons';
import { useTranslation } from '../../hooks/useTranslation';

interface CalendarProps {
  completions: Array<{ completedAt: string; taskName: string; translationKey?: string; roomName: string }>;
  tasks: Array<{ id: number; name: string; translationKey?: string; roomName: string; roomType: string; health: number; frequencyDays: number; lastCompletedAt: string | null; iconKey?: string }>;
  language?: string;
}

export function Calendar({ completions, tasks, language }: CalendarProps) {
  const { taskName, t, roomDisplayName } = useTranslation(language);
  const localeMap: Record<string, string> = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT' };
  const locale = localeMap[language || 'en'] || 'en-US';
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = today.toLocaleString(locale, { month: 'long', year: 'numeric' });

  // Days with completions this month
  const completionDays = new Set(
    completions
      .filter((c) => {
        const d = new Date(c.completedAt);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((c) => new Date(c.completedAt).getDate())
  );

  // Upcoming due dates
  const upcoming = tasks
    .map((task) => {
      const dueDate = new Date(task.lastCompletedAt || Date.now());
      if (task.lastCompletedAt) {
        dueDate.setDate(dueDate.getDate() + task.frequencyDays);
      }
      const dueInDays = task.lastCompletedAt
        ? Math.max(0, Math.ceil((dueDate.getTime() - Date.now()) / 86400000))
        : 0;
      return { ...task, dueInDays, dueDate };
    })
    .filter((task) => task.dueInDays <= 30)
    .sort((a, b) => a.dueInDays - b.dueInDays);

  // Days with due tasks
  const dueDays = new Set(
    upcoming
      .filter((task) => task.dueDate.getMonth() === month && task.dueDate.getFullYear() === year)
      .map((task) => task.dueDate.getDate())
  );

  // Calendar grid padding
  const calDays: (number | null)[] = [];
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < offset; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  return (
    <div className="page-enter calendar-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
      {/* Calendar Grid */}
      <div className="tq-card" style={{ padding: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--warm-text)', textAlign: 'center', marginBottom: 20 }}>{monthName}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
          {[
            t('calendar.mon'),
            t('calendar.tue'),
            t('calendar.wed'),
            t('calendar.thu'),
            t('calendar.fri'),
            t('calendar.sat'),
            t('calendar.sun'),
          ].map((d) => (
            <div key={d} style={{ fontSize: 12, fontWeight: 800, color: 'var(--warm-text-light)', padding: 10 }}>{d}</div>
          ))}
          {calDays.map((d, i) => {
            if (!d) return <div key={`e-${i}`} />;
            const isToday = d === today.getDate();
            const hasActivity = completionDays.has(d);
            const isDue = dueDays.has(d);
            const isPast = d < today.getDate();
            return (
              <div key={d} style={{
                padding: 10, borderRadius: 14, fontSize: 14,
                fontWeight: isToday ? 900 : 600,
                color: isToday ? '#fff' : isPast ? 'var(--warm-text)' : 'var(--warm-text-light)',
                backgroundColor: isToday ? 'var(--warm-accent)' : hasActivity && isPast ? 'var(--health-green-bg)' : isDue && !isPast ? 'var(--health-red-bg)' : 'transparent',
                border: isToday ? 'none' : hasActivity && isPast ? '1.5px solid var(--health-green)' : isDue && !isPast ? '1.5px solid var(--health-red)' : '1.5px solid transparent',
              }}>
                {d}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 20 }}>
          {[
            { bg: 'var(--health-green-bg)', border: 'var(--health-green)', label: t('calendar.choresDone') },
            { bg: 'var(--health-red-bg)', border: 'var(--health-red)', label: t('calendar.tasksDue') },
            { bg: 'var(--warm-accent)', border: 'var(--warm-accent)', label: t('calendar.today') },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--warm-text-muted)', fontWeight: 600 }}>
              <div style={{ width: 14, height: 14, borderRadius: 6, backgroundColor: l.bg, border: `1.5px solid ${l.border}` }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Due Dates */}
      <div className="tq-card calendar-sidebar" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-text)', margin: '0 0 14px' }}>{t('calendar.upcomingDueDates')}</h3>
        {upcoming.slice(0, 8).map((item, i) => {
          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 0', borderBottom: i < Math.min(upcoming.length, 8) - 1 ? '1px solid var(--warm-border)' : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: 'var(--warm-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--warm-border)',
              }}><TaskIcon iconKey={item.iconKey} size={20} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warm-text)' }}>{taskName(item.name, item.translationKey)}</div>
                <div style={{ fontSize: 11, color: 'var(--warm-text-light)', fontWeight: 600 }}>{roomDisplayName(item.roomName, item.roomType)}</div>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 10,
                backgroundColor: item.dueInDays <= 5 ? 'var(--health-red-bg)' : 'var(--health-yellow-bg)',
                color: item.dueInDays <= 5 ? 'var(--health-red)' : 'var(--health-yellow)',
              }}>{t('calendar.inDays').replace('{days}', `${item.dueInDays}`)}</div>
            </div>
          );
        })}
        {upcoming.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--warm-text-light)', fontSize: 13, fontWeight: 600 }}>
            {t('calendar.allCaughtUp')}
          </div>
        )}
      </div>
    </div>
  );
}
