import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function syncPublicImagesPlugin(): Plugin {
  const syncDirs = () => {
    try {
      const root = process.cwd();
      const srcDir = path.resolve(root, 'src', 'assets', 'images');
      const targetDirs = [
        path.resolve(root, 'public', 'src', 'assets', 'images'),
        path.resolve(root, 'public', 'assets', 'images'),
        path.resolve(root, 'public', 'images'),
        path.resolve(root, 'dist', 'src', 'assets', 'images'),
        path.resolve(root, 'dist', 'assets', 'images'),
        path.resolve(root, 'dist', 'images'),
      ];

      if (fs.existsSync(srcDir)) {
        const files = fs.readdirSync(srcDir);
        for (const dir of targetDirs) {
          // If in buildStart, dist doesn't exist yet, which is fine
          if (dir.includes('/dist/') && !fs.existsSync(path.resolve(root, 'dist'))) {
            continue;
          }
          fs.mkdirSync(dir, { recursive: true });
          for (const file of files) {
            const srcPath = path.join(srcDir, file);
            if (fs.statSync(srcPath).isFile()) {
              fs.copyFileSync(srcPath, path.join(dir, file));
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Vite Image Sync] Warning:', err);
    }
  };

  return {
    name: 'sync-public-images',
    buildStart() {
      syncDirs();
    },
    closeBundle() {
      syncDirs();
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [syncPublicImagesPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
