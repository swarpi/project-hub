import type { ProjectWithOrchestration, Orchestration, Architecture } from '@/lib/types';
import ProjectCard from '@/components/ui/ProjectCard';

interface ProjectsSectionProps {
  projects: ProjectWithOrchestration[];
  onOpenGraph: (graph: {
    type: 'orchestration' | 'architecture';
    data: Orchestration | Architecture;
    projectName: string;
    projectUrl: string;
  }) => void;
}

export default function ProjectsSection({ projects, onOpenGraph }: ProjectsSectionProps) {
  return (
    <section id="projects" style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: 'var(--hub-font)',
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700,
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}
        >
          Projects
        </h2>
        <p style={{ fontFamily: 'var(--hub-font)', fontSize: 14, fontWeight: 500, color: 'var(--hub-text-dim)', margin: 0 }}>
          Click Architecture or Pipeline to explore interactively
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {projects.map((project) => (
          <ProjectCard
            key={project.name}
            project={project}
            onOpenArchitecture={
              project.architecture
                ? () =>
                    onOpenGraph({
                      type: 'architecture',
                      data: project.architecture!,
                      projectName: project.name,
                      projectUrl: project.url,
                    })
                : undefined
            }
            onOpenOrchestration={
              project.orchestration
                ? () =>
                    onOpenGraph({
                      type: 'orchestration',
                      data: project.orchestration!,
                      projectName: project.name,
                      projectUrl: project.url,
                    })
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
