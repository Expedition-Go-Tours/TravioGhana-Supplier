import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "espree";
import { describe, expect, it } from "vitest";

/**
 * Guards the shell alignment contract documented in components/layout/shell.js:
 *
 *   Every page rendered inside AppShell must start at the same left edge as the
 *   header logo, so pages must NOT declare their own horizontal gutter or centre
 *   themselves with `mx-auto` — AppShell's <PageContainer> owns both.
 *
 *   Centring a page root inside the already-centred column looks fine on the
 *   page you are staring at, but it moves that page's title off the logo by a
 *   different amount on every viewport width and sidebar state (49px at 1440,
 *   184px at 1920, 312px for the offer builder). The page column is the only
 *   thing that centres; a narrower reading measure stays left-aligned on it.
 *
 * Routes that genuinely own their full-viewport layout opt out via
 * `handle: { bleed: true }` in router.jsx and take responsibility for their own
 * gutter by importing SHELL_GUTTER (this test enforces that import).
 *
 * The page root is found with a real parser rather than regex so that nested
 * components, callbacks and return statements cannot produce false positives.
 */

const SRC_DIR = resolve(process.cwd(), "src");
const FEATURES_DIR = join(SRC_DIR, "features");
const LAYOUT_DIR = join(SRC_DIR, "components", "layout");

/** Pages rendered outside AppShell — they have no sidebar/logo to align with. */
const STANDALONE_PAGES = new Set([
  "auth/pages/LoginPage.jsx",
  "auth/pages/AuthCallback.jsx",
  "supplier/pages/SupplierStatusPage.jsx",
]);

/** Bleed routes (see router.jsx) — their chrome must use the shared gutter. */
const BLEED_PAGES = [
  "chat/pages/ChatPage.jsx",
  "products/pages/ProductBuilderPage.jsx",
  "products/pages/ProductDetailPage.jsx",
];

const HORIZONTAL_GUTTER = /(?:^|\s)(?:[a-z0-9-]+:)?(?:p|px|pl|pr)-/;

function pageFiles() {
  const files = [];
  for (const feature of readdirSync(FEATURES_DIR)) {
    const pagesDir = join(FEATURES_DIR, feature, "pages");
    if (!existsSync(pagesDir)) continue;
    for (const file of readdirSync(pagesDir)) {
      if (!file.endsWith(".jsx")) continue;
      const rel = `${feature}/pages/${file}`;
      if (STANDALONE_PAGES.has(rel)) continue;
      files.push({ rel, path: join(pagesDir, file) });
    }
  }
  return files;
}

function parseSource(source, filePath) {
  return parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
    loc: true,
    range: true,
    // Fail loudly on syntax we cannot analyse instead of silently skipping it.
    comment: false,
    filePath,
  });
}

function defaultExportFunction(ast) {
  for (const node of ast.body) {
    if (node.type !== "ExportDefaultDeclaration") continue;
    const { declaration } = node;
    if (
      declaration.type === "FunctionDeclaration" ||
      declaration.type === "FunctionExpression" ||
      declaration.type === "ArrowFunctionExpression"
    ) {
      return declaration;
    }
  }
  return null;
}

function classNameText(attribute, source) {
  if (!attribute) return null;
  const { value } = attribute;
  if (!value) return "";
  if (value.type === "Literal") return String(value.value);
  return source.slice(value.range[0], value.range[1]);
}

/** Page roots: JSX returned directly by the page component (never nested fns). */
function pageRoots(component, source) {
  const roots = [];

  const walk = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (
      node !== component &&
      (node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression")
    ) {
      return; // inner components/callbacks own their own layout
    }
    if (node.type === "ReturnStatement" && node.argument) {
      const argument = node.argument;
      if (argument.type === "JSXElement" || argument.type === "JSXFragment") {
        const opening = argument.type === "JSXElement" ? argument.openingElement : null;
        const attribute = opening?.attributes.find(
          (a) => a.type === "JSXAttribute" && a.name?.name === "className",
        );
        roots.push({
          line: node.loc.start.line,
          text: classNameText(attribute, source) ?? "(no className)",
        });
      }
    }
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "range" || key === "parent") continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value.type === "string") walk(value);
    }
  };

  if (component.body?.type === "BlockStatement") component.body.body.forEach(walk);
  else if (component.body?.type) walk(component.body);

  return roots;
}

