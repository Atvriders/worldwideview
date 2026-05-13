import { describe, it, expect, vi, beforeEach } from "vitest";
import { pluginManager } from "./PluginManager";
import { dataBus } from "@/core/data/DataBus";
import { pollingManager } from "@/core/data/PollingManager";
import { cacheLayer } from "@/core/data/CacheLayer";
import { useStore } from "@/core/state/store";
import { loadPluginFromManifest } from "./loadPluginFromManifest";

// Mock dependencies
vi.mock("@/core/data/DataBus", () => ({
  dataBus: {
    emit: vi.fn(),
  },
}));

vi.mock("@/core/data/PollingManager", () => ({
  pollingManager: {
    register: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    stopAll: vi.fn(),
  },
}));

vi.mock("@/core/data/CacheLayer", () => ({
  cacheLayer: {
    init: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    getFromPersistent: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
  },
}));

const mockStore = {
  dataConfig: {
    pluginSettings: {},
  },
  setLayerLoading: vi.fn(),
  isPlaybackMode: false,
  currentTime: new Date(),
};

vi.mock("@/core/state/store", () => ({
  useStore: {
    getState: vi.fn(() => mockStore),
  },
}));

vi.mock("./loadPluginFromManifest", () => ({
  loadPluginFromManifest: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/core/data/resolveEngineUrl", () => ({
  resolveEngineUrl: vi.fn(() => "ws://localhost:5000/stream"),
}));

vi.mock("@/core/data/engineManifest", () => ({
  fetchLocalEngineManifest: vi.fn().mockResolvedValue({}),
}));

