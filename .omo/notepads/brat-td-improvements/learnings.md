# Brat TD Improvements — Learnings

## Project Setup
- Next.js 16, React 19, Tailwind CSS 4
- Working directory: kodlohost/
- Commands: npm run build, npm run lint, npm run dev
- No test framework yet — vitest will be set up in Task 1
- Canvas 2D game, all in BratTDClient.tsx (6040 lines)

## Game Architecture
- Game loop: requestAnimationFrame ~60fps
- State: Mutable refs for game data, React state for UI
- Sync: 150ms setInterval batch update from refs → state
- Config: gameConfig.ts (1818 lines) — towers, enemies, waves, achievements
- API: route.ts — leaderboard + progression via Supabase

## Key Files
- app/(main)/tools/brat-td/BratTDClient.tsx — main game (6040 lines)
- app/(main)/tools/brat-td/gameConfig.ts — game config (1818 lines)
- app/(main)/tools/brat-td/page.tsx — server component wrapper
- app/api/brat-td/route.ts — API route (286 lines)

## Type Extraction (Wave 1)
- All 32 type/interface definitions extracted from BratTDClient.tsx (21 types) and gameConfig.ts (11 types) into `lib/brat-td/types.ts`
- Types from gameConfig.ts were `export` already — kept as-is in types.ts
- Types from BratTDClient.tsx were internal (`interface`/`type` without export) — made `export` in types.ts
- gameConfig.ts: had no imports before; now imports all its types from `@/lib/brat-td/types`
- BratTDClient.tsx: removed `PathPoint`, `Upgrade`, `UpgradeStats` from `./gameConfig` import + removed `import type { EnemyModifier, Obstacle } from "./gameConfig"`; now imports all types from `@/lib/brat-td/types`
- Build passes with zero errors after extraction

## Vitest Setup (Task 1)
- Vitest v4.1.8 installed as dev dependency
- Config: `vitest.config.ts` with `@/*` path alias using `resolve.alias` (fileURLToPath)
- Environment: `node` (no jsdom needed for data-only tests)
- Setup file: `lib/brat-td/__tests__/setup.ts` — mocks for Canvas 2D context, Audio, requestAnimationFrame, cancelAnimationFrame, matchMedia
- Test pattern: `lib/**/*.test.{ts,tsx}` and `app/**/*.test.{ts,tsx}`
- Scripts: `npm run test` (vitest run), `npm run test:watch` (vitest watch)
- Smoke test: imports GAME_WIDTH/GAME_HEIGHT from gameConfig, asserts they are positive numbers
- Test results: 2/2 tests pass, 364ms

## Path Alias in Vitest
- Use `resolve.alias` with `'@': fileURLToPath(new URL('./', import.meta.url))` to match tsconfig `@/*` → `./`
- DO NOT put alias inside `test` block — it goes at root level

## Centralized Game Constants (Wave 1)
- Moved hardcoded magic numbers from BratTDClient.tsx into gameConfig.ts
- Constants added: ANTI_AIR_TOWERS, SUPPORT_TOWERS, COFFEE_BUFF_DEFAULTS, SHIELD_REGEN_DELAY_FRAMES, HEALER_BASE_HEAL, HEALER_HP_SCALING, MAX_OVERHEAL_MULTIPLIER, MAX_DAMAGE_DEBUFF_MULTIPLIER, NON_ENDLESS_WAVE_COUNT, LEADERBOARD_LIMIT
- LEADERBOARD_LIMIT was in app/api/brat-td/route.ts — moved to gameConfig.ts and imported from there
- ANTI_AIR_TOWER_TYPES renamed to ANTI_AIR_TOWERS (consistent naming with SUPPORT_TOWERS)
- COFFEE_BUFF_DEFAULTS used to replace coffee base attackSpeed (0.05) at the usage site
- Game values remain identical — only centralized

## 2026-06-14: BratTDClient.tsx fixes (T5 dead code, catch blocks, ErrorBoundary)

### T5 duplicate check fix
- **Location**: `BratTDClient.tsx` line 5739
- **Issue**: `const t5PathTaken = false;` was hardcoded dead code — T5 "already exists" warning never showed in UI
- **Fix**: Replaced with `hasT5ForTowerPath(selectedPlacedTower.type, pathIndex, selectedPlacedTower.id)` — same function already used in game logic (line 2744) but was missing from UI panel rendering
- **Parameters**: `towerType`, `pathIndex`, `exceptTowerId` (exclude current tower to allow upgrades on the same tower)

### Empty catch blocks logging
- **3 locations fixed**:
  1. `saveLocalProgression()` — localStorage serialization failure, now logs `[brat-td] saveLocalProgression:`
  2. `saveSettings()` — localStorage serialization failure, now logs `[brat-td] saveSettings:`
  3. `playTowerSound()` — audio playback errors, outer try/catch logs `[brat-td] playTowerSound:`; inner `.catch()` silently ignores `NotAllowedError` (autoplay policy) but warns on others with `[brat-td] audio:`
- **Pattern**: `catch {}` → `catch (err) { console.warn("[brat-td]", err); }`

### ErrorBoundary
- **New file**: `app/(main)/tools/brat-td/ErrorBoundary.tsx` — class component with `componentDidCatch` + `getDerivedStateFromError`
- **Fallback UI**: Ukrainian "Щось пішло не так. Оновіть сторінку." with reload button
- **Wrapping**: `page.tsx` wraps `<BratTDClient />` with `<ErrorBoundary>`
- **Logging**: Also logs caught errors via `console.warn`

### Pre-existing bug found
- `ARRAY_CAPS` was used throughout `BratTDClient.tsx` but never imported from `gameConfig.ts`. Added to import block. Would have caused TypeScript build failure regardless of these changes.

## 2026-06-14: Array Caps for Endless Mode Memory
- **gameConfig.ts**: Added `ARRAY_CAPS` object with PROJECTILES=500, PARTICLES=1000, FLOATING_TEXTS=200, SPEED_TRAILS=300, EXPLOSION_RINGS=50
- **DEFAULT_SETTINGS**: Added `effectLimits: true` setting
- **loadSettings()**: Added `effectLimits` field with fallback to default
- **pushWithCap helper**: Generic helper in `BratTDClient()` component that shifts oldest entries when cap is reached, works for both single items and arrays
- **All 18 push sites converted**: Every `arrayRef.current.push(item)` → `pushWithCap(arrayRef.current, item, cap)` across projectilesRef, particlesRef, floatingTextsRef, speedTrailsRef, explosionRingsRef
- **Effect Limits toggle**: Settings panel checkbox "Обмеження ефектів" — when ON (default), uses base ARRAY_CAPS; when OFF, doubles all caps (allows more effects on powerful devices)
- **Cap multiplier pattern**: `ARRAY_CAPS.PROJECTILES * (settingsRef.current.effectLimits ? 1 : 2)` computed inline at each push site
- **Build**: `npm run build` passes — compilation + type-check clean
