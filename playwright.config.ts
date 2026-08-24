import { defineConfig, devices } from '@playwright/test';

// Distinct from the 3000 vite.config.ts pins for `vite dev` — a developer's
// dev server may already hold 3000, and this suite must not collide with it
// or share its state. 4173 is vite's own default `preview` port.
const PORT = 4173;
// Pinned to the IPv4 loopback explicitly, and passed to `vite preview` via
// --host below: Node's default DNS resolution for "localhost" prefers IPv6
// (::1) on this machine, while Playwright's webServer readiness probe and
// baseURL must hit the same socket the server actually bound.
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries: a flaky test is a finding to report, not something to
  // paper over by re-running it until it passes (ADR 0004).
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  // `vite preview` serves the production build. Unlike `vite dev`,
  // `server.open: true` in vite.config.ts does not apply to it — that
  // setting lives under Vite's `server` options, which only govern the
  // `dev` command, not `preview` — so no browser window pops during the
  // suite. Owning a dedicated port and always starting a fresh instance
  // (reuseExistingServer: false) means the suite verifies exactly the
  // current build, never a developer's already-running, possibly stale
  // dev server.
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
