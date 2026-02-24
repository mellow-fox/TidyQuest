# TidyQuest — Release Notes

## v0.3.0 — 2026-02-24

### Overview
v0.3.0 focuses on assignment logic, admin controls, vacation handling, performance, and release integrity.  
This version also consolidates UX improvements across Rooms, Room Detail, Dashboard, History, and Settings.

### Highlights
- Global **Vacation Mode** with streak freeze behavior and optional return date.
- Expanded task assignment model with **First**, **Shared**, and **Custom** coin distribution.
- Stronger admin workflows: completion management, role-aware settings, and coin control.
- Noticeably fewer redundant API refreshes and better interaction responsiveness.
- Backup/import reliability improvements to preserve critical auth and assignment data.

### New Features
- Added global vacation configuration for admins (`vacationMode`, `vacationStartDate`, `vacationEndDate`).
- Added and refined assignment behavior across room-level and task-level assignment.
- Added custom per-user coin split support in multi-user assignments.
- Added admin UX components for assignment/completion workflows (including modal flows).
- Added and expanded i18n coverage across EN/FR/DE/ES/IT for new labels and flows.

### Fixes
- Prevented invalid duplicate completions in same-day scenarios.
- Fixed race-prone behavior around logout and settings updates.
- Reduced slow paths caused by heavy repeated dashboard/rooms reloads.
- Improved room creation behavior: async create now waits for server result and keeps modal context on failure.
- Corrected backup/import data fidelity:
  - Users now include `passwordHash` in backup payload.
  - Rooms/tasks keep assignment-related fields during restore.
  - `task_assignees` and `coinPercentage` are exported/imported.
  - Backup format version bumped to `version: 5`.
  - Compatibility fallback preserved for older backups without `taskAssignees`.

### Performance
- Reduced redundant API calls during navigation and periodic refresh.
- Deduplicated in-flight refresh patterns for dashboard and rooms.
- Improved perceived latency for:
  - vacation toggle
  - room/task refresh flows
  - logout navigation

### Technical Scope
- Client and server TypeScript compile passes.
- Main touched areas:
  - `client/src/App.tsx`
  - `client/src/components/pages/{RoomsList,RoomDetail,Dashboard,History,Settings}.tsx`
  - `client/src/components/shared/AdminCompleteModal.tsx`
  - `server/src/routes/{tasks,rooms,users,data,dashboard,history,achievements}.ts`
  - `server/src/database.ts`
  - i18n files (`en/fr/de/es/it`)

### Notes
- Runtime quality is validated by manual release smoke checks for critical flows.
- Legacy lint debt remains in parts of the codebase and will be addressed in a later release hardening cycle.
