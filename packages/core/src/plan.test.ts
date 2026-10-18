import { expect, test } from "bun:test";

import { isCapturable, planShots, shotFilename } from "@/plan.ts";
import type { Shot } from "@/plan.ts";

const mobile1 = {
  styles: { height: "568px", width: "320px" },
};

const base = {
  globals: {},
  parameters: { viewport: { options: { mobile1 } } },
};

function shotsOf(plan: ReturnType<typeof planShots>): Shot[] {
  if (!("shots" in plan)) {
    throw new Error("expected shots");
  }

  return plan.shots;
}

test("default shot is 1200x900", () => {
  const [shot] = shotsOf(planShots(base));
  expect(shot).toMatchObject({ height: 900, label: "1200x900", width: 1200 });
});

test("viewports become one shot per width at height 900", () => {
  const plan = planShots({
    ...base,
    parameters: {
      ...base.parameters,
      chromatic: { viewports: [320, 1200] },
    },
  });

  const [narrow, wide] = shotsOf(plan);
  expect(narrow).toMatchObject({
    globals: {},
    height: 900,
    label: "320",
    width: 320,
  });
  expect(wide).toMatchObject({ height: 900, label: "1200", width: 1200 });
});

test("modes win and a named viewport is looked up", () => {
  const plan = planShots({
    ...base,
    parameters: {
      ...base.parameters,
      chromatic: {
        modes: {
          narrow: { viewport: 320 },
          phone: { backgrounds: { value: "dark" }, viewport: "mobile1" },
          tall: { viewport: { height: 200, width: 400 } },
        },
      },
    },
  });

  const [narrow, phone, tall] = shotsOf(plan);
  expect(narrow).toMatchObject({
    globals: {},
    height: 900,
    label: "narrow",
    width: 320,
  });
  expect(phone).toMatchObject({
    globals: {
      backgrounds: { value: "dark" },
      viewport: { isRotated: false, value: "mobile1" },
    },
    height: 568,
    label: "phone",
    width: 320,
  });
  expect(tall).toMatchObject({
    globals: {},
    height: 200,
    label: "tall",
    width: 400,
  });
});

test("a mode without a viewport stays at 1200x900", () => {
  const plan = planShots({
    ...base,
    parameters: {
      chromatic: { modes: { dark: { backgrounds: { value: "dark" } } } },
    },
  });

  const [shot] = shotsOf(plan);
  expect(shot).toMatchObject({
    globals: { backgrounds: { value: "dark" } },
    height: 900,
    label: "dark",
    width: 1200,
  });
});

test("built-in mobile1 applies when the story sets no options", () => {
  const plan = planShots({
    globals: { viewport: { isRotated: false, value: "mobile1" } },
    parameters: {},
  });

  const [shot] = shotsOf(plan);
  expect(shot).toMatchObject({ height: 568, label: "mobile1", width: 320 });
});

test("pinned viewport uses the option size and rotation swaps axes", () => {
  const plan = planShots({
    ...base,
    globals: { viewport: { isRotated: true, value: "mobile1" } },
  });

  const [shot] = shotsOf(plan);
  expect(shot).toMatchObject({ height: 320, label: "mobile1", width: 568 });
});

test("modes and viewports together are an error", () => {
  const plan = planShots({
    ...base,
    parameters: {
      chromatic: { modes: { a: { viewport: 100 } }, viewports: [200] },
    },
  });

  expect(plan).toEqual({
    error: "chromatic.modes and chromatic.viewports are both set",
  });
});

test("unknown named viewport is an error", () => {
  const plan = planShots({
    globals: {},
    parameters: { chromatic: { modes: { phone: { viewport: "nope" } } } },
  });

  expect(plan).toEqual({ error: "unknown viewport nope" });
});

test("disable and disableSnapshot skip the story", () => {
  expect(
    planShots({ ...base, parameters: { chromatic: { disable: true } } })
  ).toEqual({
    skip: true,
  });
  expect(
    planShots({ ...base, parameters: { chromatic: { disableSnapshot: true } } })
  ).toEqual({ skip: true });
});

test("capture flags come from chromatic parameters", () => {
  const plan = planShots({
    ...base,
    parameters: {
      chromatic: {
        cropToViewport: true,
        delay: 50,
        diffIncludeAntiAliasing: true,
        diffThreshold: 0.2,
        pauseAnimationAtEnd: false,
      },
    },
  });

  const [shot] = shotsOf(plan);
  expect(shot).toMatchObject({
    cropToViewport: true,
    delay: 50,
    includeAA: true,
    pauseAtEnd: false,
    threshold: 0.2,
  });
});

test("index entries skip docs and !test", () => {
  expect(isCapturable({ tags: ["dev", "test"], type: "story" })).toBe(true);
  expect(isCapturable({ tags: ["dev", "manifest"], type: "story" })).toBe(
    false
  );
  expect(isCapturable({ tags: ["!test"], type: "story" })).toBe(false);
  expect(isCapturable({ tags: [], type: "docs" })).toBe(false);
});

test("shot filenames keep the label and browser", () => {
  expect(shotFilename("button--default", "1200x900", "firefox")).toBe(
    "button--default__1200x900__firefox.png"
  );
  expect(shotFilename("button--modes", "dark/mobile", "chrome")).toBe(
    "button--modes__dark_mobile__chrome.png"
  );
});
