import { useState } from 'react';
import NavBar from '@/components/layout/NavBar';
import WorkflowsSection from '@/components/sections/WorkflowsSection';
import PipelineSection from '@/components/sections/PipelineSection';
import ProjectsSection from '@/components/sections/ProjectsSection';
import GraphModal from '@/components/ui/GraphModal';
import BuilderPage from '@/builder/BuilderPage';
import { useProjectData } from '@/lib/data-loader';
import { useHashRoute } from '@/lib/use-hash-route';
import type { Orchestration, Architecture, ProjectWithOrchestration } from '@/lib/types';

interface ActiveGraph {
  type: 'orchestration' | 'architecture';
  data: Orchestration | Architecture;
  projectName: string;
  projectUrl: string;
}

export default function App() {
  const route = useHashRoute();
  const { data, isLoading, isRefreshing, error, refresh } = useProjectData();
  const [activeGraph, setActiveGraph] = useState<ActiveGraph | null>(null);

  const handleOpenOrchestration = (project: ProjectWithOrchestration) => {
    if (!project.orchestration) return;
    setActiveGraph({
      type: 'orchestration',
      data: project.orchestration,
      projectName: project.name,
      projectUrl: project.url,
    });
  };

  if (route === '/builder') {
    return (
      <>
        <NavBar activeRoute={route} hideSections={data?.pipeline ? [] : ['pipeline']} />
        <BuilderPage />
      </>
    );
  }

  return (
    <>
      <NavBar activeRoute={route} hideSections={data?.pipeline ? [] : ['pipeline']} />

      <main style={{ flex: 1 }}>
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              fontFamily: 'var(--hub-mono)',
              fontSize: 13,
              color: 'var(--hub-text-dim)',
            }}
          >
            Loading projects...
          </div>
        ) : error && !data ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              gap: 16,
              fontFamily: 'var(--hub-font)',
              color: 'var(--hub-text-sec)',
            }}
          >
            <p style={{ fontSize: 14 }}>Could not load project data</p>
            <button
              onClick={refresh}
              style={{
                fontFamily: 'var(--hub-mono)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--hub-accent)',
                background: 'var(--hub-accent-light)',
                border: '1px solid var(--hub-border)',
                borderRadius: 8,
                padding: '6px 16px',
              }}
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            <WorkflowsSection
              projects={data.projects}
              onOpenOrchestration={handleOpenOrchestration}
            />

            <div style={{ borderTop: '1px solid var(--hub-border)', margin: '0 24px' }} />

            {data.pipeline && (
              <div style={{ padding: '48px 0 0' }}>
                <PipelineSection orchestration={data.pipeline} />
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--hub-border)', margin: '0 24px' }} />

            <div style={{ padding: '48px 0 0' }}>
              <ProjectsSection
                projects={data.projects}
                onOpenGraph={setActiveGraph}
              />
            </div>

            {isRefreshing && (
              <div
                style={{
                  position: 'fixed',
                  bottom: 20,
                  right: 20,
                  fontFamily: 'var(--hub-mono)',
                  fontSize: 11,
                  color: 'var(--hub-text-dim)',
                  background: 'var(--hub-surface)',
                  border: '1px solid var(--hub-border)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  zIndex: 50,
                }}
              >
                Refreshing...
              </div>
            )}
          </>
        ) : null}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--hub-border)',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <a
          href="https://swarpi.github.io"
          style={{
            fontFamily: 'var(--hub-font)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--hub-text-dim)',
            transition: 'color 0.2s',
          }}
        >
          ← Back to portfolio
        </a>
        {data && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                fontFamily: 'var(--hub-mono)',
                fontSize: 10,
                color: 'var(--hub-text-dim)',
              }}
            >
              Data from {new Date(data.fetchedAt).toLocaleDateString()}
            </span>
            <button
              onClick={refresh}
              disabled={isRefreshing}
              style={{
                fontFamily: 'var(--hub-mono)',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--hub-accent)',
                background: 'none',
                border: '1px solid var(--hub-border)',
                borderRadius: 6,
                padding: '3px 8px',
                opacity: isRefreshing ? 0.5 : 1,
              }}
            >
              Refresh
            </button>
          </div>
        )}
      </footer>

      {activeGraph && (
        <GraphModal
          type={activeGraph.type}
          data={activeGraph.data}
          projectName={activeGraph.projectName}
          projectUrl={activeGraph.projectUrl}
          onClose={() => setActiveGraph(null)}
        />
      )}
    </>
  );
}
