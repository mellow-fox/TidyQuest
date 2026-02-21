import db from '../database';
import { DEFAULT_COINS_BY_EFFORT, normalizeCoinsByEffortConfig } from './health';

export function ensureAdmin(userId: number | undefined): boolean {
  if (!userId) return false;
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined;
  return user?.role === 'admin';
}

export function getCoinsByEffortConfig(): Record<number, number> {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'coinsByEffort'").get() as { value?: string } | undefined;
  if (!row?.value) return DEFAULT_COINS_BY_EFFORT;
  try {
    return normalizeCoinsByEffortConfig(JSON.parse(row.value));
  } catch {
    return DEFAULT_COINS_BY_EFFORT;
  }
}
