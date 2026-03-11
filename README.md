# 🏠 TidyQuest

> Transform household chores into an epic family adventure

**TidyQuest** is a self-hosted web application that gamifies housework using RPG mechanics. Complete tasks, earn coins, unlock achievements, and compete with your family on the leaderboard.

![Version](https://img.shields.io/badge/version-0.4.0--beta-orange.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)

> [!WARNING]
> **Early-stage project** — TidyQuest is under active development. You may encounter bugs, incomplete features, or breaking changes between versions. Back up your data regularly and feel free to [open an issue](https://github.com/mellow-fox/TidyQuest/issues) if something breaks.

---

## ✨ What is TidyQuest?

TidyQuest turns boring chores into quests:
- **🎯 Health Bars**: Each task has a visual health indicator that decays over time
- **💰 Coins & Rewards**: Earn coins by completing tasks, redeem for family rewards
- **🔥 Streaks**: Build daily/weekly streaks to stay motivated
- **🏆 Leaderboard**: Compete with family members for top position
- **🎖️ Achievements**: Unlock badges for milestones (100 tasks, 30-day streak, etc.)
- **📅 Calendar View**: See upcoming due dates at a glance
- **🌍 Multilingual**: English, French, German, Spanish, Italian
- **📱 Notifications**: Optional reminders via Telegram or ntfy

Perfect for families who want to:
- Make chores fun for kids
- Track household responsibilities
- Encourage teamwork with gamification
- Build consistent cleaning habits

---

## 📸 Screenshots

<details>
<summary>Click to view screenshots</summary>

### Dashboard
![Dashboard](screenshots/dashboard.jpg)
*Main dashboard showing task overview, streaks, and quick stats*

### Rooms & Tasks
![Rooms](screenshots/rooms.jpg)
*Room view with task health bars and completion tracking*

### Leaderboard
![Leaderboard](screenshots/leaderboard.jpg)
*Family competition with weekly/monthly rankings*

### Rewards
![Rewards](screenshots/rewards.jpg)
*Reward catalog and redemption system*

### Achievements
![Achievements](screenshots/achievements.jpg)
*Unlock badges for completing milestones*

</details>

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- 100MB disk space
- Port 3020 available

### Installation

**Choose your deployment method:**

#### Option A: Docker Hub Image (Recommended)

Fastest way to get started using pre-built multi-platform image:

1. **Create project directory**
   ```bash
   mkdir tidyquest && cd tidyquest
   ```

2. **Create docker-compose.yml**
   ```yaml
   services:
     tidyquest:
       image: mellowfox/tidyquest:latest
       container_name: tidyquest
       ports:
         - "3020:3000"
       environment:
         - NODE_ENV=production
         - JWT_SECRET=CHANGE_THIS_TO_SECURE_RANDOM_STRING_MIN_32_CHARS
       volumes:
         - ./data:/app/data
       restart: unless-stopped
   ```

3. **Generate secure JWT_SECRET**
   ```bash
   openssl rand -base64 32
   # Copy output and replace JWT_SECRET in docker-compose.yml
   ```

4. **Launch**
   ```bash
   docker compose up -d
   ```

   Access at **http://localhost:3020**

#### Option B: Build from Source

For development or customization:

1. **Clone the repository**
   ```bash
   git clone https://github.com/mellow-fox/TidyQuest.git
   cd TidyQuest
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and set a secure JWT_SECRET
   # Generate one: openssl rand -base64 32
   ```

3. **Build and launch**
   ```bash
   docker compose up -d --build
   ```

   Access at **http://localhost:3020**

### First Login
On first launch, the database is empty. Create an admin account via the **Register** page.

---

## 🎮 Features

### For Everyone
- ✅ **Complete Tasks**: Mark chores as done, earn coins
- 💎 **Redeem Rewards**: Request rewards like "Movie Night Pick" or "Extra Game Time"
- 📊 **Track Progress**: See your current streak, coins, and achievements
- 🏠 **Room Management**: Organize tasks by room (Kitchen, Bedroom, Bathroom, etc.)

### For Admins
- 👥 **User Management**: Create family members (admin/member/child roles)
- 📝 **Task CRUD**: Create, edit, delete tasks with custom frequencies (1-365 days)
- 🎁 **Reward System**: Approve/reject reward requests, manage and customize catalog
- ⚙️ **Global Settings**: Configure coins-per-effort, notifications (Telegram or ntfy)
- 🏖️ **Vacation Mode**: Pause task health decay globally or per member, with individual return dates
- 📤 **Backup/Restore**: Export full database as JSON
- 👤 **Task Assignment**: Assign tasks to specific users with three modes:
  - **First** — first person to complete earns all coins
  - **Shared** — each assignee completes once; coins split equally
  - **Custom** — define a custom coin percentage per assignee (e.g. 70% / 30%)
- ✅ **Strict Mode**: Require admin approval before task completions count
- 💑 **Couple Mode**: Disable gamification (coins, streaks, leaderboard) for simpler tracking
- 🔑 **Password Recovery**: Reset admin password via environment variable

### Built-in Defaults
- **8 Room Types**: Kitchen, Bedroom, Bathroom, Living Room, Office, Garage, Laundry, Garden
- **60+ Predefined Tasks**: Common household chores with realistic frequencies
- **10 Preset Rewards**: Movie night, ice cream, stay up late, game time, etc.
- **12 Achievements**: Unlocked automatically based on activity
- **5 Languages**: English, French, German, Spanish, Italian

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite + TypeScript |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | SQLite3 (with WAL mode) |
| **Auth** | JWT + bcrypt |
| **Deployment** | Docker (single container, ~300MB) |
| **Routing** | React Router v7 |
| **Styling** | Custom design system with CSS custom properties |

**Zero external dependencies** for core functionality. Optional Telegram or ntfy integration for notifications.

---

## 📂 Project Structure

```
TidyQuest/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # useAuth, useApi, useTranslation
│   │   ├── i18n/        # Translation files (EN/FR/DE/ES/IT)
│   │   └── App.tsx
│   └── package.json
├── server/           # Express backend
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # JWT auth
│   │   ├── utils/       # Health calculation, notifications
│   │   └── database.ts  # SQLite setup
│   └── package.json
├── data/             # Persistent storage (Docker volume)
│   ├── tidyquest.db     # SQLite database
│   └── avatars/         # User-uploaded photos
├── Dockerfile        # Multi-stage build
├── docker-compose.yml
├── .env.example      # Configuration template
├── SECURITY.md       # Security best practices
└── API.md            # API documentation
```

---

## 🔧 Configuration

### Environment Variables

See `.env.example` for all options. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** (prod) | Secret for signing JWT tokens (min 32 chars) |
| `NODE_ENV` | No | `production` or `development` |
| `PORT` | No | Server port (default: 3000) |
| `ADMIN_RESET_PASSWORD` | No | One-shot admin password recovery. Set, restart, then remove. |

### Notifications (Optional)

TidyQuest supports two notification providers (configure in Settings, admin only):

**Telegram**
1. Create a Telegram bot via [@BotFather](https://t.me/botfather)
2. Get your chat ID via [@userinfobot](https://t.me/userinfobot)
3. Enter bot token and chat ID in Settings

**ntfy**
1. Use [ntfy.sh](https://ntfy.sh) or your own ntfy server
2. Enter the server URL and topic in Settings
3. Subscribe to the topic on your phone

Notification types:
- 🕐 **Daily Due Tasks**: Sent at configured time (default 09:00)
- 🎁 **Reward Requests**: Notify admin when child requests reward
- 🎖️ **Achievements**: Celebrate unlocked achievements

---

## 📖 Usage

### Creating Rooms
1. Go to **Rooms** page
2. Click **Add Room**
3. Select room type (e.g., Kitchen)
4. Choose from 60+ default tasks or create custom ones

### Completing Tasks
1. Open a room
2. Click ✅ on a task row
3. Earn coins (5-25 based on effort level 1-5)
4. Health bar resets to 100%

### Redeeming Rewards
1. Go to **Rewards** page
2. Click **Redeem** on a reward (coins deducted immediately)
3. Admin approves/rejects request
4. If rejected, coins are refunded

### Vacation Mode
Admin can enable vacation mode in **Settings**:
- **Global**: Pause health decay for the entire family
- **Per member**: Toggle vacation individually with separate return dates

Vacation freezes task health and protects streaks while members are away.

### Admin Password Recovery

If an admin forgets their password:

1. Add the environment variable to your container:
   ```yaml
   environment:
     - ADMIN_RESET_PASSWORD=your-new-password
   ```
2. Restart the container — the first admin's password is reset
3. **Remove the variable immediately** and restart again

---

## 🔒 Security

**Before exposing publicly**, review `SECURITY.md` for:
- Setting strong JWT_SECRET
- Using HTTPS reverse proxy (Caddy/Nginx)
- Database backup strategy
- Telegram token protection

⚠️ **Never expose TidyQuest directly to the internet over HTTP**.

---

## 🔄 Updating

### Using Docker Hub Image
```bash
docker compose pull
docker compose up -d
```

### Using Source Build
```bash
cd TidyQuest
git pull
docker compose down
docker compose up -d --build
```

Your data persists in the `./data` volume.

---

## 🗄️ Backup & Restore

### Manual Backup (via UI)
Admin → Settings → Export Data → Download JSON

### File System Backup
```bash
cp data/tidyquest.db backups/tidyquest-$(date +%Y%m%d).db
```

### Restore
Admin → Settings → Import Data → Upload JSON

---

## 🌐 API Documentation

See `API.md` for full endpoint documentation with examples.

Quick overview:
- **Auth**: `/api/auth/register`, `/api/auth/login`
- **Rooms**: `/api/rooms` (CRUD)
- **Tasks**: `/api/rooms/:id/tasks` (CRUD + complete)
- **Dashboard**: `/api/dashboard` (aggregated view)
- **Leaderboard**: `/api/leaderboard?period=week|month|quarter|year`
- **Rewards**: `/api/rewards` (CRUD + redeem)
- **Achievements**: `/api/achievements`

All endpoints require `Authorization: Bearer <token>` (except auth routes).

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

**What this means:**
- ✅ You can use, modify, and distribute TidyQuest freely
- ✅ You can run it commercially (for your business/family)
- ⚠️ If you modify and **host** TidyQuest as a service (even privately), you **must** share your source code
- ⚠️ Any derivative work must also be licensed under AGPL-3.0

**Why AGPL?** To ensure TidyQuest remains free and open-source forever, preventing proprietary SaaS forks.

See the `LICENSE` file for full details.

---

## 🙏 Acknowledgments

- Inspired by RPG mechanics from classic games
- Built with love for families who want to make chores fun
- Uses [Nunito](https://fonts.google.com/specimen/Nunito) font (bundled locally)

---

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/mellow-fox/TidyQuest/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/mellow-fox/TidyQuest/discussions)
- 🔒 **Security Issues**: See `SECURITY.md` for responsible disclosure

---

Made with ❤️ for families everywhere
