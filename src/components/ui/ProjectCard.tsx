import type { ProjectWithOrchestration } from '@/lib/types';

interface ProjectCardProps {
  project: ProjectWithOrchestration;
  onOpenArchitecture?: () => void;
  onOpenOrchestration?: () => void;
}

export default function ProjectCard({ project, onOpenArchitecture, onOpenOrchestration }: ProjectCardProps) {
  const date = new Date(project.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });

  return (
    <div
      style={{
        background: 'var(--hub-surface)',
        border: '1.5px solid var(--hub-border)',
        borderRadius: 'var(--hub-radius)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 32px var(--wf-shadow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--hub-font)', fontSize: 16, fontWeight: 700 }}>
          {project.name}
        </span>
        {project.language && (
          <span
            style={{
              fontFamily: 'var(--hub-mono)',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--hub-text-dim)',
              border: '1.5px solid var(--hub-border)',
              borderRadius: 100,
              padding: '2px 8px',
            }}
          >
            {project.language}
          </span>
        )}
      </div>

      <p
        style={{
          fontFamily: 'var(--hub-font)',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--hub-text-sec)',
          lineHeight: 1.6,
          flex: 1,
        }}
      >
        {project.description}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {project.architecture && (
          <button
            onClick={onOpenArchitecture}
            style={{
              fontFamily: 'var(--hub-mono)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--hub-accent)',
              background: 'var(--hub-accent-light)',
              border: '1px solid var(--hub-border)',
              borderRadius: 8,
              padding: '4px 10px',
              transition: 'all 0.2s',
            }}
          >
            Architecture
          </button>
        )}
        {project.orchestration && (
          <button
            onClick={onOpenOrchestration}
            style={{
              fontFamily: 'var(--hub-mono)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--hub-text-dim)',
              background: 'transparent',
              border: '1px solid var(--hub-border)',
              borderRadius: 8,
              padding: '4px 10px',
              transition: 'all 0.2s',
            }}
          >
            Pipeline
          </button>
        )}
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--hub-mono)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--hub-text-dim)',
            background: 'transparent',
            border: '1px solid var(--hub-border)',
            borderRadius: 8,
            padding: '4px 10px',
            transition: 'all 0.2s',
            marginLeft: 'auto',
          }}
        >
          GitHub ↗
        </a>
      </div>

      <span
        style={{
          fontFamily: 'var(--hub-mono)',
          fontSize: 11,
          color: 'var(--hub-text-dim)',
        }}
      >
        Updated {date}
      </span>
    </div>
  );
}
