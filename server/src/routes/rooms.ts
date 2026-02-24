import { Router, Response } from 'express';
import db from '../database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { calculateHealth } from '../utils/health';
import { suggestTaskIcon } from '../utils/taskIcons';
import { ensureAdmin, getGlobalVacation } from '../utils/adminHelpers';

const router = Router();

// Default tasks per room type
const DEFAULT_TASKS: Record<string, Array<{ name: string; frequencyDays: number; effort: number; isSeasonal?: boolean; translationKey: string; iconKey?: string }>> = {
  kitchen: [
    { name: 'Wash Dishes', frequencyDays: 1, effort: 2, translationKey: 'kitchen.wash_dishes' },
    { name: 'Clean Counters', frequencyDays: 1, effort: 1, translationKey: 'kitchen.clean_counters' },
    { name: 'Wipe Stovetop', frequencyDays: 1, effort: 2, translationKey: 'kitchen.wipe_stovetop' },
    { name: 'Empty Household Waste', frequencyDays: 2, effort: 1, translationKey: 'kitchen.empty_household_waste' },
    { name: 'Empty Compost', frequencyDays: 2, effort: 1, translationKey: 'kitchen.empty_compost' },
    { name: 'Empty Plastic Recycling', frequencyDays: 7, effort: 1, translationKey: 'kitchen.empty_plastic_recycling' },
    { name: 'Empty Glass Recycling', frequencyDays: 14, effort: 1, translationKey: 'kitchen.empty_glass_recycling' },
    { name: 'Clean Sink', frequencyDays: 2, effort: 1, translationKey: 'kitchen.clean_sink' },
    { name: 'Clean Kitchen Sink Drain', frequencyDays: 30, effort: 2, translationKey: 'kitchen.clean_sink_drain' },
    { name: 'Wipe Appliances', frequencyDays: 7, effort: 2, translationKey: 'kitchen.wipe_appliances' },
    { name: 'Mop Floor', frequencyDays: 7, effort: 4, translationKey: 'kitchen.mop_floor' },
    { name: 'Clean Microwave', frequencyDays: 7, effort: 2, translationKey: 'kitchen.clean_microwave' },
    { name: 'Wipe Cabinet Fronts', frequencyDays: 14, effort: 2, translationKey: 'kitchen.wipe_cabinet_fronts' },
    { name: 'Clean Fridge', frequencyDays: 14, effort: 3, translationKey: 'kitchen.clean_fridge' },
    { name: 'Defrost Freezer', frequencyDays: 90, effort: 4, translationKey: 'kitchen.defrost_freezer' },
    { name: 'Descale Kettle', frequencyDays: 30, effort: 2, translationKey: 'kitchen.descale_kettle' },
    { name: 'Clean Dishwasher Filter', frequencyDays: 30, effort: 2, translationKey: 'kitchen.clean_dishwasher_filter' },
    { name: 'Check Dishwasher Salt', frequencyDays: 30, effort: 1, translationKey: 'kitchen.check_dishwasher_salt' },
    { name: 'Clean Oven', frequencyDays: 30, effort: 5, translationKey: 'kitchen.clean_oven' },
    { name: 'Clean Range Hood & Filter', frequencyDays: 90, effort: 4, translationKey: 'kitchen.clean_range_hood' },
    { name: 'Deep Clean Fridge', frequencyDays: 90, effort: 5, translationKey: 'kitchen.deep_clean_fridge' },
    { name: 'Organize Pantry', frequencyDays: 90, effort: 3, translationKey: 'kitchen.organize_pantry' },
  ],
  bedroom: [
    { name: 'Make Bed', frequencyDays: 1, effort: 1, translationKey: 'bedroom.make_bed' },
    { name: 'Tidy Nightstand', frequencyDays: 3, effort: 1, translationKey: 'bedroom.tidy_nightstand' },
    { name: 'Change Sheets', frequencyDays: 7, effort: 3, translationKey: 'bedroom.change_sheets' },
    { name: 'Vacuum Floor', frequencyDays: 7, effort: 2, translationKey: 'bedroom.vacuum_floor' },
    { name: 'Dust Surfaces', frequencyDays: 14, effort: 2, translationKey: 'bedroom.dust_surfaces' },
    { name: 'Clean Under Bed', frequencyDays: 30, effort: 3, translationKey: 'bedroom.clean_under_bed' },
    { name: 'Wash Pillows', frequencyDays: 90, effort: 3, translationKey: 'bedroom.wash_pillows' },
    { name: 'Wash Duvet/Comforter', frequencyDays: 90, effort: 4, translationKey: 'bedroom.wash_duvet' },
    { name: 'Change Fitted Sheet', frequencyDays: 14, effort: 2, translationKey: 'bedroom.change_fitted_sheet' },
    { name: 'Organize Closet', frequencyDays: 90, effort: 3, translationKey: 'bedroom.organize_closet' },
    { name: 'Flip/Rotate Mattress', frequencyDays: 180, effort: 4, translationKey: 'bedroom.flip_mattress' },
    { name: 'Clean Windows', frequencyDays: 90, effort: 3, isSeasonal: true, translationKey: 'bedroom.clean_windows' },
    { name: 'Wash Curtains', frequencyDays: 180, effort: 3, isSeasonal: true, translationKey: 'bedroom.wash_curtains' },
  ],
  bathroom: [
    { name: 'Wipe Sink & Counter', frequencyDays: 1, effort: 1, translationKey: 'bathroom.wipe_sink_counter' },
    { name: 'Squeegee Shower Glass', frequencyDays: 1, effort: 1, translationKey: 'bathroom.squeegee_shower' },
    { name: 'Scrub Toilet', frequencyDays: 3, effort: 3, translationKey: 'bathroom.scrub_toilet' },
    { name: 'Clean Mirror', frequencyDays: 3, effort: 1, translationKey: 'bathroom.clean_mirror' },
    { name: 'Wash Towels', frequencyDays: 7, effort: 2, translationKey: 'bathroom.wash_towels' },
    { name: 'Clean Shower/Tub', frequencyDays: 7, effort: 4, translationKey: 'bathroom.clean_shower_tub' },
    { name: 'Mop Floor', frequencyDays: 7, effort: 3, translationKey: 'bathroom.mop_floor' },
    { name: 'Clean Sink Drain', frequencyDays: 14, effort: 2, translationKey: 'bathroom.clean_sink_drain' },
    { name: 'Clean Shower Drain', frequencyDays: 14, effort: 2, translationKey: 'bathroom.clean_shower_drain' },
    { name: 'Wash Bath Mat', frequencyDays: 14, effort: 2, translationKey: 'bathroom.wash_bath_mat' },
    { name: 'Wipe Light Switches & Door Handles', frequencyDays: 14, effort: 1, translationKey: 'bathroom.wipe_switches_handles' },
    { name: 'Clean Grout', frequencyDays: 90, effort: 5, translationKey: 'bathroom.clean_grout' },
    { name: 'Descale Showerhead', frequencyDays: 90, effort: 2, translationKey: 'bathroom.descale_showerhead' },
    { name: 'Wash Shower Curtain', frequencyDays: 30, effort: 2, translationKey: 'bathroom.wash_shower_curtain' },
    { name: 'Organize Cabinets & Drawers', frequencyDays: 90, effort: 3, translationKey: 'bathroom.organize_cabinets' },
    { name: 'Replace Toothbrush', frequencyDays: 90, effort: 1, translationKey: 'bathroom.replace_toothbrush' },
  ],
  living: [
    { name: 'Tidy Up / Put Things Away', frequencyDays: 1, effort: 1, translationKey: 'living.tidy_up' },
    { name: 'Fluff & Tidy Cushions', frequencyDays: 3, effort: 1, translationKey: 'living.fluff_cushions' },
    { name: 'Vacuum Carpet/Floor', frequencyDays: 7, effort: 3, translationKey: 'living.vacuum_carpet' },
    { name: 'Dust Surfaces & Shelves', frequencyDays: 7, effort: 2, translationKey: 'living.dust_surfaces_shelves' },
    { name: 'Wipe TV Screen', frequencyDays: 14, effort: 1, translationKey: 'living.wipe_tv' },
    { name: 'Clean Remote Controls', frequencyDays: 14, effort: 1, translationKey: 'living.clean_remotes' },
    { name: 'Dust Lampshades & Light Fixtures', frequencyDays: 30, effort: 2, translationKey: 'living.dust_lampshades' },
    { name: 'Vacuum Sofa & Under Cushions', frequencyDays: 30, effort: 3, translationKey: 'living.vacuum_sofa' },
    { name: 'Clean Windows', frequencyDays: 90, effort: 4, isSeasonal: true, translationKey: 'living.clean_windows' },
    { name: 'Wash Curtains/Blinds', frequencyDays: 180, effort: 4, isSeasonal: true, translationKey: 'living.wash_curtains_blinds' },
    { name: 'Deep Clean Carpet/Rug', frequencyDays: 180, effort: 5, translationKey: 'living.deep_clean_carpet' },
    { name: 'Clean Behind Furniture', frequencyDays: 90, effort: 4, translationKey: 'living.clean_behind_furniture' },
    { name: 'Polish Wood Furniture', frequencyDays: 90, effort: 3, translationKey: 'living.polish_furniture' },
  ],
  office: [
    { name: 'Clear Desk', frequencyDays: 1, effort: 1, translationKey: 'office.clear_desk' },
    { name: 'Wipe Desk Surface', frequencyDays: 3, effort: 1, translationKey: 'office.wipe_desk' },
    { name: 'Clean Keyboard & Mouse', frequencyDays: 7, effort: 1, translationKey: 'office.clean_keyboard_mouse' },
    { name: 'Wipe Monitor', frequencyDays: 7, effort: 1, translationKey: 'office.wipe_monitor' },
    { name: 'Empty Paper Trash/Shredder', frequencyDays: 7, effort: 1, translationKey: 'office.empty_paper_trash' },
    { name: 'Vacuum Floor', frequencyDays: 7, effort: 2, translationKey: 'office.vacuum_floor' },
    { name: 'Organize Cables', frequencyDays: 30, effort: 2, translationKey: 'office.organize_cables' },
    { name: 'Dust Shelves & Bookcase', frequencyDays: 14, effort: 2, translationKey: 'office.dust_shelves' },
    { name: 'Clean Desk Lamp', frequencyDays: 30, effort: 1, translationKey: 'office.clean_desk_lamp' },
    { name: 'Organize Drawers & Filing', frequencyDays: 90, effort: 3, translationKey: 'office.organize_drawers' },
    { name: 'Wipe Light Switches & Door Handle', frequencyDays: 14, effort: 1, translationKey: 'office.wipe_switches' },
    { name: 'Clean Chair (Fabric/Leather)', frequencyDays: 90, effort: 3, translationKey: 'office.clean_chair' },
  ],
  garage: [
    { name: 'Sweep Floor', frequencyDays: 14, effort: 3, translationKey: 'garage.sweep_floor' },
    { name: 'Organize Tools', frequencyDays: 30, effort: 3, translationKey: 'garage.organize_tools' },
    { name: 'Clean Workbench', frequencyDays: 14, effort: 2, translationKey: 'garage.clean_workbench' },
    { name: 'Clear Cobwebs', frequencyDays: 30, effort: 2, translationKey: 'garage.clear_cobwebs' },
    { name: 'Organize Storage Shelves', frequencyDays: 90, effort: 4, translationKey: 'garage.organize_shelves' },
    { name: 'Wipe Down Power Tools', frequencyDays: 30, effort: 2, translationKey: 'garage.wipe_power_tools' },
    { name: 'Sort Recycling & Waste', frequencyDays: 7, effort: 2, translationKey: 'garage.sort_recycling' },
    { name: 'Mop/Hose Floor', frequencyDays: 90, effort: 4, translationKey: 'garage.mop_hose_floor' },
    { name: 'Check & Organize Chemicals', frequencyDays: 90, effort: 2, translationKey: 'garage.check_chemicals' },
    { name: 'Clean Garage Door Tracks', frequencyDays: 180, effort: 3, translationKey: 'garage.clean_door_tracks' },
  ],
  laundry: [
    { name: 'Wipe Washer Door Seal', frequencyDays: 7, effort: 1, translationKey: 'laundry.wipe_washer_seal' },
    { name: 'Clean Lint Filter', frequencyDays: 7, effort: 1, translationKey: 'laundry.clean_lint_filter' },
    { name: 'Wipe Machine Exterior', frequencyDays: 14, effort: 2, translationKey: 'laundry.wipe_machine_exterior' },
    { name: 'Run Washer Cleaning Cycle', frequencyDays: 30, effort: 2, translationKey: 'laundry.run_cleaning_cycle' },
    { name: 'Drain Washing Machine', frequencyDays: 90, effort: 2, translationKey: 'laundry.drain_washing_machine' },
    { name: 'Descale Washing Machine', frequencyDays: 60, effort: 2, translationKey: 'laundry.descale_washing_machine' },
    { name: 'Clean Detergent Drawer', frequencyDays: 30, effort: 2, translationKey: 'laundry.clean_detergent_drawer' },
    { name: 'Sweep/Mop Floor', frequencyDays: 14, effort: 2, translationKey: 'laundry.sweep_mop_floor' },
    { name: 'Organize Supplies & Detergents', frequencyDays: 30, effort: 2, translationKey: 'laundry.organize_supplies' },
    { name: 'Clean Dryer Vent', frequencyDays: 90, effort: 4, translationKey: 'laundry.clean_dryer_vent' },
    { name: 'Wipe Folding Surface', frequencyDays: 7, effort: 1, translationKey: 'laundry.wipe_folding_surface' },
    { name: 'Sort & Donate Old Clothes', frequencyDays: 180, effort: 3, translationKey: 'laundry.sort_donate_clothes' },
  ],
};

