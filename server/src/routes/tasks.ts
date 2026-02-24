import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { calculateHealth, getCoinsForEffort } from '../utils/health';
import { suggestTaskIcon } from '../utils/taskIcons';
import { notifyAchievementUnlocksForUser } from '../utils/achievementNotifications';
import { ensureAdmin, getCoinsByEffortConfig, getGlobalVacation } from '../utils/adminHelpers';

const router = Router();
router.use(authMiddleware);

function hadDueTaskOnDate(dateIsoDay: string): boolean {
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
      const health = calculateHealth(t.lastCompletedAt, safeFreq, false, null);
      if (health < 100) return true;
    }
  }
  return false;
}

// List tasks for a room
router.get('/rooms/:roomId/tasks', (req: AuthRequest, res: Response) => {
  const vacation = getGlobalVacation();
  const room = db.prepare('SELECT assignedUserId FROM rooms WHERE id = ?').get(req.params.roomId) as any;
  const tasks = db.prepare('SELECT * FROM tasks WHERE roomId = ?').all(req.params.roomId) as any[];
  const now = new Date().toISOString();

  // Build users map for assignment resolution
  const allUsers = db.prepare('SELECT id, displayName, avatarColor, avatarType, avatarPreset, avatarPhotoUrl FROM users').all() as any[];
  const usersById = new Map(allUsers.map((u: any) => [u.id, u]));

  // Batch-fetch today's completions for all tasks in this room
  const taskIds = tasks.map((t: any) => t.id);
  const todayCompletions = taskIds.length > 0
    ? db.prepare(
        `SELECT tc.id as completionId, tc.taskId, tc.userId, u.displayName, u.avatarColor, u.avatarType, u.avatarPreset, u.avatarPhotoUrl
         FROM task_completions tc
         JOIN users u ON tc.userId = u.id
         WHERE tc.taskId IN (${taskIds.map(() => '?').join(',')}) AND date(tc.completedAt) = date(?)`
      ).all(...taskIds, now) as any[]
    : [];

  const completedTodayByTask = new Map(todayCompletions.map((c: any) => [c.taskId, {
    completionId: c.completionId, userId: c.userId, displayName: c.displayName, avatarColor: c.avatarColor,
    avatarType: c.avatarType, avatarPreset: c.avatarPreset, avatarPhotoUrl: c.avatarPhotoUrl,
  }]));

  // For shared mode tasks: collect per-user completions today
  const sharedCompletionsByTask = new Map<number, Array<{ userId: number; displayName: string; completionId: number }>>();
  for (const c of todayCompletions) {
    if (!sharedCompletionsByTask.has(c.taskId)) sharedCompletionsByTask.set(c.taskId, []);
    sharedCompletionsByTask.get(c.taskId)!.push({ userId: c.userId, displayName: c.displayName, completionId: c.completionId });
  }

  // Batch-fetch task_assignees for all tasks in this room
  const taskAssigneeRows = taskIds.length > 0
    ? db.prepare(`SELECT taskId, userId, coinPercentage FROM task_assignees WHERE taskId IN (${taskIds.map(() => '?').join(',')})`)
        .all(...taskIds) as { taskId: number; userId: number; coinPercentage: number }[]
    : [];
  const assigneesByTask = new Map<number, { userId: number; coinPercentage: number }[]>();
  for (const a of taskAssigneeRows) {
    if (!assigneesByTask.has(a.taskId)) assigneesByTask.set(a.taskId, []);
    assigneesByTask.get(a.taskId)!.push({ userId: a.userId, coinPercentage: a.coinPercentage });
  }

  const roomAssignedUserId = room?.assignedUserId ?? null;

  const tasksWithHealth = tasks.map((t) => {
    const taskAssigneeEntries = assigneesByTask.get(t.id) || [];
    const taskAssignedUserIds = taskAssigneeEntries.map(a => a.userId);
    // effectiveAssignedUserIds: room assignment overrides task assignment
    const effectiveAssignedUserIds = roomAssignedUserId ? [roomAssignedUserId] : taskAssignedUserIds;
    const assignedUsers = taskAssigneeEntries
      .map(a => {
        const u = usersById.get(a.userId);
        if (!u) return null;
        return { id: u.id, displayName: u.displayName, avatarColor: u.avatarColor, avatarType: u.avatarType, avatarPreset: u.avatarPreset, avatarPhotoUrl: u.avatarPhotoUrl, coinPercentage: a.coinPercentage };
      })
      .filter(Boolean);
    const mode = t.assignmentMode || 'first';
    return {
      ...t,
      isSeasonal: !!t.isSeasonal,
      assignedToChildren: !!t.assignedToChildren,
      assignedUserIds: taskAssignedUserIds,
      assignedUsers,
      effectiveAssignedUserIds,
      completedTodayBy: completedTodayByTask.get(t.id) || null,
      assignmentMode: mode,
      sharedCompletions: (mode === 'shared' || mode === 'custom') ? (sharedCompletionsByTask.get(t.id) || []) : undefined,
      health: calculateHealth(t.lastCompletedAt, t.frequencyDays, vacation.isVacation, vacation.startDate),
    };
  });

  res.json(tasksWithHealth);
});

