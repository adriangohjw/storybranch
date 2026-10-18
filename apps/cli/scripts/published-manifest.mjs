import { existsSync } from "node:fs";
import { copyFile, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const cliDir = path.join(import.meta.dirname, "..");

export function publishedManifest(pkg) {
  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    if (version.startsWith("workspace:")) {
      throw new Error(`${name} must be bundled, not published as a dependency`);
    }
  }

  const next = { ...pkg };
  delete next.devDependencies;
  delete next.scripts;
  next.scripts = { postinstall: "playwright install chromium" };

  return next;
}

async function packManifest(restore) {
  const pkgPath = path.join(cliDir, "package.json");
  const backupPath = path.join(cliDir, "package.json.pack-backup");
  const licensePath = path.join(cliDir, "LICENSE");

  if (restore) {
    if (existsSync(licensePath)) {
      await rm(licensePath);
    }

    if (!existsSync(backupPath)) {
      return;
    }

    await writeFile(pkgPath, await readFile(backupPath));
    await rm(backupPath);

    return;
  }

  if (existsSync(backupPath)) {
    throw new Error(
      "package.json.pack-backup already exists; run bun scripts/published-manifest.mjs restore"
    );
  }

  const original = await readFile(pkgPath);
  const next = publishedManifest(JSON.parse(original.toString()));

  await copyFile(path.join(cliDir, "../../LICENSE"), licensePath);
  await writeFile(backupPath, original);
  await writeFile(pkgPath, `${JSON.stringify(next, null, 2)}\n`);
}

if (import.meta.main) {
  await packManifest(process.argv[2] === "restore");
}
