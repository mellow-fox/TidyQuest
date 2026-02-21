import en from '../i18n/en.json';
import fr from '../i18n/fr.json';
import de from '../i18n/de.json';
import es from '../i18n/es.json';
import it from '../i18n/it.json';

type TranslationData = typeof en;

const translations: Record<string, TranslationData> = { en, fr, de, es, it };

export function useTranslation(language: string = 'en') {
  const lang = translations[language] || translations.en;
  const fallback = translations.en;

  function normalize(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /** Translate a task name: if translationKey exists and has a translation, use it; else return raw name */
  function taskName(name: string, translationKey: string | null | undefined): string {
    if (!translationKey) return name;

    // translationKey format: "room.task_key" e.g. "kitchen.wash_dishes"
    const [room, ...rest] = translationKey.split('.');
    const taskKey = rest.join('.');

    const roomTasks = (lang.tasks as any)?.[room];
    if (roomTasks && roomTasks[taskKey]) {
      return roomTasks[taskKey];
    }

    // Fallback to English
    const fallbackTasks = (fallback.tasks as any)?.[room];
    if (fallbackTasks && fallbackTasks[taskKey]) {
      return fallbackTasks[taskKey];
    }

    return name;
  }

  /** Translate a UI string by dot-notation key, e.g. "profile.title" */
  function t(key: string): string {
    const parts = key.split('.');
    let value: any = lang.ui;
    let fallbackValue: any = fallback.ui;

    for (const part of parts) {
      value = value?.[part];
      fallbackValue = fallbackValue?.[part];
    }

    return (typeof value === 'string' ? value : null)
      || (typeof fallbackValue === 'string' ? fallbackValue : null)
      || key;
  }

  /** Translate a room type name */
  function roomName(roomType: string): string {
    return (lang.rooms as any)?.[roomType]
      || (fallback.rooms as any)?.[roomType]
      || roomType;
  }

  function roomDisplayName(name: string | null | undefined, roomType: string): string {
    const raw = (name || '').trim();
    if (!raw) return roomName(roomType);

    const normalized = normalize(raw);
    for (const locale of Object.values(translations)) {
      const localized = (locale.rooms as any)?.[roomType];
      if (typeof localized === 'string' && normalize(localized) === normalized) {
        return roomName(roomType);
      }
    }
    return raw;
  }

  function timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return t('time.never');
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('time.justNow');
    if (mins < 60) return t('time.minutesAgo').replace('{count}', `${mins}`);
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('time.hoursAgo').replace('{count}', `${hours}`);
    const days = Math.floor(hours / 24);
    if (days === 1) return t('time.yesterday');
    if (days < 7) return t('time.daysAgo').replace('{count}', `${days}`);
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return t('time.oneWeekAgo');
    if (weeks < 5) return t('time.weeksAgo').replace('{count}', `${weeks}`);
    const months = Math.floor(days / 30);
    if (months === 1) return t('time.oneMonthAgo');
    return t('time.monthsAgo').replace('{count}', `${months}`);
  }

  return { taskName, t, roomName, roomDisplayName, timeAgo };
}
