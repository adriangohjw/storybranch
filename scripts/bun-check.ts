import { spawnSync } from "node:child_process";

const bun = process.env.BUN_CHECK_BIN ?? process.execPath;
const result = spawnSync(bun, ["check"], {
  stdio: "inherit",
  cwd: process.cwd(),
});

process.exit(result.status ?? 1);
