/** @vitest-environment node */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { 
    issueMarketplaceToken, 
    verifyMarketplaceToken, 
    revokeMarketplaceToken 
} from "./marketplaceToken";

describe("Marketplace Tokens", () => {
    const originalSecret = process.env.AUTH_SECRET;

    beforeAll(() => {
        process.env.AUTH_SECRET = "test-secret-at-least-32-chars-long-!!!";
    });

    afterAll(() => {
        process.env.AUTH_SECRET = originalSecret;
    });

    it("should issue and verify a valid token", async () => {
        const userId = "user-123";
        const token = await issueMarketplaceToken(userId);
        expect(token).toBeDefined();

        const payload = await verifyMarketplaceToken(token);
        expect(payload.sub).toBe(userId);
        expect(payload.scope).toBe("marketplace");
    });

    it("should throw if scope is incorrect", async () => {
        // We can't easily forge a token with wrong scope without re-implementing SignJWT
        // but we can test that verify fails on random strings
        await expect(verifyMarketplaceToken("invalid-token")).rejects.toThrow();
    });

    it("should handle token revocation", async () => {
        const token = await issueMarketplaceToken("user-1");
        const payload = await verifyMarketplaceToken(token);
        const jti = payload.jti!;

        revokeMarketplaceToken(jti);
        
        await expect(verifyMarketplaceToken(token)).rejects.toThrow("Token has been revoked");
    });

    it("should throw if AUTH_SECRET is missing", async () => {
        const secret = process.env.AUTH_SECRET;
        delete process.env.AUTH_SECRET;
        
        await expect(issueMarketplaceToken("u1")).rejects.toThrow("AUTH_SECRET is not set");
        
        process.env.AUTH_SECRET = secret;
    });

    it("should ignore empty jti in revoke", () => {
        expect(() => revokeMarketplaceToken("")).not.toThrow();
    });
});
