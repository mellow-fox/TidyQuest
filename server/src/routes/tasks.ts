import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { calculateHealth, getCoinsForEffort } from '../utils/health';
import { suggestTaskIcon } from '../utils/taskIcons';
import { notifyAchievementUnlocksForUser } from '../utils/achievementNotifications';
import { ensureAdmin, getCoinsByEffortConfig } from '../utils/adminHelpers';

const router = Router();
router.use(authMiddleware);

function hadDueTaskOnDate(dateIsoDay: string, user: any): boolean {
  const endOfDay = new Date(`${dateIsoDay}T23:59:59.999Z`).getTime();
  const tasks = db.prepare('SELECT id, frequencyDays, isSeasonal, lastCompletedAt FROM tasks').all() as Array<{
    id: number; frequencyDays: number; isSeasonal: number; lastCompletedAt: string | null;
  }>;

  for (const t of tasks) {
    if (t.isSeasonal) continue;
    const safeFreq = Math.max(1 / 24, Number(t.frequencyDays) || 7);
    let dueTs: number;
    if (!t.lastCompletedAt) {
      dueTs = 0;
    } else {
      dueTs = new Date(t.lastCompletedAt).getTime() + safeFreq * 86400000;
    }
    if (dueTs <= endOfDay) {
      const health = calculateHealth(t.lastCompletedAt, safeFreq, !!user.isVacationMode, user.vacationStartDate);
      if (health < 100) return true;
    }
  }
  return false;
}

// List tasks for a room
router.get('/rooms/:roomId/tasks', (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT isVacationMode, vacationStartDate FROM users WHERE id = ?').get(req.userId) as any;
  const tasks = db.prepare('SELECT * FROM tasks WHERE roomId = ?').all(req.params.roomId) as any[];

  const tasksWithHealth = tasks.map((t) => ({
    ...t,
    isSeasonal: !!t.isSeasonal,
    health: calculateHealth(t.lastCompletedAt, t.frequencyDays, !!user.isVacationMode, user.vacationStartDate),
  }));

  res.json(tasksWithHealth);
});

// Create task
router.post('/rooms/:roomId/tasks', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { name, notes, frequencyDays, effort, isSeasonal, health, iconKey } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const effectiveFrequency = Math.max(1 / 24, Number(frequencyDays) || 7);
  let lastCompletedAt: string | null = null;
  if (health !== undefined && health !== null) {
    const targetHealth = Math.max(0, Math.min(100, Math.round(Number(health))));
    if (targetHealth >= 100) {
      lastCompletedAt = new Date().toISOString();
    } else {
      const daysSince = ((100 - targetHealth) / 100) * effectiveFrequency;
      lastCompletedAt = new Date(Date.now() - daysSince * 86400000).toISOString();
    }
  }

  const result = db.prepare(
    'INSERT INTO tasks (roomId, name, notes, frequencyDays, effort, isSeasonal, lastCompletedAt, iconKey) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.params.roomId, name, notes || null, frequencyDays || 7, effort || 1, isSeasonal ? 1 : 0, lastCompletedAt, iconKey || suggestTaskIcon(name, null));

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// Update task
router.put('/tasks/:id', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { name, notes, frequencyDays, effort, isSeasonal, health, iconKey } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any;
  if (!task) return res.status(404).json({ error: 'Task not found' });

  let lastCompletedAt: string | undefined;
  if (health !== undefined && health !== null) {
    const targetHealth = Math.max(0, Math.min(100, Math.round(Number(health))));
    if (targetHealth >= 100) {
      lastCompletedAt = new Date().toISOString();
    } else {
      const effectiveFrequency = Math.max(1 / 24, Number(frequencyDays ?? task.frequencyDays) || 7);
      const daysSince = ((100 - targetHealth) / 100) * effectiveFrequency;
      lastCompletedAt = new Date(Date.now() - daysSince * 86400000).toISOString();
    }
  }

  db.prepare(
    'UPDATE tasks SET name = COALESCE(?, name), notes = COALESCE(?, notes), frequencyDays = COALESCE(?, frequencyDays), effort = COALESCE(?, effort), isSeasonal = COALESCE(?, isSeasonal), lastCompletedAt = COALESCE(?, lastCompletedAt), iconKey = COALESCE(?, iconKey) WHERE id = ?'
  ).run(name, notes, frequencyDays, effort, isSeasonal !== undefined ? (isSeasonal ? 1 : 0) : undefined, lastCompletedAt, iconKey, req.params.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete task
router.delete('/tasks/:id', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Complete task
router.post('/tasks/:id/complete', (req: AuthRequest, res: Response) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any;
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Always use server timestamp — never trust client-supplied completedAt
  const now = new Date().toISOString();
  const coins = getCoinsForEffort(task.effort, getCoinsByEffortConfig());

  // Update task lastCompletedAt
  db.prepare('UPDATE tasks SET lastCompletedAt = ? WHERE id = ?').run(now, req.params.id);

  // Record completion
  db.prepare(
    'INSERT INTO task_completions (taskId, userId, completedAt, coinsEarned) VALUES (?, ?, ?, ?)'
  ).run(task.id, req.userId, now, coins);

  // Update user coins
  db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(coins, req.userId);

  // Update streak
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
  const today = new Date().toISOString().slice(0, 10);

  if (user.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let keepGapWithoutPenalty = false;
    if (user.lastActiveDate && user.lastActiveDate < yesterday) {
      keepGapWithoutPenalty = true;
      const start = new Date(`${user.lastActiveDate}T00:00:00.000Z`);
      const end = new Date(`${yesterday}T00:00:00.000Z`);
      for (let d = new Date(start.getTime() + 86400000); d <= end; d = new Date(d.getTime() + 86400000)) {
        const day = d.toISOString().slice(0, 10);
        if (hadDueTaskOnDate(day, user)) {
          keepGapWithoutPenalty = false;
          break;
        }
      }
    }
    const newStreak = user.lastActiveDate === yesterday
      ? user.currentStreak + 1
      : keepGapWithoutPenalty
        ? user.currentStreak + 1
        : 1;
    db.prepare('UPDATE users SET currentStreak = ?, lastActiveDate = ? WHERE id = ?')
      .run(newStreak, today, req.userId);
  }

  // Fire-and-forget achievement unlock notifications.
  void notifyAchievementUnlocksForUser(req.userId!);

  res.json({ coinsEarned: coins, health: 100 });
});

export default router;
