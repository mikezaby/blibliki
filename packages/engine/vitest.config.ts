import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Engine tests use real-time AudioContexts; parallel files contend for
    // limited audio backends and make timing assertions flaky in CI.
    fileParallelism: false,
    // ponytail: retry in CI only. The render thread writes param values back
    // on its own clock, so an immediate read is stale about 1 time in 4000.
    // A retry gets a fresh context. Offline rendering would remove the race;
    // see docs/adr/0013.
    retry: process.env.CI ? 2 : 0,
    setupFiles: "test/testSetup.ts",
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
  },
  plugins: [tsconfigPaths()],
});
