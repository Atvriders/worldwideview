---
phase: 27-tool-description-rewrite
plan: "03"
subsystem: mcp-tools
tags: [mcp, tool-descriptions, desc-03, geocoding, filters, favorites]
dependency_graph:
  requires: []
  provides: [DESC-03]
  affects: [geocodingTools, filterTools, favoritesTools]
tech_stack:
  added: []
  patterns: [6-component-description-standard, sessions-precondition, prefer-disambiguation]
key_files:
  created: []
  modified:
    - src/app/api/mcp/geocodingTools.ts
    - src/app/api/mcp/filterTools.ts
    - src/app/api/mcp/favoritesTools.ts
    - src/app/api/mcp/geocodingTools.test.ts
    - src/app/api/mcp/filterTools.test.ts
    - src/app/api/mcp/favoritesTools.test.ts
decisions:
  - "fly_to description reuses canonical globe://sessions and 'no active globe session to control' phrasing from MCP_SERVER_INSTRUCTIONS"
  - "Prefer clauses added to fly_to (pan_globe/focus_entity) and clear_filter (over re-setting to empty) for agent disambiguation"
  - "All eight descriptions end with Example: and stay within 350-600 char target, well under the 1024 hard cap"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-31"
  tasks_completed: 3
  files_changed: 6
---

# Phase 27 Plan 03: v1.3 Tool Description Rewrite (DESC-03) Summary

One-liner: Conformed all eight v1.3 tool descriptions (geocodingTools, filterTools, favoritesTools) to the 6-component standard with sessions precondition on fly_to and enforcement tests.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| 1 - geocodingTools.ts descriptions | e3876f8 | geocode_location + fly_to conformed; fly_to gains globe://sessions precondition and Prefer disambiguation |
| 2 - filterTools.ts + favoritesTools.ts descriptions | 8b426d4 | All six remaining tools conformed to 6-component standard |
| 3 - DESC-03 assertion tests | 748d6ea | Schema capture + shared/targeted assertions in all three test files; 41 tests green |

## What Was Done

**Task 1 - geocodingTools.ts:**
- `geocode_location`: added explicit "When to use" (use before fly_to; do not guess coordinates), Nominatim rate-limit and 24h cache limitations, fixed component order.
- `fly_to`: added `globe://sessions` precondition, `"no active globe session to control"` outcome, `Prefer pan_globe/focus_entity` disambiguation clause.

**Task 2 - filterTools.ts:**
- `set_filter`: When-to-use after get_plugin_filters; note that it affects the live globe layer not data query tools.
- `clear_filter`: Prefer-over-re-setting-empty framing; omit-to-clear-all made prominent.
- `get_plugin_filters`: Read-only discovery framing; `[]` when no filters declared or no globe session active stated explicitly.

**Task 2 - favoritesTools.ts:**
- `save_favorite`: Upsert-by-entityId semantics (re-saving updates, not duplicates); exact-id limitation.
- `list_favorites`: `live`/`stale` semantics and no-session fallback stated explicitly; returns `[]` when empty.
- `remove_favorite`: Pair-with-list_favorites disambiguation.

**Task 3 - Tests:**
- Added `schemas` capture alongside `handlers` in all three test mocks.
- Each file: shared data-driven loop asserting `length > 0`, `<= 1024`, and `"Example:"` for every tool.
- Targeted: fly_to globe://sessions + no-active-session-outcome + Prefer; get_plugin_filters [] / no-session; list_favorites live + stale.

## Verification

- `pnpm exec tsc --noEmit`: pre-existing errors in server.ts (unrelated to this plan); no new errors introduced.
- `pnpm test -- geocodingTools filterTools favoritesTools`: 41 tests passed (3 files).
- Diff confined to three registrar files (description strings only) and three co-located test files.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None - no new endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- src/app/api/mcp/geocodingTools.ts: exists and modified
- src/app/api/mcp/filterTools.ts: exists and modified
- src/app/api/mcp/favoritesTools.ts: exists and modified
- src/app/api/mcp/geocodingTools.test.ts: exists and modified
- src/app/api/mcp/filterTools.test.ts: exists and modified
- src/app/api/mcp/favoritesTools.test.ts: exists and modified
- Commits e3876f8, 8b426d4, 748d6ea: verified in git log
