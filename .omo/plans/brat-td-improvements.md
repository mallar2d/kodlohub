# Brat TD — Incremental Improvements Plan

## TL;DR

> **Quick Summary**: Modularize the 6040-line game god-component into separate engine/renderer/state modules using TDD, fix critical bugs (cosmetics rendering, error handling, memory bounds), then add new content (enemies, towers, waves) and polish visuals/audio.
>
> **Deliverables**:
> - Test framework set up with core game logic tests
> - Extracted modules: `types.ts`, `engine.ts`, `renderer.ts`, `state.ts`, `audio.ts`
> - `BratTDClient.tsx` reduced to thin React wrapper
> - Cosmetics rendering (effects rendered on canvas)
> - Error boundary + proper error handling
> - Array bounds caps (projectiles, particles, trails)
> - Centralized hardcoded config into `gameConfig.ts`
> - 2 new enemy types, 1 new tower type, new wave configurations
> - Enhanced Canvas 2D visuals (shadows, gradients, animations)
> - Improved sound system (distinct audio events per tower)
> - Accessibility improvements
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves + final verification
> **Critical Path**: Test setup → Type extraction → Engine/Renderer extraction → Content → Polish → Verification

---

## Context

### Original Request
Plan next improvements for the Brat TD tower defense game — incremental patches covering refactoring, stability, new content, and visual/audio polish.

### Interview Summary
**Key Discussions**:
- Priority order: Refactoring + stability first → then new content → then UX/visuals
- Full modular architecture extraction (not minimal)
- TDD: write tests before refactoring
- Enhanced Canvas 2D graphics (not sprites)
- New content: waves, enemies, towers (propose based on balance gaps)
- Incremental patch-based approach
- No player feedback, no i18n/PWA priorities

**Research Findings**:
- BratTDClient.tsx is 6040 lines — all game logic, rendering, UI in one file
- gameConfig.ts is 1818 lines — all configs, waves, achievements
- Cosmetics system tracks state but does NOT render effects visually
- T5 duplicate check uses `t5PathTaken = false` (dead code) instead of `hasT5ForTowerPath()`
- All error catch blocks are empty (`catch {}`)
- Projectile/particle/trail arrays unbounded (memory risk in endless)
- Single sound file (`PDR_PRODUCTION_SOUND.mp3`) for all audio
- O(n²) collision detection, no spatial partitioning
- 18 separate useEffect sync watchers
- Hardcoded magic numbers scattered in code

### Metis Review
**Identified Gaps** (addressed):
- "Enhanced Canvas 2D graphics" is unbounded → scoped to specific improvements (shadows, gradients, death animations, status effect indicators)
- No acceptance criteria defined yet → adding concrete criteria per task
- T5 duplicate check is localized to UI panel → fix uses existing `hasT5ForTowerPath()` function
- TypeScript strict mode actually IS enabled (`tsconfig.json` has `"strict": true`) → corrected from initial research

---

## Work Objectives

### Core Objective
Incrementally improve Brat TD by modularizing the 6040-line god-component and fixing critical bugs first, then adding new game content, then polishing visuals and audio — all in independently deployable patches with TDD protection.

### Concrete Deliverables
- `lib/brat-td/types.ts` — all game type definitions extracted
- `lib/brat-td/engine.ts` — game loop, update, spawn, collision logic
- `lib/brat-td/renderer.ts` — Canvas 2D drawing functions
- `lib/brat-td/state.ts` — game state management, ref synchronization
- `lib/brat-td/audio.ts` — sound system with distinct audio events
- `lib/brat-td/config.ts` — centralized game configuration
- Updated `gameConfig.ts` — new enemies, tower, waves
- Working cosmetics rendering on canvas
- Test suite covering core game logic

### Definition of Done
- [ ] `npm run build` passes with zero errors
- [ ] All existing game features work identically (regression-free)
- [ ] All new tests pass
- [ ] No empty `catch {}` blocks remain in game code
- [ ] `BratTDClient.tsx` is under 1500 lines (thin wrapper)
- [ ] Cosmetics visual effects render correctly on canvas
- [ ] New tower and enemies appear in game and are configurable

### Must Have
- Test framework configured and core logic tests passing
- All modules extracted and game works identically
- Cosmetics rendering fixed (effects visible on canvas)
- Error handling improved (no empty catch blocks)
- Array bounds added (projectiles, particles, trails)
- Hardcoded config centralized into gameConfig
- At least 1 new tower and 2 new enemies
- New wave configurations for new content
- Each patch independently deployable

### Must NOT Have (Guardrails)
- NO sprite-based graphics (Canvas 2D enhancements only, per user preference)
- NO WebGL/Pixi.js migration
- NO i18n/translation work
- NO PWA/service worker
- NO mobile UI redesign
- NO minimap, replay system, or sandbox mode
- NO changes to existing tower upgrade mechanics
- NO changes to existing wave 1-46 configurations
- NO breaking changes to leaderboard/progression API
- NO AI slop: excessive comments, over-abstraction, generic names

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO — will be set up as Task 1
- **Automated tests**: YES (TDD) — write tests BEFORE refactoring
- **Framework**: vitest (compatible with Next.js 16, good TypeScript support)
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — navigate to game page, interact, assert DOM, screenshot
- **Game Logic**: Use Bash (vitest) — run tests, assert pass/fail
- **API**: Use Bash (curl) — send requests, assert status + response
- **Build**: Use Bash — `npm run build`, assert zero errors

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation + bug fixes):
├── Task 1: Set up vitest + test config [quick]
├── Task 2: Extract TypeScript types to types.ts [quick]
├── Task 3: Fix cosmetics rendering [deep]
├── Task 4: Fix T5 check + error boundary + error handling [quick]
├── Task 5: Add array bounds (projectiles, particles, trails caps) [quick]
├── Task 6: Centralize hardcoded config → gameConfig.ts [quick]
└── Task 7: Write core game logic tests [deep]

Wave 2 (After Wave 1 — module extraction):
├── Task 8: Extract engine.ts [deep] — depends: 2, 7
├── Task 9: Extract renderer.ts [deep] — depends: 2, 8
├── Task 10: Extract state.ts [deep] — depends: 2, 8
├── Task 11: Extract audio.ts [unspecified-high] — depends: 6
└── Task 12: Add seeded random for endless mode [quick] — depends: 7

Wave 3 (After Wave 2 — content + thin wrapper):
├── Task 13: New enemy: Камікадзе-Брат (kamikaze rusher) [deep] — depends: 6, 7
├── Task 14: New enemy: Брат-Дрон-Розвідник (camo drone) [quick] — depends: 6, 7
├── Task 15: New tower: Вогнемет Подро (flamethrower, DoT tower) [deep] — depends: 6, 7
├── Task 16: New wave configurations [quick] — depends: 13, 14, 15
└── Task 17: BratTDClient.tsx → thin React wrapper [deep] — depends: 8, 9, 10, 11

Wave 4 (After Wave 3 — polish):
├── Task 18: Enhanced Canvas 2D visuals [visual-engineering] — depends: 9
├── Task 19: Improved sound system (distinct audio events per tower) [unspecified-high] — depends: 11
├── Task 20: Accessibility improvements [quick] — depends: 17
└── Task 21: Combine sync useEffects (reduce from 18 to fewer) [quick] — depends: 10

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real manual QA [unspecified-high]
└── Task F4: Scope fidelity check [deep]
→ Present results → Get explicit user okay

Critical Path: Task 1/2/7 → Task 8 → Task 9/10 → Task 17 → Task 18/20 → F1-F4 → user okay
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 7 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 7 | 1 |
| 2 | — | 8, 9, 10 | 1 |
| 3 | — | — | 1 |
| 4 | — | — | 1 |
| 5 | — | — | 1 |
| 6 | — | 11, 13, 14, 15 | 1 |
| 7 | 1 | 8, 9, 10, 12, 13, 14, 15 | 1 |
| 8 | 2, 7 | 9, 10, 17 | 2 |
| 9 | 2, 8 | 18 | 2 |
| 10 | 2, 8 | 17, 21 | 2 |
| 11 | 6 | 17, 19 | 2 |
| 12 | 7 | — | 2 |
| 13 | 6, 7 | 16 | 3 |
| 14 | 6, 7 | 16 | 3 |
| 15 | 6, 7 | 16 | 3 |
| 16 | 13, 14, 15 | — | 3 |
| 17 | 8, 9, 10, 11 | 20 | 3 |
| 18 | 9 | — | 4 |
| 19 | 11 | — | 4 |
| 20 | 17 | — | 4 |
| 21 | 10 | — | 4 |

