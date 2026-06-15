# Draft: Brat TD v1.0 Release

## Requirements (confirmed)
- Довести гру до версії 1.0
- Баланс: полірування балансу та оптимізації
- Нормальний інтерфейс: весь UI внутрішньо-ігровий, фуллскрін
- Контент-меню: якомусь різновиду вмісту/контенту меню

## Research Findings

### Current State (v0.8)
- 12 tower types (hammer, boomerang, gas, sniper, kladmen, infinix, chain, candy, flamethrower, coffee, bankomat, monolith)
- Each tower has 3 upgrade paths × 5 tiers = 180 upgrades total
- 3 maps: yard (easy), two-way (medium), infinix-junction (hard)
- 13+ enemy types with special abilities (armor, regen, camo, glitch, matryoshka, etc.)
- 8-tier wave scaling system (waves 1-66+)
- Progression: XP, player levels, tower unlocks, achievements (14), titles/frames
- Canvas rendering (800×500, scaled via CSS aspect-ratio)
- Sound system, spatial grid for collision, particle system
- Cloud sync (Supabase), leaderboard (local + global)
- Sandbox mode, difficulty selection (easy/normal/hard)
- ~9200 lines of game code
- 11 test files (balance, bugs, progression, tower configs, economy)

### UI Architecture (Current)
- HTML panels (React components) surround a canvas
- Grid layout: 3 cols for canvas, 1 col for sidebar
- Components: GameHUD, ShopPanel, UpgradePanel, SettingsPanel, ProgressionPanel, CosmeticsPanel, AchievementsPanel, LeaderboardPanel, IdleOverlay, EndGameOverlay, MapSelector, WavePreview, SandboxPanel, StatusBar, AchievementToastStack
- Canvas is 800×500 with aspect-[8/5]
- NO fullscreen mode
- NO in-game pause menu (pause just sets isPaused)
- NO proper tutorial system (just a hint text box)
- Settings are in a sidebar panel (not in-game overlay)

### Identified Gaps for v1.0
- **Fullscreen/Immersive Mode**: Game runs in a small embedded canvas. Needs fullscreen toggle
- **In-Game UI**: All panels should be overlaid ON the game canvas, not separate sidebar cards
- **Pause Menu**: Currently just sets isPaused=true, no proper pause overlay with options
- **Content Browser**: No way to browse towers/enemies out of game (encyclopedia/стрілі)
- **Balance Polish**: Tier scaling, economy curves, tower viability may need tuning
- **Performance**: Canvas rendering may lag with many enemies/projectiles
- **Mobile UX**: Touch controls exist but layout is desktop-focused
- **Tutorial**: Just a text box hint, needs interactive how-to-play
- **Visual Polish**: Animations, transitions, loading states, wave announcements
- **Audio**: Sound system exists but needs volume mixing, SFX variety
- **Game Feel**: Screen shake, juice, feedback on actions

## Technical Decisions
- Canvas resolution stays 800×500 (game coords), CSS scaling handles viewport

## Open Questions
- What specific balance issues exist? (need to review tests)
- Should UI be canvas-rendered or React overlay? (canvas = more immersive, React = easier)
- Fullscreen = browser Fullscreen API or just expanding to fill viewport?
- How much new content for v1.0? More maps? More enemies? More towers?
- Mobile priority level?
- PWA/offline support needed?

## Scope Boundaries
- INCLUDE: Balance, UI overhaul, fullscreen, menu, polish
- EXCLUDE: (to be defined)