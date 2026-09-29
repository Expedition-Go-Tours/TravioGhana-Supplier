/**
 * One-time MapLibre v6 worker wiring. Import before constructing any `Map`.
 *
 * v6 is ESM-only and loads its tile-parsing worker as a real module file
 * (`maplibre-gl-worker.mjs`) which imports a sibling `maplibre-gl-shared.mjs`.
 * Inside a bundler `import.meta.url` cannot resolve that file, so without an
 * explicit URL the worker never loads: every map hangs silently with an empty
 * container and no error.
 *
 * `?worker&url` is required rather than a plain `?url`. A plain `?url` emits
 * the worker verbatim, without its sibling, and the worker 404s on its very
 * first import — the same silent failure.
 */
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);
