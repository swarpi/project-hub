import { useState, useEffect, useCallback } from 'react';

const C = {
  indigo: 'oklch(0.45 0.18 265)',
  indigoMid: 'oklch(0.55 0.16 265)',
  indigoLight: 'oklch(0.93 0.04 265)',
  indigoDim: 'oklch(0.45 0.18 265 / 0.12)',
  amber: 'oklch(0.68 0.14 65)',
  amberLight: 'oklch(0.96 0.04 65)',
  amberDim: 'oklch(0.68 0.14 65 / 0.15)',
  border: 'oklch(0.88 0.01 80)',
  borderStrong: 'oklch(0.78 0.02 80)',
  textPrimary: 'oklch(0.18 0.02 265)',
  textSec: 'oklch(0.45 0.02 265)',
  textDim: 'oklch(0.65 0.015 265)',
  bg: 'oklch(0.97 0.008 80)',
  bgCard: 'oklch(1 0 0)',
};

interface NodeData {
  id: string;
  num: string;
  title: string;
  tagline: string;
  icon: React.ReactNode;
  color: string;
  colorLight: string;
  colorDim: string;
  description: string;
  outputs: string[];
  docLink?: string;
}

const NODES: NodeData[] = [
  {
    id: 'architect',
    num: '01',
    title: 'Architect',
    tagline: 'Shapes the system before anything is built.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    color: C.indigo,
    colorLight: C.indigoLight,
    colorDim: C.indigoDim,
    description:
      'Asks clarifying questions and explores alternatives before any code is written. Produces Architecture Decision Records (ADRs) and detailed specs — the north star for all downstream work.',
    outputs: ['ADRs', 'Specs', 'Constraints'],
    docLink: 'https://github.com/swarpi/agent-eng/blob/main/src/templates/.claude/agents/architect.md',
  },
  {
    id: 'planner',
    num: '02',
    title: 'Planner',
    tagline: 'Decomposes specs into actionable work.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 6h12M4 10h8M4 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: C.indigo,
    colorLight: C.indigoLight,
    colorDim: C.indigoDim,
    description:
      'Takes ADRs and specs as input. Decomposes the work into discrete, actionable tickets — each with clear acceptance criteria — that the Executor can pick up without ambiguity.',
    outputs: ['Tickets', 'Milestones', 'Criteria'],
    docLink: 'https://github.com/swarpi/agent-eng/blob/main/src/templates/.claude/agents/planner.md',
  },
  {
    id: 'executor',
    num: '03',
    title: 'Executor',
    tagline: 'Implements with intent and discipline.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M6 7l4-3 4 3v6l-4 3-4-3V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      </svg>
    ),
    color: C.indigo,
    colorLight: C.indigoLight,
    colorDim: C.indigoDim,
    description:
      'Implements tickets following established conventions. Always proposes a plan before touching the codebase — creating an audit trail and a review surface before any commits land.',
    outputs: ['Code', 'PRs', 'Plan docs'],
    docLink: 'https://github.com/swarpi/agent-eng/blob/main/src/templates/.claude/agents/executor.md',
  },
  {
    id: 'reviewer',
    num: '04',
    title: 'Reviewer',
    tagline: 'Validates against acceptance criteria.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: C.amber,
    colorLight: C.amberLight,
    colorDim: C.amberDim,
    description:
      'Validates code against the original acceptance criteria from the Planner. Flags issues back to the Executor and provides final approval when all criteria are met.',
    outputs: ['Feedback', 'Approval', 'Notes'],
    docLink: 'https://github.com/swarpi/agent-eng/blob/main/src/templates/.claude/agents/reviewer.md',
  },
];

const NODE_W = 240;
const NODE_H = 170;

interface Position {
  x: number;
  y: number;
}

interface Positions {
  [key: string]: Position;
}

function DotGrid({ W, H }: { W: number; H: number }) {
  const gap = 32;
  const cols = Math.ceil(W / gap) + 1;
  const rows = Math.ceil(H / gap) + 1;
  const pts: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push([c * gap, r * gap]);

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <defs>
        <radialGradient id="dgFade" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="oklch(0.72 0.04 265)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="oklch(0.72 0.04 265)" stopOpacity="0.04" />
        </radialGradient>
      </defs>
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.1" fill="url(#dgFade)" />
      ))}
    </svg>
  );
}

