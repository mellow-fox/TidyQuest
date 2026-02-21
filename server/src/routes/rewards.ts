import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { isNotificationTypeEnabled, sendTelegramMessage } from '../utils/notifications';
import { ensureAdmin } from '../utils/adminHelpers';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: AuthRequest, res: Response) => {
  const rewards = db.prepare(
    'SELECT id, title, description, costCoins, isActive, isPreset, createdBy, createdAt FROM rewards WHERE isActive = 1 ORDER BY costCoins ASC, id ASC'
  ).all();
  const mine = db.prepare(
    `SELECT rr.id, rr.rewardId, rr.userId, rr.costCoins, rr.redeemedAt, rr.status, r.title
     FROM reward_redemptions rr
     JOIN rewards r ON rr.rewardId = r.id
     WHERE rr.userId = ?
     ORDER BY rr.redeemedAt DESC
     LIMIT 20`
  ).all(req.userId);
  res.json({ rewards, mine });
});

router.get('/admin', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) return res.status(403).json({ error: 'Admin only' });
  const rewards = db.prepare(
    'SELECT id, title, description, costCoins, isActive, isPreset, createdBy, createdAt FROM rewards ORDER BY isActive DESC, costCoins ASC, id ASC'
  ).all();
  const redemptions = db.prepare(
    `SELECT rr.id, rr.rewardId, rr.userId, rr.costCoins, rr.redeemedAt, rr.status, r.title, u.displayName
     FROM reward_redemptions rr
     JOIN rewards r ON rr.rewardId = r.id
     JOIN users u ON rr.userId = u.id
     ORDER BY rr.redeemedAt DESC
     LIMIT 50`
  ).all();
  res.json({ rewards, redemptions });
});

router.put('/redemptions/:id', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) return res.status(403).json({ error: 'Admin only' });
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body as { status?: 'requested' | 'approved' | 'rejected' | 'cancelled' };
  if (!status || !['requested', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const row = db.prepare('SELECT id, userId, costCoins, status FROM reward_redemptions WHERE id = ?').get(id) as any;
  if (!row) return res.status(404).json({ error: 'Redemption not found' });
  db.transaction(() => {
    db.prepare('UPDATE reward_redemptions SET status = ? WHERE id = ?').run(status, id);
    // Refund coins exactly once when moving from requested -> rejected
    if (status === 'rejected' && row.status === 'requested') {
      db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(row.costCoins, row.userId);
    }
  })();
  const updated = db.prepare(
    `SELECT rr.id, rr.rewardId, rr.userId, rr.costCoins, rr.redeemedAt, rr.status, r.title, u.displayName
     FROM reward_redemptions rr
     JOIN rewards r ON rr.rewardId = r.id
     JOIN users u ON rr.userId = u.id
     WHERE rr.id = ?`
  ).get(id);
  res.json(updated);
});

router.post('/redemptions/:id/cancel', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const row = db.prepare('SELECT id, userId, costCoins, status FROM reward_redemptions WHERE id = ?').get(id) as any;
  if (!row) return res.status(404).json({ error: 'Redemption not found' });
  if (row.userId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  if (row.status !== 'requested') return res.status(400).json({ error: 'Only requested rewards can be cancelled' });

  db.transaction(() => {
    db.prepare("UPDATE reward_redemptions SET status = 'cancelled' WHERE id = ?").run(id);
    db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(row.costCoins, row.userId);
  })();

  const updated = db.prepare(
    `SELECT rr.id, rr.rewardId, rr.userId, rr.costCoins, rr.redeemedAt, rr.status, r.title
     FROM reward_redemptions rr
     JOIN rewards r ON rr.rewardId = r.id
     WHERE rr.id = ?`
  ).get(id);
  const user = db.prepare('SELECT coins FROM users WHERE id = ?').get(req.userId) as any;
  res.json({ redemption: updated, coins: user?.coins ?? 0 });
});

router.post('/', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) return res.status(403).json({ error: 'Admin only' });
  const { title, description, costCoins } = req.body as { title?: string; description?: string; costCoins?: number };
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return res.status(400).json({ error: 'title is required' });
  const cost = Math.round(Number(costCoins));
  if (!Number.isFinite(cost) || cost <= 0) return res.status(400).json({ error: 'costCoins must be > 0' });

  const result = db.prepare(
    'INSERT INTO rewards (title, description, costCoins, isActive, isPreset, createdBy) VALUES (?, ?, ?, 1, 0, ?)'
  ).run(cleanTitle, description?.trim() || null, cost, req.userId);
  const created = db.prepare(
    'SELECT id, title, description, costCoins, isActive, isPreset, createdBy, createdAt FROM rewards WHERE id = ?'
  ).get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) return res.status(403).json({ error: 'Admin only' });
  const id = parseInt(req.params.id as string, 10);
  const reward = db.prepare('SELECT id FROM rewards WHERE id = ?').get(id) as any;
  if (!reward) return res.status(404).json({ error: 'Reward not found' });

  const { title, description, costCoins, isActive } = req.body as { title?: string; description?: string; costCoins?: number; isActive?: boolean };
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return res.status(400).json({ error: 'title is required' });
  const cost = Math.round(Number(costCoins));
  if (!Number.isFinite(cost) || cost <= 0) return res.status(400).json({ error: 'costCoins must be > 0' });

  db.prepare('UPDATE rewards SET title = ?, description = ?, costCoins = ?, isActive = ? WHERE id = ?')
    .run(cleanTitle, description?.trim() || null, cost, isActive === false ? 0 : 1, id);

  const updated = db.prepare(
    'SELECT id, title, description, costCoins, isActive, isPreset, createdBy, createdAt FROM rewards WHERE id = ?'
  ).get(id);
  res.json(updated);
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) return res.status(403).json({ error: 'Admin only' });
  const id = parseInt(req.params.id as string, 10);
  const reward = db.prepare('SELECT id FROM rewards WHERE id = ?').get(id) as any;
  if (!reward) return res.status(404).json({ error: 'Reward not found' });
  db.prepare('DELETE FROM rewards WHERE id = ?').run(id);
  res.json({ success: true });
});

router.post('/:id/redeem', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const reward = db.prepare('SELECT id, title, costCoins, isActive FROM rewards WHERE id = ?').get(id) as any;
  if (!reward || !reward.isActive) return res.status(404).json({ error: 'Reward not available' });
  const me = db.prepare('SELECT id, coins, displayName FROM users WHERE id = ?').get(req.userId) as any;
  if (!me) return res.status(404).json({ error: 'User not found' });
  if (me.coins < reward.costCoins) return res.status(400).json({ error: 'Not enough coins' });

  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET coins = coins - ? WHERE id = ?').run(reward.costCoins, req.userId);
    const redemption = db.prepare(
      "INSERT INTO reward_redemptions (rewardId, userId, costCoins, status) VALUES (?, ?, ?, 'requested')"
    ).run(id, req.userId, reward.costCoins);
    return redemption.lastInsertRowid;
  });
  const redemptionId = tx();
  const user = db.prepare('SELECT coins FROM users WHERE id = ?').get(req.userId) as any;
  const redemption = db.prepare(
    'SELECT id, rewardId, userId, costCoins, redeemedAt, status FROM reward_redemptions WHERE id = ?'
  ).get(redemptionId);

  if (isNotificationTypeEnabled('rewardRequest')) {
    void sendTelegramMessage(
      `🎁 Reward request: ${me.displayName} requested "${reward.title}" (${reward.costCoins} coins).`
    );
  }
  res.json({ redemption, coins: user.coins });
});

export default router;
