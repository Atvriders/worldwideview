---
phase: 27-tool-description-rewrite
plan: "01"
subsystem: mcp
tags: [mcp, tool-descriptions, testing]
dependency_graph:
  requires: []
  provides: [DESC-01]
  affects: [globeCommandTools.ts, globeCommandTools.test.ts]
tech_stack:
  added: []
  patterns: [6-component tool description standard]
key_files:
  modified:
    - src/app/api/mcp/globeCommandTools.ts
    - src/app/api/mcp/globeCommandTools.test.ts
decisions:
  - "6-component order: Purpose -> When to use -> Limitations -> Parameters -> Example"
  - "Descriptions 574-687 chars, well under 1024 char hard cap"
  - "Canonical sessions/no-active-session phrasing reused verbatim from MCP_SERVER_INSTRUCTIONS"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-31T04:50:46Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 27 Plan 01: Command Tool Description Rewrite (DESC-01) Summary

Rewrote the four globe command tool descriptions (pan_globe, focus_entity, toggle_layer, set_timeline) in globeCommandTools.ts to the 6-component standard, and added enforcement tests in globeCommandTools.test.ts.

## What Was Done

### Task 1: Rewrite four command tool descriptions

Each of the four tools now has a description following the fixed component order: Purpose -> When to use (with Prefer disambiguation) -> Limitations -> Parameters -> Example.

Mandatory substrings present in every description:
- "globe://sessions" (sessions precondition)
- "no active globe session to control" (no-session outcome, canonical phrasing from MCP_SERVER_INSTRUCTIONS)
- "Prefer " (disambiguation line naming nearest alternative)
- "Example:" (worked example call)

Description lengths: pan_globe 687, focus_entity 680, toggle_layer 574, set_timeline 602. All under 1024 char hard cap.

set_timeline also names all five timeWindow enum values ('1h','6h','24h','48h','7d').
pan_globe states coordinate ranges and notes focus_entity entity-id resolution is not yet wired.

### Task 2: Add DESC-01 enforcement tests

New `describe("command tool descriptions (DESC-01)")` block in globeCommandTools.test.ts with data-driven `it.each` over all four tool names asserting:
- description length > 0 and <= 1024
- includes "globe://sessions"
- includes "no active globe session to control"
- includes "Prefer "
- includes "Example:"

Plus a set_timeline-specific assertion that at least one timeWindow enum literal is present.

Updated `makeFakeServer()` to capture the schema def (second `registerTool` argument) per tool name.

All 65 tests pass.

## Deviations from Plan

None - plan executed exactly as written.

Pre-existing tsc error in src/lib/mcp/server.ts (Property 'camera' does not exist on type 'GlobeStateSnapshot') was present before this plan and is out of scope.

## Self-Check: PASSED

- src/app/api/mcp/globeCommandTools.ts: modified
- src/app/api/mcp/globeCommandTools.test.ts: modified
- Commits: b4f8e20 (feat), 576efde (test)
- pnpm test -- globeCommandTools: 65 passed