### Agent Dispatch Summary

- **Wave 1**: 7 tasks — T1→`quick`, T2→`quick`, T3→`deep`, T4→`quick`, T5→`quick`, T6→`quick`, T7→`deep`
- **Wave 2**: 5 tasks — T8→`deep`, T9→`deep`, T10→`deep`, T11→`unspecified-high`, T12→`quick`
- **Wave 3**: 5 tasks — T13→`deep`, T14→`quick`, T15→`deep`, T16→`quick`, T17→`deep`
- **Wave 4**: 4 tasks — T18→`visual-engineering`, T19→`unspecified-high`, T20→`quick`, T21→`quick`
- **FINAL**: 4 tasks — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [x] 1. Set up vitest + test config

  **What to do**:
  - Install vitest and @vitejs/plugin-react as dev dependencies
  - Create `vitest.config.ts` in project root with path aliases matching `tsconfig.json` (`@/*` → `./`)
  - Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `package.json`
  - Create `lib/brat-td/__tests__/setup.ts` with any global test setup (mock Canvas, Audio, requestAnimationFrame)
  - Write one smoke test (e.g., verify `GAME_WIDTH` and `GAME_HEIGHT` export from `gameConfig.ts`) to confirm framework works
  - Run `npx vitest run` and confirm smoke test passes

  **Must NOT do**:
  - Do not modify existing game code
  - Do not add jest — use vitest only
  - Do not create test files for untested modules yet (just the smoke test)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard dev tooling setup, well-documented pattern
  - **Skills**: []
  - **Skills Evaluated but Omitted**: `git-master` (no git work needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-7)
  - **Blocks**: Task 7 (tests depend on framework)
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `package.json` — current scripts and dependencies to add to
  - `tsconfig.json` — path aliases (`@/*`) that vitest config must match

  **External References**:
  - Vitest docs: https://vitest.dev/guide/ — setup with Next.js path aliases

  **Acceptance Criteria**:
  - [ ] `vitest.config.ts` exists in project root with correct path aliases
  - [ ] `package.json` has `"test": "vitest run"` and `"test:watch": "vitest"` scripts
  - [ ] `lib/brat-td/__tests__/setup.ts` exists with Canvas/Audio/rAF mocks
  - [ ] `npx vitest run` exits with code 0 and smoke test passes
  - [ ] `npm run build` still passes (no regressions)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Vitest runs successfully and smoke test passes
    Tool: Bash
    Preconditions: vitest installed, config created, smoke test written
    Steps:
      1. Run `cd kodlohost && npx vitest run`
      2. Check exit code is 0
      3. Confirm output contains "1 passed" or similar
    Expected Result: Vitest runs, smoke test passes, exit code 0
    Failure Indicators: Exit code non-zero, "no tests found", import resolution errors
    Evidence: .omo/evidence/task-1-vitest-smoke.txt

  Scenario: Build still passes after test setup
    Tool: Bash
    Preconditions: vitest config and test files added
    Steps:
      1. Run `cd kodlohost && npm run build`
      2. Check exit code is 0
    Expected Result: Build succeeds with zero errors
    Failure Indicators: TypeScript errors in test config, module resolution failures
    Evidence: .omo/evidence/task-1-build-passes.txt
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `refactor(brat-td): set up test framework and extract types`
  - Files: `vitest.config.ts`, `package.json`, `lib/brat-td/__tests__/setup.ts`
  - Pre-commit: `npx vitest run && npm run build`

- [x] 2. Extract TypeScript types to types.ts

  **What to do**:
  - Create `lib/brat-td/types.ts`
  - Move ALL type definitions and interfaces from `BratTDClient.tsx` and `gameConfig.ts` into `types.ts`:
    - `ActiveEnemy`, `PlacedTower`, `Projectile`, `Mine`, `Particle`, `FloatingText`, `SpeedTrail`
    - `TowerConfig`, `EnemyConfig`, `WaveSegment`, `MapConfig`, `DifficultyConfig`
    - `Progression`, `Achievement`, `CosmeticItems`
    - `GameStatus`, `DifficultyKey`, `TargetingMode`
    - All union types and enums used in game logic
  - Update imports in `BratTDClient.tsx` and `gameConfig.ts` to import from `@/lib/brat-td/types`
  - Verify `npm run build` passes after extraction

  **Must NOT do**:
  - Do not change any runtime logic — purely type extraction
  - Do not rename types or interfaces
  - Do not add new types that don't already exist

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical type extraction, no logic changes
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-7)
  - **Blocks**: Tasks 8, 9, 10 (engine/renderer/state extraction need types)
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `BratTDClient.tsx:1-100` — type definitions at top of file (GameStatus type, DifficultyKey, etc.)
  - `BratTDClient.tsx:340-420` — React state type interfaces (Progression, etc.)
  - `gameConfig.ts:1-50` — TowerConfig, EnemyConfig interfaces

  **API/Type References**:
  - All interfaces used in game state: `ActiveEnemy`, `PlacedTower`, `Projectile`, `Mine`, `Particle`

  **Why Each Reference Matters**:
  - Types at top of BratTDClient.tsx need to move first so remaining code can import them
  - gameConfig.ts defines config interfaces that engine/renderer will need

  **Acceptance Criteria**:
  - [ ] `lib/brat-td/types.ts` exists with all game type definitions
  - [ ] `BratTDClient.tsx` and `gameConfig.ts` import types from `@/lib/brat-td/types`
  - [ ] `npm run build` passes with zero errors
  - [ ] No type was renamed or had its shape changed
  - [ ] `lib/brat-td/types.ts` exports all types that were previously inline

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Type extraction is complete and build passes
    Tool: Bash
    Preconditions: types.ts created, imports updated
    Steps:
      1. Run `cd kodlohost && npm run build`
      2. Check exit code is 0
      3. Grep for `export interface` and `export type` in types.ts — confirm all expected types present
      4. Grep for inline type definitions in BratTDClient.tsx — confirm they're gone
    Expected Result: Build passes, all types exported from types.ts, no inline definitions remain in client
    Failure Indicators: Build errors, missing imports, type mismatches
    Evidence: .omo/evidence/task-2-type-extraction.txt

  Scenario: No runtime behavior changed
    Tool: Bash
    Preconditions: type extraction complete
    Steps:
      1. Run `cd kodlohost && npm run build`
      2. Verify no new TypeScript errors
      3. Verify all existing game code compiles
    Expected Result: Build identical to before extraction
    Failure Indicators: Any TypeScript errors referencing moved types
    Evidence: .omo/evidence/task-2-no-regression.txt
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `refactor(brat-td): set up test framework and extract types`
  - Files: `lib/brat-td/types.ts`, `BratTDClient.tsx`, `gameConfig.ts`
  - Pre-commit: `npm run build && npx vitest run`

