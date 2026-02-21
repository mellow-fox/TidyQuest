import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database';
import { AuthRequest, authMiddleware, generateToken } from '../middleware/auth';

// Simple in-memory rate limiter for auth endpoints
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 20; // max attempts per window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Periodically purge expired entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (entry.resetAt < now) loginAttempts.delete(key);
  }
}, RATE_LIMIT_WINDOW_MS);

const router = Router();

router.post('/register', (req: AuthRequest, res: Response) => {
  const { username, password, displayName, avatarColor, language } = req.body;

  if (!username || !password || !displayName) {
    return res.status(400).json({ error: 'username, password, and displayName are required' });
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

  // Block registration if disabled by admin — unless this is the very first user
  if (userCount.count > 0) {
    const regEnabled = (db.prepare("SELECT value FROM app_settings WHERE key = 'registrationEnabled'").get() as { value: string } | undefined)?.value;
    if (regEnabled === '0') {
      return res.status(403).json({ error: 'Registration is currently disabled by the administrator.' });
    }
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const role = userCount.count === 0 ? 'admin' : 'member';

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, displayName, passwordHash, role, avatarColor, language) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(username, displayName, passwordHash, role, avatarColor || '#F97316', language || 'en');

  const token = generateToken(result.lastInsertRowid as number);
  const user = db.prepare('SELECT id, username, displayName, role, avatarColor, avatarType, avatarPreset, avatarPhotoUrl, coins, currentStreak, goalCoins, goalStartAt, goalEndAt, language FROM users WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json({ token, user });
});

router.get('/registration-status', (_req: AuthRequest, res: Response) => {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'registrationEnabled'").get() as { value: string } | undefined;
  const registrationEnabled = row ? row.value !== '0' : true;
  res.json({ registrationEnabled });
});

router.post('/login', (req: AuthRequest, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user.id);
  const { passwordHash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = db.prepare(
    'SELECT id, username, displayName, role, avatarColor, avatarType, avatarPreset, avatarPhotoUrl, coins, currentStreak, goalCoins, goalStartAt, goalEndAt, lastActiveDate, isVacationMode, language, createdAt FROM users WHERE id = ?'
  ).get(req.userId) as any;

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

export default router;
