/**
 * @file auth-contracts.ts
 * @description Shared contracts for Decentralized Plugin Authentication.
 */

/**
 * Payload sent by the Local App to the Marketplace to exchange a long-lived
 * API key for a short-lived, audience-bound JWT.
 */
export interface TokenExchangeRequest {
    /** The long-lived API key securely stored by the Local App */
    apiKey: string;
    /** The specific Data Engine (audience) the Local App wants to connect to */
    audience: string;
}

/**
 * First message sent by the Local App over the WebSocket to authenticate with the Data Engine.
 */
export interface WebSocketAuthMessage {
    type: "auth";
    /** The short-lived JWT obtained from the Token Exchange */
    token: string;
}
