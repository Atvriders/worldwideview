import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma");
vi.mock("@/lib/globeStateStore");
vi.mock("@/lib/data-query/service");

import { registerFavoritesTools } from "./favoritesTools";
import { prisma } from "@/lib/prisma";
import { readActiveSessions } from "@/lib/globeStateStore";
import { getEntityDetails } from "@/lib/data-query/service";

const mockPrisma = vi.mocked(prisma, true);
const mockReadActiveSessions = vi.mocked(readActiveSessions);
const mockGetEntityDetails = vi.mocked(getEntityDetails);

const handlers: Record<string, (args: unknown) => unknown> = {};
const mockServer = {
    registerTool: vi.fn((name: string, _schema: unknown, handler: (args: unknown) => unknown) => {
        handlers[name] = handler;
    }),
};

const ctx = { userId: "u1" };

beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(handlers).forEach((k) => delete handlers[k]);
    registerFavoritesTools(mockServer as never, ctx);
});

describe("save_favorite tool handler", () => {
    it("calls prisma.favorite.upsert with userId from context, not from args", async () => {
        mockPrisma.favorite.upsert.mockResolvedValue({} as never);

        await handlers["save_favorite"]({
            entityId: "ship:123",
            pluginId: "maritime",
            userId: "attacker",
        });

        expect(mockPrisma.favorite.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: "u1" }),
                create: expect.objectContaining({ userId: "u1" }),
            }),
        );
        expect(mockPrisma.favorite.upsert).not.toHaveBeenCalledWith(
            expect.objectContaining({ create: expect.objectContaining({ userId: "attacker" }) }),
        );
    });

    it("sets pluginName to pluginId as fallback when name is omitted", async () => {
        mockPrisma.favorite.upsert.mockResolvedValue({} as never);

        await handlers["save_favorite"]({ entityId: "ship:456", pluginId: "maritime" });

        expect(mockPrisma.favorite.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ pluginName: "maritime" }),
            }),
        );
    });
});

describe("list_favorites tool handler", () => {
    it("returns status 'live' for entity when active session exists", async () => {
        mockPrisma.favorite.findMany.mockResolvedValue([
            { id: "1", entityId: "ship:123", pluginId: "maritime", userId: "u1", pluginName: "Maritime", createdAt: new Date() },
        ] as never);
        mockReadActiveSessions.mockResolvedValue(["sess-abc"]);
        mockGetEntityDetails.mockResolvedValue({ entityId: "ship:123", lat: 1, lon: 2 } as never);

        const result = await handlers["list_favorites"]({});

        const text = (result as { content: Array<{ text: string }> }).content[0].text;
        const parsed = JSON.parse(text);
        expect(parsed[0].status).toBe("live");
    });

    it("returns status 'stale' for all entities when no active session exists", async () => {
        mockPrisma.favorite.findMany.mockResolvedValue([
            { id: "1", entityId: "ship:123", pluginId: "maritime", userId: "u1", pluginName: "Maritime", createdAt: new Date() },
        ] as never);
        mockReadActiveSessions.mockResolvedValue([]);

        const result = await handlers["list_favorites"]({});

        const text = (result as { content: Array<{ text: string }> }).content[0].text;
        const parsed = JSON.parse(text);
        expect(parsed[0].status).toBe("stale");
    });

    it("returns status 'stale' when getEntityDetails returns null", async () => {
        mockPrisma.favorite.findMany.mockResolvedValue([
            { id: "1", entityId: "ship:123", pluginId: "maritime", userId: "u1", pluginName: "Maritime", createdAt: new Date() },
        ] as never);
        mockReadActiveSessions.mockResolvedValue(["sess-abc"]);
        mockGetEntityDetails.mockResolvedValue(null);

        const result = await handlers["list_favorites"]({});

        const text = (result as { content: Array<{ text: string }> }).content[0].text;
        const parsed = JSON.parse(text);
        expect(parsed[0].status).toBe("stale");
    });
});

describe("remove_favorite tool handler", () => {
    it("calls prisma.favorite.delete with correct where clause including userId and entityId", async () => {
        mockPrisma.favorite.delete.mockResolvedValue({} as never);

        await handlers["remove_favorite"]({ entityId: "ship:123" });

        expect(mockPrisma.favorite.delete).toHaveBeenCalledWith({
            where: expect.objectContaining({
                userId: "u1",
                entityId: "ship:123",
            }),
        });
    });
});
