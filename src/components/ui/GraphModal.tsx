import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import OrchestrationGraph from '@/components/graphs/OrchestrationGraph';
import ArchitectureGraph from '@/components/graphs/ArchitectureGraph';
import type { Orchestration, Architecture } from '@/lib/types';

interface GraphModalProps {
  type: 'orchestration' | 'architecture';
  data: Orchestration | Architecture;
  projectName: string;
  projectUrl: string;
  onClose: () => void;
}

export default function GraphModal({ type, data, projectName, projectUrl, onClose }: GraphModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--wf-bg)',
      }}
    >
      {type === 'orchestration' ? (
        <OrchestrationGraph
          orchestration={data as Orchestration}
          projectName={projectName}
          projectUrl={projectUrl}
          onClose={onClose}
        />
      ) : (
        <ArchitectureGraph
          architecture={data as Architecture}
          projectName={projectName}
          projectUrl={projectUrl}
          onClose={onClose}
        />
      )}
    </div>,
    document.body
  );
}
