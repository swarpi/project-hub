import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { useProjectData } from "./data-loader";

vi.mock("./github", () => ({
  fetchProjectsWithOrchestrations: vi.fn(),
  fetchPipelineOrchestration: vi.fn(),
}));

import {
  fetchProjectsWithOrchestrations,
  fetchPipelineOrchestration,
} from "./github";

const mockFetchProjects = vi.mocked(fetchProjectsWithOrchestrations);
const mockFetchPipeline = vi.mocked(fetchPipelineOrchestration);

const validHub = {
  pipeline: { name: "p", description: "d", agents: [], connections: [] },
  projects: [],
  fetchedAt: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  mockFetchProjects.mockReset();
  mockFetchPipeline.mockReset();
});

describe("useProjectData", () => {
  it("loads pre-fetched data successfully", async () => {
    server.use(
      http.get("*/data/projects.json", () => HttpResponse.json(validHub)),
    );

    const { result } = renderHook(() => useProjectData());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(validHub);
    expect(result.current.error).toBeNull();
  });

  it("falls back to live API when pre-fetch fails", async () => {
    server.use(
      http.get("*/data/projects.json", () => new HttpResponse(null, { status: 404 })),
    );
    mockFetchProjects.mockResolvedValue([]);
    mockFetchPipeline.mockResolvedValue(validHub.pipeline);

    const { result } = renderHook(() => useProjectData());
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.pipeline).toEqual(validHub.pipeline);
  });

  it("sets error when both pre-fetch and live API fail", async () => {
    server.use(
      http.get("*/data/projects.json", () => new HttpResponse(null, { status: 404 })),
    );
    mockFetchProjects.mockRejectedValue(new Error("network down"));
    mockFetchPipeline.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useProjectData());
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.data).toBeNull();
  });

  it("sets error when pipeline is null", async () => {
    server.use(
      http.get("*/data/projects.json", () => new HttpResponse(null, { status: 404 })),
    );
    mockFetchProjects.mockResolvedValue([]);
    mockFetchPipeline.mockResolvedValue(null);

    const { result } = renderHook(() => useProjectData());
    await waitFor(() => expect(result.current.error).toBe("Could not fetch pipeline data"));
  });

  it("refresh triggers live API call", async () => {
    server.use(
      http.get("*/data/projects.json", () => HttpResponse.json(validHub)),
    );
    mockFetchProjects.mockResolvedValue([]);
    mockFetchPipeline.mockResolvedValue(validHub.pipeline);

    const { result } = renderHook(() => useProjectData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.refresh();
    expect(mockFetchProjects).toHaveBeenCalled();
    expect(mockFetchPipeline).toHaveBeenCalled();
  });

  it("handles non-Error throw in refresh", async () => {
    server.use(
      http.get("*/data/projects.json", () => new HttpResponse(null, { status: 404 })),
    );
    mockFetchProjects.mockRejectedValue("string error");
    mockFetchPipeline.mockResolvedValue(validHub.pipeline);

    const { result } = renderHook(() => useProjectData());
    await waitFor(() => expect(result.current.error).toBe("Failed to fetch data"));
  });
});
