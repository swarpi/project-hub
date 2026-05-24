import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { Canvas } from "./components/Canvas";
import { Palette } from "./components/Palette";
import { RightSidebar } from "./components/RightSidebar";
import { Toolbar } from "./components/Toolbar";
import { useBuilderStore, createInitialDiagram } from "./store/builder-store";

function RestoreBanner({ onDismiss }: { onDismiss: () => void }) {
	const loadDiagram = useBuilderStore((s) => s.loadDiagram);

	const onStartFresh = () => {
		const initial = createInitialDiagram();
		loadDiagram({ ...initial });
		localStorage.removeItem("diagram-builder-diagram");
		onDismiss();
	};

	return (
		<div style={BANNER}>
			<span style={BANNER_TEXT}>
				You have a saved diagram from your last session.
			</span>
			<button type="button" onClick={onDismiss} style={BANNER_BTN_PRIMARY}>
				Continue
			</button>
			<button type="button" onClick={onStartFresh} style={BANNER_BTN}>
				Start fresh
			</button>
		</div>
	);
}

function BuilderInner() {
	const [showRestore, setShowRestore] = useState(false);
	const reactFlow = useReactFlow();
	const clearSelection = useBuilderStore((s) => s.clearSelection);
	const selectNode = useBuilderStore((s) => s.selectNode);
	const components = useBuilderStore((s) => s.components);

	useEffect(() => {
		const prev = document.title;
		document.title = "Diagram Builder — Project Hub";
		return () => {
			document.title = prev;
		};
	}, []);

	useEffect(() => {
		try {
			const raw = localStorage.getItem("diagram-builder-diagram");
			if (!raw) return;
			const data = JSON.parse(raw);
			const state = data?.state;
			if (state?.components && state.components.length > 0) {
				setShowRestore(true);
			}
		} catch {
			// corrupt data, ignore
		}
	}, []);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

			const mod = e.metaKey || e.ctrlKey;

			if (e.key === "Escape") {
				e.preventDefault();
				clearSelection();
			} else if (mod && e.key.toLowerCase() === "a") {
				e.preventDefault();
				for (const comp of components) {
					selectNode(comp.id);
				}
				reactFlow.setNodes((nodes) =>
					nodes.map((n) => ({ ...n, selected: true })),
				);
			} else if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
				e.preventDefault();
				reactFlow.fitView({ padding: 0.2 });
			}
		},
		[clearSelection, selectNode, components, reactFlow],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	return (
		<div style={{ height: "calc(100vh - 57px)", display: "flex", flexDirection: "column" }}>
			{showRestore && <RestoreBanner onDismiss={() => setShowRestore(false)} />}
			<div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
				<Palette />
				<div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
					<Toolbar />
					<div style={{ flex: 1 }}>
						<Canvas />
					</div>
				</div>
				<RightSidebar />
			</div>
		</div>
	);
}

export default function BuilderPage() {
	return (
		<ReactFlowProvider>
			<BuilderInner />
		</ReactFlowProvider>
	);
}

const BANNER: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 8,
	padding: "8px 16px",
	background: "var(--wf-accent-dim)",
	borderBottom: "1px solid var(--wf-border)",
	flexShrink: 0,
};

const BANNER_TEXT: CSSProperties = {
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
	fontSize: 12,
	color: "var(--wf-text)",
	flex: 1,
};

const BANNER_BTN: CSSProperties = {
	padding: "4px 12px",
	borderRadius: 6,
	fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
	fontSize: 11,
	fontWeight: 500,
	cursor: "pointer",
	background: "transparent",
	border: "1px solid var(--wf-border)",
	color: "var(--wf-text-sec)",
};

const BANNER_BTN_PRIMARY: CSSProperties = {
	...BANNER_BTN,
	background: "var(--wf-accent)",
	border: "1px solid var(--wf-accent)",
	color: "white",
	fontWeight: 600,
};
