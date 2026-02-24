import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: AuthRequest, res: Response) => {
  const requested = String(req.query.period || 'week');
  const period = ['week', 'month', 'quarter', 'year'].includes(requested)
    ? (requested as 'week' | 'month' | 'quarter' | 'year')
    : 'week';

  // Calculate date range
  const now = new Date();
  let startDate: string;

  if (period === 'week') {
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    startDate = monday.toISOString();
  } else if (period === 'month') {
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = firstOfMonth.toISOString();
  } else if (period === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const firstOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);
    startDate = firstOfQuarter.toISOString();
  } else {
    const firstOfYear = new Date(now.getFullYear(), 0, 1);
    startDate = firstOfYear.toISOString();
  }

  const users = db.prepare(
    'SELECT id, username, displayName, avatarColor, avatarType, avatarPreset, avatarPhotoUrl, coins, currentStreak FROM users'
  ).all() as any[];

  const leaderboard = users.map((user) => {
    const result = db.prepare(
      "SELECT COALESCE(SUM(coinsEarned), 0) as points FROM task_completions WHERE userId = ? AND status = 'approved' AND completedAt >= ?"
    ).get(user.id, startDate) as any;

    return {
      ...user,
      points: result.points,
    };
  });

  leaderboard.sort((a, b) => b.points - a.points);
  res.json(leaderboard);
});

export default router;
