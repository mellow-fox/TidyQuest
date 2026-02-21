import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { ensureAdmin } from '../utils/adminHelpers';

const router = Router();
router.use(authMiddleware);

// Export all data as JSON
router.get('/export', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const users = db.prepare('SELECT id, username, displayName, role, avatarColor, avatarType, avatarPreset, avatarPhotoUrl, coins, currentStreak, goalCoins, goalStartAt, goalEndAt, lastActiveDate, isVacationMode, language, createdAt FROM users').all();
  const rooms = db.prepare('SELECT * FROM rooms').all();
  const tasks = db.prepare('SELECT * FROM tasks').all();
  const completions = db.prepare('SELECT * FROM task_completions').all();
  const settings = db.prepare('SELECT * FROM app_settings').all();
  const goals = db.prepare('SELECT * FROM user_goals').all();
  const rewards = db.prepare('SELECT * FROM rewards').all();
  const rewardRedemptions = db.prepare('SELECT * FROM reward_redemptions').all();

  res.setHeader('Content-Disposition', 'attachment; filename=tidyquest-backup.json');
  res.json({ version: 4, exportedAt: new Date().toISOString(), users, rooms, tasks, completions, settings, goals, rewards, rewardRedemptions });
});

// Import data from JSON
router.post('/import', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { users, rooms, tasks, completions, settings, goals, rewards, rewardRedemptions } = req.body;

  if (!Array.isArray(users) || !Array.isArray(rooms) || !Array.isArray(tasks) || !Array.isArray(completions)) {
    return res.status(400).json({ error: 'Invalid backup format. Expected arrays: users, rooms, tasks, completions' });
  }

  const importData = db.transaction(() => {
    // Clear existing data
    db.prepare('DELETE FROM task_completions').run();
    db.prepare('DELETE FROM reward_redemptions').run();
    db.prepare('DELETE FROM user_goals').run();
    db.prepare('DELETE FROM rewards').run();
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM rooms').run();
    db.prepare('DELETE FROM users').run();

    // Re-insert
    for (const u of users) {
      db.prepare(
        'INSERT INTO users (id, username, displayName, passwordHash, role, avatarColor, avatarType, avatarPreset, avatarPhotoUrl, coins, currentStreak, goalCoins, goalStartAt, goalEndAt, lastActiveDate, isVacationMode, language, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        u.id,
        u.username,
        u.displayName,
        u.passwordHash || '',
        u.role || 'child',
        u.avatarColor,
        u.avatarType || 'letter',
        u.avatarPreset || null,
        u.avatarPhotoUrl || null,
        u.coins,
        u.currentStreak,
        u.goalCoins || null,
        u.goalStartAt || null,
        u.goalEndAt || null,
        u.lastActiveDate,
        u.isVacationMode ? 1 : 0,
        u.language,
        u.createdAt
      );
    }

    for (const r of rooms) {
      db.prepare(
        'INSERT INTO rooms (id, name, roomType, color, accentColor, photoUrl, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(r.id, r.name, r.roomType, r.color, r.accentColor, r.photoUrl, r.sortOrder, r.createdAt);
    }

    for (const t of tasks) {
      db.prepare(
        'INSERT INTO tasks (id, roomId, name, notes, frequencyDays, effort, isSeasonal, lastCompletedAt, translationKey, iconKey, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(t.id, t.roomId, t.name, t.notes || null, t.frequencyDays, t.effort, t.isSeasonal ? 1 : 0, t.lastCompletedAt, t.translationKey || null, t.iconKey || null, t.createdAt);
    }

    for (const c of completions) {
      db.prepare(
        'INSERT INTO task_completions (id, taskId, userId, completedAt, coinsEarned) VALUES (?, ?, ?, ?, ?)'
      ).run(c.id, c.taskId, c.userId, c.completedAt, c.coinsEarned);
    }

    if (Array.isArray(settings)) {
      db.prepare('DELETE FROM app_settings').run();
      for (const s of settings) {
        db.prepare('INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, COALESCE(?, datetime(\'now\')))').run(s.key, s.value, s.updatedAt);
      }
    }

    if (Array.isArray(goals)) {
      for (const g of goals) {
        db.prepare(
          'INSERT INTO user_goals (id, userId, title, goalCoins, startAt, endAt, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(g.id, g.userId, g.title, g.goalCoins, g.startAt || null, g.endAt || null, g.createdBy || null, g.createdAt);
      }
    }

    if (Array.isArray(rewards)) {
      for (const r of rewards) {
        db.prepare(
          'INSERT INTO rewards (id, title, description, costCoins, isActive, isPreset, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(r.id, r.title, r.description || null, r.costCoins, r.isActive ? 1 : 0, r.isPreset ? 1 : 0, r.createdBy || null, r.createdAt);
      }
    }

    if (Array.isArray(rewardRedemptions)) {
      for (const rr of rewardRedemptions) {
        db.prepare(
          'INSERT INTO reward_redemptions (id, rewardId, userId, costCoins, redeemedAt, status) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(rr.id, rr.rewardId, rr.userId, rr.costCoins, rr.redeemedAt, rr.status || 'requested');
      }
    }

  });

  importData();
  res.json({ success: true, imported: { users: users.length, rooms: rooms.length, tasks: tasks.length, completions: completions.length } });
});

export default router;
