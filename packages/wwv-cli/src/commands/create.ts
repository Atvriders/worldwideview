import fs from "fs";
import path from "path";

export async function createPlugin(name: string, basePath: string = process.cwd()) {
    const targetDir = path.join(basePath, name);
    if (fs.existsSync(targetDir)) {
        throw new Error(`Directory ${name} already exists`);
    }

    fs.mkdirSync(targetDir, { recursive: true });
    fs.mkdirSync(path.join(targetDir, "src"), { recursive: true });

    const manifest = {
        manifest_version: 1,
        id: name,
        name: name,
        version: "1.0.0",
        description: "A WorldWideView plugin",
        type: "data-layer",
        category: "custom",
        icon: "Box",
        capabilities: ["data:own"],
        entry: "dist/frontend.mjs",
        dev_entry: "src/index.ts"
    };

    fs.writeFileSync(
        path.join(targetDir, "wwv-manifest.json"),
        JSON.stringify(manifest, null, 2)
    );

    const indexContent = `export default class MyPlugin {
    id = "${name}";
    name = "${name}";
    version = "1.0.0";
    category = "custom";
    icon = "Box";

    async initialize(ctx) {
        console.log("Initialized", this.id);
    }
    
    destroy() {}
    
    async fetch(timeRange) {
        return [];
    }
    
    getPollingInterval() {
        return 5000;
    }
    
    getLayerConfig() {
        return { color: "#3b82f6", clusterEnabled: true, clusterDistance: 50 };
    }
    
    renderEntity(entity) {
        return { type: "point", color: "#3b82f6", size: 6 };
    }
}
`;
    fs.writeFileSync(path.join(targetDir, "src", "index.ts"), indexContent);
    console.log(`Plugin ${name} scaffolded successfully in ./${name}`);
}
