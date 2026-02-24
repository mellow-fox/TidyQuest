import db from '../database';
import { DEFAULT_COINS_BY_EFFORT, normalizeCoinsByEffortConfig } from './health';

export function getGlobalVacation(): { isVacation: boolean; startDate: string | null; endDate: string | null } {
  const mode = (db.prepare("SELECT value FROM app_settings WHERE key = 'vacationMode'").get() as any)?.value;
  const startDate = (db.prepare("SELECT value FROM app_settings WHERE key = 'vacationStartDate'").get() as any)?.value || null;
  const endDate = (db.prepare("SELECT value FROM app_settings WHERE key = 'vacationEndDate'").get() as any)?.value || null;
  if (mode === '1' && endDate && new Date(endDate) < new Date()) {
    db.prepare("UPDATE app_settings SET value = '0', updatedAt = datetime('now') WHERE key = 'vacationMode'").run();
    db.prepare("UPDATE app_settings SET value = '', updatedAt = datetime('now') WHERE key = 'vacationStartDate'").run();
    db.prepare("UPDATE app_settings SET value = '', updatedAt = datetime('now') WHERE key = 'vacationEndDate'").run();
    return { isVacation: false, startDate: null, endDate: null };
  }
  return { isVacation: mode === '1', startDate: startDate || null, endDate: endDate || null };
}

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
