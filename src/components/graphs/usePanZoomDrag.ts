import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Positions } from './graph-utils';

interface UsePanZoomDragOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  initialScale: number;
}

export function usePanZoomDrag({ containerRef, initialScale }: UsePanZoomDragOptions) {
  const scaleRef = useRef(initialScale);
  const panRef = useRef({ x: 0, y: 0 });
  const panDragRef = useRef<{ startX: number; startY: number } | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const dragDistRef = useRef(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const DRAG_THRESHOLD = 3;

  const toCanvas = useCallback((screenX: number, screenY: number) => ({
    x: (screenX - panRef.current.x) / scaleRef.current,
    y: (screenY - panRef.current.y) / scaleRef.current,
  }), []);

  const handleDragStart = useCallback((id: string, e: React.MouseEvent, positions: Positions, setPositions: React.Dispatch<React.SetStateAction<Positions>>) => {
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
  }, [toCanvas]);

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
  }, []);

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
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [containerRef, handleWheel]);

  return {
    scaleRef,
    panRef,
    draggingId,
    dragDistRef,
    DRAG_THRESHOLD,
    toCanvas,
    handleDragStart,
    handleCanvasPanStart,
    rerender,
  };
}
