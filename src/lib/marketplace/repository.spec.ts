import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
    getInstalledPlugins, 
    isInstalled, 
    upsertPlugin, 
    uninstallPlugin, 
    disablePlugin, 
    enablePlugin,
    getDisabledPluginIds
} from "./repository";
import { prisma } from "../db";

vi.mock("../db", () => ({
    prisma: {
        installedPlugin: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            updateMany: vi.fn(),
            create: vi.fn(),
            deleteMany: vi.fn(),
        }
    }
}));

describe("Marketplace Repository", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should get installed plugins", async () => {
        const mockData = [{ pluginId: "p1" }];
        (prisma.installedPlugin.findMany as any).mockResolvedValue(mockData);
        const result = await getInstalledPlugins();
        expect(result).toEqual(mockData);
    });

    it("should check if installed", async () => {
        (prisma.installedPlugin.findFirst as any).mockResolvedValue({ pluginId: "p1" });
        expect(await isInstalled("p1")).toBe(true);
        
        (prisma.installedPlugin.findFirst as any).mockResolvedValue(null);
        expect(await isInstalled("p2")).toBe(false);
    });

    it("should upsert existing plugin", async () => {
        (prisma.installedPlugin.findFirst as any)
            .mockResolvedValueOnce({ pluginId: "p1" }) // exists
            .mockResolvedValueOnce({ pluginId: "p1", version: "2.0.0" }); // return updated
            
        await upsertPlugin("p1", "2.0.0");
        expect(prisma.installedPlugin.updateMany).toHaveBeenCalled();
    });

    it("should create new plugin on upsert", async () => {
        (prisma.installedPlugin.findFirst as any).mockResolvedValue(null);
        await upsertPlugin("pnew", "1.0.0");
        expect(prisma.installedPlugin.create).toHaveBeenCalled();
    });

    it("should handle uninstall", async () => {
        await uninstallPlugin("p1");
        expect(prisma.installedPlugin.deleteMany).toHaveBeenCalledWith({ where: { pluginId: "p1" } });
    });

    it("should handle uninstall failure", async () => {
        (prisma.installedPlugin.deleteMany as any).mockRejectedValue(new Error("Fail"));
        const result = await uninstallPlugin("p1");
        expect(result).toBe(0);
    });

    it("should disable existing plugin", async () => {
        (prisma.installedPlugin.findFirst as any).mockResolvedValue({ pluginId: "p1" });
        await disablePlugin("p1");
        expect(prisma.installedPlugin.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            data: { enabled: false }
        }));
    });

    it("should create record for disabling built-in plugin", async () => {
        (prisma.installedPlugin.findFirst as any).mockResolvedValue(null);
        await disablePlugin("builtin-1");
        expect(prisma.installedPlugin.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ pluginId: "builtin-1", enabled: false })
        }));
    });

    it("should enable plugin", async () => {
        await enablePlugin("p1");
        expect(prisma.installedPlugin.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            data: { enabled: true }
        }));
    });

    it("should get disabled plugin IDs", async () => {
        (prisma.installedPlugin.findMany as any).mockResolvedValue([
            { pluginId: "p1" },
            { pluginId: "p2" }
        ]);
        const ids = await getDisabledPluginIds();
        expect(ids).toBeInstanceOf(Set);
        expect(ids.has("p1")).toBe(true);
        expect(ids.size).toBe(2);
    });
});
