/**
 * MCP Filter Tool registrar (Phase 23 Wave 2 -- 23-02).
 *
 * Registers three MCP tools that let an AI agent filter the live globe:
 *
 *   set_filter          -- push filter values to a plugin layer (FILT-01)
 *   clear_filter        -- clear one plugin's filters, or all filters (FILT-02)
 *   get_plugin_filters  -- read a plugin's declared filterable fields (FILT-03)
 *
 * set_filter / clear_filter enqueue a GlobeCommand via enqueueGlobeCommand; the
 * browser drains the queue over the SSE bridge and applies them to filterSlice.
 * get_plugin_filters reads the browser-published session catalog (D-05).
 *
 * Security: userId comes ONLY from ctx (the verified auth result). It is never
 * read from tool arguments. sessionId may come from args (scopes the tab) or is
 * resolved from the user's active ZSET entry.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { enqueueGlobeCommand, resolveActiveSessionId } from "@/lib/globeCommandQueue";
import { readSessionCatalog } from "@/lib/mcpSessionCatalog";
import { filterValueSchema } from "@/lib/mcp/filterSchemas";
import type { GlobeCommand } from "@/core/globe/types/GlobeCommand";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type McpTextResult = { content: [{ type: "text"; text: string }] };

function textResult(text: string): McpTextResult {
    return { content: [{ type: "text", text }] };
}

const NO_SESSION_RESULT = textResult("no active globe session to control");

/**
 * Resolves the session to use: explicit arg takes precedence, falling back to
 * the most-recently-active session for this user. Returns null if none is live.
 */
async function resolveSession(
    userId: string,
    argSessionId: string | undefined,
): Promise<string | null> {
    if (argSessionId !== undefined && argSessionId !== "") {
        return argSessionId;
    }
    return resolveActiveSessionId(userId);
}

// ---------------------------------------------------------------------------
// Public registrar
// ---------------------------------------------------------------------------

export function registerFilterTools(
    server: McpServer,
    ctx: { userId: string },
): void {
    const { userId } = ctx;

    // TOOL: set_filter (FILT-01)
    server.registerTool(
        "set_filter",
        {
            description:
                "Apply one or more filters to a plugin's layer on the live globe. Filters are keyed by filterId; discover valid filter ids and value shapes via get_plugin_filters.",
            inputSchema: {
                pluginId: z.string().min(1).describe("Plugin whose layer to filter, e.g. 'flights'"),
                filters: z
                    .record(z.string(), filterValueSchema)
                    .describe("Map of filterId -> filter value. Discover valid filter ids via get_plugin_filters."),
                sessionId: z.string().optional().describe("Target globe session id. Omit to target most-recently-active tab."),
            },
        },
        async (args) => {
            try {
                const sessionId = await resolveSession(userId, args.sessionId);
                if (sessionId === null) return NO_SESSION_RESULT;

                const cmd: GlobeCommand = {
                    type: "setFilter",
                    pluginId: args.pluginId,
                    filters: args.filters,
                };
                await enqueueGlobeCommand(userId, sessionId, cmd);
                return textResult(
                    `set_filter command enqueued for '${args.pluginId}' (${Object.keys(args.filters).length} filter(s))`,
                );
            } catch (err) {
                console.error("[filterTools] set_filter failed:", err);
                return textResult("set_filter command failed");
            }
        },
    );

    // TOOL: clear_filter (FILT-02)
    server.registerTool(
        "clear_filter",
        {
            description:
                "Clear filters on the live globe. Provide a pluginId to clear just that plugin's filters, or omit it to clear ALL filters.",
            inputSchema: {
                pluginId: z.string().optional().describe("Plugin whose filters to clear. Omit to clear ALL filters on the globe."),
                sessionId: z.string().optional().describe("Target globe session id. Omit to target most-recently-active tab."),
            },
        },
        async (args) => {
            try {
                const sessionId = await resolveSession(userId, args.sessionId);
                if (sessionId === null) return NO_SESSION_RESULT;

                const cmd: GlobeCommand = {
                    type: "clearFilter",
                    ...(args.pluginId !== undefined && { pluginId: args.pluginId }),
                };
                await enqueueGlobeCommand(userId, sessionId, cmd);
                return textResult(
                    args.pluginId
                        ? `clear_filter enqueued for '${args.pluginId}'`
                        : "clear_filter enqueued for ALL plugins",
                );
            } catch (err) {
                console.error("[filterTools] clear_filter failed:", err);
                return textResult("clear_filter command failed");
            }
        },
    );

    // TOOL: get_plugin_filters (FILT-03)
    server.registerTool(
        "get_plugin_filters",
        {
            description:
                "List the filterable fields a plugin has declared. Returns a JSON array of filter definitions (id, label, type, propertyKey, options/range). Returns [] when the plugin declares no filters or no globe session is active.",
            inputSchema: {
                pluginId: z.string().min(1).describe("Plugin to inspect for declared filterable fields"),
            },
        },
        async (args) => {
            try {
                const sessionId = await resolveActiveSessionId(userId);
                if (!sessionId) return textResult("[]");

                const catalog = await readSessionCatalog(userId, sessionId);
                const defs = catalog?.filterDefinitions?.[args.pluginId] ?? [];
                return textResult(JSON.stringify(defs));
            } catch (err) {
                console.error("[filterTools] get_plugin_filters failed:", err);
                return textResult("[]");
            }
        },
    );
}
