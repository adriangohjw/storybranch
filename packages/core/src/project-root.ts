import { access, readdir } from "node:fs/promises";
import path from "node:path";

const STORYBOOK_DIR = ".storybook";
const PACKAGE_MANIFEST = "package.json";

export function resolveStartDir(options: {
  cwd?: string;
  flagCwd?: string;
}): string {
  const { cwd, flagCwd } = options;

  if (flagCwd !== undefined && flagCwd !== "") {
    return path.resolve(flagCwd);
  }

  const fromEnv = process.env.STORYBRANCH_ROOT;

  if (fromEnv !== undefined && fromEnv !== "") {
    return path.resolve(fromEnv);
  }

  return cwd ?? process.cwd();
}

export async function resolveProjectRoot(startDir: string): Promise<string> {
  const absolute = path.resolve(startDir);
  let current = absolute;

  for (;;) {
    if (await isStorybookPackageRoot(current)) {
      await assertSingleStorybookConfig(current);

      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  throw new Error(
    `no Storybook package found from ${absolute}; cd into a package with package.json and ${STORYBOOK_DIR}/, or pass --cwd`
  );
}

async function isStorybookPackageRoot(dir: string): Promise<boolean> {
  return (
    (await pathExists(path.join(dir, PACKAGE_MANIFEST))) &&
    (await pathExists(path.join(dir, STORYBOOK_DIR)))
  );
}

async function pathExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function assertSingleStorybookConfig(packageRoot: string): Promise<void> {
  const configs = await findStorybookConfigDirs(packageRoot);
  const expected = path.join(packageRoot, STORYBOOK_DIR);

  if (configs.length === 1 && configs[0] === expected) {
    return;
  }

  if (configs.length === 0) {
    throw new Error(
      `package at ${packageRoot} is missing ${STORYBOOK_DIR}/ at the package root`
    );
  }

  const listed = configs.map((dir) => path.relative(packageRoot, dir)).join(", ");

  throw new Error(
    `package at ${packageRoot} must have exactly one ${STORYBOOK_DIR}/ at the package root; found: ${listed}`
  );
}

async function findStorybookConfigDirs(root: string): Promise<string[]> {
  const found: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const name = entry.name;

      if (name === "node_modules" || name === ".git") {
        continue;
      }

      const full = path.join(dir, name);

      if (name === STORYBOOK_DIR) {
        found.push(full);
        continue;
      }

      await walk(full);
    }
  }

  await walk(root);

  return found.toSorted();
}
