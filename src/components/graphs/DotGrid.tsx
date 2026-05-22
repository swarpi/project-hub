export function DotGrid({ W, H, gradientId = 'dgFade' }: { W: number; H: number; gradientId?: string }) {
  const gap = 32;
  const cols = Math.ceil(W / gap) + 1;
  const rows = Math.ceil(H / gap) + 1;
  const pts: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push([c * gap, r * gap]);

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="oklch(0.72 0.04 265)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="oklch(0.72 0.04 265)" stopOpacity="0.04" />
        </radialGradient>
      </defs>
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.1" fill={`url(#${gradientId})`} />
      ))}
    </svg>
  );
}
