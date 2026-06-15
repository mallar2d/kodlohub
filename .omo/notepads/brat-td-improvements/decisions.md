# Brat TD Improvements — Decisions

## Architecture
- Modular extraction: types.ts → engine.ts → renderer.ts → state.ts → audio.ts
- BratTDClient.tsx becomes thin React wrapper (<1500 lines)
- TDD: vitest framework, tests before refactoring
- Enhanced Canvas 2D (not sprites/WebGL)

## Content
- New enemy: Камікадзе-Брат (kamikaze rusher) — punishes tower clustering
- New enemy: Брат-Дрон-Розвідник (camo drone) — first flying+camo combo
- New tower: Вогнемет Подро (flamethrower) — DoT mechanic, counters regen

## Bug Fixes
- Cosmetics: effects tracked in state but NOT rendered on canvas → add rendering
- T5 check: t5PathTaken = false → use hasT5ForTowerPath()
- Error handling: all catch blocks empty → add console.warn
- Memory: unbounded arrays → add caps (projectiles=500, particles=1000)
