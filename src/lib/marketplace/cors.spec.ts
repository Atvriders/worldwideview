import { describe, it, expect } from "vitest";
import { corsHeaders, handlePreflight, withCors } from "./cors";
import { NextResponse } from "next/server";

describe("corsHeaders", () => {
    it("should return empty object if no origin header", () => {
        const req = new Request("http://localhost");
        expect(corsHeaders(req)).toEqual({});
    });

    it("should reflect origin and include marketplace headers", () => {
        const origin = "https://example.com";
        const req = new Request("http://localhost", {
            headers: { "origin": origin }
        });
        const headers = corsHeaders(req);
        expect(headers["Access-Control-Allow-Origin"]).toBe(origin);
        expect(headers["Access-Control-Allow-Private-Network"]).toBe("true");
    });
});

describe("handlePreflight", () => {
    it("should return 204 with CORS headers", () => {
        const req = new Request("http://localhost", {
            headers: { "origin": "http://test.local" }
        });
        const resp = handlePreflight(req);
        expect(resp.status).toBe(204);
        expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("http://test.local");
    });
});

describe("withCors", () => {
    it("should append CORS headers to existing response", () => {
        const req = new Request("http://localhost", {
            headers: { "origin": "http://test.local" }
        });
        const resp = NextResponse.json({ ok: true });
        const wrapped = withCors(resp, req);
        expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBe("http://test.local");
    });
});
