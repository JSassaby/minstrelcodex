
# Minstrel Codex — Gamification Layer Implementation Plan

## Overview
Transform the existing writing app into a habit-forming writing platform using craft-oriented gamification. All gamification lives outside the editor surface — in dashboards, session screens, and progress views.

---

## Phase 1: Foundation (Database + Core Hooks)

### 1.1 Database Schema
Tables needed (all local-first via Dexie, cloud-synced later):

**`writing_sessions` (Songs)**
- `id` (uuid)
- `chronicle_id` (string — project/folder name)
- `started_at` (timestamp)
- `ended_at` (timestamp)
- `word_count` (int)
- `duration_seconds` (int)
- `xp_earned` (int)
- `streak_day` (int — streak count at time of session)

**`chronicles`**
- `id` (string)
- `title` (string)
- `created_at` (timestamp)
- `target_words` (int)
- `genre` (string)
- `status` ('active' | 'completed' | 'archived')

**`writer_profile`**
- `key` = 'profile' (singleton in Dexie preferences)
- `total_xp` (int)
- `level` (int)
- `title` (string — e.g. "Apprentice Scribe")
- `current_streak` (int)
- `longest_streak` (int)
- `ember_active` (boolean — forgiveness day)
- `last_writing_date` (string — YYYY-MM-DD)

**`achievements`**
- `id` (string)
- `unlocked_at` (timestamp)
- `category` (string)

**`craft_skills`**
- `skill` ('narrative' | 'dialogue' | 'description' | 'argument' | 'reflection')
- `xp` (int)
- `level` (int)

### 1.2 Core Hooks
- `useWriterProfile()` — reads/writes profile singleton
- `useSessionTracker()` — detects active writing sessions (≥100 words, ≥5 min)
- `useStreakEngine()` — manages streak logic with ember forgiveness
- `useXPEngine()` — calculates XP with multipliers

---

## Phase 2: XP & Leveling System

### XP Sources
| Source | XP |
|---|---|
| Per word written | 1 XP |
| Session completion (≥100w) | +50 XP bonus |
| 30+ min focused session | 1.5x multiplier |
| Streak day 3–6 | 1.5x multiplier |
| Streak day 7–13 | 2.0x multiplier |
| Streak day 14–29 | 2.5x multiplier |
| Streak day 30+ | 3.0x multiplier |

### Writer Ranks
| Level | Title | XP Required |
|---|---|---|
| 1 | Apprentice Scribe | 0 |
| 2 | Journeyman Scribe | 1,000 |
| 3 | Wordsmith | 5,000 |
| 4 | Storyteller | 15,000 |
| 5 | Chronicle Keeper | 40,000 |
| 6 | Loremaster | 100,000 |
| 7 | Master Bard | 250,000 |
| 8 | Grand Minstrel | 500,000 |
| 9 | Saga Weaver | 1,000,000 |
| 10 | Mythwright | 2,500,000 |

---

## Phase 3: Streak System

### Mechanics
- Writing ≥100 words in a day counts as a streak day
- Missing one day → **Ember state** (flame dims but streak preserved)
- Missing two consecutive days → streak resets
- Ember can be used once per 7 days
- Visual: flame icon with intensity levels (spark → torch → bonfire → inferno)

### Streak Milestones
- 3 days: "Kindling" badge
- 7 days: "Steady Flame"
- 14 days: "Burning Bright"
- 30 days: "Eternal Flame"
- 100 days: "Undying Ember"

---

## Phase 4: Song Complete Screen

After each writing session ends (≥100 words, user stops writing for 2+ min or navigates away):

1. **Session Summary Card**
   - Words written this session
   - Time spent
   - XP earned (with multiplier breakdown)
   - Streak status

2. **Progress Bar**
   - XP progress toward next level
   - Chronicle word count progress

3. **Achievement Unlocks** (if any triggered)

---

## Phase 5: The Scriptorium (Dashboard)