function ConnectionLayer({ positions }: { positions: Positions }) {
  if (!positions.architect) return null;

  const nCx = (id: string) => positions[id].x + NODE_W / 2;
  const nCy = (id: string) => positions[id].y + NODE_H / 2;
  const top = (id: string) => ({ x: nCx(id), y: positions[id].y });
  const bot = (id: string) => ({ x: nCx(id), y: positions[id].y + NODE_H });
  const left = (id: string) => ({ x: positions[id].x, y: nCy(id) });
  const right = (id: string) => ({ x: positions[id].x + NODE_W, y: nCy(id) });

  const bez = (p0: Position, c1: Position, c2: Position, p1: Position, t = 0.5) => ({
    x: (1 - t) ** 3 * p0.x + 3 * (1 - t) ** 2 * t * c1.x + 3 * (1 - t) * t ** 2 * c2.x + t ** 3 * p1.x,
    y: (1 - t) ** 3 * p0.y + 3 * (1 - t) ** 2 * t * c1.y + 3 * (1 - t) * t ** 2 * c2.y + t ** 3 * p1.y,
  });

  const arch2plan = (() => {
    const f = left('architect'),
      p1 = top('planner');
    const c1 = { x: f.x - 60, y: f.y };
    const c2 = { x: p1.x, y: p1.y - 60 };
    const d = `M${f.x},${f.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p1.x},${p1.y}`;
    const mid = bez(f, c1, c2, p1, 0.5);
    return { d, mid, artifacts: 'ADRs · Specs', color: C.indigo };
  })();

  const plan2exec = (() => {
    const f = right('planner'),
      p1 = left('executor');
    const c1 = { x: f.x + 60, y: f.y };
    const c2 = { x: p1.x - 60, y: p1.y };
    const d = `M${f.x},${f.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p1.x},${p1.y}`;
    const mid = bez(f, c1, c2, p1, 0.5);
    return { d, mid, artifacts: 'Tickets', color: C.indigo };
  })();

  const exec2rev = (() => {
    const f = bot('executor'),
      p1 = right('reviewer');
    const c1 = { x: f.x, y: f.y + 60 };
    const c2 = { x: p1.x + 60, y: p1.y };
    const d = `M${f.x},${f.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p1.x},${p1.y}`;
    const mid = bez(f, c1, c2, p1, 0.5);
    return { d, mid, artifacts: 'Code', color: C.indigo };
  })();

  const rev2exec = (() => {
    const f = bot('reviewer'),
      p1 = bot('executor');
    const swing = 55;
    const c1 = { x: f.x + 20, y: f.y + swing };
    const c2 = { x: p1.x - 20, y: p1.y + swing };
    const d = `M${f.x},${f.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p1.x},${p1.y}`;
    const mid = { x: (f.x + p1.x) / 2 - 56, y: Math.max(f.y, p1.y) + 12 };
    return { d, mid, artifacts: 'Feedback', color: C.amber };
  })();

  const lines = [arch2plan, plan2exec, exec2rev];

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        <marker id="arr-indigo" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M1 1l5 3-5 3" stroke={C.indigo} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="arr-amber" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M1 1l5 3-5 3" stroke={C.amber} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <filter id="blur-indigo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="blur-amber" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {[...lines, rev2exec].map((l, i) => (
        <path
          key={i}
          d={l.d}
          fill="none"
          stroke={l.color === C.amber ? C.amber : C.indigo}
          strokeWidth="1"
          strokeDasharray="5 7"
          opacity={l.color === C.amber ? 0.18 : 0.12}
        />
      ))}

      {lines.map((l, i) => (
        <path
          key={`a${i}`}
          d={l.d}
          fill="none"
          stroke={C.indigo}
          strokeWidth="1.8"
          strokeDasharray="6 8"
          opacity="0.55"
          markerEnd="url(#arr-indigo)"
          filter="url(#blur-indigo)"
          className="flow-line"
          style={{ animationDelay: `${i * 0.25}s` }}
        />
      ))}
      <path
        d={rev2exec.d}
        fill="none"
        stroke={C.amber}
        strokeWidth="1.8"
        strokeDasharray="5 7"
        opacity="0.6"
        markerEnd="url(#arr-amber)"
        filter="url(#blur-amber)"
        className="flow-line-reverse"
      />

      {[...lines, rev2exec].map((l, i) => (
        <foreignObject key={`f${i}`} x={l.mid.x - 56} y={l.mid.y - 13} width="112" height="26">
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9.5px',
              lineHeight: 1,
              padding: '4px 9px',
              borderRadius: '20px',
              background: 'oklch(1 0 0)',
              border: `1px solid ${l.color === C.amber ? 'oklch(0.88 0.06 65)' : 'oklch(0.88 0.04 265)'}`,
              color: l.color === C.amber ? C.amber : C.indigo,
              whiteSpace: 'nowrap',
              textAlign: 'center',
              boxShadow: '0 1px 4px oklch(0 0 0 / 0.06)',
            }}
          >
            {l.artifacts}
          </div>
        </foreignObject>
      ))}
    </svg>
  );
}

