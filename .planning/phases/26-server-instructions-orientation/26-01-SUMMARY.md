---
phase: 26-server-instructions-orientation
plan: "01"
subsystem: mcp-server
tags: [mcp, instructions, prompts, orientation, agent-ux]
dependency_graph:
  requires: []
  provides: [orient-globe-prompt, investigate-prompt, extended-mcp-instructions]
  affects: [src/lib/mcp/server.ts, src/app/api/mcp/route.ts]
tech_stack:
  added: []
  patterns: [userId-closure-registrar, registerPrompt-MCP-SDK, empty-session-graceful-fallback]
key_files:
  created:
    - src/lib/mcp/server.test.ts
  modified:
    - src/lib/mcp/server.ts
    - src/app/api/mcp/route.ts
    - package.json
decisions:
  - "orient-globe reads most-recent session (sessions[0]) matching globeResources.ts pattern; multiple sessions listed but only the newest is inspected for camera/layers"
  - "investigate handler is synchronous (static template, no resource reads) -- registrar is still async for API uniformity"
  - "MCP_SERVER_INSTRUCTIONS WORKFLOWS section lists 3 rules; existing SESSIONS section preserved for backward compat with clients that already parse it"
metrics:
  duration: "~8 min"
  completed: "2026-05-31"
  tasks_completed: 3
  files_changed: 4
---

# Phase 26 Plan 01: Server Instructions + Orientation Summary

Extended MCP server with geospatial-intelligence role framing, a MENTAL MODEL section, three do-X-before-Y workflow rules in instructions, and two MCP prompts (orient-globe, investigate) registered via a userId-scoped registrar wired into the per-request seam.

## Tasks Completed

| Task | Name | Commit | Key files |
|------|------|--------|-----------|
| 1 | Extend MCP_SERVER_INSTRUCTIONS | cb5b1cb | src/lib/mcp/server.ts |
| 2 | Add registerOrientationPrompts registrar | cb5b1cb | src/lib/mcp/server.ts |
| 3 | Wire registrar into route.ts + unit test | cb5b1cb | src/app/api/mcp/route.ts, src/lib/mcp/server.test.ts |

## What Was Built

**MCP_SERVER_INSTRUCTIONS** now opens with "You are a geospatial intelligence assistant..." role-framing. A MENTAL MODEL section defines globe/plugins/sessions in plain terms. A WORKFLOWS section encodes three ordered rules:
- Rule 1: read `globe://sessions` before any command tool.
- Rule 2: check `tools/list` for `<pluginId>__<toolName>` before calling plugin-data tools.
- Rule 3: geocode a place name before calling fly_to / focus_entity.

**registerOrientationPrompts(server, { userId })** is a new exported async registrar in `server.ts` that:
- Registers `orient-globe` (no args): calls `readActiveSessions` + `readGlobeState`, returns a structured text message listing active sessions, loaded layer names/state, and camera lat/lon/alt in one call. Falls back gracefully when no sessions exist.
- Registers `investigate` (optional `place` arg via Zod): returns a static 6-step workflow (geocode -> check plugins -> orient -> toggle layers -> query region -> drill into entity) with the place name woven in when provided.

**route.ts** now calls `await registerOrientationPrompts(server, { userId: authResult.userId })` in the registration seam alongside existing registrars.

**server.test.ts** (17 tests) covers: instructions content assertions (role framing, preserved sections, both workflow rules), registrar registration (both prompt names), orient-globe handler (sessions+layers+camera present, empty-session fallback), investigate handler (step numbering, no TODO/placeholder tokens, place-name weaving, geocode+tools/list steps present).

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- pnpm test -- server.test.ts: 17 passed (17)
- pnpm build: exits 0

## Known Stubs

None.

## Threat Flags

None. orient-globe userId comes from the authResult closure in route.ts (T-26-01 mitigated). investigate place arg is echoed into a static string only -- no eval or query construction (T-26-02 accepted).

## Self-Check: PASSED

- src/lib/mcp/server.ts: exists, contains registerOrientationPrompts export
- src/lib/mcp/server.test.ts: exists, 17 tests green
- src/app/api/mcp/route.ts: contains registerOrientationPrompts call
- commit cb5b1cb: verified in git log
