import { describe, it, expect, afterEach } from "vitest";
import { createPlugin } from "../src/commands/create";
import fs from "fs";
import path from "path";

describe("create command", () => {
    const testDir = path.join(__dirname, "test-plugin");

    afterEach(() => {
        if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("should scaffold a new plugin folder with manifest and index.ts", async () => {
        await createPlugin("test-plugin", __dirname);
        expect(fs.existsSync(path.join(testDir, "wwv-manifest.json"))).toBe(true);
        expect(fs.existsSync(path.join(testDir, "src", "index.ts"))).toBe(true);
        
        const manifest = JSON.parse(fs.readFileSync(path.join(testDir, "wwv-manifest.json"), "utf-8"));
        expect(manifest.id).toBe("test-plugin");
    });
});
