import { describe, it, expect, vi, beforeEach } from "vitest";
import { dataBus } from "./DataBus";

describe("DataBus", () => {
    beforeEach(() => {
        dataBus.removeAllListeners();
        vi.restoreAllMocks();
    });

    it("should allow subscribing and emitting events", () => {
        const handler = vi.fn();
        dataBus.on("dataUpdated", handler);

        const payload = { pluginId: "test-plugin", entities: [] };
        dataBus.emit("dataUpdated", payload);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(payload);
    });

    it("should allow unsubscribing using the returned function", () => {
        const handler = vi.fn();
        const unsubscribe = dataBus.on("dataUpdated", handler);

        unsubscribe();
        dataBus.emit("dataUpdated", { pluginId: "test-plugin", entities: [] });

        expect(handler).not.toHaveBeenCalled();
    });

    it("should allow unsubscribing using the off method", () => {
        const handler = vi.fn();
        dataBus.on("dataUpdated", handler);
        dataBus.off("dataUpdated", handler);

        dataBus.emit("dataUpdated", { pluginId: "test-plugin", entities: [] });

        expect(handler).not.toHaveBeenCalled();
    });

    it("should support multiple listeners for the same event", () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        dataBus.on("dataUpdated", handler1);
        dataBus.on("dataUpdated", handler2);

        const payload = { pluginId: "test-plugin", entities: [] };
        dataBus.emit("dataUpdated", payload);

        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("should catch and log errors thrown by listeners without crashing", () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const badHandler = vi.fn(() => {
            throw new Error("Handler failed");
        });
        const goodHandler = vi.fn();

        dataBus.on("dataUpdated", badHandler);
        dataBus.on("dataUpdated", goodHandler);

        expect(() => {
            dataBus.emit("dataUpdated", { pluginId: "test-plugin", entities: [] });
        }).not.toThrow();

        expect(badHandler).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[DataBus] Error in handler for "dataUpdated":'),
            expect.any(Error)
        );
        expect(goodHandler).toHaveBeenCalledTimes(1);
    });

    it("should allow removing all listeners for a specific event", () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        dataBus.on("dataUpdated", handler1);
        dataBus.on("layerToggled", handler2);

        dataBus.removeAllListeners("dataUpdated");

        dataBus.emit("dataUpdated", { pluginId: "test", entities: [] });
        dataBus.emit("layerToggled", { pluginId: "test", enabled: true });

        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("should allow removing all listeners across all events", () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        dataBus.on("dataUpdated", handler1);
        dataBus.on("layerToggled", handler2);

        dataBus.removeAllListeners();

        dataBus.emit("dataUpdated", { pluginId: "test", entities: [] });
        dataBus.emit("layerToggled", { pluginId: "test", enabled: true });

        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
    });
});
