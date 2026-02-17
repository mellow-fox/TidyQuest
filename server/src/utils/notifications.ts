import db from '../database';

interface TelegramSettings {
  enabled: boolean;
  botToken: string;
  chatId: string;
  notificationTime: string;
}

export interface NotificationTypeSettings {
  taskDue: boolean;
  rewardRequest: boolean;
  achievementUnlocked: boolean;
}

function getSetting(key: string): string {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value?: string } | undefined;
  return row?.value || '';
}

export function getTelegramSettings(): TelegramSettings {
  return {
    enabled: getSetting('telegramEnabled') === '1',
    botToken: getSetting('telegramBotToken'),
    chatId: getSetting('telegramChatId'),
    notificationTime: normalizeNotificationTime(getSetting('telegramNotificationTime')),
  };
}

const DEFAULT_NOTIFICATION_TYPES: NotificationTypeSettings = {
  taskDue: true,
  rewardRequest: true,
  achievementUnlocked: true,
};

export function getNotificationTypeSettings(): NotificationTypeSettings {
  const raw = getSetting('telegramNotificationTypes');
  if (!raw) return DEFAULT_NOTIFICATION_TYPES;
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationTypeSettings>;
    return {
      taskDue: parsed.taskDue !== false,
      rewardRequest: parsed.rewardRequest !== false,
      achievementUnlocked: parsed.achievementUnlocked !== false,
    };
  } catch {
    return DEFAULT_NOTIFICATION_TYPES;
  }
}

export function isNotificationTypeEnabled(type: keyof NotificationTypeSettings): boolean {
  return getNotificationTypeSettings()[type];
}

interface SendTelegramMessageOptions {
  ignoreEnabled?: boolean;
  botToken?: string;
  chatId?: string;
}

interface TelegramSendResult {
  ok: boolean;
  error?: string;
}

function normalizeNotificationTime(value: string): string {
  const trimmed = value.trim();
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed) ? trimmed : '09:00';
}

function toLocalIsoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDueIsoDay(task: { lastCompletedAt: string | null; frequencyDays: number }, now: Date): string {
  const safeFrequency = Math.max(1 / 24, Number(task.frequencyDays) || 7);
  const dueTs = task.lastCompletedAt
    ? new Date(task.lastCompletedAt).getTime() + safeFrequency * 86400000
    : now.getTime();
  return toLocalIsoDay(new Date(dueTs));
}

export async function sendTelegramMessageDetailed(message: string, options: SendTelegramMessageOptions = {}): Promise<TelegramSendResult> {
  const cfg = getTelegramSettings();
  const botToken = options.botToken?.trim() || cfg.botToken;
  const chatId = options.chatId?.trim() || cfg.chatId;
  if (!botToken) return { ok: false, error: 'Telegram bot token is missing.' };
  if (!chatId) return { ok: false, error: 'Telegram chat ID is missing.' };
  if (!cfg.enabled && !options.ignoreEnabled) return { ok: false, error: 'Notifications are disabled.' };

  // Security: Validate Telegram bot token format to prevent SSRF
  // Telegram tokens have format: 123456789:ABCdef-GHIjkl_MNOpqr
  // Must contain only digits, letters, hyphens, underscores, and exactly one colon
  const telegramTokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
  if (!telegramTokenPattern.test(botToken)) {
    return { ok: false, error: 'Invalid Telegram bot token format.' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });
    if (response.ok) return { ok: true };

    const body = await response.json().catch(() => null) as { description?: string } | null;
    const details = body?.description ? ` ${body.description}` : '';
    return { ok: false, error: `Telegram API rejected the request.${details}`.trim() };
  } catch {
    return { ok: false, error: 'Could not reach Telegram API (network/connectivity issue).' };
  }
}

export async function sendTelegramMessage(message: string, options: SendTelegramMessageOptions = {}): Promise<boolean> {
  const result = await sendTelegramMessageDetailed(message, options);
  return result.ok;
}

let lastCheckedMinute: string | null = null;

export async function sendDueTaskNotificationsIfNeeded(
  now: Date = new Date(),
  sendFn: (message: string) => Promise<boolean> = (message) => sendTelegramMessage(message),
): Promise<void> {
  const cfg = getTelegramSettings();
  if (!cfg.enabled || !cfg.botToken || !cfg.chatId) return;
  if (!isNotificationTypeEnabled('taskDue')) return;

  const currentMinute = `${toLocalIsoDay(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (currentMinute === lastCheckedMinute) return;
  lastCheckedMinute = currentMinute;

  const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (nowHm !== cfg.notificationTime) return;

  const today = toLocalIsoDay(now);
  const tasks = db.prepare(
    `SELECT t.id, t.name, t.frequencyDays, t.lastCompletedAt, r.name as roomName
     FROM tasks t
     LEFT JOIN rooms r ON r.id = t.roomId
     WHERE t.isSeasonal = 0`
  ).all() as Array<{
    id: number;
    name: string;
    frequencyDays: number;
    lastCompletedAt: string | null;
    roomName: string | null;
  }>;

  for (const task of tasks) {
    const dueDate = getDueIsoDay(task, now);
    if (dueDate !== today) continue;

    const alreadySent = db.prepare(
      'SELECT id FROM task_due_notifications WHERE taskId = ? AND dueDate = ?'
    ).get(task.id, today) as { id: number } | undefined;
    if (alreadySent) continue;

    const sent = await sendFn(
      `Task due today: "${task.name}"${task.roomName ? ` (${task.roomName})` : ''}.`
    );
    if (!sent) continue;

    db.prepare(
      'INSERT OR IGNORE INTO task_due_notifications (taskId, dueDate) VALUES (?, ?)'
    ).run(task.id, today);
  }
}