describe("dashboard shell alignment", () => {
  const files = pageFiles();

  it("finds the pages rendered inside AppShell", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)("$rel starts on the column edge", ({ rel, path }) => {
    const source = readFileSync(path, "utf8");
    const component = defaultExportFunction(parseSource(source, path));
    expect(component, `${rel} has no default-exported component`).toBeTruthy();

    const roots = pageRoots(component, source);
    expect(roots.length, `${rel} renders no JSX root`).toBeGreaterThan(0);

    for (const root of roots) {
      const where = `${rel}:${root.line}`;

      // The column is centred by SHELL_MEASURE; a root that centres itself
      // drifts off the logo rail (see the comment at the top of this file).
      expect(
        root.text.includes("mx-auto"),
        `${where} centres itself ("${root.text}") — the page column is already centred, so this moves the page off the logo. Narrow it with max-w-* only.`,
      ).toBe(false);

      if (root.text.includes("SHELL_GUTTER")) continue; // bleed route, owns its gutter

      expect(
        HORIZONTAL_GUTTER.test(root.text),
        `${where} declares its own horizontal gutter ("${root.text}") — PageContainer owns it, see components/layout/shell.js.`,
      ).toBe(false);
    }
  });

  it.each(BLEED_PAGES)("%s uses the shared gutter", (rel) => {
    const source = readFileSync(join(FEATURES_DIR, rel), "utf8");
    expect(source).toContain("SHELL_GUTTER");
    expect(source).toMatch(/from ["']@\/components\/layout\/shell["']/);
  });
});

describe("shell wiring", () => {
  const read = (name) => readFileSync(join(LAYOUT_DIR, name), "utf8");

  it("PageContainer owns the measure, gutter and vertical rhythm", () => {
    const source = read("PageContainer.jsx");
    for (const token of ["SHELL_MEASURE", "SHELL_GUTTER", "SHELL_PADDING_Y"]) {
      expect(source).toContain(token);
    }
  });

  it("Header shares the same gutter and measure as the pages", () => {
    const source = read("Header.jsx");
    expect(source).toContain("SHELL_GUTTER");
    // The inner column must use the page measure, or the logo drifts off the
    // page column's edge.
    expect(source).toContain("SHELL_MEASURE");
    // The gutter must not be re-hardcoded next to the logo.
    expect(source).not.toMatch(/px-2 sm:px-4 lg:px-6/);
  });

  it("the page measure carries the centring on its own", () => {
    const source = read("shell.js");
    // A column that is not centred is the bug this guards: the admin app
    // (AppLayout.tsx) centres its 1440 column, and both apps share the width.
    expect(source).toMatch(/SHELL_MEASURE\s*=\s*"[^"]*mx-auto[^"]*"/);
  });

  it("Header puts the search on the header's centre line", () => {
    const source = read("Header.jsx");
    // [1fr, search, 1fr]: equal side tracks put the middle track on the centre
    // line regardless of logo/profile widths; the search track is a range so
    // the button cannot collapse to its placeholder width.
    expect(source).toContain(
      "xl:grid-cols-[minmax(0,1fr)_minmax(240px,380px)_minmax(0,1fr)]",
    );
  });

  it("AppShell wraps every page in PageContainer and honours handle.bleed", () => {
    const source = read("AppShell.jsx");
    expect(source).toContain("<PageContainer bleed={isBleed}>");
    expect(source).toContain("match.handle?.bleed");
  });
});
