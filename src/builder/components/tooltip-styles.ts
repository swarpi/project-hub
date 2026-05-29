import type { CSSProperties } from "react";

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
