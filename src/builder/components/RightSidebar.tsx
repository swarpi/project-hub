import type { CSSProperties } from "react";
import { useBuilderStore } from "../store/builder-store";
import type { UiSlice } from "../store/builder-store";
import { AIPanel } from "./AIPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { YamlPreview } from "./YamlPreview";
import { LearnPanel } from "./LearnPanel";

const TABS: { key: UiSlice["activePanel"]; label: string }[] = [
	{ key: "properties", label: "Properties" },
	{ key: "yaml", label: "YAML" },
	{ key: "ai", label: "AI" },
	{ key: "learn", label: "Learn" },
];

const CONTAINER: CSSProperties = {
	width: 268,
	flexShrink: 0,
	background: "var(--wf-bg)",
	borderLeft: "1px solid var(--wf-border)",
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
};

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

export function RightSidebar(): React.ReactElement {
	const activePanel = useBuilderStore((s) => s.activePanel);
	const setActivePanel = useBuilderStore((s) => s.setActivePanel);

	return (
		<div style={CONTAINER}>
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
