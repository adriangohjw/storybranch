import { expect, test } from "bun:test";
import { existsSync } from "node:fs";

import { chromium } from "playwright";

import { collectIgnoreRects } from "@/ignore.ts";

const hasChromium = existsSync(chromium.executablePath());

test.skipIf(!hasChromium)(
  "inline ignores, selectors, and open shadow roots become boxes",
  async () => {
    const browser = await chromium.launch();

    try {
      const page = await browser.newPage();
      await page.setContent(`
      <div id="storybook-root">
        <p class="chromatic-ignore" style="display:block;width:10px;height:8px">a</p>
        <p data-chromatic="ignore" style="display:block;width:12px;height:6px">b</p>
        <p class="price" style="display:block;width:14px;height:4px">c</p>
        <div id="host"></div>
        <iframe data-chromatic="ignore" style="display:block;width:20px;height:10px;border:0" srcdoc="<p class='chromatic-ignore' style='display:block;width:5px;height:5px'>inside</p>"></iframe>
      </div>
    `);
      await page.evaluate(() => {
        const host = document.querySelector("#host");

        if (!(host instanceof HTMLElement)) {
          throw new Error("missing host");
        }

        const shadow = host.attachShadow({ mode: "open" });
        const inner = document.createElement("span");
        inner.className = "chromatic-ignore";
        inner.style.display = "block";
        inner.style.width = "9px";
        inner.style.height = "7px";
        inner.textContent = "shadow";
        shadow.append(inner);
      });

      const rects = await page.evaluate(collectIgnoreRects, [".price"]);
      const sizes = rects
        .map((rect) => `${Math.round(rect.width)}x${Math.round(rect.height)}`)
        .toSorted();
      expect(sizes).toEqual(["10x8", "12x6", "14x4", "20x10", "9x7"]);
    } finally {
      await browser.close();
    }
  }
);

test.skipIf(!hasChromium)(
  "a bad ignore selector fails the collection",
  async () => {
    const browser = await chromium.launch();

    try {
      const page = await browser.newPage();
      await page.setContent('<div id="storybook-root"></div>');
      await expect(page.evaluate(collectIgnoreRects, ["["])).rejects.toThrow(
        "invalid ignore selector"
      );
    } finally {
      await browser.close();
    }
  }
);
