import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5183,
    strictPort: true,
    // WSL2 on /mnt/c: inotify doesn't cross the drvfs mount — poll instead
    watch: { usePolling: true, interval: 400 },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
});
