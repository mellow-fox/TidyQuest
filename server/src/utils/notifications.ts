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

/* ── ntfy ── */

interface NtfySettings {
  enabled: boolean;
  serverUrl: string;
  topic: string;
  token: string;
}

interface SendNtfyMessageOptions {
  ignoreEnabled?: boolean;
  serverUrl?: string;
  topic?: string;
  token?: string;
}

interface NtfySendResult {
  ok: boolean;
  error?: string;
}

export function getNtfySettings(): NtfySettings {
  return {
    enabled: getSetting('ntfyEnabled') === '1',
    serverUrl: getSetting('ntfyServerUrl') || 'https://ntfy.sh',
    topic: getSetting('ntfyTopic'),
    token: getSetting('ntfyToken'),
  };
}

export async function sendNtfyMessageDetailed(message: string, options: SendNtfyMessageOptions = {}): Promise<NtfySendResult> {
  const cfg = getNtfySettings();
  const serverUrl = (options.serverUrl?.trim() || cfg.serverUrl).replace(/\/+$/, '');
  const topic = options.topic?.trim() || cfg.topic;
  const token = options.token?.trim() || cfg.token;
  if (!topic) return { ok: false, error: 'ntfy topic is missing.' };
  if (!cfg.enabled && !options.ignoreEnabled) return { ok: false, error: 'ntfy notifications are disabled.' };

  // Validate URL to prevent SSRF
  try {
    const parsed = new URL(`${serverUrl}/${topic}`);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, error: 'ntfy server URL must use http or https.' };
    }
  } catch {
    return { ok: false, error: 'Invalid ntfy server URL.' };
  }

  try {
    const headers: Record<string, string> = { Title: 'TidyQuest' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${serverUrl}/${topic}`, {
      method: 'POST',
      headers,
      body: message,
    });
    if (response.ok) return { ok: true };
    const text = await response.text().catch(() => '');
    return { ok: false, error: `ntfy returned ${response.status}.${text ? ` ${text}` : ''}`.trim() };
  } catch {
    return { ok: false, error: 'Could not reach ntfy server (network/connectivity issue).' };
  }
}

export async function sendNtfyMessage(message: string, options: SendNtfyMessageOptions = {}): Promise<boolean> {
  const result = await sendNtfyMessageDetailed(message, options);
  return result.ok;
}

/* ── Unified sender ── */

export async function sendNotification(message: string): Promise<{ telegram?: boolean; ntfy?: boolean }> {
  const results: { telegram?: boolean; ntfy?: boolean } = {};
  const telegramCfg = getTelegramSettings();
  const ntfyCfg = getNtfySettings();

  if (telegramCfg.enabled && telegramCfg.botToken && telegramCfg.chatId) {
    results.telegram = await sendTelegramMessage(message);
  }
  if (ntfyCfg.enabled && ntfyCfg.topic) {
    results.ntfy = await sendNtfyMessage(message);
  }
  return results;
}

let lastCheckedMinute: string | null = null;

function isAnyProviderEnabled(): boolean {
  const tg = getTelegramSettings();
  const ntfy = getNtfySettings();
  return (tg.enabled && !!tg.botToken && !!tg.chatId) || (ntfy.enabled && !!ntfy.topic);
}

export async function sendDueTaskNotificationsIfNeeded(
  now: Date = new Date(),
  sendFn: (message: string) => Promise<boolean> = async (message) => {
    const r = await sendNotification(message);
    return (r.telegram ?? false) || (r.ntfy ?? false);
  },
): Promise<void> {
  if (!isAnyProviderEnabled()) return;
  if (!isNotificationTypeEnabled('taskDue')) return;

  const currentMinute = `${toLocalIsoDay(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (currentMinute === lastCheckedMinute) return;
  lastCheckedMinute = currentMinute;

  const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const notificationTime = normalizeNotificationTime(getSetting('telegramNotificationTime'));
  if (nowHm !== notificationTime) return;

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
