import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import roomsRoutes from './routes/rooms';
import tasksRoutes from './routes/tasks';
import dashboardRoutes from './routes/dashboard';
import leaderboardRoutes from './routes/leaderboard';
import historyRoutes from './routes/history';
import usersRoutes from './routes/users';
import dataRoutes from './routes/data';
import achievementsRoutes from './routes/achievements';
import rewardsRoutes from './routes/rewards';
import { sendDueTaskNotificationsIfNeeded } from './utils/notifications';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initDatabase();

// CORS: allow only in dev or via explicit env var (in production, frontend is served from same origin)
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV !== 'production' ? true : false);
app.use(cors({ origin: corsOrigin }));

app.use(express.json({ limit: '50mb' }));

// Prevent browser caching of API responses
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Serve uploaded avatars
const avatarsDir = path.join(__dirname, '..', '..', 'data', 'avatars');
app.use('/api/avatars', express.static(avatarsDir));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api', tasksRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', dataRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/rewards', rewardsRoutes);

// Serve static frontend in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));

// 404 handler for unknown API routes (must be before the SPA catch-all)
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TidyQuest server running on http://localhost:${PORT}`);
  void sendDueTaskNotificationsIfNeeded();
  setInterval(() => {
    void sendDueTaskNotificationsIfNeeded();
  }, 30000);
});
