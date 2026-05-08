import type { ProjectWithOrchestration } from '@/lib/types';

interface WorkflowsSectionProps {
  projects: ProjectWithOrchestration[];
  onOpenOrchestration: (project: ProjectWithOrchestration) => void;
}

export default function WorkflowsSection({ projects, onOpenOrchestration }: WorkflowsSectionProps) {
  const workflowProjects = projects.filter((p) => p.orchestration).slice(0, 4);

  if (workflowProjects.length === 0) return null;

  return (
    <section id="workflows" style={{ padding: '48px 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--hub-font)', fontSize: 22, fontWeight: 700, margin: 0 }}>
          Workflows
        </h2>
        <span style={{ fontFamily: 'var(--hub-mono)', fontSize: 11, color: 'var(--hub-text-dim)' }}>
          Agent orchestrations
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {workflowProjects.map((project) => (
          <button
            key={project.name}
            onClick={() => onOpenOrchestration(project)}
            style={{
              textAlign: 'left',
              background: 'var(--hub-surface)',
              border: '1.5px solid var(--hub-border)',
              borderRadius: 'var(--hub-radius)',
              padding: '16px 20px',
              transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--hub-accent)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--hub-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--hub-font)', fontSize: 14, fontWeight: 700 }}>
                {project.name}
              </span>
              {project.language && (
                <span
                  style={{
                    fontFamily: 'var(--hub-mono)',
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--hub-text-dim)',
                    border: '1px solid var(--hub-border)',
                    borderRadius: 100,
                    padding: '1px 6px',
                  }}
                >
                  {project.language}
                </span>
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--hub-mono)',
                fontSize: 11,
                color: 'var(--hub-text-dim)',
              }}
            >
              {project.orchestration!.agents.length} agents · View pipeline →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