- [x] 3. Fix cosmetics rendering (effects not shown on canvas)

  **What to do**:
  - Find all places where `activeEffect` is referenced in `BratTDClient.tsx`
  - Currently: `activeEffect` is tracked in state (line 391), set in UI (line 5993), saved/loaded (lines 4981, 1670), but NEVER rendered in the Canvas drawing functions
  - Add visual rendering for each defined effect:
    - `golden_glow`: golden particle aura around towers
    - `frost_trail`: blue frost trail behind enemies
    - `fire_trail`: orange flame trail behind enemies
    - `neon_pulse`: neon outline pulse on the player's placed towers
  - Each effect should be a Canvas 2D drawing added to the main render loop in `drawScene()` or equivalent
  - Use the existing particle system (`particlesRef`) as the rendering mechanism — when an effect is active, spawn effect-specific particles in the update loop
  - Also fix `activeFrame` rendering — add a decorative frame around the player's name in leaderboard/session summary

  **Must NOT do**:
  - Do not change achievement definitions or unlock conditions
  - Do not add new effect types beyond what's already defined in `gameConfig.ts` ACHIEVE_DEFINITIONS
  - Do not modify the cosmetics selection UI (it works correctly)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding the rendering loop and particle system to add visual effects
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4-7)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `BratTDClient.tsx:3039-3078` — particle system (`particlesRef.current.push()` pattern)
  - `BratTDClient.tsx:3600+` — `drawScene()` or canvas rendering functions
  - `BratTDClient.tsx:3784-4283` — projectile rendering patterns (how visuals are drawn per frame)

  **API/Type References**:
  - `BratTDClient.tsx:391` — `activeEffect` state variable
  - `BratTDClient.tsx:5992-5993` — effect selection UI (already works)
  - `gameConfig.ts` — `ACHIEVE_DEFINITIONS` array with `effects` field listing available cosmetic effects

  **Why Each Reference Matters**:
  - Particle system pattern shows how to add visual effects to the canvas
  - `activeEffect` state shows what effect is selected and needs rendering
  - Achievement definitions list all available effects by name

  **Acceptance Criteria**:
  - [ ] Selecting `golden_glow` effect renders golden particles on player's towers
  - [ ] Selecting `frost_trail` effect renders blue frost particles behind enemies
  - [ ] Selecting `fire_trail` effect renders orange flame particles
  - [ ] Selecting `neon_pulse` effect renders neon outline pulse
  - [ ] Selecting "none" (empty effect) renders no effect visuals
  - [ ] Effect persists across game sessions (saved/loaded via progression)
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Cosmetic effect renders on canvas when selected
    Tool: Playwright
    Preconditions: Game loaded, player has unlocked at least one cosmetic effect
    Steps:
      1. Navigate to game page
      2. Open Settings panel
      3. Select "Ефект" (Effect) dropdown — choose "golden_glow"
      4. Start a wave
      5. Place a tower
      6. Screenshot the canvas area
      7. Verify golden particles appear around the placed tower
    Expected Result: Golden particle effect visible around towers on canvas
    Failure Indicators: No visual effect visible, effect dropdown doesn't work, game crashes
    Evidence: .omo/evidence/task-3-golden-glow-effect.png

  Scenario: Selecting "none" effect removes visual rendering
    Tool: Playwright
    Preconditions: Effect was previously active
    Steps:
      1. In Settings, change effect dropdown to empty/none option
      2. Start a wave and place a tower
      3. Screenshot the canvas
      4. Verify no cosmetic particles are rendered
    Expected Result: No effect particles on canvas when effect is "none"
    Failure Indicators: Previous effect still rendering, particles persisting
    Evidence: .omo/evidence/task-3-no-effect.png
  ```

  **Commit**: YES
  - Message: `fix(brat-td): render cosmetic effects on canvas`
  - Files: `BratTDClient.tsx`
  - Pre-commit: `npm run build`

- [x] 4. Fix T5 duplicate check + error boundary + error handling

  **What to do**:
  - Fix `t5PathTaken` dead code at line 5732: replace `const t5PathTaken = false;` with `const t5PathTaken = hasT5ForTowerPath(tower.type, pathIndex, tower.id);` so the upgrade panel correctly disables T5 for paths that already have T5
  - Add a React Error Boundary component wrapping the game client in `page.tsx` — if the game loop throws, show a friendly error message in Ukrainian, not a blank white screen
  - Replace ALL empty `catch {}` blocks in `BratTDClient.tsx` with `catch (err) { console.warn('[brat-td]', err); }` — 10+ instances found at lines 1484, 1493, 1604, 1613, 1628, 1674, 1700, 1713, 1726, 1895
  - Replace silent audio fail `audio.play().catch(() => {})` at line 1895 with `audio.play().catch((e) => { if (e.name !== 'NotAllowedError') console.warn('[brat-td] audio:', e.message); })` — silently ignore autoplay policy errors but log others

  **Must NOT do**:
  - Do not change error handling in `route.ts` (API route) — that's a separate concern
  - Do not add error reporting service or external telemetry
  - Do not change game logic in the catch blocks — just add logging

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical fixes, well-scoped, no architectural decisions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `BratTDClient.tsx:5732` — `const t5PathTaken = false;` (dead code, should use `hasT5ForTowerPath`)
  - `BratTDClient.tsx:2093` — `hasT5ForTowerPath` function definition (correct implementation)
  - `BratTDClient.tsx:2743` — existing correct usage of `hasT5ForTowerPath` in game logic

  **Why Each Reference Matters**:
  - Line 5732 is the bug location — must replace `false` with the function call
  - Line 2093 shows the correct function signature and behavior
  - Empty catch blocks are at known line numbers — mechanical search-and-replace

  **Acceptance Criteria**:
  - [ ] `t5PathTaken` at line 5732 now calls `hasT5ForTowerPath(tower.type, pathIndex, tower.id)` instead of hardcoding `false`
  - [ ] React Error Boundary wraps `<BratTDClient />` in `page.tsx` with Ukrainian fallback UI
  - [ ] Zero empty catch blocks remain in `BratTDClient.tsx` (search for `catch {}` and `catch() {}`)
  - [ ] Audio catch logs non-NotAllowedError warnings
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: T5 upgrade correctly disables when T5 already exists on another path
    Tool: Playwright
    Preconditions: Game loaded, tower with T5 on one path selected
    Steps:
      1. Start game on Easy difficulty
      2. Place a tower (e.g., Hammer)
      3. Upgrade one path to Tier 5
      4. Select the tower
      5. Check the upgrade panel for the OTHER two paths — T5 should be visually disabled/grayed out
    Expected Result: T5 upgrade buttons disabled on paths where T5 is already taken
    Failure Indicators: T5 buttons still appear enabled on conflicting paths
    Evidence: .omo/evidence/task-3-t5-check.png

  Scenario: Error boundary catches game crash gracefully
    Tool: Playwright
    Preconditions: Error boundary is implemented
    Steps:
      1. Inject a runtime error in the game component (or verify error boundary component exists)
      2. Verify the fallback UI renders with Ukrainian error message
    Expected Result: Error boundary shows friendly message, not white screen
    Failure Indicators: White screen of death, uncaught exception
    Evidence: .omo/evidence/task-4-error-boundary.txt

  Scenario: No empty catch blocks remain
    Tool: Bash
    Preconditions: All catch blocks updated
    Steps:
      1. Run `cd kodlohost && grep -r "catch {}" app/ lib/ || echo "PASS: no empty catches"`
      2. Run `cd kodlohost && grep -r "catch() {}" app/ lib/ || echo "PASS: no empty catches"`
    Expected Result: Grep finds zero empty catch blocks in game code
    Failure Indicators: Any remaining `catch {}` or `catch() {}`
    Evidence: .omo/evidence/task-4-no-empty-catches.txt
  ```

  **Commit**: YES
  - Message: `fix(brat-td): T5 check, error boundary, error handling`
  - Files: `BratTDClient.tsx`, `app/(main)/tools/brat-td/page.tsx`
  - Pre-commit: `npm run build`