function NodeCard({
  node,
  pos,
  selected,
  onClick,
  animDelay,
}: {
  node: NodeData;
  pos: Position;
  selected: boolean;
  onClick: (id: string) => void;
  animDelay: number;
}) {
  const isAmber = node.color === C.amber;
  const [hovered, setHovered] = useState(false);
  const active = selected || hovered;

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: NODE_W,
        height: NODE_H,
        cursor: 'pointer',
        animation: `nodeIn 0.5s cubic-bezier(0.16,1,0.3,1) ${animDelay}ms both`,
      }}
      onClick={() => onClick(node.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: active ? (isAmber ? 'oklch(0.995 0.008 65)' : 'oklch(0.995 0.008 265)') : 'oklch(1 0 0)',
          border: `1.5px solid ${active ? node.color : 'oklch(0.88 0.01 80)'}`,
          borderRadius: '16px',
          padding: '20px',
          boxShadow: active
            ? `0 0 0 4px ${isAmber ? 'oklch(0.68 0.14 65 / 0.1)' : 'oklch(0.45 0.18 265 / 0.1)'}, 0 8px 32px oklch(0 0 0 / 0.08), 0 2px 8px oklch(0 0 0 / 0.05)`
            : '0 1px 4px oklch(0 0 0 / 0.05), 0 4px 16px oklch(0 0 0 / 0.04)',
          transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
          transform: active ? 'translateY(-2px)' : 'translateY(0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: node.color,
            borderRadius: '16px 16px 0 0',
            opacity: active ? 1 : 0.4,
            transition: 'opacity 0.2s',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              fontWeight: 500,
              color: node.color,
              background: isAmber ? C.amberDim : C.indigoDim,
              border: `1px solid ${isAmber ? 'oklch(0.68 0.14 65 / 0.25)' : 'oklch(0.45 0.18 265 / 0.2)'}`,
              borderRadius: '6px',
              padding: '2px 7px',
            }}
          >
            {node.num}
          </span>
          <span style={{ color: node.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{node.icon}</span>
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: 1.1,
              color: C.textPrimary,
              marginBottom: '5px',
            }}
          >
            {node.title}
          </div>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '12px',
              lineHeight: 1.5,
              color: C.textDim,
            }}
          >
            {node.tagline}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: 'auto' }}>
          {node.outputs.map((o) => (
            <span
              key={o}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9.5px',
                padding: '2px 8px',
                borderRadius: '20px',
                background: isAmber ? C.amberLight : C.indigoLight,
                color: node.color,
                border: `1px solid ${isAmber ? 'oklch(0.68 0.14 65 / 0.2)' : 'oklch(0.45 0.18 265 / 0.15)'}`,
                whiteSpace: 'nowrap',
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

function DetailPanel({ node, onClose, positions }: { node: NodeData; onClose: () => void; positions: Positions }) {
  const isAmber = node.color === C.amber;
  const pos = positions[node.id];
  let panelLeft = pos.x + NODE_W + 20;
  if (typeof window !== 'undefined' && panelLeft + 300 > window.innerWidth) panelLeft = pos.x - 320;
  const panelTop = Math.max(20, pos.y - 20);

  return (
    <div
      style={{
        position: 'absolute',
        left: panelLeft,
        top: panelTop,
        width: 300,
        background: 'oklch(1 0 0)',
        border: `1.5px solid ${node.color}`,
        borderRadius: '18px',
        padding: '24px',
        boxShadow: `0 0 0 4px ${isAmber ? 'oklch(0.68 0.14 65 / 0.08)' : 'oklch(0.45 0.18 265 / 0.08)'}, 0 20px 60px oklch(0 0 0 / 0.1)`,
        animation: 'panelIn 0.28s cubic-bezier(0.16,1,0.3,1) both',
        zIndex: 200,
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
          border: '1.5px solid oklch(0.88 0.01 80)',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.textDim,
          fontSize: '13px',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        ✕
      </button>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9.5px',
          color: node.color,
          marginBottom: '12px',
          background: isAmber ? C.amberLight : C.indigoLight,
          padding: '3px 9px',
          borderRadius: '20px',
          border: `1px solid ${isAmber ? 'oklch(0.68 0.14 65 / 0.25)' : 'oklch(0.45 0.18 265 / 0.2)'}`,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: node.color, display: 'inline-block' }} />
        Role {node.num}
      </div>

      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '22px',
          fontWeight: 700,
          color: C.textPrimary,
          marginBottom: '12px',
          lineHeight: 1.1,
        }}
      >
        {node.title}
      </div>

      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '13px',
          lineHeight: 1.7,
          color: C.textSec,
          marginBottom: '18px',
        }}
      >
        {node.description}
      </div>

      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: C.textDim,
          marginBottom: '8px',
        }}
      >
        Produces
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
        {node.outputs.map((o) => (
          <span
            key={o}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10.5px',
              padding: '4px 10px',
              borderRadius: '8px',
              background: isAmber ? C.amberLight : C.indigoLight,
              color: node.color,
              border: `1px solid ${isAmber ? 'oklch(0.68 0.14 65 / 0.2)' : 'oklch(0.45 0.18 265 / 0.15)'}`,
            }}
          >
            {o}
          </span>
        ))}
      </div>

      {node.docLink && (
        <a
          href={node.docLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            color: node.color,
            padding: '9px 16px',
            borderRadius: '10px',
            border: `1.5px solid ${isAmber ? 'oklch(0.68 0.14 65 / 0.35)' : 'oklch(0.45 0.18 265 / 0.3)'}`,
            background: isAmber ? C.amberLight : C.indigoLight,
            cursor: 'pointer',
            textDecoration: 'none',
            width: '100%',
            justifyContent: 'center',
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

function Header() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 32,
        left: 40,
        zIndex: 10,
        animation: 'fadeUp 0.5s both',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '14px',
          fontWeight: 600,
          color: C.textPrimary,
          letterSpacing: '-0.01em',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="3" fill={C.indigo} />
          <circle cx="9" cy="9" r="7.5" stroke={C.indigo} strokeWidth="1.2" strokeDasharray="3 2" />
        </svg>
        Agentic Engineering Workflow
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: C.textDim,
          marginTop: '4px',
          paddingLeft: '28px',
        }}
      >
        four-role pipeline · click any node to explore
      </div>
    </div>
  );
}

