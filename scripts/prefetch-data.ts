import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const GITHUB_USER = 'swarpi';

async function fetchYaml(repo: string, file: string, token?: string): Promise<unknown | null> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_USER}/${repo}/main/${file}`,
      { headers }
    );
    if (!res.ok) return null;
    const { load } = await import('js-yaml');
    return load(await res.text());
  } catch {
    return null;
  }
}

async function prefetch() {
  const token = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  console.log('Fetching showcase repos...');
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`,
    { headers }
  );

  if (!res.ok) {
    console.warn(`GitHub API returned ${res.status} — writing empty data`);
    writeOutput({ pipeline: null, projects: [], fetchedAt: new Date().toISOString() });
    return;
  }

  const repos = (await res.json()) as Record<string, unknown>[];
  const showcaseRepos = repos.filter((r) =>
    (r.topics as string[] | undefined)?.includes('showcase')
  );
  console.log(`Found ${showcaseRepos.length} showcase repos`);

  const projects = await Promise.all(
    showcaseRepos.map(async (repo) => {
      const name = repo.name as string;
      console.log(`  Fetching ${name}...`);
      const [orchestration, architecture] = await Promise.all([
        fetchYaml(name, 'orchestration.yaml', token || undefined),
        fetchYaml(name, 'architecture.yaml', token || undefined),
      ]);
      return {
        name,
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

  projects.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  console.log('Fetching pipeline orchestration...');
  const pipeline = await fetchYaml('swarpi.github.io', 'orchestration.yaml', token || undefined);

  const output = {
    pipeline,
    projects,
    fetchedAt: new Date().toISOString(),
  };

  writeOutput(output);
  console.log(`Done — ${projects.length} projects written`);
}

function writeOutput(data: unknown) {
  const dir = join(process.cwd(), 'public', 'data');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'projects.json'), JSON.stringify(data, null, 2));
}

prefetch().catch((e) => {
  console.error('Prefetch failed:', e);
  process.exit(1);
});
