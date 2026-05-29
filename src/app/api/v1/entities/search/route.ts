import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { searchEntities } from "@/lib/data-query/service";

export async function GET(request: NextRequest) {
    const auth = await authenticateApiKey(request);
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q");
    if (!q || q.trim() === "") {
        return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
    }

    const pluginId = searchParams.get("pluginId") ?? undefined;
    const rawLimit = searchParams.get("limit");
    const limit = Math.min(parseInt(rawLimit ?? "20", 10), 100);

    try {
        const entities = await searchEntities(q, pluginId, limit);
        return NextResponse.json({
            entities,
            count: entities.length,
            query: q,
            ...(pluginId !== undefined && { pluginId }),
        });
    } catch (err) {
        console.error("[entities/search] GET error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
