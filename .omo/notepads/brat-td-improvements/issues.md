# Brat TD Improvements — Issues

## Known Issues
- (empty — will populate during execution)
- Build fails with pre-existing errors: (1) gameConfig.ts no longer re-exports types imported from lib/brat-td/types.ts — BratTDClient.tsx can't import PathPoint from "./gameConfig"; (2) Cannot find name 'ARRAY_CAPS' in BratTDClient.tsx. These are from in-progress refactoring, not from vitest setup.
