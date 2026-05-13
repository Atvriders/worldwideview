import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter, getClientIp } from "./rateLimit";
import { NextResponse } from "next/server";

describe("RateLimiter", () => {
    let limiter: RateLimiter;
    const windowMs = 1000;
    const maxRequests = 2;

    beforeEach(() => {
        vi.useFakeTimers();
        limiter = new RateLimiter({ windowMs, maxRequests });
    });

    afterEach(() => {
        limiter.destroy();
        vi.useRealTimers();
    });

    it("should allow requests within limit", () => {
        expect(limiter.check("user-1")).toBeNull();
        expect(limiter.check("user-1")).toBeNull();
    });

    it("should block requests exceeding limit", () => {
        limiter.check("user-1");
        limiter.check("user-1");
        const response = limiter.check("user-1");
        
        expect(response).toBeInstanceOf(NextResponse);
        expect(response?.status).toBe(429);
    });

    it("should reset limit after window expires", () => {
        limiter.check("user-1");
        limiter.check("user-1");
        expect(limiter.check("user-1")).not.toBeNull();

        vi.advanceTimersByTime(windowMs + 1);
        
        expect(limiter.check("user-1")).toBeNull();
    });

    it("should clean up expired entries periodically", () => {
        limiter.check("user-1");
        vi.advanceTimersByTime(windowMs + 1);
        
        // Trigger cleanup (scheduled at windowMs * 2)
        vi.advanceTimersByTime(windowMs);
        
        const store = (limiter as any).store;
        expect(store.has("user-1")).toBe(false);
    });

    it("should clear timer on destroy", () => {
        const clearIntervalSpy = vi.spyOn(global, "clearInterval");
        limiter.destroy();
        expect(clearIntervalSpy).toHaveBeenCalled();
    });
});

describe("getClientIp", () => {
    it("should prefer x-forwarded-for first IP", () => {
        const req = new Request("http://localhost", {
            headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" }
        });
        expect(getClientIp(req)).toBe("1.2.3.4");
    });

    it("should fallback to x-real-ip", () => {
        const req = new Request("http://localhost", {
            headers: { "x-real-ip": "9.9.9.9" }
        });
        expect(getClientIp(req)).toBe("9.9.9.9");
    });

    it("should return unknown if no headers present", () => {
        const req = new Request("http://localhost");
        expect(getClientIp(req)).toBe("unknown");
    });
});
