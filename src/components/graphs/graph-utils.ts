export interface Position { x: number; y: number }
export interface Positions { [key: string]: Position }

export const GRAPH_COLORS: Record<string, { main: string; light: string; dim: string; border: string }> = {
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

export const GC = {
  border: 'var(--wf-border)',
  borderStrong: 'var(--wf-border-strong)',
  textPrimary: 'var(--wf-text)',
  textSec: 'var(--wf-text-sec)',
  textDim: 'var(--wf-text-dim)',
  bg: 'var(--wf-bg)',
  card: 'var(--wf-card)',
  labelBg: 'var(--wf-label-bg)',
};

function ctrlOffset(distance: number, curvature: number): number {
  return distance >= 0 ? 0.5 * distance : curvature * 25 * Math.sqrt(-distance);
}

export function getSmartPort(
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

export function getControlPoint(dir: string, x: number, y: number, tx: number, ty: number, curvature: number): Position {
  switch (dir) {
    case 'left':   return { x: x - ctrlOffset(x - tx, curvature), y };
    case 'right':  return { x: x + ctrlOffset(tx - x, curvature), y };
    case 'top':    return { x, y: y - ctrlOffset(y - ty, curvature) };
    case 'bottom': return { x, y: y + ctrlOffset(ty - y, curvature) };
    default:       return { x, y };
  }
}
