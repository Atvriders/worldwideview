import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data-query/service");
vi.mock("@/lib/globeStateStore");
vi.mock("@/lib/mcpSessionCatalog");
vi.mock("@/lib/globeCommandQueue");

import { getAllPluginSnapshots } from "@/lib/data-query/service";
import { readActiveSessions, readGlobeState } from "@/lib/globeStateStore";
import { readSessionCatalog } from "@/lib/mcpSessionCatalog";
import { resolveActiveSessionId } from "@/lib/globeCommandQueue";

import {
    radiusKmToBbox,
    deriveEntityTypes,
    listStreamingPlugins,
    buildInvestigateProse,
    composeGlobeContext,
} from "./discoveryHelpers";

import type { PluginDataSnapshot } from "@/lib/data-query/types";

const mockGetAllSnapshots = vi.mocked(getAllPluginSnapshots);
const mockReadActiveSessions = vi.mocked(readActiveSessions);
const mockReadGlobeState = vi.mocked(readGlobeState);
const mockReadSessionCatalog = vi.mocked(readSessionCatalog);

// resolveActiveSessionId is re-exported from discoveryHelpers but not called
// directly in these tests; mocked to avoid ioredis errors.
vi.mocked(resolveActiveSessionId).mockResolvedValue(null);

beforeEach(() => {
    vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// radiusKmToBbox
// ---------------------------------------------------------------------------
describe("radiusKmToBbox", () => {
    it("produces correct bbox at mid-latitude (lat=45, lon=0, radius=111km)", () => {
        const bbox = radiusKmToBbox(45, 0, 111);
        // lat delta = 111/111 = 1 degree
        expect(bbox.north).toBeCloseTo(46, 4);
        expect(bbox.south).toBeCloseTo(44, 4);
        // lon delta = 111 / (111 * cos(45deg)) ~ 1/cos(45) ~ 1.414
        const expectedLonDelta = 1 / Math.cos((45 * Math.PI) / 180);
        expect(bbox.east).toBeCloseTo(expectedLonDelta, 2);
        expect(bbox.west).toBeCloseTo(-expectedLonDelta, 2);
    });

    it("clamps longitude delta near the poles (lat=89.9)", () => {
        // cos(89.9 deg) is nearly 0 -- guard prevents division explosion
        const bbox = radiusKmToBbox(89.9, 0, 50);
        // lon delta should be capped (cos clamped to 0.01)
        const maxLonDelta = 50 / (111 * 0.01);
        expect(bbox.east - bbox.west).toBeLessThanOrEqual(maxLonDelta * 2 + 0.001);
    });

    it("clamps north to 90 and south to -90 at poles", () => {
        const bbox = radiusKmToBbox(89, 0, 500);
        expect(bbox.north).toBeLessThanOrEqual(90);
        const bbox2 = radiusKmToBbox(-89, 0, 500);
        expect(bbox2.south).toBeGreaterThanOrEqual(-90);
    });

    it("returns correct bbox at equator (lat=0)", () => {
        const bbox = radiusKmToBbox(0, 10, 111);
        expect(bbox.north).toBeCloseTo(1, 4);
        expect(bbox.south).toBeCloseTo(-1, 4);
        // cos(0) = 1 so lon delta ~ 1
        expect(bbox.east).toBeCloseTo(11, 1);
        expect(bbox.west).toBeCloseTo(9, 1);
    });
});

// ---------------------------------------------------------------------------
// deriveEntityTypes
// ---------------------------------------------------------------------------
describe("deriveEntityTypes", () => {
    const snapshot: PluginDataSnapshot = {
        pluginId: "flights",
        entities: [
            {
                id: "e1",
                pluginId: "flights",
                latitude: 0,
                longitude: 0,
                timestamp: new Date(),
                properties: { status: "airborne", airline: "NZ" },
            },
            {
                id: "e2",
                pluginId: "flights",
                latitude: 1,
                longitude: 1,
                timestamp: new Date(),
                properties: { status: "landed", altitude: 0 },
            },
        ],
        timestamp: new Date(),
    };

    it("returns filterDef ids when filterDefs provided", () => {
        const defs = [
            { id: "status", label: "Status", type: "select" as const, propertyKey: "status", options: [] },
        ];
        const result = deriveEntityTypes(snapshot, defs);
        expect(result).toEqual(["status"]);
    });

    it("falls back to distinct properties keys when no filterDefs", () => {
        const result = deriveEntityTypes(snapshot);
        expect(result).toContain("status");
        expect(result).toContain("airline");
        expect(result).toContain("altitude");
    });

    it("returns empty array for snapshot with no entities", () => {
        const empty: PluginDataSnapshot = { pluginId: "x", entities: [], timestamp: new Date() };
        expect(deriveEntityTypes(empty)).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// listStreamingPlugins
// ---------------------------------------------------------------------------
describe("listStreamingPlugins", () => {
    it("returns plugins with counts when snapshots present", async () => {
        mockGetAllSnapshots.mockResolvedValue([
            {
                pluginId: "flights",
                entities: [
                    { id: "e1", pluginId: "flights", latitude: 0, longitude: 0, timestamp: new Date(), properties: {} },
                ],
                timestamp: new Date(),
            },
        ]);
        const result = await listStreamingPlugins();
        expect(result.reason).toBeUndefined();
        expect(result.plugins).toHaveLength(1);
        expect(result.plugins[0].pluginId).toBe("flights");
        expect(result.plugins[0].entityCount).toBe(1);
    });

    it("returns { plugins: [], reason: 'engine unreachable' } when no snapshots", async () => {
        mockGetAllSnapshots.mockResolvedValue([]);
        const result = await listStreamingPlugins();
        expect(result.plugins).toHaveLength(0);
        expect(result.reason).toBe("engine unreachable");
    });
});

// ---------------------------------------------------------------------------
// buildInvestigateProse
// ---------------------------------------------------------------------------
describe("buildInvestigateProse", () => {
    it("happy path: returns count + camera panned text when session present", () => {
        const prose = buildInvestigateProse({
            displayName: "Auckland, NZ",
            entityType: "flights",
            matchedPlugin: "flights",
            entityCount: 5,
            sessionPresent: true,
        });
        expect(prose.length).toBeGreaterThan(0);
        expect(prose).toContain("5");
        expect(prose).toContain("Auckland");
        expect(prose).toContain("Camera has been panned");
    });

    it("happy path: notes skipped camera when no session", () => {
        const prose = buildInvestigateProse({
            displayName: "Auckland, NZ",
            entityType: "flights",
            matchedPlugin: "flights",
            entityCount: 3,
            sessionPresent: false,
        });
        expect(prose).toContain("camera pan skipped");
    });

    it("no-matching-plugin: explains entity_type not found", () => {
        const prose = buildInvestigateProse({
            displayName: "Auckland, NZ",
            entityType: "submarines",
            matchedPlugin: null,
            entityCount: 0,
            sessionPresent: false,
        });
        expect(prose).toContain("submarines");
        expect(prose).toContain("list_available_plugins");
    });

    it("no-data-matches: explains empty region result", () => {
        const prose = buildInvestigateProse({
            displayName: "Auckland, NZ",
            entityType: "flights",
            matchedPlugin: "flights",
            entityCount: 0,
            sessionPresent: true,
            emptyReason: "no_data_matches",
        });
        expect(prose.length).toBeGreaterThan(0);
        expect(prose).toContain("no");
    });
});

// ---------------------------------------------------------------------------
// composeGlobeContext
// ---------------------------------------------------------------------------
describe("composeGlobeContext", () => {
    it("returns sessionCount:0 + camera:null when no sessions", async () => {
        mockReadActiveSessions.mockResolvedValue([]);
        mockGetAllSnapshots.mockResolvedValue([]);

        const ctx = await composeGlobeContext("u1");
        expect(ctx.sessionCount).toBe(0);
        expect(ctx.camera).toBeNull();
        expect(ctx.layers).toEqual({});
    });

    it("returns camera + layers when session active", async () => {
        mockReadActiveSessions.mockResolvedValue([{ sessionId: "s1", lastSeen: Date.now() }]);
        mockGetAllSnapshots.mockResolvedValue([]);
        mockReadGlobeState.mockResolvedValue({
            viewport: { lat: -36.8, lon: 174.7, altitude: 500000, heading: 0, pitch: -45, roll: 0 },
            layers: { flights: { enabled: true } as never },
            timeline: { currentTime: "2026-01-01T00:00:00Z", timeWindow: "1h", isPlaybackMode: false, playbackTime: 0, playbackSpeed: 1 },
            selectedEntity: null,
            lastUpdate: Date.now(),
        });
        mockReadSessionCatalog.mockResolvedValue({ tools: [], capabilities: [] });

        const ctx = await composeGlobeContext("u1");
        expect(ctx.sessionCount).toBe(1);
        expect(ctx.camera).not.toBeNull();
        expect(ctx.camera?.lat).toBeCloseTo(-36.8);
        expect(ctx.layers).toHaveProperty("flights");
    });
});
