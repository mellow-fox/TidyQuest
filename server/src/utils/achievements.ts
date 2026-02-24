export interface AchievementDef {
  id: string;
  titleKey: string;
  descKey: string;
  icon: 'spark' | 'fire' | 'coin' | 'star' | 'crown' | 'broom' | 'heart' | 'shield' | 'rocket' | 'diamond';
  threshold: number;
  metric: 'completions' | 'streak' | 'coins' | 'rooms_clean' | 'weekly_tasks' | 'weekend_tasks' | 'perfect_weeks';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Getting started
  { id: 'first_task', titleKey: 'achievements.firstStep', descKey: 'achievements.firstStepDesc', icon: 'spark', threshold: 1, metric: 'completions' },
  { id: 'helper_10', titleKey: 'achievements.helper', descKey: 'achievements.helperDesc', icon: 'star', threshold: 10, metric: 'completions' },
  { id: 'busy_bee_25', titleKey: 'achievements.busyBee', descKey: 'achievements.busyBeeDesc', icon: 'broom', threshold: 25, metric: 'completions' },
  { id: 'cleaning_hero_50', titleKey: 'achievements.cleaningHero', descKey: 'achievements.cleaningHeroDesc', icon: 'shield', threshold: 50, metric: 'completions' },
  { id: 'chore_champion_100', titleKey: 'achievements.choreChampion', descKey: 'achievements.choreChampionDesc', icon: 'crown', threshold: 100, metric: 'completions' },
  { id: 'tidyquest_legend_250', titleKey: 'achievements.legend', descKey: 'achievements.legendDesc', icon: 'diamond', threshold: 250, metric: 'completions' },
  { id: 'unstoppable_500', titleKey: 'achievements.unstoppable', descKey: 'achievements.unstoppableDesc', icon: 'rocket', threshold: 500, metric: 'completions' },

  // Streaks
  { id: 'streak_3', titleKey: 'achievements.onFire', descKey: 'achievements.onFireDesc', icon: 'fire', threshold: 3, metric: 'streak' },
  { id: 'streak_7', titleKey: 'achievements.streakMaster', descKey: 'achievements.streakMasterDesc', icon: 'fire', threshold: 7, metric: 'streak' },
  { id: 'streak_14', titleKey: 'achievements.twoWeekWarrior', descKey: 'achievements.twoWeekWarriorDesc', icon: 'fire', threshold: 14, metric: 'streak' },
  { id: 'streak_30', titleKey: 'achievements.monthlyMachine', descKey: 'achievements.monthlyMachineDesc', icon: 'crown', threshold: 30, metric: 'streak' },
  { id: 'streak_100', titleKey: 'achievements.centurion', descKey: 'achievements.centurionDesc', icon: 'diamond', threshold: 100, metric: 'streak' },
  { id: 'streak_60_night_owl', titleKey: 'achievements.nightOwl', descKey: 'achievements.nightOwlDesc', icon: 'rocket', threshold: 60, metric: 'streak' },

  // Coins
  { id: 'coins_50', titleKey: 'achievements.piggyBank', descKey: 'achievements.piggyBankDesc', icon: 'coin', threshold: 50, metric: 'coins' },
  { id: 'coins_100', titleKey: 'achievements.saver', descKey: 'achievements.saverDesc', icon: 'coin', threshold: 100, metric: 'coins' },
  { id: 'coins_500', titleKey: 'achievements.treasureHunter', descKey: 'achievements.treasureHunterDesc', icon: 'coin', threshold: 500, metric: 'coins' },
  { id: 'coins_1000', titleKey: 'achievements.goldMaster', descKey: 'achievements.goldMasterDesc', icon: 'crown', threshold: 1000, metric: 'coins' },
  { id: 'coins_5000', titleKey: 'achievements.millionaire', descKey: 'achievements.millionaireDesc', icon: 'diamond', threshold: 5000, metric: 'coins' },

  // Room mastery
  { id: 'room_master_3', titleKey: 'achievements.roomTamer', descKey: 'achievements.roomTamerDesc', icon: 'heart', threshold: 3, metric: 'rooms_clean' },
  { id: 'room_master_5', titleKey: 'achievements.housePride', descKey: 'achievements.housePrideDesc', icon: 'shield', threshold: 5, metric: 'rooms_clean' },

  // Weekly productivity
  { id: 'weekly_5', titleKey: 'achievements.weekendWarrior', descKey: 'achievements.weekendWarriorDesc', icon: 'star', threshold: 5, metric: 'weekend_tasks' },
  { id: 'weekly_15', titleKey: 'achievements.superWeek', descKey: 'achievements.superWeekDesc', icon: 'rocket', threshold: 15, metric: 'weekly_tasks' },

  // Perfect weeks (all due tasks done)
  { id: 'perfect_1', titleKey: 'achievements.perfectWeek', descKey: 'achievements.perfectWeekDesc', icon: 'star', threshold: 1, metric: 'perfect_weeks' },
  { id: 'perfect_4', titleKey: 'achievements.perfectMonth', descKey: 'achievements.perfectMonthDesc', icon: 'crown', threshold: 4, metric: 'perfect_weeks' },
];

export interface AchievementStats {
  completions: number;
  streak: number;
  coins: number;
  rooms_clean: number;
  weekly_tasks: number;
  weekend_tasks: number;
  perfect_weeks: number;
}

export function buildAchievements(stats: AchievementStats) {
  return ACHIEVEMENTS.map((a) => {
    const value = stats[a.metric] ?? 0;
    const progress = Math.min(100, Math.round((value / a.threshold) * 100));
    return {
      id: a.id,
      titleKey: a.titleKey,
      descKey: a.descKey,
      icon: a.icon,
      threshold: a.threshold,
      value,
      progress,
      unlocked: value >= a.threshold,
    };
  });
}
