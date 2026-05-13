import { describe, it, expect, vi, beforeEach } from "vitest";
import { cacheLayer } from "./CacheLayer";

describe("CacheLayer", () => {
  let mockDB: any;
  let mockObjectStore: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    cacheLayer.clear();

    mockObjectStore = {
      put: vi.fn(),
      get: vi.fn(() => ({ onsuccess: null })),
      delete: vi.fn(),
      clear: vi.fn(),
    };

    mockDB = {
      transaction: vi.fn(() => ({
        objectStore: () => mockObjectStore,
      })),
      objectStoreNames: {
        contains: vi.fn(() => true),
      },
    };

    // Mock IndexedDB
    const mockRequest: any = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockDB,
    };

    global.indexedDB = {
      open: vi.fn(() => mockRequest),
    } as any;
    
    // Stub global performance for WsClient logs if needed, but here we just need window
    vi.stubGlobal("window", {});
  });

  it("should initialize and open IndexedDB", async () => {
    const initPromise = cacheLayer.init();
    const request = (global.indexedDB.open as any).mock.results[0].value;
    request.onsuccess();
    await initPromise;

    expect(global.indexedDB.open).toHaveBeenCalledWith("worldwideview-cache", 1);
  });

  it("should set and get items from memory cache", () => {
    const entities = [{ id: "1" }];
    cacheLayer.set("plugin-a", entities as any, 1000);

    expect(cacheLayer.get("plugin-a")).toEqual(entities);
  });

  it("should respect TTL for memory cache", () => {
    const entities = [{ id: "1" }];
    cacheLayer.set("plugin-a", entities as any, 1000);

    vi.advanceTimersByTime(1001);
    expect(cacheLayer.get("plugin-a")).toBeNull();
  });

  it("should persist to IndexedDB when set is called", async () => {
    // Initialize DB first
    const initPromise = cacheLayer.init();
    const request = (global.indexedDB.open as any).mock.results[0].value;
    request.onsuccess();
    await initPromise;

    const entities = [{ id: "1" }];
    cacheLayer.set("plugin-a", entities as any, 1000);

    expect(mockDB.transaction).toHaveBeenCalledWith("entities", "readwrite");
    expect(mockObjectStore.put).toHaveBeenCalledWith(
      expect.objectContaining({ entities }),
      "plugin-a"
    );
  });

  it("should fetch from persistent storage if memory miss", async () => {
    // Initialize DB
    const initPromise = cacheLayer.init();
    const request = (global.indexedDB.open as any).mock.results[0].value;
    request.onsuccess();
    await initPromise;

    const entities = [{ id: "persistent" }];
    const getRequest: any = { onsuccess: null, result: { entities, timestamp: Date.now(), ttl: 10000 } };
    mockObjectStore.get.mockReturnValue(getRequest);

    const fetchPromise = cacheLayer.getFromPersistent("plugin-a");
    getRequest.onsuccess();
    const result = await fetchPromise;

    expect(result).toEqual(entities);
    // Should also populate memory cache
    expect(cacheLayer.get("plugin-a")).toEqual(entities);
  });

  it("should handle IndexedDB initialization failure gracefully", async () => {
    const mockRequest: any = { onerror: null };
    global.indexedDB.open = vi.fn(() => mockRequest);
    
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const initPromise = cacheLayer.init();
    mockRequest.onerror();
    await initPromise;
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("IndexedDB unavailable")
    );
  });

  it("should return null from getFromPersistent if entry is expired", async () => {
    const initPromise = cacheLayer.init();
    const request = (global.indexedDB.open as any).mock.results[0].value;
    request.onsuccess();
    await initPromise;

    const entities = [{ id: "expired" }];
    const getRequest: any = { onsuccess: null, result: { entities, timestamp: Date.now() - 2000, ttl: 1000 } };
    mockObjectStore.get.mockReturnValue(getRequest);

    const fetchPromise = cacheLayer.getFromPersistent("plugin-a");
    getRequest.onsuccess();
    const result = await fetchPromise;

    expect(result).toBeNull();
  });

  it("should invalidate both memory and persistent cache", async () => {
    const initPromise = cacheLayer.init();
    const request = (global.indexedDB.open as any).mock.results[0].value;
    request.onsuccess();
    await initPromise;

    cacheLayer.set("plugin-a", [{ id: "1" }] as any);
    cacheLayer.invalidate("plugin-a");
    
    expect(cacheLayer.get("plugin-a")).toBeNull();
    expect(mockObjectStore.delete).toHaveBeenCalledWith("plugin-a");
  });
});
