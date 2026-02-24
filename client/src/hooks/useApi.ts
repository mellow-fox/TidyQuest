const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('tidyquest_token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('tidyquest_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(errorBody.error || 'Request failed') as any;
    err.body = errorBody;
    throw err;
  }

  return res.json();
}

export const api = {
  // Auth
  register: (data: { username: string; password: string; displayName: string; avatarColor?: string; language?: string }) =>
    apiFetch<{ token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { username: string; password: string }) =>
    apiFetch<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiFetch<any>('/auth/me'),

  // Dashboard
  dashboard: () => apiFetch<any>('/dashboard'),

  // Rooms
  getRooms: () => apiFetch<any[]>('/rooms'),
  getDefaultTasks: (roomType: string) =>
    apiFetch<Array<{ name: string; frequencyDays: number; effort: number; isSeasonal?: boolean }>>(`/rooms/defaults/${roomType}`),
  createRoom: (data: { name: string; roomType: string; color?: string; accentColor?: string; tasks?: any[]; assignedUserId?: number | null }) =>
    apiFetch<any>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateRoom: (id: number, data: any) =>
    apiFetch<any>(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoom: (id: number) =>
    apiFetch<any>(`/rooms/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (roomId: number) => apiFetch<any[]>(`/rooms/${roomId}/tasks`),
  createTask: (roomId: number, data: { name: string; notes?: string; frequencyDays?: number; effort?: number; isSeasonal?: boolean; health?: number; iconKey?: string; assignedToChildren?: boolean; assignedUserIds?: number[]; assignmentMode?: 'first' | 'shared' | 'custom'; assignedUserPercentages?: Record<number, number> }) =>
    apiFetch<any>(`/rooms/${roomId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: number, data: any) =>
    apiFetch<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: number) =>
    apiFetch<any>(`/tasks/${id}`, { method: 'DELETE' }),
  completeTask: (id: number, onBehalfOfUserId?: number) =>
    apiFetch<{ coinsEarned: number; health: number }>(`/tasks/${id}/complete`, {
      method: 'POST', body: JSON.stringify(onBehalfOfUserId ? { onBehalfOfUserId } : {}),
    }),

  // Leaderboard
  leaderboard: (period: 'week' | 'month' | 'quarter' | 'year') => apiFetch<any[]>(`/leaderboard?period=${period}`),

  // History
  history: (limit = 20, offset = 0) => apiFetch<any>(`/history?limit=${limit}&offset=${offset}`),

  // Users
  getUsers: () => apiFetch<any[]>('/users'),
  createUser: (data: { username: string; password: string; displayName: string; avatarColor?: string; language?: string; role?: 'admin' | 'member' | 'child' }) =>
    apiFetch<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateSettings: (userId: number, data: { language?: string; isVacationMode?: boolean }) =>
    apiFetch<any>(`/users/${userId}/settings`, { method: 'PUT', body: JSON.stringify(data) }),
  updateProfile: (userId: number, data: { displayName?: string; avatarType?: string; avatarColor?: string; avatarPreset?: string | null; language?: string }) =>
    apiFetch<any>(`/users/${userId}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
  updatePassword: (userId: number, data: { currentPassword?: string; newPassword: string }) =>
    apiFetch<{ success: boolean }>(`/users/${userId}/password`, { method: 'PUT', body: JSON.stringify(data) }),
  updateUserRole: (userId: number, role: 'admin' | 'member' | 'child') =>
    apiFetch<any>(`/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  updateUserGoal: (userId: number, data: { goalCoins: number | null; goalStartAt?: string | null; goalEndAt?: string | null }) =>
    apiFetch<any>(`/users/${userId}/goal`, { method: 'PUT', body: JSON.stringify(data) }),
  getUserGoals: (userId: number) =>
    apiFetch<Array<{ id: number; userId: number; title: string; goalCoins: number; startAt?: string | null; endAt?: string | null; createdAt: string }>>(`/users/${userId}/goals`),
  createUserGoal: (userId: number, data: { title: string; goalCoins: number; startAt?: string | null; endAt?: string | null }) =>
    apiFetch<any>(`/users/${userId}/goals`, { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (goalId: number, data: { title: string; goalCoins: number; startAt?: string | null; endAt?: string | null }) =>
    apiFetch<any>(`/users/goals/${goalId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGoal: (goalId: number) =>
    apiFetch<{ success: boolean }>(`/users/goals/${goalId}`, { method: 'DELETE' }),
  deleteUser: (userId: number) =>
    apiFetch<{ success: boolean }>(`/users/${userId}`, { method: 'DELETE' }),
  getCoinsConfig: () => apiFetch<{ coinsByEffort: Record<number, number> }>('/users/coins-config'),
  updateCoinsConfig: (data: { coinsByEffort?: Record<number, number>; useDefault?: boolean }) =>
    apiFetch<{ coinsByEffort: Record<number, number> }>('/users/coins-config', { method: 'PUT', body: JSON.stringify(data) }),
  uploadAvatar: async (userId: number, file: File) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(`${API_BASE}/users/${userId}/avatar-upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }
    return res.json();
  },

  // Data
  exportData: () => apiFetch<any>('/export'),
  importData: (data: any) =>
    apiFetch<any>('/import', { method: 'POST', body: JSON.stringify(data) }),
  achievements: () => apiFetch<any>('/achievements'),
  getRegistrationStatus: () =>
    fetch('/api/auth/registration-status').then((r) => r.json()) as Promise<{ registrationEnabled: boolean }>,
  getRegistrationConfig: () =>
    apiFetch<{ registrationEnabled: boolean }>('/users/registration-config'),
  updateRegistrationConfig: (data: { registrationEnabled: boolean }) =>
    apiFetch<{ registrationEnabled: boolean }>('/users/registration-config', { method: 'PUT', body: JSON.stringify(data) }),
  getNotificationsConfig: () =>
    apiFetch<{
      enabled: boolean;
      chatId: string;
      hasToken: boolean;
      notificationTime: string;
      notificationTypes: { taskDue: boolean; rewardRequest: boolean; achievementUnlocked: boolean };
    }>('/users/notifications-config'),
  updateNotificationsConfig: (data: {
    enabled?: boolean;
    botToken?: string;
    chatId?: string;
    notificationTime?: string;
    notificationTypes?: { taskDue: boolean; rewardRequest: boolean; achievementUnlocked: boolean };
  }) =>
    apiFetch<{
      enabled: boolean;
      chatId: string;
      hasToken: boolean;
      notificationTime: string;
      notificationTypes: { taskDue: boolean; rewardRequest: boolean; achievementUnlocked: boolean };
    }>('/users/notifications-config', { method: 'PUT', body: JSON.stringify(data) }),
  sendNotificationsTest: (data?: { botToken?: string; chatId?: string }) =>
    apiFetch<{ success: boolean }>('/users/notifications-test', { method: 'POST', body: JSON.stringify(data || {}) }),
  getRewards: () =>
    apiFetch<{ rewards: Array<{ id: number; title: string; description?: string | null; costCoins: number }>; mine: Array<{ id: number; title: string; costCoins: number; redeemedAt: string; status: string }> }>('/rewards'),
  getRewardsAdmin: () =>
    apiFetch<{ rewards: any[]; redemptions: any[] }>('/rewards/admin'),
  updateRedemptionStatus: (id: number, status: 'requested' | 'approved' | 'rejected') =>
    apiFetch<any>(`/rewards/redemptions/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  cancelRedemption: (id: number) =>
    apiFetch<{ redemption: any; coins: number }>(`/rewards/redemptions/${id}/cancel`, { method: 'POST' }),
  createReward: (data: { title: string; description?: string; costCoins: number }) =>
    apiFetch<any>('/rewards', { method: 'POST', body: JSON.stringify(data) }),
  updateReward: (id: number, data: { title: string; description?: string; costCoins: number; isActive?: boolean }) =>
    apiFetch<any>(`/rewards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteReward: (id: number) =>
    apiFetch<{ success: boolean }>(`/rewards/${id}`, { method: 'DELETE' }),
  redeemReward: (id: number) =>
    apiFetch<{ redemption: any; coins: number }>(`/rewards/${id}/redeem`, { method: 'POST' }),

  cancelCompletion: (completionId: number) =>
    apiFetch<{ success: boolean; coinsDeducted: number }>(`/completions/${completionId}`, { method: 'DELETE' }),

  adjustCoins: (userId: number, amount: number) =>
    apiFetch<any>(`/users/${userId}/adjust-coins`, { method: 'POST', body: JSON.stringify({ amount }) }),

  getVacationConfig: () =>
    apiFetch<{ vacationMode: boolean; vacationStartDate: string | null; vacationEndDate: string | null }>('/users/vacation-config'),
  updateVacationConfig: (data: { vacationMode?: boolean; vacationEndDate?: string | null }) =>
    apiFetch<{ vacationMode: boolean; vacationStartDate: string | null; vacationEndDate: string | null }>('/users/vacation-config', { method: 'PUT', body: JSON.stringify(data) }),
};
