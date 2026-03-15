export function getHealthColor(h: number): string {
  return h >= 70 ? 'var(--health-green)' : h >= 40 ? 'var(--health-yellow)' : 'var(--health-red)';
}

export function getHealthBg(h: number): string {
  return h >= 70 ? 'var(--health-green-bg)' : h >= 40 ? 'var(--health-yellow-bg)' : 'var(--health-red-bg)';
}

export function getHealthLabel(h: number): string {
  return h >= 70 ? 'Healthy' : h >= 40 ? 'Needs attention' : 'Critical';
}

export function getRoomHealth(tasks: Array<{ health: number; effort: number }>): number {
  const totalEffort = tasks.reduce((s, t) => s + t.effort, 0);
  if (totalEffort === 0) return 100;
  return Math.round(tasks.reduce((s, t) => s + t.health * t.effort, 0) / totalEffort);
}
