import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { buildAchievements } from '../utils/achievements';
import { calculateHealth } from '../utils/health';

const router = Router();
router.use(authMiddleware);

function getUserStats(userId: number) {
  const user = db.prepare('SELECT id, displayName, role, coins, currentStreak, avatarColor, avatarType, avatarPreset, avatarPhotoUrl, isVacationMode, vacationStartDate FROM users WHERE id = ?').get(userId) as any;
  if (!user) return null;

  const completionsRow = db.prepare('SELECT COUNT(*) as count FROM task_completions WHERE userId = ?').get(userId) as { count: number };

  // Rooms with health >= 70 (considered "clean") — fetch all tasks in one query
  const rooms = db.prepare('SELECT * FROM rooms').all() as any[];
  const allRoomTasks = db.prepare('SELECT * FROM tasks').all() as any[];
  const tasksByRoom = new Map<number, any[]>();
  for (const t of allRoomTasks) {
    if (!tasksByRoom.has(t.roomId)) tasksByRoom.set(t.roomId, []);
    tasksByRoom.get(t.roomId)!.push(t);
  }
  let roomsClean = 0;
  for (const room of rooms) {
    const tasks = tasksByRoom.get(room.id) || [];
    if (tasks.length === 0) continue;
    const nonSeasonal = tasks.filter((t: any) => !t.isSeasonal);
    const forAvg = nonSeasonal.length > 0 ? nonSeasonal : tasks;
    const totalEffort = forAvg.reduce((s: number, t: any) => s + t.effort, 0);
    const health = totalEffort > 0
      ? Math.round(forAvg.reduce((s: number, t: any) => s + calculateHealth(t.lastCompletedAt, t.frequencyDays, !!user.isVacationMode, user.vacationStartDate) * t.effort, 0) / totalEffort)
      : 100;
    if (health >= 70) roomsClean++;
  }

  // Tasks completed this week (Monday 00:00 UTC to now)
  const now = new Date();
  const dayOfWeek = now.getUTCDay() || 7; // Sunday=7
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - dayOfWeek + 1);
  monday.setUTCHours(0, 0, 0, 0);
  const weeklyRow = db.prepare(
    'SELECT COUNT(*) as count FROM task_completions WHERE userId = ? AND completedAt >= ?'
  ).get(userId, monday.toISOString()) as { count: number };

  // Perfect weeks: weeks where user completed at least 1 task every day (Mon-Sun)
  // We count how many full weeks had all 7 days with at least one completion
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
    const daySet = new Set(allCompletions.map(c => c.day));
    // Check each past full week
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
        if (!daySet.has(dayStr)) { allDays = false; break; }
      }
      if (allDays) perfectWeeks++;
      checkDate.setUTCDate(checkDate.getUTCDate() + 7);
    }
  }

  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    avatarColor: user.avatarColor,
    avatarType: user.avatarType,
    avatarPreset: user.avatarPreset,
    avatarPhotoUrl: user.avatarPhotoUrl,
    achievements: buildAchievements({
      completions: completionsRow.count,
      streak: user.currentStreak || 0,
      coins: user.coins || 0,
      rooms_clean: roomsClean,
      weekly_tasks: weeklyRow.count,
      perfect_weeks: perfectWeeks,
    }),
  };
}

router.get('/', (req: AuthRequest, res: Response) => {
  const me = getUserStats(req.userId!);
  if (!me) return res.status(404).json({ error: 'User not found' });

  const family = me.role === 'admin'
    ? (db.prepare("SELECT id FROM users WHERE role IN ('child', 'member') ORDER BY displayName").all() as Array<{ id: number }>)
      .map((u) => getUserStats(u.id))
      .filter(Boolean)
    : [];

  res.json({ me, family });
});

export default router;
