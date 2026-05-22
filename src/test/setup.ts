// Polyfill localStorage for @vitest-environment node tests
if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {};
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  } as Storage;
}

import "@testing-library/jest-dom/vitest";
import { beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import { server } from "./mocks/server";
import { useBuilderStore } from "@/builder/store/builder-store";
import { createInitialDiagram } from "./store-helpers";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  useBuilderStore.setState({
    ...createInitialDiagram(),
    selectedNodeId: null,
    selectedEdgeId: null,
    activePanel: "properties" as const,
    aiPanelOpen: false,
  });
});
