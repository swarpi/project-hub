import { useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import { useBuilderStore } from "../store/builder-store";
import type { UiSlice } from "../store/builder-store";
import { AIPanel } from "./AIPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { YamlPreview } from "./YamlPreview";
import { LearnPanel } from "./LearnPanel";

const DEFAULT_WIDTH = 268;

const TABS: { key: UiSlice["activePanel"]; label: string }[] = [
	{ key: "properties", label: "Properties" },
	{ key: "yaml", label: "YAML" },
	{ key: "ai", label: "AI" },
	{ key: "learn", label: "Learn" },
];

const TAB_ROW: CSSProperties = {
	display: "flex",
	borderBottom: "1px solid var(--wf-border)",
	flexShrink: 0,
};

function tabStyle(active: boolean): CSSProperties {
	return {
		flex: 1,
		padding: "8px 0",
		background: "none",
		border: "none",
		borderBottom: active ? "2px solid var(--wf-accent)" : "2px solid transparent",
		cursor: "pointer",
		fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
		fontSize: 11,
		fontWeight: 600,
		textTransform: "uppercase",
		letterSpacing: "0.05em",
		color: active ? "var(--wf-accent)" : "var(--wf-text-dim)",
		transition: "color 0.15s ease, border-color 0.15s ease",
	};
}

const HANDLE: CSSProperties = {
	position: "absolute",
	top: 0,
	left: -3,
	width: 6,
	height: "100%",
	cursor: "col-resize",
	zIndex: 10,
};

const HANDLE_LINE: CSSProperties = {
	position: "absolute",
	top: 0,
	left: 2,
	width: 2,
	height: "100%",
	borderRadius: 1,
	transition: "background 0.15s ease",
};

export function RightSidebar(): React.ReactElement {
	const activePanel = useBuilderStore((s) => s.activePanel);
	const setActivePanel = useBuilderStore((s) => s.setActivePanel);
	const sidebarWidth = useBuilderStore((s) => s.sidebarWidth);
	const setSidebarWidth = useBuilderStore((s) => s.setSidebarWidth);

	const containerRef = useRef<HTMLDivElement>(null);
	const dragging = useRef(false);

	const onMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			dragging.current = true;

			const startX = e.clientX;
			const startWidth = sidebarWidth;

			document.body.style.userSelect = "none";
			document.body.style.cursor = "col-resize";

			const onMouseMove = (ev: MouseEvent) => {
				const delta = startX - ev.clientX;
				setSidebarWidth(startWidth + delta);
			};

			const onMouseUp = () => {
				dragging.current = false;
				document.body.style.userSelect = "";
				document.body.style.cursor = "";
				window.removeEventListener("mousemove", onMouseMove);
				window.removeEventListener("mouseup", onMouseUp);
			};

			window.addEventListener("mousemove", onMouseMove);
			window.addEventListener("mouseup", onMouseUp);
		},
		[sidebarWidth, setSidebarWidth],
	);

	const onDoubleClick = useCallback(() => {
		setSidebarWidth(DEFAULT_WIDTH);
	}, [setSidebarWidth]);

	const containerStyle: CSSProperties = {
		width: sidebarWidth,
		flexShrink: 0,
		background: "var(--wf-bg)",
		borderLeft: "1px solid var(--wf-border)",
		display: "flex",
		flexDirection: "column",
		overflow: "hidden",
		position: "relative",
	};

	return (
		<div ref={containerRef} style={containerStyle}>
			<div
				data-testid="resize-handle"
				style={HANDLE}
				onMouseDown={onMouseDown}
				onDoubleClick={onDoubleClick}
				onMouseEnter={(e) => {
					const line = e.currentTarget.firstElementChild as HTMLElement;
					if (line) line.style.background = "var(--wf-accent)";
				}}
				onMouseLeave={(e) => {
					const line = e.currentTarget.firstElementChild as HTMLElement;
					if (line) line.style.background = "transparent";
				}}
			>
				<div style={HANDLE_LINE} />
			</div>

			<div style={TAB_ROW}>
				{TABS.map(({ key, label }) => (
					<button
						key={key}
						style={tabStyle(activePanel === key)}
						onClick={() => setActivePanel(key)}
						onMouseEnter={(e) => {
							if (activePanel !== key)
								e.currentTarget.style.color = "var(--wf-text-sec)";
						}}
						onMouseLeave={(e) => {
							if (activePanel !== key)
								e.currentTarget.style.color = "var(--wf-text-dim)";
						}}
					>
						{label}
					</button>
				))}
			</div>

			<div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
				{activePanel === "properties" && <PropertiesPanel />}
				{activePanel === "yaml" && <YamlPreview />}
				<div style={{
					position: activePanel === "ai" ? "relative" : "absolute",
					inset: 0,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					visibility: activePanel === "ai" ? "visible" : "hidden",
					pointerEvents: activePanel === "ai" ? "auto" : "none",
				}}>
					<AIPanel />
				</div>
				<div style={{
					position: activePanel === "learn" ? "relative" : "absolute",
					inset: 0,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					visibility: activePanel === "learn" ? "visible" : "hidden",
					pointerEvents: activePanel === "learn" ? "auto" : "none",
				}}>
					<LearnPanel />
				</div>
			</div>
		</div>
	);
}
