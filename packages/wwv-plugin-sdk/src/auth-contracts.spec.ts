import { describe, it, expect } from "vitest";
import type { TokenExchangeRequest, WebSocketAuthMessage } from "./auth-contracts";

describe("Auth Contracts", () => {
    it("should export correct types", () => {
        const validExchangeRequest: TokenExchangeRequest = {
            apiKey: "test-api-key",
            audience: "engine-123"
        };

        const validAuthMessage: WebSocketAuthMessage = {
            type: "auth",
            token: "jwt-token-here"
        };

        // If the properties above don't exist or have wrong types, TS will fail compilation.
        // We use expect() to satisfy vitest that this is a valid test suite.
        expect(validExchangeRequest.apiKey).toBe("test-api-key");
        expect(validAuthMessage.type).toBe("auth");
    });
});

