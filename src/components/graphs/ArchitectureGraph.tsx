import { useState, useEffect, useCallback, useRef } from 'react';
import type { Architecture, ArchComponent, ArchConnection } from '@/lib/types';

const COLORS: Record<string, { main: string; light: string; dim: string; border: string }> = {
  indigo: {
    main: 'oklch(0.45 0.18 265)',
    light: 'oklch(0.93 0.04 265)',
    dim: 'oklch(0.45 0.18 265 / 0.12)',
    border: 'oklch(0.45 0.18 265 / 0.2)',
  },
  amber: {
    main: 'oklch(0.68 0.14 65)',
    light: 'oklch(0.96 0.04 65)',
    dim: 'oklch(0.68 0.14 65 / 0.15)',
    border: 'oklch(0.68 0.14 65 / 0.25)',
  },
  green: {
    main: 'oklch(0.58 0.14 155)',
    light: 'oklch(0.94 0.04 155)',
    dim: 'oklch(0.58 0.14 155 / 0.12)',
    border: 'oklch(0.58 0.14 155 / 0.2)',
  },
  blue: {
    main: 'oklch(0.55 0.15 240)',
    light: 'oklch(0.94 0.04 240)',
    dim: 'oklch(0.55 0.15 240 / 0.12)',
    border: 'oklch(0.55 0.15 240 / 0.2)',
  },
};

const C = {
  border: 'var(--wf-border)',
  textPrimary: 'var(--wf-text)',
  textSec: 'var(--wf-text-sec)',
  textDim: 'var(--wf-text-dim)',
  bg: 'var(--wf-bg)',
  card: 'var(--wf-card)',
  labelBg: 'var(--wf-label-bg)',
};

const TIER_ORDER: Record<string, number> = { client: 0, service: 1, engine: 2, data: 3 };
const TIER_LABELS: Record<string, string> = { client: 'Client', service: 'Service', engine: 'Engine', data: 'Data' };

type Tier = 'client' | 'service' | 'engine' | 'data';

function getTierAccentElements(tier: Tier | string, colorMain: string, active: boolean) {
  const opacity = active ? 1 : 0.4;
  const base = { position: 'absolute' as const, background: colorMain, opacity };

  switch (tier) {
    case 'service':
      return [{ ...base, top: 0, left: 0, bottom: 0, width: '3px', borderRadius: '12px 0 0 12px' }];
    case 'engine':
      return [{ ...base, bottom: 0, left: 0, right: 0, height: '2.5px', borderRadius: '0 0 12px 12px' }];
    case 'data':
      return [
        { ...base, top: 0, left: 0, right: 0, height: '1.5px', borderRadius: '12px 12px 0 0' },
        { ...base, bottom: 0, left: 0, right: 0, height: '1.5px', borderRadius: '0 0 12px 12px' },
      ];
    case 'client':
    default:
      return [{ ...base, top: 0, left: 0, right: 0, height: '2.5px', borderRadius: '12px 12px 0 0' }];
  }
}

function getTierBadgeStyle(tier: string, color: { main: string; light: string; dim: string; border: string }) {
  switch (tier) {
    case 'client':
      return { background: color.dim, color: color.main, border: `1px solid ${color.border}` };
    case 'service':
      return { background: 'transparent', color: color.main, border: `1.5px solid ${color.main}` };
    case 'engine':
      return { background: color.light, color: color.main, border: `1px dashed ${color.border}` };
    case 'data':
      return { background: color.dim, color: color.main, border: `1.5px double ${color.main}` };
    default:
      return { background: color.dim, color: color.main, border: `1px solid ${color.border}` };
  }
}

const NODE_W = 170;
const NODE_H = 100;

interface Position { x: number; y: number }
interface Positions { [key: string]: Position }

function DotGrid({ W, H }: { W: number; H: number }) {
  const gap = 32;
  const cols = Math.ceil(W / gap) + 1;
  const rows = Math.ceil(H / gap) + 1;
  const pts: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push([c * gap, r * gap]);

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <defs>
        <radialGradient id="dgFade2" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="oklch(0.72 0.04 265)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="oklch(0.72 0.04 265)" stopOpacity="0.04" />
        </radialGradient>
      </defs>
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.1" fill="url(#dgFade2)" />
      ))}
    </svg>
  );
}