// Create task
router.post('/rooms/:roomId/tasks', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { name, notes, frequencyDays, effort, isSeasonal, health, iconKey, assignedToChildren, assignedUserIds, assignmentMode, assignedUserPercentages } = req.body;
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

  // assignedUserIds and assignedToChildren are mutually exclusive
  const resolvedAssignedToChildren = (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) ? 0 : (assignedToChildren ? 1 : 0);
  const resolvedAssignmentMode = ['shared', 'custom'].includes(assignmentMode) ? assignmentMode : 'first';

  // Validate custom mode percentages sum to 100
  if (resolvedAssignmentMode === 'custom' && Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
    const total = assignedUserIds.reduce((s: number, uid: number) => s + ((assignedUserPercentages?.[Number(uid)] ?? 0)), 0);
    if (total !== 100) return res.status(400).json({ error: 'custom_percentages_must_sum_to_100' });
  }

  const result = db.prepare(
    'INSERT INTO tasks (roomId, name, notes, frequencyDays, effort, isSeasonal, lastCompletedAt, iconKey, assignedToChildren, assignmentMode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.params.roomId, name, notes || null, frequencyDays || 7, effort || 1, isSeasonal ? 1 : 0, lastCompletedAt, iconKey || suggestTaskIcon(name, null), resolvedAssignedToChildren, resolvedAssignmentMode);

  const newTaskId = result.lastInsertRowid as number;

  // Insert multi-user assignees
  if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
    const insertAssignee = db.prepare('INSERT OR IGNORE INTO task_assignees (taskId, userId, coinPercentage) VALUES (?, ?, ?)');
    for (const uid of assignedUserIds) {
      const pct = (assignedUserPercentages && typeof assignedUserPercentages === 'object') ? (assignedUserPercentages[Number(uid)] ?? 0) : 0;
      insertAssignee.run(newTaskId, Number(uid), pct);
    }
  }

  // If the room has a room-level assignedUserId, auto-assign this new task to that user
  const roomData = db.prepare('SELECT assignedUserId FROM rooms WHERE id = ?').get(req.params.roomId) as { assignedUserId: number | null } | undefined;
  if (roomData?.assignedUserId) {
    db.prepare('INSERT OR IGNORE INTO task_assignees (taskId, userId, coinPercentage) VALUES (?, ?, 0)')
      .run(newTaskId, roomData.assignedUserId);
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(newTaskId);
  res.status(201).json(task);
});

