import path from "node:path";
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
      maxWorkers: 2,
      alias: {
        "@xyflow/react": path.resolve(__dirname, "src/test/mocks/xyflow-react.tsx"),
      },
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/test/**",
          "src/**/*.test.{ts,tsx}",
          "src/vite-env.d.ts",
          "src/main.tsx",
          "src/lib/types.ts",
          "src/builder/components/Canvas.tsx",
          "src/builder/nodes/ArchComponentNode.tsx",
          "src/builder/nodes/TierZoneNode.tsx",
          "src/builder/edges/ArchConnectionEdge.tsx",
        ],
        reporter: ["text", "lcov", "html"],
        thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
      },
    },
  }),
);