function getSmartPort(
  fromPos: Position, toPos: Position,
  nodeW: number, nodeH: number,
): { source: Position; sourceDir: string; target: Position; targetDir: string } {
  const fromCx = fromPos.x + nodeW / 2;
  const fromCy = fromPos.y + nodeH / 2;
  const toCx = toPos.x + nodeW / 2;
  const toCy = toPos.y + nodeH / 2;
  const hw = nodeW / 2;
  const hh = nodeH / 2;

  const pickSide = (cx: number, cy: number, otherCx: number, otherCy: number) => {
    const ddx = otherCx - cx;
    const ddy = otherCy - cy;
    if (Math.abs(ddx / hw) > Math.abs(ddy / hh)) {
      return ddx > 0
        ? { point: { x: cx + hw, y: cy }, dir: 'right' }
        : { point: { x: cx - hw, y: cy }, dir: 'left' };
    }
    return ddy > 0
      ? { point: { x: cx, y: cy + hh }, dir: 'bottom' }
      : { point: { x: cx, y: cy - hh }, dir: 'top' };
  };

  const src = pickSide(fromCx, fromCy, toCx, toCy);
  const tgt = pickSide(toCx, toCy, fromCx, fromCy);
  return { source: src.point, sourceDir: src.dir, target: tgt.point, targetDir: tgt.dir };
}

function ctrlOffset(distance: number, curvature: number): number {
  return distance >= 0 ? 0.5 * distance : curvature * 25 * Math.sqrt(-distance);
}

function getControlPoint(dir: string, x: number, y: number, tx: number, ty: number, curvature: number): Position {
  switch (dir) {
    case 'left':   return { x: x - ctrlOffset(x - tx, curvature), y };
    case 'right':  return { x: x + ctrlOffset(tx - x, curvature), y };
    case 'top':    return { x, y: y - ctrlOffset(y - ty, curvature) };
    case 'bottom': return { x, y: y + ctrlOffset(ty - y, curvature) };
    default:       return { x, y };
  }
}

