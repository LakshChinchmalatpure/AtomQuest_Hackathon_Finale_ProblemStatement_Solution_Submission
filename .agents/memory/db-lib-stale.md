---
name: DB lib stale declarations
description: lib/db schema changes require rebuilding lib declarations before artifact typechecks
---

When you edit `lib/db/src/schema/` files (add tables, columns, exports), the TypeScript declaration files in `lib/db/dist/` become stale. Artifact typechecks (`tsc --noEmit`) read from `dist/`, so they see the old exports and report missing members.

**Fix:** Run `pnpm run typecheck:libs` (which runs `tsc --build`) before running any artifact-level typecheck. This rebuilds `lib/db/dist/index.d.ts` with the new exports.

**Why:** lib packages are composite and emit declarations via `tsc --build`. Artifacts consume those declaration files, not the source directly.

**How to apply:** Anytime you touch lib/db (or any lib/* package) schema/exports, run typecheck:libs first. Also needed after `pnpm --filter @workspace/db run push` if you added new schema files.
