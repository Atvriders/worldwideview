import { Command } from "commander";

import { createPlugin } from "./commands/create";

const program = new Command();

program
  .name("wwv")
  .description("WorldWideView Plugin CLI")
  .version("1.0.0");

program
  .command("create <name>")
  .description("Scaffold a new WorldWideView plugin")
  .action(async (name) => {
      try {
          await createPlugin(name);
      } catch (err: any) {
          console.error("Error:", err.message);
          process.exit(1);
      }
  });

program.parse();
