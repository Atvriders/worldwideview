import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { getEntitiesInRegion } from "@/lib/data-query/service";

export async function GET(request: NextRequest) {
    const auth = await authenticateApiKey(request);
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const north = parseFloat(searchParams.get("north") ?? "");
    const south = parseFloat(searchParams.get("south") ?? "");
    const east = parseFloat(searchParams.get("east") ?? "");
    const west = parseFloat(searchParams.get("west") ?? "");

    if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
        return NextResponse.json(
            { error: "Missing or invalid bounding box parameters (north, south, east, west)" },
            { status: 400 },
        );
    }

    const pluginId = searchParams.get("pluginId") ?? undefined;
    const rawLimit = searchParams.get("limit");
    const limit = Math.min(parseInt(rawLimit ?? "100", 10), 1000);

    try {
        const entities = await getEntitiesInRegion({ north, south, east, west, pluginId, limit });
        return NextResponse.json({
            entities,
            count: entities.length,
            bounds: { north, south, east, west },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        if (message.includes("Invalid bounding box")) {
            return NextResponse.json({ error: message }, { status: 400 });
        }
        console.error("[entities/region] GET error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
