import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Build guard for the SerpApi key.
 *
 * `VITE_SERP_API_KEY` is a SERVER-ONLY secret (the backend owns the SerpApi
 * call). The `VITE_` prefix normally means "ship me to the browser", so this
 * plugin makes the leak structurally impossible:
 *  - referencing `import.meta.env.VITE_SERP_API_KEY` in client code fails;
 *  - using the bare `import.meta.env` object (which serializes every VITE_
 *    variable, including this one) fails as well.
 *
 * Test files and config files are ignored — they never ship in the bundle.
 */
function noClientSerpKeyPlugin() {
  const isClientSource = (id) =>
    id.includes('/src/') &&
    !id.includes('/node_modules/') &&
    !/\.(test|spec)\.[jt]sx?$/.test(id);

  return {
    name: 'no-client-serp-key',
    transform(code, id) {
      if (!isClientSource(id)) return null;
      // Check executable code only: these strings legitimately appear in the
      // explanatory comments in src/config/index.js.
      const source = code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
      if (/\bimport\.meta\.env\.VITE_SERP_API_KEY\b/.test(source)) {
        throw new Error(
          '[no-client-serp-key] VITE_SERP_API_KEY is a server-only SerpApi secret and must not be referenced in client code. Use the backend /locations/google-search route instead.'
        );
      }
      if (/\bimport\.meta\.env(?!\.)/.test(source)) {
        throw new Error(
          '[no-client-serp-key] Using the bare import.meta.env object would serialize every VITE_ variable — including VITE_SERP_API_KEY — into the public bundle. Reference individual import.meta.env.VITE_* keys instead.'
        );
      }
      return null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      noClientSerpKeyPlugin(),
      isProduction && visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      sourcemap: isProduction ? 'hidden' : true,
      outDir: 'dist',
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      } : {},
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'react-vendor';
              }
              if (id.includes('lucide-react') || id.includes('sonner')) {
                return 'ui-vendor';
              }
              if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
                return 'form-vendor';
              }
              if (id.includes('zustand')) {
                return 'state-vendor';
              }
              return 'vendor';
            }
          },
          assetFileNames: (assetInfo) => {
            if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
            const info = assetInfo.name.split('.');
            let extType = info[info.length - 1];
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
              extType = 'images';
            } else if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              extType = 'fonts';
            }
            return `assets/${extType}/[name]-[hash][extname]`;
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
      assetsInlineLimit: 4096,
    },
    server: {
      port: 5173,
      strictPort: false,
      host: true,
      open: false,
    },
    preview: {
      port: 4173,
      strictPort: false,
      host: true,
      open: false,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand',
        'axios',
        'lucide-react',
        'sonner',
        'react-hook-form',
        'zod',
      ],
      // MapLibre v6's worker can fail to bundle during dependency pre-bundling.
      exclude: ['maplibre-gl'],
    },
  };
});
