import type { IgnoreRect } from "@/images.ts";

export function collectIgnoreRects(selectors: string[]): IgnoreRect[] {
  // page.evaluate ships this function alone, so the selector cannot be a module const.
  const inlineIgnore = '.chromatic-ignore, [data-chromatic="ignore"]';
  const root = document.querySelector("#storybook-root");

  if (!(root instanceof Element)) {
    throw new TypeError("missing #storybook-root");
  }

  const origin = root.getBoundingClientRect();
  const rects: IgnoreRect[] = [];
  const seen = new Set<Element>();

  const add = (element: Element): void => {
    if (seen.has(element)) {
      return;
    }

    seen.add(element);
    const box = element.getBoundingClientRect();

    if (box.width <= 0 || box.height <= 0) {
      return;
    }

    rects.push({
      height: box.height,
      width: box.width,
      x: box.x - origin.x,
      y: box.y - origin.y,
    });
  };

  const query = (scope: ParentNode, selector: string): void => {
    let found: NodeListOf<Element>;

    try {
      found = scope.querySelectorAll(selector);
    } catch {
      throw new Error(`invalid ignore selector ${selector}`);
    }

    for (const element of found) {
      add(element);
    }
  };

  const visit = (scope: ParentNode): void => {
    if (scope instanceof Element) {
      try {
        if (scope.matches(inlineIgnore)) {
          add(scope);
        }
      } catch {
        throw new Error(`invalid ignore selector ${inlineIgnore}`);
      }

      for (const selector of selectors) {
        try {
          if (scope.matches(selector)) {
            add(scope);
          }
        } catch {
          throw new Error(`invalid ignore selector ${selector}`);
        }
      }
    }

    query(scope, inlineIgnore);

    for (const selector of selectors) {
      query(scope, selector);
    }

    for (const element of scope.querySelectorAll("*")) {
      if (element.shadowRoot) {
        visit(element.shadowRoot);
      }
    }
  };

  visit(root);

  return rects;
}