function ConnectionLayer({ positions, connections, components }: { positions: Positions; connections: ArchConnection[]; components: ArchComponent[] }) {
  if (Object.keys(positions).length === 0) return null;

  const getColor = (compId: string) => {
    const comp = components.find((c) => c.id === compId);
    return COLORS[comp?.color || 'indigo'];
  };

  const CURVATURE = 0.25;

  const pairIndex = new Map<string, number>();
  connections.forEach((conn) => {
    const key = [conn.from, conn.to].sort().join('::');
    const idx = pairIndex.get(key) ?? 0;
    pairIndex.set(key, idx + 1);
  });

  let pairCounter = new Map<string, number>();

  const lines = connections.map((conn) => {
    const fromPos = positions[conn.from];
    const toPos = positions[conn.to];
    if (!fromPos || !toPos) return null;

    const color = getColor(conn.from);
    const isStream = conn.style === 'stream';
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

    const colorName = components.find(c => c.id === conn.from)?.color || 'indigo';
    return { d, mid, protocol: conn.protocol, color: color.main, colorName, isStream };
  }).filter(Boolean);

  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        {Object.entries(COLORS).map(([name, color]) => (
          <marker key={name} id={`arch-arr-${name}`} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
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
            opacity={0.5}
            strokeLinecap="round"
            strokeDasharray={l.isStream ? '3 5' : 'none'}
            markerEnd={`url(#arch-arr-${l.colorName})`}
          />
          <foreignObject x={l.mid.x - 30} y={l.mid.y - 8} width="60" height="16" style={{ overflow: 'visible' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '6.5px',
              lineHeight: 1,
              padding: '2px 5px',
              borderRadius: '8px',
              background: C.labelBg,
              border: `1px solid ${C.border}`,
              color: 'var(--wf-text-sec)',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              boxShadow: `0 1px 3px var(--wf-shadow)`,
              width: 'fit-content',
              margin: '0 auto',
            }}>
              {l.protocol}
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
  );
}


function ComponentNode({
  component,
  index,
  pos,
  selected,
  onClick,
  onDrag,
  isDragging,
}: {
  component: ArchComponent;
  index: number;
  pos: Position;
  selected: boolean;
  onClick: (id: string) => void;
  onDrag: (id: string, e: React.MouseEvent) => void;
  isDragging: boolean;
}) {
  const color = COLORS[component.color || 'indigo'];
  const [hovered, setHovered] = useState(false);
  const active = selected || hovered;
  const hasInteracted = useRef(false);
  if (isDragging) hasInteracted.current = true;

  return (
    <div
      data-node-id={component.id}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: NODE_W,
        cursor: isDragging ? 'grabbing' : 'grab',
        animation: hasInteracted.current ? 'none' : `archNodeIn 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 80}ms both`,
        userSelect: 'none',
      }}
      onMouseDown={(e) => { e.preventDefault(); onDrag(component.id, e); }}
      onClick={() => onClick(component.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: '100%',
        background: active ? color.light : C.card,
        border: `1.5px solid ${active ? color.main : C.border}`,
        borderRadius: '12px',
        padding: component.tier === 'service' ? '10px 12px 10px 15px' : '10px 12px',
        boxShadow: isDragging
          ? `0 0 0 3px ${color.dim}, 0 12px 36px oklch(0 0 0 / 0.15)`
          : active
          ? `0 0 0 3px ${color.dim}, 0 6px 24px oklch(0 0 0 / 0.08)`
          : '0 1px 4px oklch(0 0 0 / 0.05), 0 3px 12px oklch(0 0 0 / 0.04)',
        transition: isDragging ? 'box-shadow 0.15s' : 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
        transform: isDragging ? 'scale(1.03)' : active ? 'translateY(-1px)' : 'translateY(0)',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {getTierAccentElements(component.tier, color.main, active).map((style, i) => (
          <div key={i} style={style} />
        ))}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', fontWeight: 500,
            borderRadius: '4px', padding: '1px 5px',
            ...getTierBadgeStyle(component.tier, color),
          }}>
            {TIER_LABELS[component.tier] || component.tier}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '7px',
            color: C.textDim, maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {component.technology}
          </span>
        </div>

        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 700,
          color: C.textPrimary, lineHeight: 1.2,
        }}>
          {component.title}
        </div>

        {component.subcomponents && component.subcomponents.length > 0 && (
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: 'auto' }}>
            {component.subcomponents.slice(0, 2).map((sub) => (
              <span key={sub.name} style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '7.5px',
                padding: '1px 5px', borderRadius: '8px',
                background: color.light, color: color.main, border: `1px solid ${color.border}`,
              }}>
                {sub.name}
              </span>
            ))}
            {component.subcomponents.length > 2 && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '7.5px',
                padding: '1px 5px', borderRadius: '8px',
                background: color.light, color: color.main, border: `1px solid ${color.border}`,
              }}>
                +{component.subcomponents.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailPanel({ component, onClose }: { component: ArchComponent; onClose: () => void }) {
  const color = COLORS[component.color || 'indigo'];

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 360, background: C.card, border: `1.5px solid ${color.main}`,
      borderRadius: '18px', padding: '24px',
      boxShadow: `0 0 0 4px ${color.dim}, 0 20px 60px oklch(0 0 0 / 0.15)`,
      animation: 'archPanelIn 0.25s cubic-bezier(0.16,1,0.3,1) both', zIndex: 300,
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 14, right: 14, width: 26, height: 26,
        borderRadius: '8px', border: `1.5px solid ${C.border}`, background: 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.textDim, fontSize: '13px',
      }}>✕</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: color.main,
          background: color.light, padding: '3px 8px', borderRadius: '10px', border: `1px solid ${color.border}`,
        }}>
          {TIER_LABELS[component.tier] || component.tier}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: C.textDim,
        }}>
          {component.technology}
        </span>
      </div>

      <div style={{
        fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 700,
        color: C.textPrimary, marginBottom: '8px',
      }}>
        {component.title}
      </div>

      <div style={{
        fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', color: C.textSec,
        lineHeight: 1.6, marginBottom: '20px',
      }}>
        {component.description}
      </div>

      {component.subcomponents && component.subcomponents.length > 0 && (
        <>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', textTransform: 'uppercase',
            letterSpacing: '0.1em', color: C.textDim, marginBottom: '10px',
          }}>
            Subcomponents
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {component.subcomponents.map((sub) => (
              <div key={sub.name} style={{
                padding: '10px 12px', borderRadius: '10px',
                background: color.light, border: `1px solid ${color.border}`,
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '11px',
                  fontWeight: 600, color: color.main, marginBottom: '2px',
                }}>
                  {sub.name}
                </div>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px',
                  color: C.textSec, lineHeight: 1.4,
                }}>
                  {sub.detail}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ArchitectureGraphProps {
  architecture: Architecture;
  projectName: string;
  projectUrl: string;
  onClose?: () => void;
}

export default function ArchitectureGraph({ architecture, projectName, projectUrl: _projectUrl, onClose }: ArchitectureGraphProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [positions, setPositions] = useState<Positions>({});
  const [dims, setDims] = useState({ W: 1200, H: 800 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const dragDistRef = useRef(0);
  const DRAG_THRESHOLD = 3;
  const containerRef = useRef<HTMLDivElement>(null);

  const INITIAL_SCALE = 1.4;
  const scaleRef = useRef(INITIAL_SCALE);
  const panRef = useRef({ x: 0, y: 0 });
  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender((n) => n + 1), []);

  const panDragRef = useRef<{ startX: number; startY: number } | null>(null);

  const toCanvas = useCallback((screenX: number, screenY: number) => ({
    x: (screenX - panRef.current.x) / scaleRef.current,
    y: (screenY - panRef.current.y) / scaleRef.current,
  }), []);

  const handleDragStart = useCallback((id: string, e: React.MouseEvent) => {
    const pos = positions[id];
    if (!pos) return;
    const canvas = toCanvas(e.clientX, e.clientY);
    dragRef.current = { id, offsetX: canvas.x - pos.x, offsetY: canvas.y - pos.y };
    dragDistRef.current = 0;
    const startX = e.clientX;
    const startY = e.clientY;
    setDraggingId(id);

    const onMove = (ev: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragDistRef.current = Math.max(dragDistRef.current, Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY));
      const c = toCanvas(ev.clientX, ev.clientY);
      setPositions((prev) => ({ ...prev, [drag.id]: { x: c.x - drag.offsetX, y: c.y - drag.offsetY } }));
    };

    const onUp = () => {
      dragRef.current = null;
      setDraggingId(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [positions, toCanvas]);

  const handleCanvasPanStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node-id]')) return;
    e.preventDefault();
    panDragRef.current = { startX: e.clientX - panRef.current.x, startY: e.clientY - panRef.current.y };
    dragDistRef.current = 0;
    const startX = e.clientX;
    const startY = e.clientY;

    const onMove = (ev: MouseEvent) => {
      if (!panDragRef.current) return;
      dragDistRef.current = Math.max(dragDistRef.current, Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY));
      panRef.current = { x: ev.clientX - panDragRef.current.startX, y: ev.clientY - panDragRef.current.startY };
      rerender();
    };

    const onUp = () => {
      panDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [rerender]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const oldScale = scaleRef.current;
    const newScale = Math.min(3, Math.max(0.3, oldScale + delta * oldScale));
    const cx = (e.clientX - panRef.current.x) / oldScale;
    const cy = (e.clientY - panRef.current.y) / oldScale;
    panRef.current = { x: e.clientX - cx * newScale, y: e.clientY - cy * newScale };
    scaleRef.current = newScale;
    rerender();
  }, [rerender]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const compute = useCallback(() => {
    if (typeof window === 'undefined') return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    setDims({ W, H });

    panRef.current = { x: W / 2, y: H / 2 };
    scaleRef.current = INITIAL_SCALE;

    const components = architecture.components;
    const tiers: Record<string, ArchComponent[]> = {};
    for (const comp of components) {
      const tier = comp.tier || 'service';
      if (!tiers[tier]) tiers[tier] = [];
      tiers[tier].push(comp);
    }

    const sortedTiers = Object.entries(tiers).sort(
      ([a], [b]) => (TIER_ORDER[a] ?? 99) - (TIER_ORDER[b] ?? 99)
    );

    const totalTiers = sortedTiers.length;
    const tierSpacing = 140;
    const startY = -((totalTiers - 1) * tierSpacing) / 2 - NODE_H / 2;

    const newPositions: Positions = {};

    sortedTiers.forEach(([, comps], tierIdx) => {
      const y = startY + tierIdx * tierSpacing;
      const spacing = 200;
      const startX = -((comps.length - 1) * spacing) / 2 - NODE_W / 2;

      comps.forEach((comp, i) => {
        newPositions[comp.id] = { x: startX + i * spacing, y };
      });
    });

    setPositions(newPositions);
    rerender();
  }, [architecture, rerender]);

  useEffect(() => {
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [compute]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selected) setSelected(null);
        else if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onClose]);

  const selectedComp = architecture.components.find((c) => c.id === selected);
  const scale = scaleRef.current;
  const pan = panRef.current;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: C.bg,
        cursor: draggingId ? 'grabbing' : 'default',
      }}
      onMouseDown={handleCanvasPanStart}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
        @keyframes archFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes archNodeIn { from { opacity: 0; transform: scale(0.92) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes archPanelIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        .arch-flow-line { animation: archFlowDash 1.6s linear infinite; }
      `}</style>

      <DotGrid W={dims.W} H={dims.H} />

      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, var(--wf-bg) 100%)',
      }} />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transformOrigin: '0 0',
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        willChange: 'transform',
      }}>
        {Object.keys(positions).length > 0 && (
          <ConnectionLayer positions={positions} connections={architecture.connections} components={architecture.components} />
        )}

        {architecture.components.map((comp, i) =>
          positions[comp.id] ? (
            <ComponentNode
              key={comp.id}
              component={comp}
              index={i}
              pos={positions[comp.id]}
              selected={selected === comp.id}
              onClick={(id) => { if (dragDistRef.current < DRAG_THRESHOLD) setSelected((prev) => (prev === id ? null : id)); }}
              onDrag={handleDragStart}
              isDragging={draggingId === comp.id}
            />
          ) : null
        )}
      </div>

      <div style={{ position: 'absolute', top: 28, left: 36, zIndex: 10, animation: 'archFadeUp 0.5s both', pointerEvents: 'auto' }}>
        {onClose && (
          <button onClick={onClose} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px', color: C.textDim,
            background: 'none', border: 'none', cursor: 'pointer', marginBottom: '8px', padding: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to projects
          </button>
        )}
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 600, color: C.textPrimary,
        }}>
          {architecture.name || projectName}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: C.textDim, marginTop: '4px',
        }}>
          {architecture.components.length} components · click to explore
        </div>
      </div>

      {selected && selectedComp && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.3)', zIndex: 250 }}
            onClick={() => setSelected(null)} />
          <DetailPanel component={selectedComp} onClose={() => setSelected(null)} />
        </>
      )}

      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '8px',
        fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: C.textDim,
        animation: 'archFadeUp 0.5s 0.8s both', pointerEvents: 'none',
      }}>
        <span style={{ padding: '2px 6px', borderRadius: '4px', border: `1px solid ${C.border}`, color: C.textSec }}>scroll</span>
        to zoom ·
        <span style={{ padding: '2px 6px', borderRadius: '4px', border: `1px solid ${C.border}`, color: C.textSec }}>drag</span>
        to pan or rearrange ·
        <span style={{ padding: '2px 6px', borderRadius: '4px', border: `1px solid ${C.border}`, color: C.textSec }}>click</span>
        to inspect ·
        <span style={{ padding: '2px 6px', borderRadius: '4px', border: `1px solid ${C.border}`, color: C.textSec }}>esc</span>
        to go back
      </div>
    </div>
  );
}
