import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    // The Playwright suite lives in e2e/ and also matches vitest's default
    // *.spec.ts glob. The two runners must stay separate — `npm test` must
    // not launch a browser, `npm run test:e2e` must not run the unit suite
    // (Loop 013 handoff, Section 4) — so e2e/ is excluded here explicitly.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
