import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Engine tests use real-time AudioContexts; parallel files contend for
    // limited audio backends and make timing assertions flaky in CI.
    fileParallelism: false,
    setupFiles: "test/testSetup.ts",
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
  },
  plugins: [tsconfigPaths()],
});
