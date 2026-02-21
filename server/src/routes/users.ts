import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { DEFAULT_COINS_BY_EFFORT, normalizeCoinsByEffortConfig } from '../utils/health';
import { NotificationTypeSettings, sendTelegramMessageDetailed } from '../utils/notifications';
import { ensureAdmin, getCoinsByEffortConfig } from '../utils/adminHelpers';

const router = Router();
router.use(authMiddleware);

const USER_SELECT = 'id, username, displayName, role, avatarColor, avatarType, avatarPreset, avatarPhotoUrl, coins, currentStreak, goalCoins, goalStartAt, goalEndAt, isVacationMode, language, createdAt';

function normalizeNotificationTime(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = String(value).trim();
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed) ? trimmed : null;
}

function normalizeNotificationTypes(value: unknown): NotificationTypeSettings | null {
  if (value === undefined) return null;
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const toBool = (v: unknown, fallback: boolean) => typeof v === 'boolean' ? v : fallback;
  return {
    taskDue: toBool(raw.taskDue, true),
    rewardRequest: toBool(raw.rewardRequest, true),
    achievementUnlocked: toBool(raw.achievementUnlocked, true),
  };
}

function readNotificationTypesSetting(): NotificationTypeSettings {
  const rawTypes = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegramNotificationTypes'").get() as any)?.value || '';
  if (!rawTypes) return { taskDue: true, rewardRequest: true, achievementUnlocked: true };
  try {
    return normalizeNotificationTypes(JSON.parse(rawTypes)) || { taskDue: true, rewardRequest: true, achievementUnlocked: true };
  } catch {
    return { taskDue: true, rewardRequest: true, achievementUnlocked: true };
  }
}

function syncPrimaryGoal(userId: number) {
  const nowIso = new Date().toISOString();
  const primary = db.prepare(
    `SELECT goalCoins, startAt, endAt
     FROM user_goals
     WHERE userId = ?
     ORDER BY
       CASE
         WHEN (startAt IS NULL OR startAt <= ?) AND (endAt IS NULL OR endAt >= ?) THEN 0
         ELSE 1
       END,
       COALESCE(startAt, createdAt) ASC,
       id DESC
     LIMIT 1`
  ).get(userId, nowIso, nowIso) as { goalCoins: number; startAt: string | null; endAt: string | null } | undefined;

  if (!primary) {
    db.prepare('UPDATE users SET goalCoins = NULL, goalStartAt = NULL, goalEndAt = NULL WHERE id = ?').run(userId);
    return;
  }

  db.prepare('UPDATE users SET goalCoins = ?, goalStartAt = ?, goalEndAt = ? WHERE id = ?')
    .run(primary.goalCoins, primary.startAt || null, primary.endAt || null, userId);
}

// Setup multer for avatar uploads
const avatarsDir = path.join(__dirname, '..', '..', '..', 'data', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (req, _file, cb) => {
    const ext = path.extname(_file.originalname) || '.jpg';
    const targetId = parseInt((req as any).params?.id as string, 10);
    const safeId = Number.isFinite(targetId) ? targetId : (req as AuthRequest).userId;
    cb(null, `user-${safeId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// List all users (family)
router.get('/', (req: AuthRequest, res: Response) => {
  const users = db.prepare(`SELECT ${USER_SELECT} FROM users`).all();
  res.json(users);
});

router.get('/coins-config', (_req: AuthRequest, res: Response) => {
  res.json({ coinsByEffort: getCoinsByEffortConfig() });
});

router.put('/coins-config', (req: AuthRequest, res: Response) => {
  const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.userId) as any;
  if (!requester || requester.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { coinsByEffort, useDefault } = req.body as { coinsByEffort?: Record<string, number>; useDefault?: boolean };
  const next = useDefault ? DEFAULT_COINS_BY_EFFORT : normalizeCoinsByEffortConfig(coinsByEffort || {});
  db.prepare("UPDATE app_settings SET value = ?, updatedAt = datetime('now') WHERE key = 'coinsByEffort'")
    .run(JSON.stringify(next));
  res.json({ coinsByEffort: next });
});

// Create member (admin only)
router.post('/', (req: AuthRequest, res: Response) => {
  const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.userId) as any;
  if (!requester || requester.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { username, password, displayName, avatarColor, language, role } = req.body as any;
  if (!username || !password || !displayName) {
    return res.status(400).json({ error: 'username, password, and displayName are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const safeRole = role === 'admin' ? 'admin' : role === 'child' ? 'child' : 'member';
  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, displayName, passwordHash, role, avatarColor, language) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    username,
    displayName,
    passwordHash,
    safeRole,
    avatarColor || '#F97316',
    language || 'en',
  );

  const created = db.prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`).get(result.lastInsertRowid);
  res.status(201).json(created);
});