// Update task
router.put('/tasks/:id', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { name, notes, frequencyDays, effort, isSeasonal, health, iconKey, assignedToChildren, assignedUserIds, assignmentMode, assignedUserPercentages } = req.body;
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

  // assignedUserIds and assignedToChildren are mutually exclusive
  let resolvedAssignedToChildren: number | undefined;
  if (assignedUserIds !== undefined) {
    resolvedAssignedToChildren = (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) ? 0 : undefined;
  } else if (assignedToChildren !== undefined) {
    resolvedAssignedToChildren = assignedToChildren ? 1 : 0;
  }

  // Build dynamic SQL to support explicit null values
  const setClauses: string[] = [];
  const params: any[] = [];

  if (name !== undefined) { setClauses.push('name = COALESCE(?, name)'); params.push(name); }
  if (notes !== undefined) { setClauses.push('notes = ?'); params.push(notes || null); }
  if (frequencyDays !== undefined) { setClauses.push('frequencyDays = COALESCE(?, frequencyDays)'); params.push(frequencyDays); }
  if (effort !== undefined) { setClauses.push('effort = COALESCE(?, effort)'); params.push(effort); }
  if (isSeasonal !== undefined) { setClauses.push('isSeasonal = ?'); params.push(isSeasonal ? 1 : 0); }
  if (lastCompletedAt !== undefined) { setClauses.push('lastCompletedAt = COALESCE(?, lastCompletedAt)'); params.push(lastCompletedAt); }
  if (iconKey !== undefined) { setClauses.push('iconKey = COALESCE(?, iconKey)'); params.push(iconKey); }
  if (resolvedAssignedToChildren !== undefined) { setClauses.push('assignedToChildren = ?'); params.push(resolvedAssignedToChildren); }
  const resolvedMode = assignmentMode !== undefined ? (['shared', 'custom'].includes(assignmentMode) ? assignmentMode : 'first') : undefined;
  if (resolvedMode !== undefined) { setClauses.push('assignmentMode = ?'); params.push(resolvedMode); }

  // Validate custom mode percentages sum to 100
  if (resolvedMode === 'custom' && Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
    const total = assignedUserIds.reduce((s: number, uid: number) => s + ((assignedUserPercentages?.[Number(uid)] ?? 0)), 0);
    if (total !== 100) return res.status(400).json({ error: 'custom_percentages_must_sum_to_100' });
  }

  if (setClauses.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
  }

  // Update task_assignees if provided
  if (assignedUserIds !== undefined) {
    db.prepare('DELETE FROM task_assignees WHERE taskId = ?').run(req.params.id);
    if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
      const insertAssignee = db.prepare('INSERT OR IGNORE INTO task_assignees (taskId, userId, coinPercentage) VALUES (?, ?, ?)');
      for (const uid of assignedUserIds) {
        const pct = (assignedUserPercentages && typeof assignedUserPercentages === 'object') ? (assignedUserPercentages[Number(uid)] ?? 0) : 0;
        insertAssignee.run(Number(req.params.id), Number(uid), pct);
      }
      // Clear assignedToChildren when specific users are set
      db.prepare('UPDATE tasks SET assignedToChildren = 0 WHERE id = ?').run(req.params.id);
    }
  }

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any;
  res.json({ ...updated, assignedToChildren: !!updated.assignedToChildren });
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

  // Enforce assignment rules
  const room = db.prepare('SELECT assignedUserId FROM rooms WHERE id = ?').get(task.roomId) as any;
  const requester = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId) as any;
  const isAdminOrMember = requester?.role === 'admin' || requester?.role === 'member';

  // Support completing on behalf of another user (admin/member only)
  const { onBehalfOfUserId } = req.body;
  if (onBehalfOfUserId && !isAdminOrMember) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const effectiveUserId = (onBehalfOfUserId && isAdminOrMember)
    ? Number(onBehalfOfUserId)
    : req.userId!;

  if (room?.assignedUserId !== null && room?.assignedUserId !== undefined) {
    // Room-level assignment: only the assigned user, admins, and members can complete
    if (!isAdminOrMember && req.userId !== room.assignedUserId) {
      return res.status(403).json({ error: 'not_assigned' });
    }
  } else {
    // Check task-level multi-user assignment
    const taskAssignees = db.prepare('SELECT userId FROM task_assignees WHERE taskId = ?').all(task.id) as { userId: number }[];
    if (taskAssignees.length > 0) {
      if (!isAdminOrMember && !taskAssignees.some(a => a.userId === req.userId)) {
        return res.status(403).json({ error: 'not_assigned' });
      }
    }
  }
  // If task.assignedToChildren and no room/task-user assignment: all children allowed (no additional restriction needed)
  // If no assignment: everyone allowed

  // Always use server timestamp — never trust client-supplied completedAt
  const now = new Date().toISOString();

  // Block if effective user already completed this task today
  const alreadyDoneBySelf = db.prepare(
    "SELECT id FROM task_completions WHERE taskId = ? AND userId = ? AND date(completedAt) = date(?)"
  ).get(task.id, effectiveUserId, now);
  if (alreadyDoneBySelf) {
    return res.status(409).json({ error: 'already_done_today' });
  }

  if (task.assignmentMode !== 'shared' && task.assignmentMode !== 'custom') {
    // In 'first' mode: block if someone else already completed today
    const alreadyDoneByOther = db.prepare(
      "SELECT id FROM task_completions WHERE taskId = ? AND userId != ? AND date(completedAt) = date(?)"
    ).get(task.id, effectiveUserId, now);
    if (alreadyDoneByOther) {
      return res.status(409).json({ error: 'already_done_by_other' });
    }
  }

  // Fetch assignees once — needed for coin splitting and lastCompletedAt logic
  const taskAssignees = db.prepare('SELECT userId, coinPercentage FROM task_assignees WHERE taskId = ?').all(task.id) as { userId: number; coinPercentage: number }[];

  // Coin calculation based on assignment mode
  const totalCoins = getCoinsForEffort(task.effort, getCoinsByEffortConfig());
  let coins: number;
  if (task.assignmentMode === 'shared' && taskAssignees.length > 1) {
    coins = Math.floor(totalCoins / taskAssignees.length);
  } else if (task.assignmentMode === 'custom') {
    const row = taskAssignees.find(a => a.userId === effectiveUserId);
    coins = Math.floor(totalCoins * (row?.coinPercentage ?? 0) / 100);
  } else {
    coins = totalCoins;
  }

  // Record completion for the effective user
  db.prepare(
    'INSERT INTO task_completions (taskId, userId, completedAt, coinsEarned) VALUES (?, ?, ?, ?)'
  ).run(task.id, effectiveUserId, now, coins);

  // Update task lastCompletedAt based on assignment mode
  if (task.assignmentMode === 'shared' || task.assignmentMode === 'custom') {
    // In shared/custom mode: update lastCompletedAt only when ALL assignees have completed today
    if (taskAssignees.length > 0) {
      const doneCount = db.prepare(
        `SELECT COUNT(*) as cnt FROM task_completions WHERE taskId = ? AND date(completedAt) = date(?)`
      ).get(task.id, now) as { cnt: number };
      if (doneCount.cnt >= taskAssignees.length) {
        db.prepare('UPDATE tasks SET lastCompletedAt = ? WHERE id = ?').run(now, req.params.id);
      }
      // Else: don't update lastCompletedAt yet
    } else {
      db.prepare('UPDATE tasks SET lastCompletedAt = ? WHERE id = ?').run(now, req.params.id);
    }
  } else {
    db.prepare('UPDATE tasks SET lastCompletedAt = ? WHERE id = ?').run(now, req.params.id);
  }

  // Update effective user's coins
  db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(coins, effectiveUserId);

  // Update streak for effective user
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(effectiveUserId) as any;
  const today = new Date().toISOString().slice(0, 10);
  const streakVacation = getGlobalVacation();

  if (!streakVacation.isVacation && user.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let keepGapWithoutPenalty = false;
    if (user.lastActiveDate && user.lastActiveDate < yesterday) {
      keepGapWithoutPenalty = true;
      const start = new Date(`${user.lastActiveDate}T00:00:00.000Z`);
      const end = new Date(`${yesterday}T00:00:00.000Z`);
      for (let d = new Date(start.getTime() + 86400000); d <= end; d = new Date(d.getTime() + 86400000)) {
        const day = d.toISOString().slice(0, 10);
        if (hadDueTaskOnDate(day)) {
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
      .run(newStreak, today, effectiveUserId);
  }

  // Fire-and-forget achievement unlock notifications.
  void notifyAchievementUnlocksForUser(effectiveUserId);

  res.json({ coinsEarned: coins, health: 100 });
});

// Cancel (undo) a task completion — admin only
router.delete('/completions/:completionId', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const completion = db.prepare(
    'SELECT id, taskId, userId, coinsEarned FROM task_completions WHERE id = ?'
  ).get(req.params.completionId) as any;
  if (!completion) return res.status(404).json({ error: 'Completion not found' });

  // Deduct coins from user (min 0)
  db.prepare('UPDATE users SET coins = MAX(0, coins - ?) WHERE id = ?')
    .run(completion.coinsEarned, completion.userId);

  // Delete the completion record
  db.prepare('DELETE FROM task_completions WHERE id = ?').run(completion.id);

  // Update task.lastCompletedAt to the previous completion's completedAt (or NULL if none)
  const prev = db.prepare(
    'SELECT completedAt FROM task_completions WHERE taskId = ? ORDER BY completedAt DESC LIMIT 1'
  ).get(completion.taskId) as any;
  db.prepare('UPDATE tasks SET lastCompletedAt = ? WHERE id = ?')
    .run(prev?.completedAt || null, completion.taskId);

  res.json({ success: true, coinsDeducted: completion.coinsEarned });
});

export default router;
