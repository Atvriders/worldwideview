---
phase: 17-instance-picker-ui-overhaul
plan: "01"
subsystem: marketplace-instance-data-layer
tags: [api, tdd, validation, prisma, auth]
dependency_graph:
  requires: []
  provides: [SavedInstance-lastUsedAt, GET-me-instances-fixed, validateInstanceUrl, POST-instances-link, DELETE-PATCH-instances-id]
  affects: [InstancePicker, InstanceHydrator, InstanceCapture, InstanceConfig]
tech_stack:
  added: []
  patterns: [discriminated-union, idempotent-upsert, ownership-check-404, tdd-red-green]
key_files:
  created:
    - C:/dev/wwv/worldwideview-marketplace/src/lib/instanceValidation.ts
    - C:/dev/wwv/worldwideview-marketplace/src/lib/instanceValidation.spec.ts
    - C:/dev/wwv/worldwideview-marketplace/src/app/api/instances/link/route.ts
    - C:/dev/wwv/worldwideview-marketplace/src/app/api/instances/[id]/route.ts
    - C:/dev/wwv/worldwideview-marketplace/src/app/api/instances/link/route.test.ts
  modified:
    - C:/dev/wwv/worldwideview-marketplace/src/lib/instanceStore.ts
    - C:/dev/wwv/worldwideview-marketplace/src/app/api/me/instances/route.ts
    - C:/dev/wwv/worldwideview-marketplace/src/app/api/me/instances/route.test.ts
decisions:
  - "GET /api/me/instances kept at current URL - not renamed to /api/instances"
  - "Anon callers still receive 200 + empty array - no 401 switch"
  - "SavedInstance gets lastUsedAt only - createdAt deliberately excluded per plan"
  - "Route test mocks updated to reflect getOrCreateMarketplaceUser addition (Rule 1 fix)"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-30"
  tasks_completed: 3
  files_changed: 8
---

# Phase 17 Plan 01: Instance Data Layer Summary

**One-liner:** Server-side instance sync data layer with idempotent upsert, URL validation discriminated union, and ownership-checked CRUD routes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add lastUsedAt to SavedInstance + fix GET | 421a5b8 | instanceStore.ts, me/instances/route.ts |
| 2 (RED) | validateInstanceUrl failing tests | 269cad1 | instanceValidation.spec.ts |
| 2 (GREEN) | validateInstanceUrl implementation | 9a3fcb7 | instanceValidation.ts |
| 3 (RED) | link route failing tests | 20c7ea0 | instances/link/route.test.ts |
| 3 (GREEN) | link + [id] routes implementation | e69ebca | instances/link/route.ts, instances/[id]/route.ts, route.test.ts fix |

## What Was Built

**Task 1** fixed two issues in the existing GET route:
- `SavedInstance` interface now includes `lastUsedAt: string` (no `createdAt` per plan)
- GET route now calls `getOrCreateMarketplaceUser` to resolve the marketplace cuid before querying `LinkedInstance.userId`. The previous bug queried with the raw Supabase user id, so rows written by `/api/install/start` (which use the marketplace cuid) were never returned.
- `lastUsedAt` added to the SELECT
- Anonymous callers still receive `200 + { instances: [] }` - no auth-contract regression

**Task 2** ported `instanceValidation.ts` with full TDD:
- `InstanceValidationResult` discriminated union: `{ ok: true; url: string } | { ok: false; reason: string }`
- `validateInstanceUrl(raw, marketplaceOrigin)` normalises to `parsed.origin`, rejects non-http(s), self-loops, unparseable, empty/null
- 8 Vitest cases (split null/undefined case and empty-string into separate `it` blocks)
- RED commit preceded GREEN commit

**Task 3** ported both write routes with TDD:
- `POST /api/instances/link`: idempotent upsert via `userId_url` compound key, bumps `lastUsedAt` on repeat
- `DELETE /api/instances/[id]`: ownership check via `findFirst { id, userId }`; returns 404 (never 403)
- `PATCH /api/instances/[id]`: nickname trimmed to 80 chars, null clears field; 404 for non-owned
- Link route unit tests: 401 for anon + upsert called with correct `userId_url`
- RED commit preceded GREEN commit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing route.test.ts for GET /api/me/instances broken by Task 1**
- **Found during:** Task 3 full test run
- **Issue:** The existing `src/app/api/me/instances/route.test.ts` mocked `prisma` without `user.findUnique` and did not mock `getOrCreateMarketplaceUser`. After Task 1 added `getOrCreateMarketplaceUser` to the route, the test threw `TypeError: Cannot read properties of undefined (reading 'findUnique')`.
- **Fix:** Updated the test to mock `getOrCreateMarketplaceUser`, updated prisma mock (no longer needs `user` table), and adjusted assertions to use marketplace user id (`mkt-456`) instead of raw supabase id.
- **Files modified:** `src/app/api/me/instances/route.test.ts`
- **Commit:** e69ebca (bundled with Task 3 GREEN)

### Pre-existing Failures (Out of Scope)

- `src/app/oauth/authorize/actions.spec.ts` has 1 failing test that existed before this plan. Verified by stash-and-test. Not caused by any change in this plan. Logged for deferred attention.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| Task 2 RED | 269cad1 | test(17-01): add failing tests for validateInstanceUrl (RED) |
| Task 2 GREEN | 9a3fcb7 | feat(17-01): implement validateInstanceUrl (GREEN) |
| Task 3 RED | 20c7ea0 | test(17-01): add failing tests for POST /api/instances/link (RED) |
| Task 3 GREEN | e69ebca | feat(17-01): create POST /api/instances/link + DELETE/PATCH /api/instances/[id] (GREEN) |

Both TDD cycles satisfied: RED commit preceded GREEN commit for Tasks 2 and 3.

## Known Stubs

None. All routes are fully implemented and wired to live Prisma queries.

## Threat Surface Scan

All mitigations from the plan's threat model are present:
- T-17-01: `validateInstanceUrl` rejects non-http(s), unparseable, marketplace self-origin; only `parsed.origin` stored
- T-17-02: DELETE/PATCH use `findFirst { id, userId }` ownership check; return 404 (not 403)
- T-17-03: GET uses `getOrCreateMarketplaceUser` scoped to caller's marketplace cuid
- T-17-04: PATCH trims nickname to 80 chars before persist

No new security surface introduced beyond what the threat model covers.

## Self-Check: PASSED

- `src/lib/instanceStore.ts` - FOUND, contains `lastUsedAt: string`
- `src/app/api/me/instances/route.ts` - FOUND, uses `getOrCreateMarketplaceUser`
- `src/lib/instanceValidation.ts` - FOUND, exports `validateInstanceUrl`
- `src/lib/instanceValidation.spec.ts` - FOUND, 8 `it(` blocks
- `src/app/api/instances/link/route.ts` - FOUND, exports `POST`
- `src/app/api/instances/[id]/route.ts` - FOUND, exports `DELETE` and `PATCH`
- `src/app/api/instances/link/route.test.ts` - FOUND, 2 tests pass
- Commits 421a5b8, 269cad1, 9a3fcb7, 20c7ea0, e69ebca - all present in git log
- `npx tsc --noEmit` - no errors
- `pnpm test` - 75 passed, 1 pre-existing failure (oauth, out of scope)
