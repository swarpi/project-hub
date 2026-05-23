// @vitest-environment node
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import {
	fetchProjectsWithOrchestrations,
	fetchPipelineOrchestration,
} from "./github";

const GITHUB_USER = "swarpi";
// Match path only; query params are checked at runtime by MSW's interceptor
const REPOS_URL = `https://api.github.com/users/${GITHUB_USER}/repos`;

function rawUrl(repoName: string, filename: string): string {
	return `https://raw.githubusercontent.com/${GITHUB_USER}/${repoName}/main/${filename}`;
}

const mockOrchestrationYaml = `
name: test-pipeline
steps:
  - name: step1
    agent: agent-a
`;

const mockArchitectureYaml = `
name: test-arch
components:
  - id: api
    type: service
`;

/** Minimal GitHub repo object with the fields the module uses. */
function makeRepo(name: string): Record<string, unknown> {
	return {
		name,
		description: `${name} description`,
		html_url: `https://github.com/${GITHUB_USER}/${name}`,
		language: "TypeScript",
		updated_at: "2025-01-01T00:00:00Z",
		stargazers_count: 5,
		topics: ["showcase"],
	};
}

describe("fetchProjectsWithOrchestrations", () => {
	it("returns mapped projects on a successful API response", async () => {
		server.use(
			http.get(REPOS_URL, () => {
				return HttpResponse.json([makeRepo("my-app"), makeRepo("my-service")]);
			}),
			http.get(rawUrl("my-app", "orchestration.yaml"), () => {
				return new HttpResponse(mockOrchestrationYaml, { status: 200 });
			}),
			http.get(rawUrl("my-app", "architecture.yaml"), () => {
				return new HttpResponse(mockArchitectureYaml, { status: 200 });
			}),
			http.get(rawUrl("my-service", "orchestration.yaml"), () => {
				return new HttpResponse(null, { status: 404 });
			}),
			http.get(rawUrl("my-service", "architecture.yaml"), () => {
				return new HttpResponse(null, { status: 404 });
			}),
		);

		const projects = await fetchProjectsWithOrchestrations();

		expect(projects).toHaveLength(2);
		const appProject = projects.find((p) => p.name === "my-app");
		expect(appProject).toBeDefined();
		expect(appProject?.name).toBe("my-app");
		expect(appProject?.description).toBe("my-app description");
		expect(appProject?.orchestration).not.toBeNull();
	});

	it("returns empty array when the GitHub API returns 404", async () => {
		server.use(
			http.get(REPOS_URL, () => {
				return new HttpResponse(null, { status: 404 });
			}),
		);

		const projects = await fetchProjectsWithOrchestrations();
		expect(projects).toEqual([]);
	});

	it("returns empty array when the GitHub API throws a network error", async () => {
		server.use(
			http.get(REPOS_URL, () => {
				return HttpResponse.error();
			}),
		);

		const projects = await fetchProjectsWithOrchestrations();
		expect(projects).toEqual([]);
	});

	it("excludes repos that do not have the showcase topic", async () => {
		const nonShowcaseRepo: Record<string, unknown> = {
			...makeRepo("internal-tool"),
			topics: ["internal"],
		};

		server.use(
			http.get(REPOS_URL, () => {
				return HttpResponse.json([nonShowcaseRepo]);
			}),
		);

		const projects = await fetchProjectsWithOrchestrations();
		expect(projects).toEqual([]);
	});

	it("sets orchestration to null when orchestration.yaml returns 404", async () => {
		server.use(
			http.get(REPOS_URL, () => {
				return HttpResponse.json([makeRepo("no-orch")]);
			}),
			http.get(rawUrl("no-orch", "orchestration.yaml"), () => {
				return new HttpResponse(null, { status: 404 });
			}),
			http.get(rawUrl("no-orch", "architecture.yaml"), () => {
				return new HttpResponse(null, { status: 404 });
			}),
		);

		const projects = await fetchProjectsWithOrchestrations();
		expect(projects[0]?.orchestration).toBeNull();
	});

	it("sets architecture to null when architecture.yaml returns 404", async () => {
		server.use(
			http.get(REPOS_URL, () => {
				return HttpResponse.json([makeRepo("no-arch")]);
			}),
			http.get(rawUrl("no-arch", "orchestration.yaml"), () => {
				return new HttpResponse(null, { status: 404 });
			}),
			http.get(rawUrl("no-arch", "architecture.yaml"), () => {
				return new HttpResponse(null, { status: 404 });
			}),
		);

		const projects = await fetchProjectsWithOrchestrations();
		expect(projects[0]?.architecture).toBeNull();
	});

	it("sorts projects by updatedAt descending", async () => {
		const older: Record<string, unknown> = {
			...makeRepo("older"),
			updated_at: "2023-01-01T00:00:00Z",
		};
		const newer: Record<string, unknown> = {
			...makeRepo("newer"),
			updated_at: "2025-01-01T00:00:00Z",
		};

		server.use(
			http.get(REPOS_URL, () => {
				// Return older first to verify sort
				return HttpResponse.json([older, newer]);
			}),
			http.get(rawUrl("older", "orchestration.yaml"), () => {
				return new HttpResponse(null, { status: 404 });
			}),
			http.get(rawUrl("older", "architecture.yaml"), () => {
				return new HttpResponse(null, { status: 404 });
			}),
			http.get(rawUrl("newer", "orchestration.yaml"), () => {
				return new HttpResponse(null, { status: 404 });
			}),
			http.get(rawUrl("newer", "architecture.yaml"), () => {
				return new HttpResponse(null, { status: 404 });
			}),
		);

		const projects = await fetchProjectsWithOrchestrations();
		expect(projects[0]?.name).toBe("newer");
		expect(projects[1]?.name).toBe("older");
	});
});

describe("fetchPipelineOrchestration", () => {
	it("returns parsed orchestration YAML on success", async () => {
		server.use(
			http.get(rawUrl("swarpi.github.io", "orchestration.yaml"), () => {
				return new HttpResponse(mockOrchestrationYaml, { status: 200 });
			}),
		);

		const result = await fetchPipelineOrchestration();
		expect(result).not.toBeNull();
		expect(result).toHaveProperty("name", "test-pipeline");
	});

	it("returns null when orchestration.yaml returns 404", async () => {
		server.use(
			http.get(rawUrl("swarpi.github.io", "orchestration.yaml"), () => {
				return new HttpResponse(null, { status: 404 });
			}),
		);

		const result = await fetchPipelineOrchestration();
		expect(result).toBeNull();
	});

	it("returns null on network error", async () => {
		server.use(
			http.get(rawUrl("swarpi.github.io", "orchestration.yaml"), () => {
				return HttpResponse.error();
			}),
		);

		const result = await fetchPipelineOrchestration();
		expect(result).toBeNull();
	});
});
