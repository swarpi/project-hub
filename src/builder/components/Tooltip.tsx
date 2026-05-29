import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTooltipPin } from "../hooks/useTooltipPin";
import { useOutsideClick } from "../hooks/useOutsideClick";
import { TOOLTIP_CARD } from "./tooltip-styles";

interface TooltipProps {
  content: ReactNode;
  children: (props: {
    onMouseEnter: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
    onClick: (e: React.MouseEvent) => void;
    ref: React.RefObject<HTMLElement | null>;
  }) => ReactNode;
  delay?: number;
  maxWidth?: number;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  pinnable?: boolean;
  pinId?: string;
}

const TOOLTIP_CONTAINER: CSSProperties = {
  position: "fixed",
  zIndex: 99999,
  pointerEvents: "none",
  transition: "opacity 0.15s ease, transform 0.15s ease",
};

export function Tooltip({ content, children, delay = 400, maxWidth = 320, placement = "auto", pinnable = false, pinId }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [actualPlacement, setActualPlacement] = useState<"top" | "bottom" | "left" | "right">("top");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const { isPinned, togglePin, unpin } = useTooltipPin(pinnable ? pinId : undefined);

  const computePosition = useCallback((target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const pad = 12;

    let place = placement;
    if (place === "auto") {
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;

      if (spaceAbove > 200) place = "top";
      else if (spaceBelow > 200) place = "bottom";
      else if (spaceRight > maxWidth + pad) place = "right";
      else if (spaceLeft > maxWidth + pad) place = "left";
      else place = "bottom";
    }

    let x: number;
    let y: number;

    switch (place) {
      case "top":
        x = rect.left + rect.width / 2;
        y = rect.top - pad;
        break;
      case "bottom":
        x = rect.left + rect.width / 2;
        y = rect.bottom + pad;
        break;
      case "left":
        x = rect.left - pad;
        y = rect.top + rect.height / 2;
        break;
      case "right":
        x = rect.right + pad;
        y = rect.top + rect.height / 2;
        break;
    }

    const half = maxWidth / 2;
    const estimatedHeight = 200;
    x = Math.max(half + pad, Math.min(window.innerWidth - half - pad, x));
    if (place === "top") {
      y = Math.max(estimatedHeight + pad, y);
    } else if (place === "bottom") {
      y = Math.min(window.innerHeight - estimatedHeight - pad, y);
    } else {
      y = Math.max(estimatedHeight / 2 + pad, Math.min(window.innerHeight - estimatedHeight / 2 - pad, y));
    }

    return { x, y, place };
  }, [maxWidth, placement]);

  const show = useCallback((e: React.MouseEvent) => {
    timerRef.current = setTimeout(() => {
      const target = anchorRef.current ?? (e.currentTarget as HTMLElement);
      const { x, y, place } = computePosition(target);
      setCoords({ x, y });
      setActualPlacement(place);
      setVisible(true);
    }, delay);
  }, [delay, computePosition]);

  const hide = useCallback((e: React.MouseEvent) => {
    if (isPinned) return;
    if (
      anchorRef.current &&
      e.relatedTarget instanceof Node &&
      anchorRef.current.contains(e.relatedTarget)
    ) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, [isPinned]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!pinnable) return;
    e.stopPropagation();
    if (!isPinned && anchorRef.current) {
      const { x, y, place } = computePosition(anchorRef.current);
      setCoords({ x, y });
      setActualPlacement(place);
      setVisible(true);
    }
    togglePin();
  }, [pinnable, isPinned, togglePin, computePosition]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isPinned) {
      setVisible(false);
    }
  }, [isPinned]);

  const outsideRefs = useMemo(() => [tooltipRef, anchorRef], []);
  useOutsideClick(outsideRefs, isPinned, unpin);

  useEffect(() => {
    if (visible || isPinned) {
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
  }, [visible, isPinned]);

  const isShown = visible || isPinned;

  const getTransform = (): string => {
    switch (actualPlacement) {
      case "top": return "translate(-50%, -100%)";
      case "bottom": return "translate(-50%, 0%)";
      case "left": return "translate(-100%, -50%)";
      case "right": return "translate(0%, -50%)";
    }
  };

  const getEnterTransform = (): string => {
    switch (actualPlacement) {
      case "top": return "translate(-50%, -100%) translateY(4px)";
      case "bottom": return "translate(-50%, 0%) translateY(-4px)";
      case "left": return "translate(-100%, -50%) translateX(4px)";
      case "right": return "translate(0%, -50%) translateX(-4px)";
    }
  };

  return (
    <>
      {children({ onMouseEnter: show, onMouseLeave: hide, onClick: handleClick, ref: anchorRef })}
      {isShown && createPortal(
        <div
          ref={tooltipRef}
          style={{
            ...TOOLTIP_CONTAINER,
            left: coords.x,
            top: coords.y,
            transform: entered ? getTransform() : getEnterTransform(),
            opacity: entered ? 1 : 0,
            pointerEvents: isPinned ? "auto" : "none",
          }}
        >
          <div style={{ ...TOOLTIP_CARD, maxWidth, position: "relative" }}>
            {isPinned && (
              <button
                onClick={(e) => { e.stopPropagation(); unpin(); }}
                style={{
                  position: "absolute", top: 4, right: 6,
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--wf-text-dim, #888)", fontSize: 13, lineHeight: 1,
                  padding: "2px 4px", fontFamily: "'Geist', sans-serif",
                }}
                aria-label="Close tooltip"
              >
                ×
              </button>
            )}
            {content}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