router.use(authMiddleware);

// List all rooms with computed health (single JOIN query — no N+1)
router.get('/', (req: AuthRequest, res: Response) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY sortOrder, id').all() as any[];
  const vacation = getGlobalVacation();

  // Fetch all tasks in one query, then group by roomId
  const allTasks = db.prepare('SELECT * FROM tasks').all() as any[];
  const tasksByRoom = new Map<number, any[]>();
  for (const t of allTasks) {
    if (!tasksByRoom.has(t.roomId)) tasksByRoom.set(t.roomId, []);
    tasksByRoom.get(t.roomId)!.push(t);
  }

  // Fetch all users for assignedUser resolution
  const allUsers = db.prepare('SELECT id, displayName, avatarColor, avatarType, avatarPreset, avatarPhotoUrl FROM users').all() as any[];
  const usersById = new Map(allUsers.map((u: any) => [u.id, u]));

  // Batch-fetch today's completions for Done button display
  const nowIso = new Date().toISOString();
  const todayCompletions = db.prepare(
    `SELECT tc.id as completionId, tc.taskId, tc.userId, u.displayName, u.avatarColor, u.avatarType, u.avatarPreset, u.avatarPhotoUrl
     FROM task_completions tc
     JOIN users u ON tc.userId = u.id
     WHERE date(tc.completedAt) = date(?)`
  ).all(nowIso) as any[];
  const completedTodayByTask = new Map(todayCompletions.map((c: any) => [c.taskId, {
    completionId: c.completionId, userId: c.userId, displayName: c.displayName, avatarColor: c.avatarColor,
    avatarType: c.avatarType, avatarPreset: c.avatarPreset, avatarPhotoUrl: c.avatarPhotoUrl,
  }]));

  // Build sharedCompletions map (all completions per task, for shared/duo mode)
  const sharedCompletionsByTask = new Map<number, Array<{ userId: number; displayName: string; completionId: number }>>();
  for (const c of todayCompletions as any[]) {
    if (!sharedCompletionsByTask.has(c.taskId)) sharedCompletionsByTask.set(c.taskId, []);
    sharedCompletionsByTask.get(c.taskId)!.push({ userId: c.userId, displayName: c.displayName, completionId: c.completionId });
  }

  // Batch-fetch all task_assignees
  const allTaskAssignees = db.prepare('SELECT taskId, userId, coinPercentage FROM task_assignees').all() as { taskId: number; userId: number; coinPercentage: number }[];
  const assigneesByTask = new Map<number, { userId: number; coinPercentage: number }[]>();
  for (const a of allTaskAssignees) {
    if (!assigneesByTask.has(a.taskId)) assigneesByTask.set(a.taskId, []);
    assigneesByTask.get(a.taskId)!.push({ userId: a.userId, coinPercentage: a.coinPercentage ?? 0 });
  }

  const roomsWithHealth = rooms.map((room) => {
    const tasks = tasksByRoom.get(room.id) || [];
    const roomAssignedUserId = room.assignedUserId || null;
    const tasksWithHealth = tasks.map((t) => {
      const taskAssigneeEntries = assigneesByTask.get(t.id) || [];
      const taskAssignedUserIds = taskAssigneeEntries.map(a => a.userId);
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

    const nonSeasonal = tasksWithHealth.filter((t) => !t.isSeasonal);
    const forAvg = nonSeasonal.length > 0 ? nonSeasonal : tasksWithHealth;
    const totalEffort = forAvg.reduce((s, t) => s + t.effort, 0);
    const health = totalEffort > 0
      ? Math.round(forAvg.reduce((s, t) => s + t.health * t.effort, 0) / totalEffort)
      : 100;

    const assignedUser = room.assignedUserId ? (usersById.get(room.assignedUserId) || null) : null;
    return { ...room, tasks: tasksWithHealth, health, assignedUser };
  });

  res.json(roomsWithHealth);
});

// Get default tasks for a room type
router.get('/defaults/:roomType', authMiddleware, (_req: AuthRequest, res: Response) => {
  const type = _req.params.roomType as string;
  const defaults = (DEFAULT_TASKS[type] || []).map((t) => ({
    ...t,
    iconKey: t.iconKey || suggestTaskIcon(t.name, t.translationKey),
  }));
  res.json(defaults);
});

// Create room (with user-selected tasks)
router.post('/', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { name, roomType, color, accentColor, tasks: customTasks, assignedUserId } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  // Validate assignedUserId if provided
  const resolvedAssignedUserId: number | null = assignedUserId != null ? Number(assignedUserId) : null;
  if (resolvedAssignedUserId !== null) {
    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(resolvedAssignedUserId);
    if (!targetUser) return res.status(400).json({ error: 'Assigned user not found' });
  }

  const type = roomType || 'other';
  const result = db.prepare(
    'INSERT INTO rooms (name, roomType, color, accentColor, assignedUserId) VALUES (?, ?, ?, ?, ?)'
  ).run(name, type, color || '#FFE4CC', accentColor || '#F97316', resolvedAssignedUserId);

  const roomId = result.lastInsertRowid;

  // Insert user-selected tasks, or fall back to defaults
  const tasksToInsert = customTasks && customTasks.length > 0
    ? customTasks
    : DEFAULT_TASKS[type] || [];

  const insert = db.prepare(
    'INSERT INTO tasks (roomId, name, frequencyDays, effort, isSeasonal, lastCompletedAt, translationKey, iconKey) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertedTaskIds: number[] = [];
  for (const task of tasksToInsert) {
    // If initialHealth is provided, compute a fake lastCompletedAt to represent current state
    let lastCompletedAt: string | null = null;
    if (task.initialHealth !== undefined && task.initialHealth < 100) {
      const daysSince = ((100 - task.initialHealth) / 100) * (task.frequencyDays || 7);
      const d = new Date(Date.now() - daysSince * 86400000);
      lastCompletedAt = d.toISOString();
    } else if (task.initialHealth === 100) {
      lastCompletedAt = new Date().toISOString();
    }
    const iconKey = task.iconKey || suggestTaskIcon(task.name, task.translationKey || null);
    const taskResult = insert.run(roomId, task.name, task.frequencyDays || 7, task.effort || 1, task.isSeasonal ? 1 : 0, lastCompletedAt, task.translationKey || null, iconKey);
    insertedTaskIds.push(taskResult.lastInsertRowid as number);
  }

  // If the room is assigned to a user, also assign all tasks to that user
  if (resolvedAssignedUserId !== null) {
    const insertAssignee = db.prepare('INSERT OR IGNORE INTO task_assignees (taskId, userId, coinPercentage) VALUES (?, ?, 0)');
    for (const taskId of insertedTaskIds) {
      insertAssignee.run(taskId, resolvedAssignedUserId);
    }
  }

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
  const allTasks = db.prepare('SELECT * FROM tasks WHERE roomId = ?').all(roomId);
  res.status(201).json({ ...room, tasks: allTasks });
});

// Update room
router.put('/:id', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { name, roomType, color, accentColor, sortOrder } = req.body;
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!room) return res.status(404).json({ error: 'Room not found' });

  // Build SQL dynamically to handle assignedUserId: null (explicit unset) vs undefined (not provided)
  const params: any[] = [name, roomType, color, accentColor, sortOrder];
  let sql = 'UPDATE rooms SET name = COALESCE(?, name), roomType = COALESCE(?, roomType), color = COALESCE(?, color), accentColor = COALESCE(?, accentColor), sortOrder = COALESCE(?, sortOrder)';

  if ('assignedUserId' in req.body) {
    const assignedUserId = req.body.assignedUserId;
    // Validate that user exists when setting (allow null to unset)
    if (assignedUserId !== null && assignedUserId !== undefined) {
      const targetUser = db.prepare('SELECT id, role FROM users WHERE id = ?').get(assignedUserId) as any;
      if (!targetUser) return res.status(400).json({ error: 'User not found' });

      // Check for tasks in this room already assigned to DIFFERENT users
      const roomTasks = db.prepare('SELECT id, name FROM tasks WHERE roomId = ?').all(req.params.id) as { id: number; name: string }[];
      if (roomTasks.length > 0) {
        const taskIds = roomTasks.map(t => t.id);
        const conflicting = db.prepare(
          `SELECT DISTINCT ta.taskId FROM task_assignees ta
           WHERE ta.taskId IN (${taskIds.map(() => '?').join(',')})
             AND ta.userId != ?`
        ).all(...taskIds, Number(assignedUserId)) as { taskId: number }[];

        if (conflicting.length > 0) {
          const conflictingTaskIds = new Set(conflicting.map(c => c.taskId));
          const conflictingTaskNames = roomTasks
            .filter(t => conflictingTaskIds.has(t.id))
            .map(t => t.name);

          // If force=true, clear conflicting assignments and proceed
          if (req.body.force !== true) {
            return res.status(409).json({
              error: 'tasks_have_conflicting_assignments',
              conflictingTaskNames,
            });
          }
          // Force mode: remove all existing task-level assignments for conflicting tasks
          const deleteAssignees = db.prepare('DELETE FROM task_assignees WHERE taskId = ?');
          for (const taskId of conflictingTaskIds) {
            deleteAssignees.run(taskId);
          }
        }
      }
    }
    sql += ', assignedUserId = ?';
    params.push(req.body.assignedUserId ?? null);
  }

  sql += ' WHERE id = ?';
  params.push(req.params.id);
  db.prepare(sql).run(...params);

  // If a new assignedUserId was just set, assign all tasks in this room to that user
  if ('assignedUserId' in req.body && req.body.assignedUserId != null) {
    const newUserId = Number(req.body.assignedUserId);
    const roomTasks = db.prepare('SELECT id FROM tasks WHERE roomId = ?').all(req.params.id) as { id: number }[];
    const insertAssignee = db.prepare('INSERT OR IGNORE INTO task_assignees (taskId, userId, coinPercentage) VALUES (?, ?, 0)');
    for (const t of roomTasks) {
      insertAssignee.run(t.id, newUserId);
    }
  }

  const updated = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;

  // Resolve assignedUser for the response
  const allUsers = db.prepare('SELECT id, displayName, avatarColor, avatarType, avatarPreset, avatarPhotoUrl FROM users').all() as any[];
  const usersById = new Map(allUsers.map((u: any) => [u.id, u]));
  const assignedUser = updated.assignedUserId ? (usersById.get(updated.assignedUserId) || null) : null;

  res.json({ ...updated, assignedUser });
});

// Delete room (cascades to tasks)
router.delete('/:id', (req: AuthRequest, res: Response) => {
  if (!ensureAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
