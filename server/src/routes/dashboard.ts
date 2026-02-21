import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { calculateHealth } from '../utils/health';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: AuthRequest, res: Response) => {
  const user = db.prepare(
    'SELECT id, username, displayName, role, avatarColor, avatarType, avatarPreset, avatarPhotoUrl, coins, currentStreak, goalCoins, goalStartAt, goalEndAt, lastActiveDate, isVacationMode, vacationStartDate, language FROM users WHERE id = ?'
  ).get(req.userId) as any;

  const rooms = db.prepare('SELECT * FROM rooms ORDER BY sortOrder, id').all() as any[];
  const allTasks: any[] = [];

  // Fetch all tasks in one query and group by roomId to avoid N+1
  const dbTasks = db.prepare('SELECT * FROM tasks').all() as any[];
  const tasksByRoom = new Map<number, any[]>();
  for (const t of dbTasks) {
    if (!tasksByRoom.has(t.roomId)) tasksByRoom.set(t.roomId, []);
    tasksByRoom.get(t.roomId)!.push(t);
  }

  const nowTs = Date.now();
  const roomsWithHealth = rooms.map((room) => {
    const tasks = tasksByRoom.get(room.id) || [];
    const tasksWithHealth = tasks.map((t) => {
      const health = calculateHealth(t.lastCompletedAt, t.frequencyDays, !!user.isVacationMode, user.vacationStartDate);
      const safeFreq = Math.max(1 / 24, Number(t.frequencyDays) || 7);
      const dueDateTs = t.lastCompletedAt
        ? new Date(t.lastCompletedAt).getTime() + safeFreq * 86400000
        : nowTs;
      const dueInDays = Math.ceil((dueDateTs - nowTs) / 86400000);
      const taskWithHealth = {
        ...t,
        isSeasonal: !!t.isSeasonal,
        health,
        dueDate: new Date(dueDateTs).toISOString(),
        dueInDays,
        roomName: room.name,
        roomColor: room.color,
        roomAccent: room.accentColor,
      };
      allTasks.push(taskWithHealth);
      return taskWithHealth;
    });

    const nonSeasonal = tasksWithHealth.filter((t) => !t.isSeasonal);
    const forAvg = nonSeasonal.length > 0 ? nonSeasonal : tasksWithHealth;
    const totalEffort = forAvg.reduce((s, t) => s + t.effort, 0);
    const health = totalEffort > 0
      ? Math.round(forAvg.reduce((s, t) => s + t.health * t.effort, 0) / totalEffort)
      : 100;

    return { ...room, health, taskCount: tasks.length, criticalCount: tasksWithHealth.filter((t) => t.health < 30).length };
  });

  // House health
  const nonSeasonal = allTasks.filter((t) => !t.isSeasonal);
  const forHouseAvg = nonSeasonal.length > 0 ? nonSeasonal : allTasks;
  const totalEffort = forHouseAvg.reduce((s, t) => s + t.effort, 0);
  const houseHealth = totalEffort > 0
    ? Math.round(forHouseAvg.reduce((s, t) => s + t.health * t.effort, 0) / totalEffort)
    : 100;

  // Today's quests: tasks due today or overdue, non-seasonal
  const todaysQuests = allTasks
    .filter((t) => !t.isSeasonal && t.dueInDays <= 0)
    .sort((a, b) => a.dueInDays - b.dueInDays || a.health - b.health)
    .slice(0, 10);

  // Next tasks to come soon (non-seasonal)
  const nextTasks = allTasks
    .filter((t) => !t.isSeasonal && t.dueInDays > 0)
    .sort((a, b) => a.dueInDays - b.dueInDays || a.health - b.health)
    .slice(0, 10);

  // Recent activity
  const recentActivity = db.prepare(`
    SELECT tc.*, t.name as taskName, t.translationKey, t.roomId, r.name as roomName, u.displayName, u.avatarColor, u.avatarType, u.avatarPreset, u.avatarPhotoUrl
    FROM task_completions tc
    JOIN tasks t ON tc.taskId = t.id
    JOIN rooms r ON t.roomId = r.id
    JOIN users u ON tc.userId = u.id
    ORDER BY tc.completedAt DESC
    LIMIT 5
  `).all();

  function getGoalCoinsWithinPeriod(targetUser: any): number {
    if (!targetUser.goalStartAt && !targetUser.goalEndAt) return targetUser.coins;
    const from = targetUser.goalStartAt || '1970-01-01T00:00:00.000Z';
    const to = targetUser.goalEndAt || '9999-12-31T23:59:59.999Z';
    const row = db.prepare(
      'SELECT COALESCE(SUM(coinsEarned), 0) as total FROM task_completions WHERE userId = ? AND completedAt >= ? AND completedAt <= ?'
    ).get(targetUser.id, from, to) as { total: number };
    return row?.total || 0;
  }

  const myCurrentCoins = user.goalCoins ? getGoalCoinsWithinPeriod(user) : user.coins;
  const myGoal = user.goalCoins ? {
    goalCoins: user.goalCoins,
    currentCoins: myCurrentCoins,
    goalStartAt: user.goalStartAt || null,
    goalEndAt: user.goalEndAt || null,
    progress: Math.min(100, Math.round((myCurrentCoins / user.goalCoins) * 100)),
  } : null;

  const childrenGoals = user.role === 'admin'
    ? db.prepare(
      "SELECT id, displayName, role, coins, goalCoins, goalStartAt, goalEndAt, avatarColor, avatarType, avatarPreset, avatarPhotoUrl FROM users WHERE role != 'admin' ORDER BY displayName"
    ).all().map((c: any) => {
      const currentCoins = c.goalCoins ? getGoalCoinsWithinPeriod(c) : c.coins;
      return {
        ...c,
        currentCoins,
        progress: c.goalCoins ? Math.min(100, Math.round((currentCoins / c.goalCoins) * 100)) : null,
      };
    })
    : [];

  const pendingRewardRequests = user.role === 'admin'
    ? db.prepare(
      `SELECT rr.id, rr.costCoins, rr.redeemedAt, rr.status, r.title, u.displayName
       FROM reward_redemptions rr
       JOIN rewards r ON rr.rewardId = r.id
       JOIN users u ON rr.userId = u.id
       WHERE rr.status = 'requested'
       ORDER BY rr.redeemedAt DESC
       LIMIT 12`
    ).all()
    : [];

  res.json({
    houseHealth,
    rooms: roomsWithHealth,
    todaysQuests,
    nextTasks,
    myGoal,
    childrenGoals,
    pendingRewardRequests,
    currentUser: user,
    recentActivity,
  });
});

export default router;
