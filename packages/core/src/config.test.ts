import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { loadConfig, parseBrowserList } from "@/config.ts";

test("parseBrowserList accepts chrome firefox edge safari", () => {
  expect(parseBrowserList(["chrome", "firefox", "edge", "safari"])).toEqual([
    "chrome",
    "firefox",
    "edge",
    "safari",
  ]);
  expect(parseBrowserList(["webkit"])).toEqual(["safari"]);
  expect(() => parseBrowserList(["safari", "webkit"])).toThrow(
    "duplicate browser safari"
  );
  expect(() => parseBrowserList(["ie"])).toThrow("unknown browser");
  expect(() => parseBrowserList([])).toThrow("non-empty");
  expect(() => parseBrowserList(["chrome", "chrome"])).toThrow("duplicate");
});

test("loadConfig defaults to chrome when no file exists", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-config-"));
  expect(await loadConfig(root)).toEqual({
    browsers: ["chrome"],
    captureParallel: false,
  });
});

test("loadConfig reads json", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-config-"));
  await Bun.write(
    path.join(root, "storybranch.config.json"),
    JSON.stringify({
      browsers: ["firefox", "edge"],
      captureParallel: true,
    })
  );
  expect(await loadConfig(root)).toEqual({
    browsers: ["firefox", "edge"],
    captureParallel: true,
  });
});

test("loadConfig reads a default export from ts", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-config-"));
  await Bun.write(
    path.join(root, "storybranch.config.ts"),
    "export default { browsers: ['edge'] }\n"
  );
  expect(await loadConfig(root)).toEqual({
    browsers: ["edge"],
    captureParallel: false,
  });
});

test("loadConfig rejects both json and ts", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-config-"));
  await Bun.write(path.join(root, "storybranch.config.json"), "{}\n");
  await Bun.write(
    path.join(root, "storybranch.config.ts"),
    "export default {}\n"
  );
  await expect(loadConfig(root)).rejects.toThrow("keep one");
});