describe("PluginManager", () => {
  const mockPlugin = {
    id: "test-plugin",
    name: "Test Plugin",
    initialize: vi.fn().mockResolvedValue(undefined),
    fetch: vi.fn().mockResolvedValue([]),
    getPollingInterval: vi.fn(() => 30000),
    destroy: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.setLayerLoading.mockClear();
    // Clear private plugins map via any
    (pluginManager as any).plugins.clear();
    (pluginManager as any).initialized = false;
  });

  it("should initialize cacheLayer on init", async () => {
    await pluginManager.init();
    expect(cacheLayer.init).toHaveBeenCalled();
  });

  it("should register a plugin and initialize it", async () => {
    await pluginManager.registerPlugin(mockPlugin as any);

    expect(mockPlugin.initialize).toHaveBeenCalled();
    expect(dataBus.emit).toHaveBeenCalledWith("pluginRegistered", expect.objectContaining({
      pluginId: "test-plugin",
      defaultInterval: 30000,
    }));
    expect(pollingManager.register).toHaveBeenCalledWith("test-plugin", 30000, expect.any(Function));
  });

  it("should enable a plugin and start polling", async () => {
    await pluginManager.registerPlugin(mockPlugin as any);
    await pluginManager.enablePlugin("test-plugin");

    expect(useStore.getState().setLayerLoading).toHaveBeenCalledWith("test-plugin", true);
    expect(pollingManager.start).toHaveBeenCalledWith("test-plugin");
    expect(dataBus.emit).toHaveBeenCalledWith("layerToggled", { pluginId: "test-plugin", enabled: true });
  });

  it("should load data from cache when enabling a plugin", async () => {
    const cachedEntities = [{ id: "1" }];
    (cacheLayer.get as any).mockReturnValue(cachedEntities);

    await pluginManager.registerPlugin(mockPlugin as any);
    await pluginManager.enablePlugin("test-plugin");

    expect(dataBus.emit).toHaveBeenCalledWith("dataUpdated", {
      pluginId: "test-plugin",
      entities: cachedEntities,
    });
  });

  it("should disable a plugin and stop polling", async () => {
    await pluginManager.registerPlugin(mockPlugin as any);
    await pluginManager.enablePlugin("test-plugin");
    pluginManager.disablePlugin("test-plugin");

    expect(pollingManager.stop).toHaveBeenCalledWith("test-plugin");
    expect(dataBus.emit).toHaveBeenCalledWith("layerToggled", { pluginId: "test-plugin", enabled: false });
    expect(dataBus.emit).toHaveBeenCalledWith("dataUpdated", { pluginId: "test-plugin", entities: [] });
  });

  it("should handle data updates by caching and emitting", async () => {
    await pluginManager.registerPlugin(mockPlugin as any);
    const entities = [{ id: "new" }];
    
    // Trigger private handleDataUpdate via public registerPlugin's context.onDataUpdate if we can
    const managed = pluginManager.getPlugin("test-plugin");
    managed?.context.onDataUpdate(entities as any);

    expect(cacheLayer.set).toHaveBeenCalledWith("test-plugin", entities, expect.any(Number));
    expect(dataBus.emit).toHaveBeenCalledWith("dataUpdated", { pluginId: "test-plugin", entities });
    expect(useStore.getState().setLayerLoading).toHaveBeenCalledWith("test-plugin", false);
  });

  it("should load plugin from manifest", async () => {
    const manifest = { id: "manifest-plugin" };
    (loadPluginFromManifest as any).mockResolvedValue(mockPlugin);

    await pluginManager.loadFromManifest(manifest as any);

    expect(loadPluginFromManifest).toHaveBeenCalledWith(manifest);
    // Note: PluginManager overrides ID if it differs
    expect(mockPlugin.id).toBe("manifest-plugin");
  });

  it("should get entities for a plugin", async () => {
    const p1 = { ...mockPlugin, id: "p1" };
    await pluginManager.registerPlugin(p1 as any);
    const entities = [{ id: "1" }];
    (pluginManager as any).handleDataUpdate("p1", entities);
    expect(pluginManager.getEntities("p1")).toEqual(entities);
    expect(pluginManager.getEntities("non-existent")).toEqual([]);
  });

  it("should get all entities from enabled plugins", async () => {
    const p1 = { ...mockPlugin, id: "p1" };
    const p2 = { ...mockPlugin, id: "p2" };
    await pluginManager.registerPlugin(p1 as any);
    await pluginManager.registerPlugin(p2 as any);
    await pluginManager.enablePlugin("p1");
    // p2 is disabled by default
    
    (pluginManager as any).handleDataUpdate("p1", [{ id: "e1" }]);
    (pluginManager as any).handleDataUpdate("p2", [{ id: "e2" }]);
    
    expect(pluginManager.getAllEntities()).toEqual([{ id: "e1" }]);
  });

  it("should return all plugins and enabled plugins", async () => {
    await pluginManager.registerPlugin({ ...mockPlugin, id: "p1" } as any);
    await pluginManager.registerPlugin({ ...mockPlugin, id: "p2" } as any);
    await pluginManager.enablePlugin("p1");
    
    expect(pluginManager.getAllPlugins().length).toBe(2);
    expect(pluginManager.getEnabledPlugins().length).toBe(1);
    expect(pluginManager.getEnabledPlugins()[0].plugin.id).toBe("p1");
  });

  it("should fetch for a specific plugin", async () => {
    const p1 = { ...mockPlugin, id: "fetch-test", fetch: vi.fn().mockResolvedValue([]) };
    await pluginManager.registerPlugin(p1 as any);
    await pluginManager.enablePlugin("fetch-test");
    const timeRange = { start: new Date(), end: new Date() };
    
    await pluginManager.fetchForPlugin("fetch-test", timeRange);
    expect(p1.fetch).toHaveBeenCalledWith(timeRange);
  });

  it("should update time range for all enabled plugins", async () => {
    const p1 = { ...mockPlugin, id: "p1", fetch: vi.fn().mockResolvedValue([]) };
    await pluginManager.registerPlugin(p1 as any);
    await pluginManager.enablePlugin("p1");
    
    const timeRange = { start: new Date(), end: new Date() };
    await pluginManager.updateTimeRange(timeRange);
    expect(p1.fetch).toHaveBeenCalledWith(timeRange);
  });

  it("should handle destroy", async () => {
    await pluginManager.registerPlugin(mockPlugin as any);
    pluginManager.destroy();
    expect(pollingManager.stopAll).toHaveBeenCalled();
    expect(mockPlugin.destroy).toHaveBeenCalled();
    expect(pluginManager.getAllPlugins().length).toBe(0);
  });

  it("should toggle plugin state", async () => {
    const p1 = { ...mockPlugin, id: "toggle-test" };
    await pluginManager.registerPlugin(p1 as any);
    
    // togglePlugin is void but calls async enablePlugin
    pluginManager.togglePlugin("toggle-test");
    // Wait for the async enablePlugin to at least set the enabled flag
    await vi.waitFor(() => expect(pluginManager.getPlugin("toggle-test")?.enabled).toBe(true));
    
    pluginManager.togglePlugin("toggle-test");
    expect(pluginManager.getPlugin("toggle-test")?.enabled).toBe(false);
  });
});