- [x] 5. Add array bounds (projectiles, particles, trails caps)

  **What to do**:
  - Add maximum caps to unbounded arrays in the game loop:
    - `projectilesRef`: cap at 500 (currently unbounded)
    - `particlesRef`: cap at 1000 (currently unbounded)
    - `floatingTextsRef`: cap at 200 (currently unbounded)
    - `speedTrailsRef`: cap at 300 (currently unbounded)
    - `explosionRingsRef`: cap at 50 (currently has per-frame `Array.from` allocation)
  - When cap is reached, remove oldest entries first (shift/push pattern)
  - Replace `Array.from({ length: 8 }, ...)` per-frame allocation for explosion rings with a pre-allocated pool or just cap ring count
  - Add these constants to `gameConfig.ts` as `ARRAY_CAPS` object so they're configurable
  - Add a setting toggle in the Settings panel: "Обмеження ефектів" (Effect limits) — default ON, when OFF uses higher caps (2x) for better visual fidelity on powerful devices

  **Must NOT do**:
  - Do not remove existing visual effects — only cap them
  - Do not change game balance or enemy/tower behavior
  - Do not add WebGL batch rendering

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Well-scoped array cap additions with clear line numbers
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `BratTDClient.tsx:3784-4283` — projectile array management (push/filter pattern)
  - `BratTDClient.tsx:3039-3078` — particle system (push/filter pattern)
  - `BratTDClient.tsx:3301-3308` — speed trails (`getPureRandom() < 0.15` spawn trigger, unbounded push)
  - `gameConfig.ts` — where `ARRAY_CAPS` should be added alongside other config

  **Why Each Reference Matters**:
  - These are the exact locations where unbounded arrays grow — need caps inserted at push points
  - `gameConfig.ts` is the right place for configurable constants

  **Acceptance Criteria**:
  - [ ] `ARRAY_CAPS` object exists in `gameConfig.ts` with PROJECTILES=500, PARTICLES=1000, FLOATING_TEXTS=200, SPEED_TRAILS=300, EXPLOSION_RINGS=50
  - [ ] Each array in game loop has a cap check before push (if over cap, shift oldest)
  - [ ] Settings panel has "Обмеження ефектів" toggle that doubles caps when OFF
  - [ ] Endless mode no longer accumulates unbounded arrays (test with 50+ waves)
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Array caps prevent unbounded growth in endless mode
    Tool: Playwright
    Preconditions: Game running in endless mode
    Steps:
      1. Start game on Easy
      2. Skip to wave 20+ using game speed
      3. Place many towers to generate projectiles
      4. Monitor memory usage via browser DevTools (or just play for 5 minutes)
      5. Verify game doesn't lag or crash
    Expected Result: Game remains stable with capped arrays, no memory accumulation
    Failure Indicators: Game freezes, tab crashes, significant FPS drop
    Evidence: .omo/evidence/task-5-array-caps.txt

  Scenario: Effect limits toggle works
    Tool: Playwright
    Preconditions: Settings panel accessible
    Steps:
      1. Open Settings panel
      2. Toggle "Обмеження ефектів" OFF
      3. Place towers and verify more particles visible
      4. Toggle ON
      5. Verify particle count reduces
    Expected Result: Toggle controls visual fidelity vs performance
    Failure Indicators: Toggle doesn't change visual density, toggle crashes game
    Evidence: .omo/evidence/task-5-effect-toggle.png
  ```

  **Commit**: YES
  - Message: `fix(brat-td): add array bounds caps for projectiles, particles, trails`
  - Files: `BratTDClient.tsx`, `gameConfig.ts`
  - Pre-commit: `npm run build`

- [x] 6. Centralize hardcoded config into gameConfig.ts

  **What to do**:
  - Move the following hardcoded values from `BratTDClient.tsx` into `gameConfig.ts`:
    - `ANTI_AIR_TOWER_TYPES` Set (line 28) → `gameConfig.ts` as `ANTI_AIR_TOWERS`
    - `SUPPORT_TOWER_TYPES` Set (line 648) → `gameConfig.ts` as `SUPPORT_TOWERS`
    - `GAME_WIDTH = 800`, `GAME_HEIGHT = 500` (line 6-7 in gameConfig.ts, already there — verify usage)
    - `COFFEE_BUFF` default values (lines 2576, 2875) → `gameConfig.ts` as `COFFEE_BUFF_DEFAULTS`
    - Shield regen delay `360` frames (lines 3102, gameConfig.ts:801) → `gameConfig.ts` as `SHIELD_REGEN_DELAY_FRAMES`
    - Heal formula base `0.1 + maxHp * 0.0001` (lines 3185, 3191) → `gameConfig.ts` as `HEALER_BASE_HEAL`, `HEALER_HP_SCALING`
    - Max overheal `1.5` (line 3194) → `gameConfig.ts` as `MAX_OVERHEAL_MULTIPLIER`
    - Damage debuff cap `1.6` (line 2153) → `gameConfig.ts` as `MAX_DAMAGE_DEBUFF_MULTIPLIER`
    - `DIFFICULTY_CONFIG` (lines 416-419) → already in gameConfig as `DIFFICULTY_CONFIG` — verify, move if not
    - `NON_ENDLESS_WAVE_COUNT = 46` (line 634) → `gameConfig.ts` as `NON_ENDLESS_WAVE_COUNT`
    - `LEADERBOARD_LIMIT = 10` (route.ts:7) → `gameConfig.ts` as `LEADERBOARD_LIMIT`
  - Update all imports in `BratTDClient.tsx` and `route.ts` to use the centralized config
  - Verify `npm run build` passes

  **Must NOT do**:
  - Do not change any gameplay values — only move existing hardcoded numbers to config
  - Do not add new configuration keys that don't already exist as hardcoded values
  - Do not refactor the entire game config structure

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical extraction of constants, no logic changes
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 11, 13, 14, 15 (new content depends on centralized config)
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `BratTDClient.tsx:28` — `ANTI_AIR_TOWER_TYPES`
  - `BratTDClient.tsx:648` — `SUPPORT_TOWER_TYPES`
  - `BratTDClient.tsx:2576, 2875` — coffee buff defaults
  - `BratTDClient.tsx:3102` — shield regen delay
  - `BratTDClient.tsx:3185-3194` — heal formulas and caps
  - `BratTDClient.tsx:2153` — damage debuff cap
  - `BratTDClient.tsx:416-419` — difficulty config
  - `BratTDClient.tsx:634` — NON_ENDLESS_WAVE_COUNT
  - `route.ts:7` — LEADERBOARD_LIMIT

  **Why Each Reference Matters**:
  - These are the exact line numbers with hardcoded values that need centralizing
  - Each value is used in gameplay logic and should be configurable from one place

  **Acceptance Criteria**:
  - [ ] All listed hardcoded values moved to `gameConfig.ts` with descriptive constant names
  - [ ] `BratTDClient.tsx` imports all values from `@/lib/brat-td/config` or `gameConfig`
  - [ ] No numeric magic numbers remain in `BratTDClient.tsx` game logic (search for common patterns)
  - [ ] `route.ts` imports `LEADERBOARD_LIMIT` from gameConfig
  - [ ] Game behavior unchanged (same values, just centralized)
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: No gameplay behavior changed after config centralization
    Tool: Playwright
    Preconditions: Config values moved to gameConfig.ts
    Steps:
      1. Start game on Normal difficulty
      2. Place towers, run waves 1-5
      3. Verify starting gold is 350 (same as before)
      4. Verify tower costs are identical
      5. Verify enemy HP/damage is identical
    Expected Result: Game plays identically to before centralization
    Failure Indicators: Different gold amounts, different tower costs, different enemy stats
    Evidence: .omo/evidence/task-6-config-centralized.txt

  Scenario: All hardcoded values extracted
    Tool: Bash
    Preconditions: Refactoring complete
    Steps:
      1. Search BratTDClient.tsx for the specific magic numbers that were extracted
      2. Confirm they're now imported from gameConfig
      3. Verify gameConfig.ts exports all the constants
    Expected Result: No remaining hardcoded values in BratTDClient.tsx for the extracted items
    Failure Indicators: Hardcoded values still present in client file
    Evidence: .omo/evidence/task-6-no-magic-numbers.txt
  ```

  **Commit**: YES (groups with Tasks 4, 5)
  - Message: `refactor(brat-td): centralize hardcoded config values`
  - Files: `BratTDClient.tsx`, `gameConfig.ts`, `app/api/brat-td/route.ts`
  - Pre-commit: `npm run build`

