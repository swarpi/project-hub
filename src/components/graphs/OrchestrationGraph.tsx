import { useState, useEffect, useCallback, useRef } from 'react';
import type { Orchestration, Agent, Connection } from '@/lib/types';
import { GRAPH_COLORS, GC, getSmartPort, getControlPoint } from './graph-utils';
import type { Position, Positions } from './graph-utils';
import { DotGrid } from './DotGrid';
import { usePanZoomDrag } from './usePanZoomDrag';

const ICONS: Record<string, React.ReactNode> = {
  architect: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  'system-architect': (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 7.5v3M8.5 12l-2 1M11.5 12l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  planner: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 6h12M4 10h8M4 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  executor: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M6 7l4-3 4 3v6l-4 3-4-3V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
    </svg>
  ),
  reviewer: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'qa-tester': (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 5h12v10H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  custodian: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 13c0 2.5 1.8 4 4 4s4-1.5 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 7l6 2M7 9l6-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  default: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2" fill="currentColor" />
    </svg>
  ),
};

type AgentKind = 'decision' | 'planning' | 'execution' | 'validation' | 'maintenance';

function getAccentElements(kind: AgentKind | undefined, colorMain: string, active: boolean) {
  const opacity = active ? 1 : 0.4;
  const base = { position: 'absolute' as const, background: colorMain, opacity };

  switch (kind) {
    case 'decision':
      return [{ ...base, top: 0, left: 0, bottom: 0, width: '3px', borderRadius: '12px 0 0 12px' }];
    case 'execution':
      return [{ ...base, bottom: 0, left: 0, right: 0, height: '2.5px', borderRadius: '0 0 12px 12px' }];
    case 'validation':
      return [
        { ...base, top: 0, left: 0, right: 0, height: '1.5px', borderRadius: '12px 12px 0 0' },
        { ...base, bottom: 0, left: 0, right: 0, height: '1.5px', borderRadius: '0 0 12px 12px' },
      ];
    case 'maintenance':
      return [{ ...base, top: 0, right: 0, bottom: 0, width: '3px', borderRadius: '0 12px 12px 0' }];
    case 'planning':
    default:
      return [{ ...base, top: 0, left: 0, right: 0, height: '2.5px', borderRadius: '12px 12px 0 0' }];
  }
}

const NODE_W = 170;
const NODE_H = 105;