// Update user profile (display name, avatar, language)
router.put('/:id/profile', (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id as string);
  const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.userId) as any;
  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as any;
  if (!target) return res.status(404).json({ error: 'User not found' });

  const isSelf = userId === req.userId;
  const canAdminEditOther = requester?.role === 'admin' && userId !== req.userId;
  if (!isSelf && !canAdminEditOther) {
    return res.status(403).json({ error: 'Cannot modify another user' });
  }

  const { displayName, avatarType, avatarColor, avatarPreset, language } = req.body;

  const updates: string[] = [];
  const values: any[] = [];

  if (displayName !== undefined) { updates.push('displayName = ?'); values.push(displayName); }
  if (avatarType !== undefined) { updates.push('avatarType = ?'); values.push(avatarType); }
  if (avatarColor !== undefined) { updates.push('avatarColor = ?'); values.push(avatarColor); }
  if (avatarPreset !== undefined) { updates.push('avatarPreset = ?'); values.push(avatarPreset); }
  if (language !== undefined) { updates.push('language = ?'); values.push(language); }

  if (updates.length > 0) {
    values.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  const updated = db.prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`).get(userId);
  res.json(updated);
});

// Upload avatar photo
router.post('/:id/avatar-upload', upload.single('avatar'), (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id as string);
  const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.userId) as any;
  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as any;
  if (!target) return res.status(404).json({ error: 'User not found' });
  const isSelf = userId === req.userId;
  const canAdminEditOther = requester?.role === 'admin' && userId !== req.userId;
  if (!isSelf && !canAdminEditOther) {
    return res.status(403).json({ error: 'Cannot modify another user' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const photoUrl = `/api/avatars/${req.file.filename}`;
  db.prepare('UPDATE users SET avatarType = ?, avatarPhotoUrl = ? WHERE id = ?')
    .run('photo', photoUrl, userId);

  const updated = db.prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`).get(userId);
  res.json(updated);
});

router.put('/:id/password', (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id as string);
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'newPassword must be at least 4 characters' });
  }

  const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.userId) as any;
  const target = db.prepare('SELECT id, role, passwordHash FROM users WHERE id = ?').get(userId) as any;
  if (!target) return res.status(404).json({ error: 'User not found' });

  const isSelf = userId === req.userId;
  const canAdminEditOther = requester?.role === 'admin' && userId !== req.userId;
  if (!isSelf && !canAdminEditOther) {
    return res.status(403).json({ error: 'Cannot modify another user password' });
  }

  if (isSelf) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'currentPassword is required' });
    }
    if (!bcrypt.compareSync(currentPassword, target.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(hash, userId);
  res.json({ success: true });
});

