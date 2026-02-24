import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: AuthRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const rawHistory = db.prepare(`
    SELECT tc.id, tc.completedAt, tc.coinsEarned, tc.taskId,
           t.name as taskName, t.translationKey, t.roomId, t.assignmentMode,
           r.name as roomName, r.roomType,
           u.id as userId, u.displayName, u.avatarColor, u.avatarType, u.avatarPreset, u.avatarPhotoUrl
    FROM task_completions tc
    JOIN tasks t ON tc.taskId = t.id
    JOIN rooms r ON t.roomId = r.id
    JOIN users u ON tc.userId = u.id
    ORDER BY tc.completedAt DESC
  `).all() as any[];

  // Group shared-mode completions by (taskId, date) into a single entry with all participants
  const grouped: any[] = [];
  const seenSharedKeys = new Set<string>();

  for (const row of rawHistory) {
    if (row.assignmentMode === 'shared') {
      const key = `${row.taskId}:${row.completedAt.slice(0, 10)}`;
      if (seenSharedKeys.has(key)) continue;
      seenSharedKeys.add(key);

      const partners = rawHistory.filter((r: any) =>
        r.taskId === row.taskId &&
        r.completedAt.slice(0, 10) === row.completedAt.slice(0, 10) &&
        r.assignmentMode === 'shared'
      );

      grouped.push({
        ...row,
        coinsEarned: partners.reduce((s: number, p: any) => s + p.coinsEarned, 0),
        participants: partners.map((p: any) => ({
          id: p.userId, displayName: p.displayName, avatarColor: p.avatarColor,
          avatarType: p.avatarType, avatarPreset: p.avatarPreset, avatarPhotoUrl: p.avatarPhotoUrl,
          coinsEarned: p.coinsEarned,
        })),
      });
    } else {
      grouped.push(row);
    }
  }

  const total = grouped.length;
  const history = grouped.slice(offset, offset + limit);

  res.json({ history, total, limit, offset });
});

export default router;
