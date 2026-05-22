import { useState, useRef, useCallback, useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: ReactNode;
  children: (props: {
    onMouseEnter: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
    ref: React.RefObject<HTMLElement | null>;
  }) => ReactNode;
  delay?: number;
  maxWidth?: number;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
}

const TOOLTIP_CONTAINER: CSSProperties = {
  position: "fixed",
  zIndex: 99999,
  pointerEvents: "none",
  transition: "opacity 0.15s ease, transform 0.15s ease",
};

export const TOOLTIP_CARD: CSSProperties = {
  background: "var(--wf-card, #1a1a2e)",
  border: "1px solid var(--wf-border, #2a2a3e)",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 8px 32px oklch(0 0 0 / 0.25), 0 2px 8px oklch(0 0 0 / 0.15)",
  fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
  fontSize: 11,
  lineHeight: 1.5,
  color: "var(--wf-text, #e0e0e8)",
  backdropFilter: "blur(12px)",
};

export function Tooltip({ content, children, delay = 400, maxWidth = 320, placement = "auto" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [actualPlacement, setActualPlacement] = useState<"top" | "bottom" | "left" | "right">("top");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const show = useCallback((e: React.MouseEvent) => {
    timerRef.current = setTimeout(() => {
      const target = anchorRef.current ?? (e.currentTarget as HTMLElement);
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

      setCoords({ x, y });
      setActualPlacement(place);
      setVisible(true);
    }, delay);
  }, [delay, maxWidth, placement]);

  const hide = useCallback((e: React.MouseEvent) => {
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
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
  }, [visible]);

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
      {children({ onMouseEnter: show, onMouseLeave: hide, ref: anchorRef })}
      {visible && createPortal(
        <div
          ref={tooltipRef}
          style={{
            ...TOOLTIP_CONTAINER,
            left: coords.x,
            top: coords.y,
            transform: entered ? getTransform() : getEnterTransform(),
            opacity: entered ? 1 : 0,
          }}
        >
          <div style={{ ...TOOLTIP_CARD, maxWidth }}>
            {content}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export const TT_HEADING: CSSProperties = {
  fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--wf-text, #e0e0e8)",
  margin: 0,
  lineHeight: 1.3,
};

export const TT_LABEL: CSSProperties = {
  fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
  fontSize: 9,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: "var(--wf-text-dim, #888)",
  marginBottom: 2,
};

export const TT_TEXT: CSSProperties = {
  fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
  fontSize: 11,
  lineHeight: 1.5,
  color: "var(--wf-text-sec, #bbb)",
  margin: 0,
};

export const TT_DIVIDER: CSSProperties = {
  height: 1,
  background: "var(--wf-border, #2a2a3e)",
  margin: "8px 0",
  border: "none",
};

export const TT_BADGE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
  fontSize: 9,
  fontWeight: 500,
  padding: "2px 6px",
  borderRadius: 4,
};