function Hint() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10.5px',
        color: C.textDim,
        animation: 'fadeUp 0.5s 1s both',
      }}
    >
      <span style={{ padding: '2px 7px', borderRadius: '5px', border: `1px solid ${C.border}`, color: C.textSec }}>click</span>
      node to inspect ·
      <span style={{ padding: '2px 7px', borderRadius: '5px', border: `1px solid ${C.border}`, color: C.textSec }}>esc</span>
      to dismiss
    </div>
  );
}

export default function WorkflowGraph() {
  const [selected, setSelected] = useState<string | null>(null);
  const [positions, setPositions] = useState<Positions>({});
  const [dims, setDims] = useState({ W: 1200, H: 800 });

  const compute = useCallback(() => {
    if (typeof window === 'undefined') return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    setDims({ W, H });

    const cx = W / 2;
    const cy = H / 2;
    const hSpread = Math.min(W * 0.24, 280);
    const vSpread = Math.min(H * 0.28, 210);

    setPositions({
      architect: { x: cx - NODE_W / 2, y: cy - vSpread - NODE_H / 2 },
      planner: { x: cx - hSpread - NODE_W / 2, y: cy - NODE_H / 2 },
      executor: { x: cx + hSpread - NODE_W / 2, y: cy - NODE_H / 2 },
      reviewer: { x: cx - NODE_W / 2, y: cy + vSpread - NODE_H / 2 },
    });
  }, []);

  useEffect(() => {
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [compute]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selectedNode = NODES.find((n) => n.id === selected);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: C.bg,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes nodeIn {
          from { opacity: 0; transform: scale(0.92) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
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
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, oklch(0.92 0.01 80 / 0.5) 100%)',
        }}
      />

      <Header />

      {Object.keys(positions).length > 0 && <ConnectionLayer positions={positions} />}

      {NODES.map((node, i) =>
        positions[node.id] ? (
          <NodeCard
            key={node.id}
            node={node}
            pos={positions[node.id]}
            selected={selected === node.id}
            onClick={(id) => setSelected((prev) => (prev === id ? null : id))}
            animDelay={i * 100}
          />
        ) : null
      )}

      {selected && selectedNode && <DetailPanel node={selectedNode} onClose={() => setSelected(null)} positions={positions} />}

      <Hint />
    </div>
  );
}
