

# Phase 1: Database Schema + Core Hooks

## What We're Building
Add gamification tables to Dexie and create 4 core hooks that power XP, streaks, session tracking, and the writer profile.

---

## 1. Dexie Schema Update (`packages/core/src/db.ts`)

Add new interfaces and a **version 3** migration with 4 new tables:

- **`writingSessions`** — tracks each Song (id, chronicleId, startedAt, endedAt, wordCount, durationSeconds, xpEarned, streakDay)
- **`achievements`** — unlocked achievements (id, unlockedAt, category)
- **`craftSkills`** — skill XP per craft type (skill as PK, xp, level)

Writer profile will be stored as a JSON blob in the existing `preferences` table under key `'writer-profile'` (singleton pattern, no new table needed).

New Dexie version:
```
this.version(3).stores({
  writingSessions: 'id, chronicleId, startedAt',
  achievements: 'id, category',
  craftSkills: 'skill',
});
```

---

## 2. Gamification Types (`packages/core/src/gamification/types.ts`)

New file with all gamification interfaces:
- `WritingSessionRecord`, `AchievementRecord`, `CraftSkillRecord`
- `WriterProfile` (totalXp, level, title, currentStreak, longestStreak, emberActive, lastWritingDate)
- `WriterRank` definitions (level 1-10 with titles and XP thresholds)
- `CraftSkillType` union type
- XP multiplier constants

---

## 3. XP Engine (`packages/core/src/gamification/xpEngine.ts`)

Pure functions (no hooks, fully testable):
- `calculateSessionXP(wordCount, durationMinutes, streakDay)` — returns base XP + multipliers
- `getStreakMultiplier(streakDay)` — returns 1.0 / 1.5 / 2.0 / 2.5 / 3.0
- `getFocusMultiplier(durationMinutes)` — returns 1.5 if >=30 min, else 1.0
- `getLevelForXP(totalXp)` — returns { level, title, xpForNext }
- `WRITER_RANKS` constant array

---

## 4. Core Hooks (all in `packages/core/src/gamification/`)

### `useWriterProfile.ts`
- Reads/writes profile from `db.preferences` key `'writer-profile'`
- Returns `{ profile, updateProfile, addXP }`
- `addXP` updates totalXp, recalculates level/title, persists

### `useStreakEngine.ts`
- On call, checks `profile.lastWritingDate` against today
- Returns `{ currentStreak, emberActive, recordStreak, checkStreak }`
- `recordStreak()` — called when session qualifies (>=100 words); updates streak count, sets lastWritingDate
- `checkStreak()` — on app open, detects if streak broke (2+ days missed → reset) or ember (1 day missed)
- Ember usable once per 7 days

### `useSessionTracker.ts`
- Accepts `{ wordCount, isWriting }` from editor
- Tracks session start (first keystroke), accumulates words
- Detects session end: 2+ min idle or navigation away
- When session qualifies (>=100 words, >=5 min): saves `WritingSessionRecord` to Dexie, triggers XP award via callback
- Returns `{ activeSession, sessionWords, sessionDuration, endSession }`

### `useXPEngine.ts`
- Wraps the pure XP functions with profile context
- `awardSessionXP(wordCount, duration)` — calculates XP, calls `useWriterProfile.addXP`, returns breakdown
- Returns `{ awardSessionXP, currentLevel, xpToNextLevel, streakMultiplier }`

---

## 5. Export Updates (`packages/core/src/index.ts`)

Export all new types, records, hooks, and pure functions from the core package.

---

## Files to Create/Modify

| File | Action |
|---|---|
| `packages/core/src/db.ts` | Add interfaces + version 3 stores |
| `packages/core/src/gamification/types.ts` | Create — all gamification types & constants |
| `packages/core/src/gamification/xpEngine.ts` | Create — pure XP calculation functions |
| `packages/core/src/gamification/useWriterProfile.ts` | Create — profile read/write hook |
| `packages/core/src/gamification/useStreakEngine.ts` | Create — streak logic hook |
| `packages/core/src/gamification/useSessionTracker.ts` | Create — session detection hook |
| `packages/core/src/gamification/useXPEngine.ts` | Create — XP award hook |
| `packages/core/src/gamification/index.ts` | Create — barrel export |
| `packages/core/src/index.ts` | Update — re-export gamification module |