- [x] 7. Write core game logic tests (TDD foundation)

  **What to do**:
  - Write vitest tests for core game logic that will protect against regressions during module extraction:
    1. **Tower config tests** (`lib/brat-td/__tests__/tower-config.test.ts`):
       - All 11 tower types have complete config (cost, range, fire rate, damage, upgrade paths)
       - Each upgrade path has exactly 5 tiers
       - BTD6 crosspathing rules: max 2 paths active, max 1 path ≥Tier 3
       - Anti-air tower list matches towers with `canHitAir` property
       - Support tower list matches towers with buff definitions
    2. **Enemy config tests** (`lib/brat-td/__tests__/enemy-config.test.ts`):
       - All enemy types have required fields (hp, speed, name)
       - Boss enemies have spawn lists that reference valid enemy types
       - Enemy HP values are positive numbers
    3. **Wave config tests** (`lib/brat-td/__tests__/wave-config.test.ts`):
       - All 46 waves have valid segment structure
       - Each wave segment references valid enemy types
       - Post-46 waves (10) have valid structure
       - Tier scaling multipliers apply correct HP/speed values
    4. **XP/Progression tests** (`lib/brat-td/__tests__/progression.test.ts`):
       - XP formula `148 * level^1.4` produces correct values for levels 1-5
       - Tower unlock levels are monotonically increasing
       - Tier unlock costs match expected values (T3=788, T4=5500, T5=26250)
    5. **Balance test** (`lib/brat-td/__tests__/balance.test.ts`):
       - Starting gold can afford at least 1 tower on each difficulty
       - Wave clear rewards are calculable from formula
       - Difficulty multipliers produce expected values

  **Must NOT do**:
  - Do not test rendering or Canvas drawing (that's for later)
  - Do not test React components (focus on pure logic)
  - Do not create new game configs — only test existing ones
  - Do not restructure config file layout (that's Tasks 2+8)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires reading and understanding game configs deeply to write meaningful assertions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (but depends on Task 1 for vitest setup)
  - **Parallel Group**: Wave 1 (starts after Task 1 completes)
  - **Blocks**: Tasks 8, 9, 10, 12, 13, 14, 15 (extraction and new content need test coverage)
  - **Blocked By**: Task 1 (vitest must be set up first)

  **References**:
  **Pattern References**:
  - `gameConfig.ts:280-659` — TOWER_CONFIGS with all 11 towers
  - `gameConfig.ts:661-1013` — ENEMY_CONFIGS with all 24 enemy types
  - `gameConfig.ts:1035-1507` — WAVES and POST_46_WAVES
  - `gameConfig.ts:160-177` — TIER_SCALING multipliers
  - `gameConfig.ts:192-227` — Player level and XP formulas
  - `gameConfig.ts:28` — ANTI_AIR_TOWER_TYPES

  **API/Type References**:
  - `gameConfig.ts:TowerConfig` — tower interface with all required fields
  - `gameConfig.ts:EnemyConfig` — enemy interface with all required fields

  **Why Each Reference Matters**:
  - Config files contain all the data the tests must validate
  - Understanding crosspathing rules is critical for tower config assertions

  **Acceptance Criteria**:
  - [ ] 5 test files created in `lib/brat-td/__tests__/`
  - [ ] `npx vitest run` passes all tests
  - [ ] At least 30 test cases total across all files
  - [ ] Each test file has at least 5 test cases
  - [ ] All tests are pure logic (no Canvas, no React)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: All game logic tests pass
    Tool: Bash
    Preconditions: Test files written, vitest configured
    Steps:
      1. Run `cd kodlohost && npx vitest run`
      2. Check exit code is 0
      3. Verify output shows 30+ tests passing
    Expected Result: All tests pass, zero failures
    Failure Indicators: Any test failures, import errors, missing mocks
    Evidence: .omo/evidence/task-7-tests-pass.txt

  Scenario: Tests protect against config regressions
    Tool: Bash
    Preconditions: Tests written and passing
    Steps:
      1. Temporarily change a tower cost in gameConfig.ts (e.g., hammer cost from 200 to 999)
      2. Run `npx vitest run` — expect tower config tests to fail
      3. Revert the change
      4. Run `npx vitest run` — expect all tests to pass again
    Expected Result: Tests catch config regressions, pass after revert
    Failure Indicators: Tests don't catch the change, or tests fail after revert
    Evidence: .omo/evidence/task-7-regression-protection.txt
  ```

  **Commit**: YES
  - Message: `test(brat-td): core game logic test suite`
  - Files: `lib/brat-td/__tests__/tower-config.test.ts`, `lib/brat-td/__tests__/enemy-config.test.ts`, `lib/brat-td/__tests__/wave-config.test.ts`, `lib/brat-td/__tests__/progression.test.ts`, `lib/brat-td/__tests__/balance.test.ts`
  - Pre-commit: `npx vitest run`

- [x] 8. Extract engine.ts (game loop, update, spawn, collision)

  **What to do**:
  - Create `lib/brat-td/engine.ts`
  - Extract from `BratTDClient.tsx` into engine module:
    - `updateGame()` — main game loop logic (enemy movement, tower targeting, projectile physics, collision detection)
    - `spawnWave()` / `startNextWave()` — wave spawning logic
    - `handleEnemyDeath()` — enemy death processing (gold reward, matryoshka spawns, floating text)
    - `handleTowerAttack()` — tower firing logic
    - `handleProjectileHit()` — projectile collision and damage application
    - `handleMineTrigger()` — mine explosion logic
    - `updateBuffs()` — coffee/bankomat buff application
    - `handleEnemyAbilities()` — teleportation, shield regen, healing, speed trails
    - `applyDamageDebuffCap()` — damage debuff capping
  - All functions should be pure-ish: take game state as parameters and return updated state (or mutate refs passed in)
  - `BratTDClient.tsx` should import and call these functions from its game loop useEffect
  - Ensure all existing game logic tests (from Task 7) still pass after extraction

  **Must NOT do**:
  - Do not change game behavior — pure extraction, no logic changes
  - Do not rename functions — keep same names for traceability
  - Do not extract rendering logic (that's Task 9)
  - Do not extract state management (that's Task 10)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Large extraction from 6040-line file, needs careful understanding of game loop dependencies
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Tasks 2 (types) and 7 (tests)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 9, 10, 17 (renderer, state, thin wrapper)
  - **Blocked By**: Tasks 2, 7

  **References**:
  **Pattern References**:
  - `BratTDClient.tsx:2400-5100` — main game loop, update, and spawn functions (core extraction target)
  - `BratTDClient.tsx:2910-2920` — `startNextWave()` function
  - `BratTDClient.tsx:3080-3400` — enemy update loop with abilities
  - `BratTDClient.tsx:3784-4283` — projectile update and collision logic

  **API/Type References**:
  - `lib/brat-td/types.ts` (from Task 2) — all type definitions needed for engine function signatures

  **Why Each Reference Matters**:
  - These are the core game logic functions that need extraction
  - Types file provides the interfaces for function parameters

  **Acceptance Criteria**:
  - [ ] `lib/brat-td/engine.ts` exists with all game loop functions extracted
  - [ ] `BratTDClient.tsx` imports and calls engine functions (no inline game logic)
  - [ ] `npx vitest run` — all existing tests still pass
  - [ ] `npm run build` passes
  - [ ] Game plays identically (no behavior changes)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Game plays identically after engine extraction
    Tool: Playwright
    Preconditions: Engine module extracted, client uses imports
    Steps:
      1. Start game on Normal difficulty
      2. Play through waves 1-5 placing towers, upgrading, selling
      3. Verify enemy spawns correctly (types, timing, counts)
      4. Verify tower attacks deal correct damage
      5. Verify projectile collision works (enemies take damage)
      6. Verify enemy abilities (teleport, shield regen, healing)
      7. Verify wave completion gold reward
    Expected Result: Game plays identically to before extraction
    Failure Indicators: Missing enemies, wrong damage, broken abilities, wrong gold
    Evidence: .omo/evidence/task-8-engine-extraction.png

  Scenario: All tests pass after extraction
    Tool: Bash
    Steps:
      1. Run `cd kodlohost && npx vitest run`
      2. Verify exit code 0
      3. Verify all 30+ tests pass
    Expected Result: All tests pass, zero failures
    Failure Indicators: Import resolution errors, undefined function errors
    Evidence: .omo/evidence/task-8-tests-pass.txt
  ```

  **Commit**: YES
  - Message: `refactor(brat-td): extract game engine module`
  - Files: `lib/brat-td/engine.ts`, `BratTDClient.tsx`
  - Pre-commit: `npx vitest run && npm run build`

- [x] 9. Extract renderer.ts (Canvas 2D drawing, particles, effects)

  **What to do**:
  - Create `lib/brat-td/renderer.ts`
  - Extract from `BratTDClient.tsx` into renderer module:
    - `drawScene()` — main rendering entry point
    - `drawTowerSprite()` / `drawEnemySprite()` — entity drawing
    - `drawPath()` / `drawTrack()` — map path rendering
    - `drawObstacles()` — obstacle rendering
    - `drawProjectiles()` — projectile visualization
    - `drawParticles()` / `drawExplosionRings()` / `drawFloatingTexts()` — visual effects
    - `drawStatusEffects()` — status effect indicators on enemies
    - `drawRangeCircle()` — tower range indicator
    - `drawCosmeticEffect()` — cosmetic particle rendering (from Task 3)
    - `drawSceneBackground()` / scene theme rendering
  - All rendering functions take `CanvasRenderingContext2D` and relevant state as parameters
  - `BratTDClient.tsx` should call these functions from its `requestAnimationFrame` loop

  **Must NOT do**:
  - Do not change visual appearance — pure extraction
  - Do not add new visual effects (Task 18)
  - Do not extract game logic (that's engine.ts)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Large extraction, needs understanding of Canvas drawing API and render order
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Tasks 2 and 8 (types and engine)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 17, 18 (thin wrapper, enhanced visuals)
  - **Blocked By**: Tasks 2, 8

  **References**:
  **Pattern References**:
  - `BratTDClient.tsx:4300-5500` — rendering functions (drawScene, drawTowerSprite, drawEnemySprite, etc.)
  - `BratTDClient.tsx:3600-3800` — path/track drawing
  - `BratTDClient.tsx:4800-5100` — particle and effect rendering

  **Acceptance Criteria**:
  - [ ] `lib/brat-td/renderer.ts` exists with all drawing functions extracted
  - [ ] `BratTDClient.tsx` imports and calls renderer functions
  - [ ] Game visuals are identical to before extraction
  - [ ] `npm run build` passes
  - [ ] `npx vitest run` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Visual rendering identical after extraction
    Tool: Playwright
    Preconditions: Renderer module extracted
    Steps:
      1. Start game on Normal difficulty on map "Коростишівський Двір"
      2. Place 3 different tower types
      3. Start a wave with multiple enemy types
      4. Take screenshot of game canvas
      5. Compare visual elements: tower sprites, enemy sprites, projectiles, particles, path
    Expected Result: Visual output identical to pre-extraction
    Failure Indicators: Missing sprites, wrong colors, blank canvas, rendering errors
    Evidence: .omo/evidence/task-9-renderer-extraction.png

  Scenario: Build and tests pass
    Tool: Bash
    Steps:
      1. Run `cd kodlohost && npm run build && npx vitest run`
      2. Verify both pass
    Expected Result: Zero build errors, all tests pass
    Failure Indicators: Import errors, undefined rendering functions
    Evidence: .omo/evidence/task-9-build-tests.txt
  ```

  **Commit**: YES
  - Message: `refactor(brat-td): extract canvas renderer module`
  - Files: `lib/brat-td/renderer.ts`, `BratTDClient.tsx`
  - Pre-commit: `npx vitest run && npm run build`

- [x] 10. Extract state.ts (game state management, ref synchronization)

  **What to do**:
  - Create `lib/brat-td/state.ts`
  - Extract from `BratTDClient.tsx`:
    - All `useRef` initializations and their TypeScript types (towersRef, enemiesRef, projectilesRef, etc.)
    - All `useState` declarations for game UI state (lives, gold, wave, score, gameStatus, etc.)
    - The 18 `useEffect` sync watchers (refs → React state) and replace them with a single `useGameSync()` custom hook that batches the sync
    - `syncInterval` cleanup logic
    - State normalization logic (`normalizeProgression`, `mergeProgression`)
    - Progression save/load functions (`fetchBratTdData`, `saveProgression`)
    - Leaderboard functions (`fetchGlobalLeaderboard`, `submitGlobalScore`)
    - `buildSessionSummary()` function
  - The new `useGameSync()` hook runs a single `setInterval` that syncs ALL refs to state at once, replacing the 18 individual useEffects
  - `BratTDClient.tsx` should import and use these from the state module

  **Must NOT do**:
  - Do not change game behavior — pure extraction
  - Do not add new state variables
  - Do not modify the sync frequency (keep 150ms interval)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: React hooks extraction with careful ref synchronization management
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Tasks 2 and 8
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 17, 21 (thin wrapper, useEffect combination)
  - **Blocked By**: Tasks 2, 8

  **References**:
  **Pattern References**:
  - `BratTDClient.tsx:1836-1853` — 18 individual useEffect sync watchers
  - `BratTDClient.tsx:1380-1500` — state initialization and progression management
  - `BratTDClient.tsx:1447-1477` — normalizeProgression and mergeProgression

  **Why Each Reference Matters**:
  - The 18 sync useEffects are the primary target for consolidation
  - State initialization must be preserved exactly

  **Acceptance Criteria**:
  - [ ] `lib/brat-td/state.ts` exists with state management logic
  - [ ] Single `useGameSync()` hook replaces 18 useEffect watchers
  - [ ] Game state syncs correctly (lives, gold, wave counter update in UI)
  - [ ] Progression saves/loads correctly (cloud sync still works)
  - [ ] `npm run build` passes
  - [ ] `npx vitest run` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Game state syncs correctly after extraction
    Tool: Playwright
    Preconditions: State module extracted, useGameSync hook in place
    Steps:
      1. Start game on Normal difficulty
      2. Place a tower (verify gold decreases)
      3. Start wave 1 (verify wave counter shows 1)
      4. Let enemies reach end (verify lives decrease)
      5. Kill enemies (verify score increases)
    Expected Result: All UI updates happen correctly within 150ms
    Failure Indicators: Gold doesn't decrease, lives don't update, wave counter stuck
    Evidence: .omo/evidence/task-10-state-sync.png

  Scenario: Progression saves to cloud
    Tool: Playwright
    Preconditions: Authenticated user
    Steps:
      1. Start game, earn some XP
      2. Wait for cloud sync (check network tab or wait 2 seconds)
      3. Refresh page
      4. Verify XP and level persist
    Expected Result: Progression persists across page refreshes
    Failure Indicators: Progression lost on refresh
    Evidence: .omo/evidence/task-10-progression-save.txt
  ```

  **Commit**: YES
  - Message: `refactor(brat-td): extract state management module`
  - Files: `lib/brat-td/state.ts`, `BratTDClient.tsx`
  - Pre-commit: `npx vitest run && npm run build`

- [x] 11. Extract audio.ts (sound system with distinct audio events)

  **What to do**:
  - Create `lib/brat-td/audio.ts`
  - Extract from `BratTDClient.tsx`:
    - `playSound()` function and all sound-related logic
    - `SOUND_MAP` from `gameConfig.ts` (volume configurations per tower type)
    - Audio initialization code
  - Restructure `SOUND_MAP` to support distinct audio events per tower type:
    - Each tower type gets its own sound configuration (currently all use same MP3 at different volumes)
    - Define a `SoundEvent` enum: `TOWER_FIRE`, `ENEMY_DEATH`, `WAVE_START`, `WAVE_CLEAR`, `TOWER_PLACE`, `TOWER_SELL`, `TOWER_UPGRADE`, `GAME_OVER`, `VICTORY`, `CRIT_HIT`, `EXPLOSION`
    - Keep the current single MP3 file for now but organize the mapping so future audio files can be dropped in
  - Ensure audio still works with `PDR_PRODUCTION_SOUND.mp3` (no new sound files needed yet)

  **Must NOT do**:
  - Do not add new sound files (that's Task 19)
  - Do not change the current audio behavior (same sounds, same volumes)
  - Do not remove any existing sound triggers

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Audio system extraction with structural reorganization
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (depends only on Task 6 for config centralization)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 17, 19 (thin wrapper, improved sound)
  - **Blocked By**: Task 6

  **References**:
  **Pattern References**:
  - `gameConfig.ts:1732-1748` — SOUND_MAP (current single-file volume mapping)
  - `BratTDClient.tsx:1895` — audio.play() call with silent catch

  **Acceptance Criteria**:
  - [ ] `lib/brat-td/audio.ts` exists with sound system
  - [ ] `SoundEvent` enum defined with all event types
  - [ ] `SOUND_MAP` reorganized for per-event-type configuration
  - [ ] Game sounds identical to before extraction
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Game sounds play correctly after extraction
    Tool: Playwright
    Preconditions: Audio module extracted
    Steps:
      1. Start game with volume on
      2. Place a tower (listen for placement sound)
      3. Start a wave (listen for wave start sound)
      4. Let tower fire at enemy (listen for fire sound)
      5. Kill enemy (listen for death sound)
    Expected Result: All sound events trigger at correct moments
    Failure Indicators: No sounds, wrong timing, errors in console
    Evidence: .omo/evidence/task-11-audio-extraction.txt
  ```

  **Commit**: YES
  - Message: `refactor(brat-td): extract audio module`
  - Files: `lib/brat-td/audio.ts`, `BratTDClient.tsx`, `gameConfig.ts`
  - Pre-commit: `npm run build`

- [x] 12. Add seeded random for endless mode

  **What to do**:
  - Create `lib/brat-td/seeded-random.ts` with a deterministic PRNG (mulberry32 or xoshiro128**)
  - Replace `Math.random()` in `getScaledWave()` (gameConfig.ts lines 1564-1599) with seeded random
  - Seed should be derived from wave number + a game session seed stored in game state
  - Game session seed generated once at game start and saved with the session
  - All endless wave generation (wave 57+) uses seeded random so waves are reproducible for debugging
  - Add game state field `sessionSeed: number` initialized at game start
  - Add a `/seed` command in the settings panel to view/share current seed (for debugging)

  **Must NOT do**:
  - Do not change waves 1-56 (handcrafted, not random)
  - Do not change `Math.random()` used for visual effects (particles, trails) — only wave generation
  - Do not add replay system (future feature)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, focused change with clear scope
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (depends only on Task 7 for test foundation)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 7

  **References**:
  **Pattern References**:
  - `gameConfig.ts:1564-1599` — `getScaledWave()` function using `Math.random()`
  - `BratTDClient.tsx:2300-2400` — game initialization where session seed should be set

  **Acceptance Criteria**:
  - [ ] `lib/brat-td/seeded-random.ts` exists with deterministic PRNG
  - [ ] Endless waves are reproducible given same session seed
  - [ ] Session seed displayed in settings panel
  - [ ] `npx vitest run` passes (add test: same seed = same wave composition)
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Endless waves are reproducible with same seed
    Tool: Bash
    Steps:
      1. Write a unit test that calls getScaledWave with seed=12345 for wave 57
      2. Call it again with same seed
      3. Verify identical enemy compositions
    Expected Result: Same seed produces same wave
    Failure Indicators: Different enemy compositions with same seed
    Evidence: .omo/evidence/task-12-seeded-random.txt

  Scenario: Game still generates endless waves normally
    Tool: Playwright
    Steps:
      1. Start game, skip to wave 56
      2. Start wave 57 (endless mode)
      3. Verify enemies spawn correctly
    Expected Result: Endless mode works with seeded random
    Failure Indicators: No enemies spawn, crashes, different wave every time with same seed
    Evidence: .omo/evidence/task-12-endless-wave.png
  ```

  **Commit**: YES
  - Message: `feat(brat-td): seeded random for endless mode waves`
  - Files: `lib/brat-td/seeded-random.ts`, `gameConfig.ts`, `BratTDClient.tsx`
  - Pre-commit: `npx vitest run && npm run build`

- [x] 13. New enemy: Камікадзе-Брат (kamikaze rusher)

  **What to do**:
  - Add `kamikaze` enemy to `ENEMY_CONFIGS` in `gameConfig.ts`:
    - Name: "Камікадзе-Брат", Emoji: 💥
    - HP: 30, Speed: 2.5 (fastest after Fast Brat)
    - Special: On death, deals 15 damage to ALL towers within 60px range (temporary stun + damage)
    - No armor, no camo, no regen
  - Add drawing code in renderer: red-orange pulsing enemy with explosion indicator
  - Add to appropriate waves (18-23 as modifier, later standalone)
  - Add to tier scaling: gains armor at tier 4+, not at tier 1-3
  - Write vitest tests: kamikaze config valid, ability triggers on death, tower damage capped

  **Balance Rationale**: No enemy currently punishes tower clustering. Камікадзе forces tower spread.

  **Must NOT do**:
  - Do not modify existing enemy types
  - Do not change existing wave configurations (only add kamikaze to new/extended waves)
  - Do not make kamikaze camo or lead

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 6, 7

  **References**:
  - `gameConfig.ts:661-700` — existing enemy config pattern
  - `gameConfig.ts:800-850` — Вибуховий Брат (similar death-trigger mechanic)
  - `gameConfig.ts:160-177` — TIER_SCALING rules

  **Acceptance Criteria**:
  - [ ] `kamikaze` in ENEMY_CONFIGS with valid config
  - [ ] Kamikaze appears in waves 18-23 range
  - [ ] Death ability: 15 damage to towers within 60px, 0.5s stun
  - [ ] Visual: red-orange pulsing enemy on canvas
  - [ ] Tier scaling: gains armor at T4+
  - [ ] Vitest tests pass
  - [ ] `npm run build` passes

  **QA Scenarios**:
  ```
  Scenario: Kamikaze damages towers on death
    Tool: Playwright
    Steps:
      1. Start game, place 3 towers within 60px of each other
      2. Progress to wave with kamikaze enemy
      3. Let kamikaze die near tower cluster
      4. Verify towers take damage and briefly stun
    Expected Result: Kamikaze death damages nearby towers, stun visible
    Evidence: .omo/evidence/task-13-kamikaze.png

  Scenario: Config tests pass
    Tool: Bash
    Steps:
      1. Run `cd kodlohost && npx vitest run`
    Expected Result: Kamikaze has valid config, correct values
    Evidence: .omo/evidence/task-13-kamikaze-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(brat-td): add Камікадзе-Брат enemy type`
  - Files: `gameConfig.ts`, engine/renderer module, test file
  - Pre-commit: `npx vitest run && npm run build`

- [x] 14. New enemy: Брат-Дрон-Розвідник (camo drone variant)

  **What to do**:
  - Add `drone_scout` enemy to `ENEMY_CONFIGS`:
    - Name: "Брат-Дрон-Розвідник", Emoji: 🛸
    - HP: 25, Speed: 1.8
    - Special: Flying (immune to ground towers) + Camo (requires T2+ detection)
    - First enemy combining both abilities
  - Add to waves 25-30 range and later
  - Add drawing: small drone with camo shimmer effect
  - Write vitest tests

  **Must NOT do**:
  - Do not make this enemy lead or armored

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 6, 7

  **References**:
  - `gameConfig.ts:880-900` — `drone_brat` config
  - `gameConfig.ts:750-770` — `camo` config

  **Acceptance Criteria**:
  - [ ] `drone_scout` in ENEMY_CONFIGS with Flying + Camo
  - [ ] Only anti-air + T2+ camo towers can target it
  - [ ] Visual: small drone with camo shimmer
  - [ ] Tests pass, build passes

  **QA Scenarios**:
  ```
  Scenario: Camo drone requires anti-air AND camo detection
    Tool: Playwright
    Steps:
      1. Place hammer tower (no anti-air, no camo) → should not see drone_scout
      2. Place sniper with T2+ camo upgrade → should target drone_scout
    Expected Result: Only towers with both abilities can hit drone_scout
    Evidence: .omo/evidence/task-14-camo-drone.png
  ```

  **Commit**: YES (groups with Task 13)
  - Message: `feat(brat-td): add Брат-Дрон-Розвідник camo drone`
  - Files: gameConfig.ts, renderer, test file
  - Pre-commit: `npx vitest run && npm run build`

- [x] 15. New tower: Вогнемет Подро (flamethrower — DoT tower)

  **What to do**:
  - Add `flamethrower` tower to `TOWER_CONFIGS`:
    - Name: "Вогнемет Подро", Emoji: 🔥
    - Cost: 500G, Range: 120px, Fire rate: 0.25s, Damage: 2 per hit
    - Special: Fire DoT — 8 damage over 4s, stacks up to 3 times, counters regen
    - Player level unlock: 18
    - 3 upgrade paths × 5 tiers (15 upgrades)
    - Ground-only (not anti-air)
  - Add `flamethrower_flame` projectile type
  - Add drawing code: orange-red flame cone
  - Write vitest tests

  **Balance Rationale**: No DoT tower exists. Adds sustained DPS and counters regen enemies.

  **Must NOT do**:
  - Do not make anti-air
  - Do not allow infinite DoT stacking (cap at 3)
  - Do not modify existing tower configs

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 6, 7

  **References**:
  - `gameConfig.ts:280-659` — TOWER_CONFIGS pattern
  - `gameConfig.ts:192-204` — TOWER_UNLOCK_LEVELS

  **Acceptance Criteria**:
  - [ ] `flamethrower` in TOWER_CONFIGS with 15 upgrades
  - [ ] Base: 500G, level 18 unlock, DoT 8 dmg/4s, stacks 3x
  - [ ] Ground-only (excluded from ANTI_AIR_TOWERS)
  - [ ] Flame cone visual renders
  - [ ] Tests pass, build passes

  **QA Scenarios**:
  ```
  Scenario: Flamethrower deals DoT to enemies
    Tool: Playwright
    Steps:
      1. Place flamethrower, target an enemy
      2. Verify burn indicator on enemy
      3. Wait for DoT to tick
      4. Verify enemy HP decreases after tower stops firing
    Expected Result: 2 instant + 8 DoT over 4s, stacks max 3x
    Evidence: .omo/evidence/task-15-flamethrower.png

  Scenario: Flamethrower does NOT target flying enemies
    Tool: Playwright
    Steps:
      1. Place flamethrower near path with flying enemy
      2. Verify it ignores flying enemies
    Expected Result: Only targets ground enemies
    Evidence: .omo/evidence/task-15-no-anti-air.png
  ```

  **Commit**: YES
  - Message: `feat(brat-td): add Вогнемет Подро flamethrower tower`
  - Files: gameConfig.ts, engine, renderer, test file
  - Pre-commit: `npx vitest run && npm run build`

- [x] 16. New wave configurations

  **What to do**:
  - Add kamikaze enemies to waves 18-23 (5-10% per segment)
  - Add drone_scout enemies to waves 25-30
  - Add combined waves 35-40 featuring both new types
  - Add 5 new post-46 waves featuring new content heavily
  - Write vitest tests for new wave configs

  **Must NOT do**:
  - Do not modify waves 1-17
  - Do not change existing wave enemy counts (only add modifiers)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 13, 14, 15

  **References**:
  - `gameConfig.ts:1035-1507` — wave format

  **Acceptance Criteria**:
  - [ ] New enemies appear in waves 18-40
  - [ ] 5 new post-46 waves added
  - [ ] All segments reference valid enemy types
  - [ ] Tests pass, build passes

  **QA Scenarios**:
  ```
  Scenario: New waves spawn correctly
    Tool: Playwright
    Steps:
      1. Progress to waves 20, 28, 47
      2. Verify new enemy types appear
    Expected Result: Kamikaze in wave 20, drone_scout in 28, mixed in 47
    Evidence: .omo/evidence/task-16-new-waves.png
  ```

  **Commit**: YES (groups with Tasks 13-15)
  - Message: `feat(brat-td): new wave configurations`
  - Files: gameConfig.ts, test file
  - Pre-commit: `npx vitest run && npm run build`

- [x] 17. BratTDClient.tsx → thin React wrapper

  **What to do**:
  - Refactor `BratTDClient.tsx` (currently 6040 lines) to a thin React wrapper:
    - `useGameState()` hook from `state.ts`
    - `useGameLoop()` from `engine.ts`
    - `useRenderer()` from `renderer.ts`
    - `useAudio()` from `audio.ts`
    - UI panels (shop, upgrades, settings, achievements) stay in component
  - Target: under 1500 lines
  - All game logic/rendering/audio delegated to modules

  **Must NOT do**:
  - Do not change game behavior
  - Do not add new features

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 20
  - **Blocked By**: Tasks 8, 9, 10, 11

  **References**:
  - All extracted modules from Tasks 8-11

  **Acceptance Criteria**:
  - [ ] `BratTDClient.tsx` under 1500 lines
  - [ ] Game plays identically (no behavior changes)
  - [ ] Tests pass, build passes

  **QA Scenarios**:
  ```
  Scenario: Game works after thin wrapper refactoring
    Tool: Playwright
    Steps:
      1. Play through complete game on Normal: place towers, upgrade, sell, start waves, check settings
    Expected Result: All features identical to pre-refactoring
    Evidence: .omo/evidence/task-17-thin-wrapper.png

  Scenario: Line count under 1500
    Tool: Bash
    Steps:
      1. Run `wc -l BratTDClient.tsx`
    Expected Result: Under 1500 lines
    Evidence: .omo/evidence/task-17-line-count.txt
  ```

  **Commit**: YES
  - Message: `refactor(brat-td): thin React wrapper — all logic in modules`
  - Files: BratTDClient.tsx, all lib/brat-td/*.ts modules
  - Pre-commit: `npx vitest run && npm run build`

- [x] 18. Enhanced Canvas 2D visuals

  **What to do**:
  - Tower shadows (ctx.shadowBlur)
  - Enemy gradient health bars (green→yellow→red)
  - Death fade-out animation (10 frames)
  - Tower placement preview with range circle
  - Status effect indicators (burn, slow, stun pips)
  - Wave start flash/pulse effect
  - Larger gold floating text animation
  - All respect "Обмеження ефектів" toggle

  **Must NOT do**:
  - Do not switch to sprites or WebGL
  - Do not add game mechanics
  - Do not remove existing effects

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Task 9 (renderer)

  **Acceptance Criteria**:
  - [ ] Towers have drop shadows
  - [ ] Enemies have gradient health bars
  - [ ] Enemies fade on death (not instant disappear)
  - [ ] Placement preview with range circle
  - [ ] Status pips above enemies
  - [ ] Effects toggle works
  - [ ] Build passes, no >5fps drop

  **Commit**: YES
  - Message: `feat(brat-td): enhanced Canvas 2D visuals`
  - Files: `lib/brat-td/renderer.ts`
  - Pre-commit: `npm run build`

- [x] 19. Improved sound system

  **What to do**:
  - Restructure audio module for distinct events:
  - `SoundEvent` enum (already defined in Task 11)
  - Per-event sound configs (volume, pitch, duration)
  - Category volume controls (Master, SFX, UI) in Settings
  - Up to 8 concurrent sound limit
  - Keep using `PDR_PRODUCTION_SOUND.mp3` (no new files yet)

  **Must NOT do**:
  - Do not add new audio files
  - Do not remove existing sounds

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Task 11 (audio module)

  **Acceptance Criteria**:
  - [ ] SoundEvent enum with 11 event types
  - [ ] Distinct sound characteristics per event
  - [ ] Settings has Master + SFX + UI sliders
  - [ ] 8 concurrent sound limit
  - [ ] Build passes

  **Commit**: YES
  - Message: `feat(brat-td): improved sound system`
  - Files: `lib/brat-td/audio.ts`, Settings panel, gameConfig.ts
  - Pre-commit: `npm run build`

- [x] 20. Accessibility improvements

  **What to do**:
  - `aria-label` on canvas element
  - `aria-live="polite"` on game status log
  - `aria-label` on icon-only buttons (✕ close)
  - `aria-valuetext` on volume sliders
  - `aria-pressed` on speed button
  - Hidden game state div for screen readers (updated every 2s)
  - Keyboard shortcut for targeting mode cycling

  **Must NOT do**:
  - Do not change visual appearance

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocked By**: Task 17

  **Acceptance Criteria**:
  - [ ] Canvas has aria-label
  - [ ] Status log has aria-live
  - [ ] Icon buttons have aria-label
  - [ ] Sliders have aria-valuetext
  - [ ] Speed button has aria-pressed
  - [ ] Hidden state div updates
  - [ ] Build passes

  **Commit**: YES
  - Message: `feat(brat-td): accessibility improvements`
  - Files: BratTDClient.tsx
  - Pre-commit: `npm run build`

- [x] 21. Combine sync useEffects into useGameSync hook

  **What to do**:
  - Replace 18 individual useEffect sync watchers with single `useGameSync()` hook
  - Single setInterval(150ms) batches all ref→state syncs
  - Use `React.startTransition` for non-urgent updates (particles, floating texts)
  - Proper cleanup on unmount (clear interval, clear refs)
  - No stale closures

  **Must NOT do**:
  - Do not change sync interval (keep 150ms)
  - Do not remove any state sync
  - Do not change game behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocked By**: Task 10 (state module)

  **Acceptance Criteria**:
  - [ ] Single useGameSync() replaces 18 useEffects
  - [ ] All game state synced correctly
  - [ ] No stale closures or memory leaks
  - [ ] Tests pass, build passes

  **Commit**: YES
  - Message: `refactor(brat-td): combine sync useEffects into useGameSync`
  - Files: `lib/brat-td/state.ts`, BratTDClient.tsx
  - Pre-commit: `npx vitest run && npm run build`

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback → fix → re-run → present again → wait for okay.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run tests, check exports). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run build` + `npm run lint` + `npx vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify `BratTDClient.tsx` is under 1500 lines.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ Playwright)
  Start dev server. Play through: start game on Normal difficulty → place towers → complete wave 1-5 → upgrade paths → sell tower → check cosmetics in settings → switch map → check new tower appears in shop → check new enemies appear in waves → game over screen → verify no crashes. Save screenshots to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (`git diff`). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1 (foundation)**: `refactor(brat-td): set up test framework and extract types` — Tasks 1-2
- **Wave 1 (bugs)**: `fix(brat-td): cosmetics rendering, error handling, array bounds, config centralization` — Tasks 3-6
- **Wave 1 (tests)**: `test(brat-td): core game logic test suite` — Task 7
- **Wave 2**: `refactor(brat-td): extract engine, renderer, state, audio modules` — Tasks 8-12
- **Wave 3**: `feat(brat-td): new enemies, tower, waves, and thin client wrapper` — Tasks 13-17
- **Wave 4**: `polish(brat-td): enhanced visuals, sound, accessibility, state sync cleanup` — Tasks 18-21

---

## Success Criteria

### Verification Commands
```bash
cd kodlohost && npm run build  # Expected: successful build, zero errors
cd kodlohost && npx vitest run  # Expected: all tests pass
cd kodlohost && npm run lint    # Expected: zero lint errors
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Game works identically to pre-refactoring
- [ ] BratTDClient.tsx under 1500 lines
- [ ] Cosmetics render visually on canvas
- [ ] New tower and enemies configurable and playable