// Update user settings
router.put('/:id/settings', (req: AuthRequest, res: Response) => {
  const { language, isVacationMode } = req.body;
  const userId = parseInt(req.params.id as string);

  if (userId !== req.userId) {
    return res.status(403).json({ error: 'Cannot modify another user' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  // Handle vacation mode toggle
  if (isVacationMode !== undefined) {
    if (isVacationMode && !user.isVacationMode) {
      db.prepare('UPDATE users SET isVacationMode = 1, vacationStartDate = ? WHERE id = ?')
        .run(new Date().toISOString(), userId);
    } else if (!isVacationMode && user.isVacationMode) {
      db.prepare('UPDATE users SET isVacationMode = 0, vacationStartDate = NULL WHERE id = ?')
        .run(userId);
    }
  }

  if (language) {
    db.prepare('UPDATE users SET language = ? WHERE id = ?').run(language, userId);
  }

  const updated = db.prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`).get(userId);
  res.json(updated);
});

router.put('/:id/role', (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.id as string);
  const { role } = req.body as { role?: 'admin' | 'member' | 'child' };

  if (!role || !['admin', 'member', 'child'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin, member or child' });
  }

  const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.userId) as any;
  if (!requester || requester.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(targetId) as any;
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.role === 'admin' && role !== 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
    if (adminCount.count <= 1) {
      return res.status(400).json({ error: 'At least one admin is required' });
    }
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
  const updated = db.prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`).get(targetId);
  res.json(updated);
});

router.put('/:id/goal', (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.id as string);
  const { goalCoins, goalStartAt, goalEndAt } = req.body as { goalCoins?: number | null; goalStartAt?: string | null; goalEndAt?: string | null };

  const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.userId) as any;
  if (!requester || requester.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId) as any;
  if (!target) return res.status(404).json({ error: 'User not found' });

  let normalizedGoalCoins: number | null = null;
  if (goalCoins !== null && goalCoins !== undefined) {
    const n = Math.round(Number(goalCoins));
    if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ error: 'goalCoins must be > 0' });
    normalizedGoalCoins = n;
  }

  if (goalStartAt && Number.isNaN(new Date(goalStartAt).getTime())) {
    return res.status(400).json({ error: 'goalStartAt must be a valid date' });
  }
  if (goalEndAt && Number.isNaN(new Date(goalEndAt).getTime())) {
    return res.status(400).json({ error: 'goalEndAt must be a valid date' });
  }
  const normalizedGoalStartAt = goalStartAt ? new Date(goalStartAt).toISOString() : null;
  const normalizedGoalEndAt = goalEndAt ? new Date(goalEndAt).toISOString() : null;
  if (normalizedGoalStartAt && normalizedGoalEndAt && new Date(normalizedGoalEndAt).getTime() < new Date(normalizedGoalStartAt).getTime()) {
    return res.status(400).json({ error: 'goalEndAt must be after goalStartAt' });
  }

  if (normalizedGoalCoins === null) {
    db.prepare('UPDATE users SET goalCoins = NULL, goalStartAt = NULL, goalEndAt = NULL WHERE id = ?').run(targetId);
  } else {
    db.prepare('UPDATE users SET goalCoins = ?, goalStartAt = ?, goalEndAt = ? WHERE id = ?')
      .run(normalizedGoalCoins, normalizedGoalStartAt, normalizedGoalEndAt, targetId);
  }
  const updated = db.prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`).get(targetId);
  res.json(updated);
});

router.get('/:id/goals', (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.id as string);
  const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.userId) as any;
  const isSelf = targetId === req.userId;
  if (!isSelf && requester?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId) as any;
  if (!target) return res.status(404).json({ error: 'User not found' });

  const goals = db.prepare(
    'SELECT id, userId, title, goalCoins, startAt, endAt, createdBy, createdAt FROM user_goals WHERE userId = ? ORDER BY createdAt DESC, id DESC'
  ).all(targetId);
  res.json(goals);
});

router.post('/:id/goals', (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.id as string);
  if (!ensureAdmin(req.userId)) return res.status(403).json({ error: 'Admin only' });

  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(targetId) as any;
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') return res.status(400).json({ error: 'Cannot assign goals to admin' });

  const { title, goalCoins, startAt, endAt } = req.body as { title?: string; goalCoins?: number; startAt?: string | null; endAt?: string | null };
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return res.status(400).json({ error: 'title is required' });
  const n = Math.round(Number(goalCoins));
  if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ error: 'goalCoins must be > 0' });
  if (startAt && Number.isNaN(new Date(startAt).getTime())) return res.status(400).json({ error: 'startAt must be a valid date' });
  if (endAt && Number.isNaN(new Date(endAt).getTime())) return res.status(400).json({ error: 'endAt must be a valid date' });
  const normStart = startAt ? new Date(startAt).toISOString() : null;
  const normEnd = endAt ? new Date(endAt).toISOString() : null;
  if (normStart && normEnd && new Date(normEnd).getTime() < new Date(normStart).getTime()) {
    return res.status(400).json({ error: 'endAt must be after startAt' });
  }

  const result = db.prepare(
    'INSERT INTO user_goals (userId, title, goalCoins, startAt, endAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(targetId, cleanTitle, n, normStart, normEnd, req.userId);

  syncPrimaryGoal(targetId);
  const created = db.prepare(
    'SELECT id, userId, title, goalCoins, startAt, endAt, createdBy, createdAt FROM user_goals WHERE id = ?'
  ).get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/goals/:goalId', (req: AuthRequest, res: Response) => {
  const goalId = parseInt(req.params.goalId as string);
  if (!ensureAdmin(req.userId)) return res.status(403).json({ error: 'Admin only' });
  const goal = db.prepare('SELECT id, userId FROM user_goals WHERE id = ?').get(goalId) as any;
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const { title, goalCoins, startAt, endAt } = req.body as { title?: string; goalCoins?: number; startAt?: string | null; endAt?: string | null };
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return res.status(400).json({ error: 'title is required' });
  const n = Math.round(Number(goalCoins));
  if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ error: 'goalCoins must be > 0' });
  if (startAt && Number.isNaN(new Date(startAt).getTime())) return res.status(400).json({ error: 'startAt must be a valid date' });
  if (endAt && Number.isNaN(new Date(endAt).getTime())) return res.status(400).json({ error: 'endAt must be a valid date' });
  const normStart = startAt ? new Date(startAt).toISOString() : null;
  const normEnd = endAt ? new Date(endAt).toISOString() : null;
  if (normStart && normEnd && new Date(normEnd).getTime() < new Date(normStart).getTime()) {
    return res.status(400).json({ error: 'endAt must be after startAt' });
  }

  db.prepare('UPDATE user_goals SET title = ?, goalCoins = ?, startAt = ?, endAt = ? WHERE id = ?')
    .run(cleanTitle, n, normStart, normEnd, goalId);
  syncPrimaryGoal(goal.userId);
  const updated = db.prepare('SELECT id, userId, title, goalCoins, startAt, endAt, createdBy, createdAt FROM user_goals WHERE id = ?').get(goalId);
  res.json(updated);
});

router.delete('/goals/:goalId', (req: AuthRequest, res: Response) => {
  const goalId = parseInt(req.params.goalId as string);
  if (!ensureAdmin(req.userId)) return res.status(403).json({ error: 'Admin only' });
  const goal = db.prepare('SELECT id, userId FROM user_goals WHERE id = ?').get(goalId) as any;
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  db.prepare('DELETE FROM user_goals WHERE id = ?').run(goalId);
  syncPrimaryGoal(goal.userId);
  res.json({ success: true });
});

router.get('/notifications-config', (req: AuthRequest, res: Response) => {
  const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.userId) as any;
  if (!requester || requester.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const enabled = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegramEnabled'").get() as any)?.value === '1';
  const botToken = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegramBotToken'").get() as any)?.value || '';
  const chatId = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegramChatId'").get() as any)?.value || '';
  const notificationTime = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegramNotificationTime'").get() as any)?.value || '09:00';
  const notificationTypes = readNotificationTypesSetting();
  res.json({ enabled, chatId, hasToken: !!botToken, notificationTime, notificationTypes });
});

router.put('/notifications-config', (req: AuthRequest, res: Response) => {
  const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.userId) as any;
  if (!requester || requester.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { enabled, botToken, chatId, notificationTime, notificationTypes } = req.body as {
    enabled?: boolean;
    botToken?: string;
    chatId?: string;
    notificationTime?: string;
    notificationTypes?: NotificationTypeSettings;
  };
  const normalizedTime = normalizeNotificationTime(notificationTime);
  if (notificationTime !== undefined && !normalizedTime) {
    return res.status(400).json({ error: 'notificationTime must be in HH:MM format' });
  }
  const normalizedTypes = normalizeNotificationTypes(notificationTypes);
  if (notificationTypes !== undefined && !normalizedTypes) {
    return res.status(400).json({ error: 'notificationTypes is invalid' });
  }
  if (enabled !== undefined) {
    db.prepare("UPDATE app_settings SET value = ?, updatedAt = datetime('now') WHERE key = 'telegramEnabled'")
      .run(enabled ? '1' : '0');
  }
  if (botToken !== undefined) {
    db.prepare("UPDATE app_settings SET value = ?, updatedAt = datetime('now') WHERE key = 'telegramBotToken'")
      .run(botToken.trim());
  }
  if (chatId !== undefined) {
    db.prepare("UPDATE app_settings SET value = ?, updatedAt = datetime('now') WHERE key = 'telegramChatId'")
      .run(chatId.trim());
  }
  if (normalizedTime) {
    db.prepare("UPDATE app_settings SET value = ?, updatedAt = datetime('now') WHERE key = 'telegramNotificationTime'")
      .run(normalizedTime);
  }
  if (normalizedTypes) {
    db.prepare("UPDATE app_settings SET value = ?, updatedAt = datetime('now') WHERE key = 'telegramNotificationTypes'")
      .run(JSON.stringify(normalizedTypes));
  }

  const enabledNow = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegramEnabled'").get() as any)?.value === '1';
  const tokenNow = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegramBotToken'").get() as any)?.value || '';
  const chatNow = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegramChatId'").get() as any)?.value || '';
  if (enabledNow && (!tokenNow || !chatNow)) {
    return res.status(400).json({ error: 'To enable notifications, both Telegram bot token and Telegram chat ID are required.' });
  }
  const notificationTimeNow = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegramNotificationTime'").get() as any)?.value || '09:00';
  const notificationTypesNow = readNotificationTypesSetting();
  res.json({ enabled: enabledNow, chatId: chatNow, hasToken: !!tokenNow, notificationTime: notificationTimeNow, notificationTypes: notificationTypesNow });
});

router.post('/notifications-test', async (req: AuthRequest, res: Response) => {
  const requester = db.prepare('SELECT id, role, displayName FROM users WHERE id = ?').get(req.userId) as any;
  if (!requester || requester.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const { botToken, chatId } = req.body as { botToken?: string; chatId?: string };
  const result = await sendTelegramMessageDetailed(
    `TidyQuest test notification from ${requester.displayName} (${new Date().toISOString()})`,
    { ignoreEnabled: true, botToken, chatId }
  );
  if (!result.ok) {
    return res.status(400).json({ error: result.error || 'Telegram notification failed.' });
  }
  res.json({ success: true });
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.id as string);

  const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.userId) as any;
  if (!requester || requester.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  if (targetId === req.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(targetId) as any;
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
    if (adminCount.count <= 1) {
      return res.status(400).json({ error: 'At least one admin is required' });
    }
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.json({ success: true });
});

router.get('/registration-config', authMiddleware, (req: AuthRequest, res: Response) => {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'registrationEnabled'").get() as { value: string } | undefined;
  const registrationEnabled = row ? row.value !== '0' : true;
  res.json({ registrationEnabled });
});

router.put('/registration-config', authMiddleware, (req: AuthRequest, res: Response) => {
  const requestingUser = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId) as { role: string } | undefined;
  if (!requestingUser || requestingUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { registrationEnabled } = req.body;
  if (typeof registrationEnabled !== 'boolean') {
    return res.status(400).json({ error: 'registrationEnabled must be a boolean' });
  }

  db.prepare("UPDATE app_settings SET value = ?, updatedAt = datetime('now') WHERE key = 'registrationEnabled'")
    .run(registrationEnabled ? '1' : '0');

  res.json({ registrationEnabled });
});

export default router;
