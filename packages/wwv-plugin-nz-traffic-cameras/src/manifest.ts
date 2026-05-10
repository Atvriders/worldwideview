import type { PluginManifest } from "@worldwideview/wwv-plugin-sdk";

export const manifest: PluginManifest = {
    id: "nz-traffic-cameras",
    name: "NZ Traffic Cameras",
    version: "1.0.0",
    description: "Live traffic cameras from New Zealand Transport Agency (NZTA)",
    author: "WorldWideView",
    license: "MIT",
    format: "es-module",
    type: "active",
    capabilities: ["render_points", "sidebar_details"],
    trustTier: "verified",
    entryPoint: "src/index.ts"
};
