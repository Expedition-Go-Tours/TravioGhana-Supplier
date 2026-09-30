/**
 * Build the Stays parity report: captures both targets, then writes
 * scripts/stays-parity/output/report.html with a side-by-side view per state
 * and width.
 *
 *   npm run stays:parity
 *
 * Prerequisites: the dev server (npm run dev) is running at STAYS_APP_URL
 * (default http://127.0.0.1:5173) and the prototype exists (STAYS_PROTOTYPE,
 * default ~/Downloads/TravioGhana_Stays_Dashboard_Prototype.html).
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { OUTPUT_DIR, STATES, WIDTHS, ensureOutputDir } from "./lib.mjs";

function run(target) {
  execFileSync(process.execPath, [join(process.cwd(), "scripts/stays-parity/capture.mjs"), `--target=${target}`], {
    stdio: "inherit",
  });
}

function report(stateId, width) {
  const ref = `${stateId}-${width}-reference.png`;
  const impl = `${stateId}-${width}-implementation.png`;
  return `
  <section>
    <h2>${STATES.find((s) => s.id === stateId)?.label || stateId} · ${width}px</h2>
    <div class="pair">
      <figure><figcaption>Reference (prototype)</figcaption><img src="${ref}" /></figure>
      <figure><figcaption>Implementation</figcaption><img src="${impl}" /></figure>
    </div>
  </section>`;
}

function main() {
  ensureOutputDir();
  run("reference");
  run("implementation");

  const sections = STATES.flatMap((state) => WIDTHS.map((width) => report(state.id, width))).join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Stays parity report</title>
<style>
  :root { font-family: system-ui, sans-serif; background: #f6f8f5; color: #172b27; }
  body { margin: 0; padding: 24px; }
  h1 { font-size: 22px; }
  h2 { font-size: 15px; margin: 32px 0 10px; }
  section { border-top: 1px solid #d8e6dc; padding-top: 8px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  figure { margin: 0; }
  figcaption { font-size: 12px; color: #55705f; margin-bottom: 6px; }
  img { width: 100%; border: 1px solid #cfe0d4; border-radius: 8px; background: white; }
  @media (max-width: 1100px) { .pair { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <h1>TravioGhana Stays — parity report</h1>
  <p>Reference: prototype · Implementation: this repo at ${new Date().toISOString()}.</p>
  ${sections}
</body>
</html>`;

  const reportPath = join(OUTPUT_DIR, "report.html");
  writeFileSync(reportPath, html);
  console.log(`\nreport → ${reportPath}`);
}

main();
