import type { TokenExchangeRequest, WebSocketAuthMessage } from "./auth-contracts";

// Type-level tests to ensure the interfaces exist and have the correct shapes

const validExchangeRequest: TokenExchangeRequest = {
    apiKey: "test-api-key",
    audience: "engine-123"
};

const validAuthMessage: WebSocketAuthMessage = {
    type: "auth",
    token: "jwt-token-here"
};

// If the properties above don't exist or have wrong types, TS will fail compilation.
