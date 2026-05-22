import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/test/**",
          "src/**/*.test.{ts,tsx}",
          "src/vite-env.d.ts",
          "src/main.tsx",
        ],
        reporter: ["text", "lcov", "html"],
        // Thresholds enforced in ticket 010 once coverage reaches target.
        // thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
      },
    },
  }),
);