function ConnectionLayer({ positions, connections, agents }: { positions: Positions; connections: Connection[]; agents: Agent[] }) {
  if (Object.keys(positions).length === 0) return null;

  const getColor = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    return GRAPH_COLORS[agent?.color || 'indigo'] ?? GRAPH_COLORS.indigo;
  };

  const CURVATURE = 0.25;

  const pairIndex = new Map<string, number>();
  connections.forEach((conn) => {
    const key = [conn.from, conn.to].sort().join('::');
    pairIndex.set(key, (pairIndex.get(key) ?? 0) + 1);
  });
  const pairCounter = new Map<string, number>();

  const lines = connections.map((conn) => {
    const fromPos = positions[conn.from];
    const toPos = positions[conn.to];
    if (!fromPos || !toPos) return null;

    const color = getColor(conn.from);
    const isFeedback = conn.type === 'feedback';
    const key = [conn.from, conn.to].sort().join('::');
    const isBidirectional = (pairIndex.get(key) ?? 0) > 1;
    const myIndex = pairCounter.get(key) ?? 0;
    pairCounter.set(key, myIndex + 1);

    const { source, sourceDir, target, targetDir } = getSmartPort(fromPos, toPos, NODE_W, NODE_H);

    const c1 = getControlPoint(sourceDir, source.x, source.y, target.x, target.y, CURVATURE);
    const c2 = getControlPoint(targetDir, target.x, target.y, source.x, source.y, CURVATURE);

    const d = `M${source.x},${source.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${target.x},${target.y}`;
    const t = isBidirectional ? (myIndex === 0 ? 0.35 : 0.65) : 0.5;
    const mid = {
      x: (1-t)**3*source.x + 3*(1-t)**2*t*c1.x + 3*(1-t)*t**2*c2.x + t**3*target.x,
      y: (1-t)**3*source.y + 3*(1-t)**2*t*c1.y + 3*(1-t)*t**2*c2.y + t**3*target.y,
    };

    return { d, mid, artifact: conn.artifact, color: color.main, isFeedback };
  }).filter(Boolean);

  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        {Object.entries(GRAPH_COLORS).map(([name, color]) => (
          <marker key={name} id={`arr-${name}`} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M1.5 1.5L7.5 5 1.5 8.5" stroke={color.main} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        ))}
      </defs>

      {lines.map((l, i) => l && (
        <g key={i}>
          <path d={l.d} fill="none" stroke={l.color} strokeWidth="3" opacity={0.06} strokeLinecap="round" />
          <path
            d={l.d}
            fill="none"
            stroke={l.color}
            strokeWidth="1.5"
            opacity={l.isFeedback ? 0.35 : 0.5}
            strokeLinecap="round"
            strokeDasharray={l.isFeedback ? '4 6' : 'none'}
            markerEnd={`url(#arr-${l.isFeedback ? 'amber' : 'indigo'})`}
          />
          <foreignObject x={l.mid.x - 40} y={l.mid.y - 9} width="80" height="18" style={{ overflow: 'visible' }}>
            <div
              style={{
                fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
                fontSize: '7px',
                lineHeight: 1,
                padding: '3px 6px',
                borderRadius: '9px',
                background: GC.labelBg,
                border: `1px solid ${GC.border}`,
                color: 'var(--wf-text-sec)',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                boxShadow: `0 1px 3px var(--wf-shadow)`,
                width: 'fit-content',
                margin: '0 auto',
              }}
            >
              {l.artifact}
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
  );
}


function NodeCard({
  agent,
  index,
  pos,
  selected,
  onClick,
  onDrag,
  isDragging,
}: {
  agent: Agent;
  index: number;
  pos: Position;
  selected: boolean;
  onClick: (id: string) => void;
  onDrag: (id: string, e: React.MouseEvent) => void;
  isDragging: boolean;
}) {
  const color = GRAPH_COLORS[agent.color || 'indigo'] ?? GRAPH_COLORS.indigo;
  const [hovered, setHovered] = useState(false);
  const active = selected || hovered;
  const icon = ICONS[agent.id] || ICONS.default;

  const hasInteracted = useRef(false);
  if (isDragging) hasInteracted.current = true;

  return (
    <div
      data-node-id={agent.id}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: NODE_W,
        minHeight: NODE_H,
        cursor: isDragging ? 'grabbing' : 'grab',
        animation: hasInteracted.current ? 'none' : `nodeIn 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 80}ms both`,
        userSelect: 'none',
      }}
      onMouseDown={(e) => { e.preventDefault(); onDrag(agent.id, e); }}
      onClick={() => onClick(agent.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: '100%',
          background: active ? color.light : GC.card,
          border: `1.5px solid ${active ? color.main : GC.border}`,
          borderRadius: '12px',
          padding: agent.kind === 'decision' ? '10px 12px 10px 15px' : '10px 12px',
          boxShadow: isDragging
            ? `0 0 0 3px ${color.dim}, 0 12px 36px oklch(0 0 0 / 0.15)`
            : active
            ? `0 0 0 3px ${color.dim}, 0 6px 24px oklch(0 0 0 / 0.08)`
            : '0 1px 4px oklch(0 0 0 / 0.05), 0 3px 12px oklch(0 0 0 / 0.04)',
          transition: isDragging ? 'box-shadow 0.15s' : 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
          transform: isDragging ? 'scale(1.03)' : active ? 'translateY(-1px)' : 'translateY(0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {getAccentElements(agent.kind, color.main, active).map((style, i) => (
          <div key={i} style={style} />
        ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
              fontSize: '8px',
              fontWeight: 500,
              color: color.main,
              background: color.dim,
              border: `1px solid ${color.border}`,
              borderRadius: '4px',
              padding: '1px 5px',
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <span style={{ color: color.main, transform: 'scale(0.8)', transformOrigin: 'right center' }}>{icon}</span>
        </div>
        <div
          style={{
            fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
            fontSize: '13px',
            fontWeight: 700,
            color: GC.textPrimary,
            lineHeight: 1.2,
          }}
        >
          {agent.title}
        </div>
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: 'auto' }}>
          {agent.outputs.slice(0, 3).map((o) => (
            <span
              key={o}
              style={{
                fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
                fontSize: '7.5px',
                padding: '1px 5px',
                borderRadius: '8px',
                background: color.light,
                color: color.main,
                border: `1px solid ${color.border}`,
              }}
            >
              {o}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ agent, onClose, repoUrl }: { agent: Agent; onClose: () => void; repoUrl: string }) {
  const color = GRAPH_COLORS[agent.color || 'indigo'] ?? GRAPH_COLORS.indigo;
  const icon = ICONS[agent.id] || ICONS.default;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 340,
        background: GC.card,
        border: `1.5px solid ${color.main}`,
        borderRadius: '18px',
        padding: '24px',
        boxShadow: `0 0 0 4px ${color.dim}, 0 20px 60px oklch(0 0 0 / 0.15)`,
        animation: 'panelIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
        zIndex: 300,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 26,
          height: 26,
          borderRadius: '8px',
          border: `1.5px solid ${GC.border}`,
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: GC.textDim,
          fontSize: '13px',
        }}
      >
        ✕
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ color: color.main }}>{icon}</span>
        <span
          style={{
            fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
            fontSize: '9px',
            color: color.main,
            background: color.light,
            padding: '3px 8px',
            borderRadius: '10px',
            border: `1px solid ${color.border}`,
          }}
        >
          Agent
        </span>
        {agent.kind && (
          <span
            style={{
              fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
              fontSize: '9px',
              color: GC.textDim,
              background: 'oklch(0.95 0.005 265)',
              padding: '3px 8px',
              borderRadius: '10px',
              border: `1px solid ${GC.border}`,
              textTransform: 'capitalize',
            }}
          >
            {agent.kind}
          </span>
        )}
      </div>

      <div
        style={{
          fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
          fontSize: '22px',
          fontWeight: 700,
          color: GC.textPrimary,
          marginBottom: '8px',
        }}
      >
        {agent.title}
      </div>

      <div
        style={{
          fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
          fontSize: '13px',
          color: GC.textSec,
          lineHeight: 1.6,
          marginBottom: '20px',
        }}
      >
        {agent.description}
      </div>

      <div
        style={{
          fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: GC.textDim,
          marginBottom: '8px',
        }}
      >
        Outputs
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
        {agent.outputs.map((o) => (
          <span
            key={o}
            style={{
              fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
              fontSize: '10px',
              padding: '4px 10px',
              borderRadius: '8px',
              background: color.light,
              color: color.main,
              border: `1px solid ${color.border}`,
            }}
          >
            {o}
          </span>
        ))}
      </div>

      {agent.docLink && (
        <a
          href={`${repoUrl}/blob/main${agent.docLink}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            color: color.main,
            padding: '10px 16px',
            borderRadius: '10px',
            border: `1.5px solid ${color.border}`,
            background: color.light,
            textDecoration: 'none',
            width: '100%',
          }}
        >
          View documentation
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6h7M6.5 3L9.5 6l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      )}
    </div>
  );
}

interface OrchestrationGraphProps {
  orchestration: Orchestration;
  projectName: string;
  projectUrl: string;
  onClose?: () => void;
}

export default function OrchestrationGraph({ orchestration, projectName, projectUrl, onClose }: OrchestrationGraphProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [positions, setPositions] = useState<Positions>({});
  const [dims, setDims] = useState({ W: 1200, H: 800 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { scaleRef, panRef, draggingId, dragDistRef, DRAG_THRESHOLD, handleDragStart, handleCanvasPanStart, rerender } =
    usePanZoomDrag({ containerRef, initialScale: 1.1 });

  const onNodeDrag = useCallback((id: string, e: React.MouseEvent) => {
    handleDragStart(id, e, positions, setPositions);
  }, [handleDragStart, positions]);

  const compute = useCallback(() => {
    if (typeof window === 'undefined') return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    setDims({ W, H });

    panRef.current = { x: W / 2, y: H / 2 };
    scaleRef.current = 1.1;

    const agents = orchestration.agents;
    const n = agents.length;

    const newPositions: Positions = {};

    if (orchestration.layout === 'diamond' && n === 4) {
      const hSpread = 240;
      const vSpread = 180;
      newPositions[agents[0].id] = { x: -NODE_W / 2, y: -vSpread - NODE_H / 2 };
      newPositions[agents[1].id] = { x: -hSpread - NODE_W / 2, y: -NODE_H / 2 };
      newPositions[agents[2].id] = { x: hSpread - NODE_W / 2, y: -NODE_H / 2 };
      newPositions[agents[3].id] = { x: -NODE_W / 2, y: vSpread - NODE_H / 2 };
    } else if (n <= 3) {
      const spacing = 280;
      const startX = -((n - 1) * spacing) / 2 - NODE_W / 2;
      agents.forEach((agent, i) => {
        newPositions[agent.id] = { x: startX + i * spacing, y: -NODE_H / 2 };
      });
    } else {
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const spacingX = 280;
      const spacingY = 200;
      const startX = -((cols - 1) * spacingX) / 2 - NODE_W / 2;
      const startY = -((rows - 1) * spacingY) / 2 - NODE_H / 2;

      agents.forEach((agent, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        newPositions[agent.id] = { x: startX + col * spacingX, y: startY + row * spacingY };
      });
    }

    setPositions(newPositions);
    rerender();
  }, [orchestration, panRef, scaleRef, rerender]);

  useEffect(() => {
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [compute]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selected) {
          setSelected(null);
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onClose]);

  const selectedAgent = orchestration.agents.find((a) => a.id === selected);

  const scale = scaleRef.current;
  const pan = panRef.current;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: GC.bg,
        cursor: draggingId ? 'grabbing' : 'default',
      }}
      onMouseDown={handleCanvasPanStart}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes nodeIn {
          from { opacity: 0; transform: scale(0.92) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes flowDash {
          from { stroke-dashoffset: 60; }
          to { stroke-dashoffset: 0; }
        }
        .flow-line {
          animation: flowDash 1.6s linear infinite;
        }
        .flow-line-reverse {
          animation: flowDash 2s linear infinite reverse;
        }
      `}</style>

      <DotGrid W={dims.W} H={dims.H} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, var(--wf-bg) 100%)',
        }}
      />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transformOrigin: '0 0',
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        willChange: 'transform',
      }}>
        {Object.keys(positions).length > 0 && (
          <ConnectionLayer positions={positions} connections={orchestration.connections} agents={orchestration.agents} />
        )}

        {orchestration.agents.map((agent, i) =>
          positions[agent.id] ? (
            <NodeCard
              key={agent.id}
              agent={agent}
              index={i}
              pos={positions[agent.id]}
              selected={selected === agent.id}
              onClick={(id) => { if (dragDistRef.current < DRAG_THRESHOLD) setSelected((prev) => (prev === id ? null : id)); }}
              onDrag={onNodeDrag}
              isDragging={draggingId === agent.id}
            />
          ) : null
        )}
      </div>

      <div style={{ position: 'absolute', top: 28, left: 36, zIndex: 10, animation: 'fadeUp 0.5s both', pointerEvents: 'auto' }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
              fontSize: '12px',
              color: GC.textDim,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '8px',
              padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to projects
          </button>
        )}
        <div
          style={{
            fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
            fontSize: '15px',
            fontWeight: 600,
            color: GC.textPrimary,
          }}
        >
          {orchestration.name || projectName}
        </div>
        <div
          style={{
            fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
            fontSize: '11px',
            color: GC.textDim,
            marginTop: '4px',
          }}
        >
          {orchestration.agents.length} agents · click to explore
        </div>
      </div>

      {selected && selectedAgent && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'oklch(0 0 0 / 0.3)',
              zIndex: 250,
            }}
            onClick={() => setSelected(null)}
          />
          <DetailPanel agent={selectedAgent} onClose={() => setSelected(null)} repoUrl={projectUrl} />
        </>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
          fontSize: '10px',
          color: GC.textDim,
          animation: 'fadeUp 0.5s 0.8s both',
          pointerEvents: 'none',
        }}
      >
        <span style={{ padding: '2px 6px', borderRadius: '4px', border: `1px solid ${GC.border}`, color: GC.textSec }}>scroll</span>
        to zoom ·
        <span style={{ padding: '2px 6px', borderRadius: '4px', border: `1px solid ${GC.border}`, color: GC.textSec }}>drag</span>
        to pan or rearrange ·
        <span style={{ padding: '2px 6px', borderRadius: '4px', border: `1px solid ${GC.border}`, color: GC.textSec }}>click</span>
        to inspect ·
        <span style={{ padding: '2px 6px', borderRadius: '4px', border: `1px solid ${GC.border}`, color: GC.textSec }}>esc</span>
        to go back
      </div>
    </div>
  );
}
