import { describe, it, expect, vi, beforeEach } from "vitest";
import { dataBus } from "./DataBus";

describe("DataBus", () => {
  beforeEach(() => {
    dataBus.removeAllListeners();
    vi.clearAllMocks();
  });

  it("should register and emit events", () => {
    const handler = vi.fn();
    dataBus.on("dataUpdated" as any, handler);
    
    const payload = { pluginId: "p1", entities: [] };
    dataBus.emit("dataUpdated" as any, payload);
    
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it("should unsubscribe via return function", () => {
    const handler = vi.fn();
    const unsub = dataBus.on("dataUpdated" as any, handler);
    
    unsub();
    dataBus.emit("dataUpdated" as any, {});
    
    expect(handler).not.toHaveBeenCalled();
  });

  it("should unsubscribe via off()", () => {
    const handler = vi.fn();
    dataBus.on("dataUpdated" as any, handler);
    
    dataBus.off("dataUpdated" as any, handler);
    dataBus.emit("dataUpdated" as any, {});
    
    expect(handler).not.toHaveBeenCalled();
  });

  it("should not crash if a handler throws", () => {
    const brokenHandler = () => { throw new Error("Boom"); };
    const goodHandler = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    dataBus.on("dataUpdated" as any, brokenHandler);
    dataBus.on("dataUpdated" as any, goodHandler);
    
    dataBus.emit("dataUpdated" as any, {});
    
    expect(goodHandler).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DataBus] Error in handler for "dataUpdated"'),
      expect.any(Error)
    );
  });
});
