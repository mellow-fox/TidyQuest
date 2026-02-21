import Database from 'better-sqlite3';
import path from 'path';
import { suggestTaskIcon } from './utils/taskIcons';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'tidyquest.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      displayName TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'child',
      avatarColor TEXT NOT NULL DEFAULT '#F97316',
      coins INTEGER NOT NULL DEFAULT 0,
      currentStreak INTEGER NOT NULL DEFAULT 0,
      lastActiveDate TEXT,
      isVacationMode INTEGER NOT NULL DEFAULT 0,
      vacationStartDate TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      roomType TEXT NOT NULL DEFAULT 'other',
      color TEXT NOT NULL DEFAULT '#FFE4CC',
      accentColor TEXT NOT NULL DEFAULT '#F97316',
      photoUrl TEXT,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roomId INTEGER NOT NULL,
      name TEXT NOT NULL,
      notes TEXT,
      frequencyDays REAL NOT NULL DEFAULT 7,
      effort INTEGER NOT NULL DEFAULT 1,
      isSeasonal INTEGER NOT NULL DEFAULT 0,
      lastCompletedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      completedAt TEXT NOT NULL DEFAULT (datetime('now')),
      coinsEarned INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_due_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId INTEGER NOT NULL,
      dueDate TEXT NOT NULL,
      sentAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(taskId, dueDate),
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_achievement_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      achievementId TEXT NOT NULL,
      sentAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(userId, achievementId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      goalCoins INTEGER NOT NULL,
      startAt TEXT,
      endAt TEXT,
      createdBy INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      costCoins INTEGER NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      isPreset INTEGER NOT NULL DEFAULT 0,
      createdBy INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reward_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rewardId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      costCoins INTEGER NOT NULL,
      redeemedAt TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'requested',
      FOREIGN KEY (rewardId) REFERENCES rewards(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

  `);

  // Indexes for frequently queried columns
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_roomId ON tasks(roomId);
    CREATE INDEX IF NOT EXISTS idx_task_completions_userId ON task_completions(userId);
    CREATE INDEX IF NOT EXISTS idx_task_completions_taskId ON task_completions(taskId);
    CREATE INDEX IF NOT EXISTS idx_task_completions_completedAt ON task_completions(completedAt);
    CREATE INDEX IF NOT EXISTS idx_reward_redemptions_userId ON reward_redemptions(userId);
    CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);
  `);

  // Migrations: add new columns idempotently
  const migrations = [
    `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'child'`,
    `ALTER TABLE users ADD COLUMN avatarType TEXT NOT NULL DEFAULT 'letter'`,
    `ALTER TABLE users ADD COLUMN avatarPreset TEXT`,
    `ALTER TABLE users ADD COLUMN avatarPhotoUrl TEXT`,
    `ALTER TABLE users ADD COLUMN goalCoins INTEGER`,
    `ALTER TABLE users ADD COLUMN goalStartAt TEXT`,
    `ALTER TABLE users ADD COLUMN goalEndAt TEXT`,
    `ALTER TABLE tasks ADD COLUMN notes TEXT`,
    `ALTER TABLE tasks ADD COLUMN translationKey TEXT`,
    `ALTER TABLE tasks ADD COLUMN iconKey TEXT`,
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch (e: any) {
      // Ignore "duplicate column" errors (column already exists)
      if (!e.message?.includes('duplicate column')) {
        throw e;
      }
    }
  }

  // Populate translationKey for existing tasks that match default task names
  const TASK_NAME_TO_KEY: Record<string, string> = {
    'Wash Dishes': 'kitchen.wash_dishes',
    'Clean Counters': 'kitchen.clean_counters',
    'Wipe Stovetop': 'kitchen.wipe_stovetop',
    'Empty Trash': 'kitchen.empty_trash',
    'Empty Household Waste': 'kitchen.empty_household_waste',
    'Empty Compost': 'kitchen.empty_compost',
    'Empty Plastic Recycling': 'kitchen.empty_plastic_recycling',
    'Empty Glass Recycling': 'kitchen.empty_glass_recycling',
    'Clean Sink': 'kitchen.clean_sink',
    'Clean Kitchen Sink Drain': 'kitchen.clean_sink_drain',
    'Wipe Appliances': 'kitchen.wipe_appliances',
    'Mop Floor': 'kitchen.mop_floor',
    'Clean Microwave': 'kitchen.clean_microwave',
    'Wipe Cabinet Fronts': 'kitchen.wipe_cabinet_fronts',
    'Clean Fridge': 'kitchen.clean_fridge',
    'Defrost Freezer': 'kitchen.defrost_freezer',
    'Descale Kettle': 'kitchen.descale_kettle',
    'Clean Dishwasher': 'kitchen.clean_dishwasher',
    'Clean Dishwasher Filter': 'kitchen.clean_dishwasher_filter',
    'Check Dishwasher Salt': 'kitchen.check_dishwasher_salt',
    'Clean Oven': 'kitchen.clean_oven',
    'Clean Range Hood & Filter': 'kitchen.clean_range_hood',
    'Deep Clean Fridge': 'kitchen.deep_clean_fridge',
    'Organize Pantry': 'kitchen.organize_pantry',
    'Make Bed': 'bedroom.make_bed',
    'Tidy Nightstand': 'bedroom.tidy_nightstand',
    'Change Sheets': 'bedroom.change_sheets',
    'Vacuum Floor': 'bedroom.vacuum_floor',
    'Dust Surfaces': 'bedroom.dust_surfaces',
    'Clean Under Bed': 'bedroom.clean_under_bed',
    'Wash Pillows': 'bedroom.wash_pillows',
    'Wash Duvet/Comforter': 'bedroom.wash_duvet',
    'Change Fitted Sheet': 'bedroom.change_fitted_sheet',
    'Organize Closet': 'bedroom.organize_closet',
    'Flip/Rotate Mattress': 'bedroom.flip_mattress',
    'Clean Windows': 'bedroom.clean_windows',
    'Wash Curtains': 'bedroom.wash_curtains',
    'Wipe Sink & Counter': 'bathroom.wipe_sink_counter',
    'Squeegee Shower Glass': 'bathroom.squeegee_shower',
    'Scrub Toilet': 'bathroom.scrub_toilet',
    'Clean Mirror': 'bathroom.clean_mirror',
    'Wash Towels': 'bathroom.wash_towels',
    'Clean Shower/Tub': 'bathroom.clean_shower_tub',
    'Clean Sink Drain': 'bathroom.clean_sink_drain',
    'Clean Shower Drain': 'bathroom.clean_shower_drain',
    'Wash Bath Mat': 'bathroom.wash_bath_mat',
    'Wipe Light Switches & Door Handles': 'bathroom.wipe_switches_handles',
    'Clean Grout': 'bathroom.clean_grout',
    'Descale Showerhead': 'bathroom.descale_showerhead',
    'Wash Shower Curtain': 'bathroom.wash_shower_curtain',
    'Organize Cabinets & Drawers': 'bathroom.organize_cabinets',
    'Replace Toothbrush': 'bathroom.replace_toothbrush',
    'Tidy Up / Put Things Away': 'living.tidy_up',
    'Fluff & Tidy Cushions': 'living.fluff_cushions',
    'Vacuum Carpet/Floor': 'living.vacuum_carpet',
    'Dust Surfaces & Shelves': 'living.dust_surfaces_shelves',
    'Wipe TV Screen': 'living.wipe_tv',
    'Clean Remote Controls': 'living.clean_remotes',
    'Dust Lampshades & Light Fixtures': 'living.dust_lampshades',
    'Vacuum Sofa & Under Cushions': 'living.vacuum_sofa',
    'Wash Curtains/Blinds': 'living.wash_curtains_blinds',
    'Deep Clean Carpet/Rug': 'living.deep_clean_carpet',
    'Clean Behind Furniture': 'living.clean_behind_furniture',
    'Polish Wood Furniture': 'living.polish_furniture',
    'Clear Desk': 'office.clear_desk',
    'Wipe Desk Surface': 'office.wipe_desk',
    'Clean Keyboard & Mouse': 'office.clean_keyboard_mouse',
    'Wipe Monitor': 'office.wipe_monitor',
    'Empty Paper Trash/Shredder': 'office.empty_paper_trash',
    'Organize Cables': 'office.organize_cables',
    'Dust Shelves & Bookcase': 'office.dust_shelves',
    'Clean Desk Lamp': 'office.clean_desk_lamp',
    'Organize Drawers & Filing': 'office.organize_drawers',
    'Wipe Light Switches & Door Handle': 'office.wipe_switches',
    'Clean Chair (Fabric/Leather)': 'office.clean_chair',
    'Sweep Floor': 'garage.sweep_floor',
    'Organize Tools': 'garage.organize_tools',
    'Clean Workbench': 'garage.clean_workbench',
    'Clear Cobwebs': 'garage.clear_cobwebs',
    'Organize Storage Shelves': 'garage.organize_shelves',
    'Wipe Down Power Tools': 'garage.wipe_power_tools',
    'Sort Recycling & Waste': 'garage.sort_recycling',
    'Mop/Hose Floor': 'garage.mop_hose_floor',
    'Check & Organize Chemicals': 'garage.check_chemicals',
    'Clean Garage Door Tracks': 'garage.clean_door_tracks',
    'Wipe Washer Door Seal': 'laundry.wipe_washer_seal',
    'Clean Lint Filter': 'laundry.clean_lint_filter',
    'Wipe Machine Exterior': 'laundry.wipe_machine_exterior',
    'Run Washer Cleaning Cycle': 'laundry.run_cleaning_cycle',
    'Drain Washing Machine': 'laundry.drain_washing_machine',
    'Descale Washing Machine': 'laundry.descale_washing_machine',
    'Clean Detergent Drawer': 'laundry.clean_detergent_drawer',
    'Sweep/Mop Floor': 'laundry.sweep_mop_floor',
    'Organize Supplies & Detergents': 'laundry.organize_supplies',
    'Clean Dryer Vent': 'laundry.clean_dryer_vent',
    'Wipe Folding Surface': 'laundry.wipe_folding_surface',
    'Sort & Donate Old Clothes': 'laundry.sort_donate_clothes',
  };

  const updateStmt = db.prepare('UPDATE tasks SET translationKey = ? WHERE name = ? AND translationKey IS NULL');
  const updateIconStmt = db.prepare("UPDATE tasks SET iconKey = ? WHERE name = ? AND (iconKey IS NULL OR iconKey = '')");
  const updateMany = db.transaction(() => {
    for (const [name, key] of Object.entries(TASK_NAME_TO_KEY)) {
      updateStmt.run(key, name);
      updateIconStmt.run(suggestTaskIcon(name, key), name);
    }
  });
  updateMany();

  const tasksWithoutIcon = db.prepare("SELECT id, name, translationKey FROM tasks WHERE iconKey IS NULL OR iconKey = ''").all() as Array<{ id: number; name: string; translationKey?: string | null }>;
  const fillIcons = db.transaction(() => {
    const setById = db.prepare('UPDATE tasks SET iconKey = ? WHERE id = ?');
    for (const t of tasksWithoutIcon) {
      setById.run(suggestTaskIcon(t.name, t.translationKey || null), t.id);
    }
  });
  fillIcons();

  // Reclassify task icons once (guard via app_settings flag to avoid running on every startup)
  const iconsMigrated = (db.prepare("SELECT value FROM app_settings WHERE key = 'iconsMigrated_v2'").get() as { value: string } | undefined)?.value;
  if (iconsMigrated !== '1') {
    const OLD_ICON_KEYS = new Set(['sparkle', 'broom', 'box', 'tools', 'kitchen', 'bath', 'office', 'laundry', 'cobweb', 'sofa', 'rug', 'bed', 'window', 'trash']);
    const maybeReclassify = db.prepare('SELECT id, name, translationKey, iconKey FROM tasks').all() as Array<{
      id: number; name: string; translationKey?: string | null; iconKey?: string | null;
    }>;
    const refreshIcons = db.transaction(() => {
      const setById = db.prepare('UPDATE tasks SET iconKey = ? WHERE id = ?');
      for (const t of maybeReclassify) {
        const suggested = suggestTaskIcon(t.name, t.translationKey || null);
        const current = (t.iconKey || '').toLowerCase();
        if (!current || OLD_ICON_KEYS.has(current)) {
          if (suggested !== (t.iconKey || '')) setById.run(suggested, t.id);
        }
      }
    });
    refreshIcons();
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('iconsMigrated_v2', '1')").run();
  }

  // Default configurable coins mapping by effort
  db.prepare(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('coinsByEffort', ?)"
  ).run(JSON.stringify({ 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 }));
  db.prepare(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('telegramEnabled', '0')"
  ).run();
  db.prepare(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('telegramBotToken', '')"
  ).run();
  db.prepare(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('telegramChatId', '')"
  ).run();
  db.prepare(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('telegramNotificationTime', '09:00')"
  ).run();
  db.prepare(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('telegramNotificationTypes', ?)"
  ).run(JSON.stringify({ taskDue: true, rewardRequest: true, achievementUnlocked: true }));
  db.prepare(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('registrationEnabled', '1')"
  ).run();

  const rewardCount = (db.prepare('SELECT COUNT(*) as count FROM rewards').get() as { count: number }).count;
  if (rewardCount === 0) {
    const insertReward = db.prepare(
      'INSERT INTO rewards (title, description, costCoins, isPreset, isActive) VALUES (?, ?, ?, 1, 1)'
    );
    const defaults: Array<[string, string, number]> = [
      ['Movie Night Pick', 'Choisir le film du soir en famille.', 40],
      ['Ice Cream Treat', 'Une glace ou un dessert special.', 30],
      ['Stay Up 30 Min', 'Se coucher 30 minutes plus tard.', 35],
      ['Game Time Bonus', '30 minutes de jeu supplementaire.', 50],
      ['Choose Dinner', 'Choisir le menu du diner.', 45],
      ['Park Adventure', 'Sortie au parc en mode aventure.', 60],
      ['No-Chore Pass', 'Une tache au choix sautee cette semaine.', 80],
      ['Family Board Game', 'Choisir un jeu de societe pour la soiree.', 25],
    ];
    const seed = db.transaction(() => {
      defaults.forEach(([title, description, cost]) => insertReward.run(title, description, cost));
    });
    seed();
  }

  // Ensure there is always at least one admin user
  const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
  if (adminCount.count === 0) {
    const firstUser = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get() as { id: number } | undefined;
    if (firstUser) {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(firstUser.id);
    }
  }
}

export default db;
