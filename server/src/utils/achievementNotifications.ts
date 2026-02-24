import db from '../database';
import { buildAchievements } from './achievements';
import { isNotificationTypeEnabled, sendTelegramMessage } from './notifications';
import { calculateHealth } from './health';
import { getGlobalVacation } from './adminHelpers';

function getUserAchievementStats(userId: number) {
  const user = db.prepare(
    'SELECT id, displayName, coins, currentStreak FROM users WHERE id = ?'
  ).get(userId) as any;
  if (!user) return null;
  const vacation = getGlobalVacation();

  const completionsRow = db.prepare('SELECT COUNT(*) as count FROM task_completions WHERE userId = ?').get(userId) as { count: number };

  const rooms = db.prepare('SELECT id FROM rooms').all() as Array<{ id: number }>;
  let roomsClean = 0;
  for (const room of rooms) {
    const tasks = db.prepare('SELECT effort, isSeasonal, lastCompletedAt, frequencyDays FROM tasks WHERE roomId = ?').all(room.id) as Array<{
      effort: number;
      isSeasonal: number;
      lastCompletedAt: string | null;
      frequencyDays: number;
    }>;
    if (tasks.length === 0) continue;
    const nonSeasonal = tasks.filter((t) => !t.isSeasonal);
    const forAvg = nonSeasonal.length > 0 ? nonSeasonal : tasks;
    const totalEffort = forAvg.reduce((s, t) => s + t.effort, 0);
    const health = totalEffort > 0
      ? Math.round(forAvg.reduce((s, t) => s + calculateHealth(t.lastCompletedAt, t.frequencyDays, vacation.isVacation, vacation.startDate) * t.effort, 0) / totalEffort)
      : 100;
    if (health >= 70) roomsClean++;
  }

  const now = new Date();
  const dayOfWeek = now.getUTCDay() || 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - dayOfWeek + 1);
  monday.setUTCHours(0, 0, 0, 0);
  const weeklyRow = db.prepare(
    'SELECT COUNT(*) as count FROM task_completions WHERE userId = ? AND completedAt >= ?'
  ).get(userId, monday.toISOString()) as { count: number };

  // Tasks completed on the most recent weekend (Sat+Sun)
  const nowDay = now.getUTCDay(); // 0=Sun, 6=Sat
  const daysToLastSat = nowDay === 6 ? 0 : nowDay === 0 ? 1 : nowDay + 1;
  const lastSat = new Date(now);
  lastSat.setUTCDate(now.getUTCDate() - daysToLastSat);
  lastSat.setUTCHours(0, 0, 0, 0);
  const lastSun = new Date(lastSat);
  lastSun.setUTCDate(lastSat.getUTCDate() + 1);
  lastSun.setUTCHours(23, 59, 59, 999);
  const weekendRow = db.prepare(
    'SELECT COUNT(*) as count FROM task_completions WHERE userId = ? AND completedAt >= ? AND completedAt <= ?'
  ).get(userId, lastSat.toISOString(), lastSun.toISOString()) as { count: number };

  const allCompletions = db.prepare(
    "SELECT date(completedAt) as day FROM task_completions WHERE userId = ? GROUP BY date(completedAt) ORDER BY day"
  ).all(userId) as Array<{ day: string }>;

  const parseDayUTC = (day: string): Date => new Date(`${day}T00:00:00.000Z`);
  const mondayOfUTCDate = (d: Date): Date => {
    const out = new Date(d);
    const dow = out.getUTCDay() || 7;
    out.setUTCDate(out.getUTCDate() - dow + 1);
    out.setUTCHours(0, 0, 0, 0);
    return out;
  };

  let perfectWeeks = 0;
  if (allCompletions.length > 0) {
    const daySet = new Set(allCompletions.map((c) => c.day));
    const firstDay = parseDayUTC(allCompletions[0].day);
    const startMonday = mondayOfUTCDate(firstDay);
    const thisMonday = mondayOfUTCDate(now);
    const checkDate = new Date(startMonday);

    while (checkDate < thisMonday) {
      let allDays = true;
      for (let d = 0; d < 7; d++) {
        const checkDay = new Date(checkDate);
        checkDay.setUTCDate(checkDate.getUTCDate() + d);
        const dayStr = checkDay.toISOString().slice(0, 10);
        if (!daySet.has(dayStr)) {
          allDays = false;
          break;
        }
      }
      if (allDays) perfectWeeks++;
      checkDate.setUTCDate(checkDate.getUTCDate() + 7);
    }
  }

  return {
    userDisplayName: String(user.displayName || 'User'),
    achievements: buildAchievements({
      completions: completionsRow.count,
      streak: user.currentStreak || 0,
      coins: user.coins || 0,
      rooms_clean: roomsClean,
      weekly_tasks: weeklyRow.count,
      weekend_tasks: weekendRow.count,
      perfect_weeks: perfectWeeks,
    }),
  };
}

export async function notifyAchievementUnlocksForUser(userId: number): Promise<void> {
  if (!isNotificationTypeEnabled('achievementUnlocked')) return;
  const stats = getUserAchievementStats(userId);
  if (!stats) return;

  for (const ach of stats.achievements) {
    if (!ach.unlocked) continue;
    const inserted = db.prepare(
      'INSERT OR IGNORE INTO user_achievement_notifications (userId, achievementId) VALUES (?, ?)'
    ).run(userId, ach.id);
    if (inserted.changes < 1) continue;

    await sendTelegramMessage(
      `🏆 ${stats.userDisplayName} unlocked an achievement: ${ach.id}`
    );
  }
}
