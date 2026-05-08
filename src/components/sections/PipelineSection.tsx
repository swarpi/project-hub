import type { Orchestration } from '@/lib/types';
import OrchestrationGraph from '@/components/graphs/OrchestrationGraph';

interface PipelineSectionProps {
  orchestration: Orchestration;
}

export default function PipelineSection({ orchestration }: PipelineSectionProps) {
  return (
    <section id="pipeline" style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--hub-font)', fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>
          Agent Pipeline
        </h2>
        <p style={{ fontFamily: 'var(--hub-font)', fontSize: 14, fontWeight: 500, color: 'var(--hub-text-sec)', margin: 0 }}>
          {orchestration.description}
        </p>
      </div>

      <div
        style={{
          width: '100%',
          height: '70vh',
          minHeight: 500,
          maxHeight: 700,
          borderRadius: 'var(--hub-radius)',
          border: '1.5px solid var(--hub-border)',
          overflow: 'hidden',
        }}
      >
        <OrchestrationGraph
          orchestration={orchestration}
          projectName="Agentic Workflow"
          projectUrl="https://github.com/swarpi/swarpi.github.io"
        />
      </div>
    </section>
  );
}
