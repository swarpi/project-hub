import yaml from 'js-yaml';
import type { Orchestration, Architecture, ProjectWithOrchestration } from './types';

const GITHUB_USER = 'swarpi';

async function fetchOrchestration(repoName: string): Promise<Orchestration | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_USER}/${repoName}/main/orchestration.yaml`
    );
    if (!res.ok) return null;
    return yaml.load(await res.text()) as Orchestration;
  } catch {
    return null;
  }
}

async function fetchArchitecture(repoName: string): Promise<Architecture | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_USER}/${repoName}/main/architecture.yaml`
    );
    if (!res.ok) return null;
    return yaml.load(await res.text()) as Architecture;
  } catch {
    return null;
  }
}

export async function fetchPipelineOrchestration(): Promise<Orchestration | null> {
  return fetchOrchestration('swarpi.github.io');
}

export async function fetchProjectsWithOrchestrations(): Promise<ProjectWithOrchestration[]> {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`,
      { headers }
    );
    if (!res.ok) return [];

    const repos = await res.json();
    const showcaseRepos = repos.filter((r: Record<string, unknown>) =>
      (r.topics as string[] | undefined)?.includes('showcase')
    );

    const projects: ProjectWithOrchestration[] = await Promise.all(
      showcaseRepos.map(async (repo: Record<string, unknown>) => {
        const [orchestration, architecture] = await Promise.all([
          fetchOrchestration(repo.name as string),
          fetchArchitecture(repo.name as string),
        ]);
        return {
          name: repo.name as string,
          description: (repo.description as string) ?? 'No description',
          url: repo.html_url as string,
          language: (repo.language as string) ?? null,
          updatedAt: repo.updated_at as string,
          stars: repo.stargazers_count as number,
          orchestration,
          architecture,
        };
      })
    );

    return projects.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch {
    return [];
  }
}