### Layout (Mobile-First)
```
┌─────────────────────────┐
│ Writer Title + Level     │
│ ████████░░ 3,200 / 5,000│
├─────────────────────────┤
│ 🔥 12-day streak        │
│ Today: 340 words         │
├─────────────────────────┤
│ ACTIVE CHRONICLES        │
│ ┌─────┐ ┌─────┐         │
│ │ 📖  │ │ 📖  │         │
│ │Novel│ │Journ│         │
│ │62%  │ │     │         │
│ └─────┘ └─────┘         │
├─────────────────────────┤
│ CRAFT RADAR              │
│    Narrative             │
│   ╱        ╲            │
│ Refl ──── Dialog         │
│   ╲        ╱            │
│    Descript              │
├─────────────────────────┤
│ RECENT SONGS             │
│ • Ch.4 — 520w — 2h ago  │
│ • Ch.3 — 310w — yesterday│
├─────────────────────────┤
│ ACHIEVEMENTS             │
│ 🏅 🏅 🏅 ░░ ░░ ░░       │
└─────────────────────────┘
```

---

## Phase 6: Chronicle System

### Structure
- **Chronicle** = top-level project (novel, journal, etc.)
- **Chapter** = folder within a Chronicle
- **Song** = a single writing session contributing to a Chronicle

### Visual Growth
- Chronicle card shows a book spine that thickens with word count
- Cover becomes more ornate at milestones (10k, 25k, 50k, 80k, 100k words)
- Milestone badges: "First Chapter", "Halfway Mark", "Final Draft"

### Chronicle Milestones
| Words | Milestone |
|---|---|
| 1,000 | Chronicle Begun |
| 10,000 | First Folio |
| 25,000 | Novella Complete |
| 50,000 | Novel Draft |
| 80,000 | Full Manuscript |
| 100,000 | Magnum Opus |

---

## Phase 7: Craft Skill System

### Skills
- **Narrative** — prose paragraphs, scene-setting
- **Dialogue** — quotation marks, speech patterns
- **Description** — sensory language, adjective density
- **Argument** — structured reasoning, thesis statements
- **Reflection** — first-person introspection, journaling

### Detection (Two-Tier)
1. **Heuristic** (local, fast): quotation mark density → Dialogue; paragraph length → Narrative; "I feel/think" patterns → Reflection
2. **AI Classification** (optional, cloud): Send session text to Gemini Flash Lite for skill categorization

### Visualization
- Radar/pentagon chart on dashboard
- Each skill levels independently (1–10)
- Unlocks craft-specific titles (e.g., "Master of Dialogue")

---

## Phase 8: Achievements

### Categories
- **Consistency**: streak milestones
- **Volume**: word count milestones (1k, 10k, 50k, 100k, 500k lifetime)
- **Craft**: skill level milestones
- **Chronicle**: project milestones
- **Special**: first session, midnight writer, weekend warrior, 7-day marathon

### Shareable Cards
- Beautiful card with achievement name, date, and writer stats
- Share to social media or download as image

---

## Phase 9: Guild System (Future)

- Groups of 3–8 writers
- Shared weekly word count goals
- Contribution rings showing each member's progress
- Weekly challenges (e.g., "Guild writes 10,000 words this week")
- Requires cloud sync + user accounts

---

## Implementation Order

1. ✅ Dexie schema additions (writing_sessions, writer_profile, achievements, craft_skills)
2. ✅ Core hooks (useWriterProfile, useSessionTracker, useStreakEngine, useXPEngine)
3. ✅ Song Complete screen (post-session reward)
4. ✅ Scriptorium dashboard component
5. ✅ Streak UI (flame icon + streak display)
6. ✅ Chronicle cards with visual growth
7. ✅ Achievement system + unlock notifications
8. ✅ Craft skill radar chart
9. 🔮 Guild system (requires cloud accounts)
10. 🔮 Shareable milestone cards

---

## Technical Notes

- All gamification data is local-first (Dexie/IndexedDB)
- Cloud sync via Lovable Cloud tables when user has account
- Session detection runs in a hook, not in the editor component
- Dashboard is a separate route/view, not embedded in editor
- XP calculations are pure functions for testability
- Streak logic accounts for timezone via `Intl.DateTimeFormat`
