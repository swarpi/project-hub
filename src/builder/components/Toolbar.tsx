import { useState, useCallback, useRef, useEffect } from "react";
import { useStore } from "zustand";
import { useReactFlow } from "@xyflow/react";
import { useBuilderStore } from "../store/builder-store";
import { diagramToYaml, downloadYaml } from "../lib/yaml-export";
import { yamlToDiagram } from "../lib/yaml-import";
import { computeTierLayout } from "../lib/layout";

const BTN: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 5,
	padding: "4px 10px",
	borderRadius: 6,
	fontFamily: "'JetBrains Mono', monospace",
	fontSize: 10,
	cursor: "pointer",
	border: "1px solid var(--wf-border)",
	background: "var(--wf-card)",
	color: "var(--wf-text-dim)",
	transition: "all 0.15s ease",
};

const ICON_BTN: React.CSSProperties = {
	...BTN,
	padding: "4px 7px",
};

const DIVIDER: React.CSSProperties = {
	width: 1,
	height: 20,
	background: "var(--wf-border)",
	margin: "0 4px",
	flexShrink: 0,
};

const LABEL: React.CSSProperties = {
	fontFamily: "'Space Grotesk', sans-serif",
	fontSize: 11,
	fontWeight: 600,
	color: "var(--wf-text-sec)",
	textTransform: "uppercase",
	letterSpacing: "0.05em",
};

function disabled(base: React.CSSProperties): React.CSSProperties {
	return { ...base, opacity: 0.35, cursor: "default", pointerEvents: "none" };
}

// --- Import Modal ---

function ImportModal({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const loadDiagram = useBuilderStore((s) => s.loadDiagram);
	const reactFlow = useReactFlow();
	const [tab, setTab] = useState<"upload" | "paste">("upload");
	const [pasteValue, setPasteValue] = useState("");
	const [errors, setErrors] = useState<string[]>([]);

	useEffect(() => {
		const el = dialogRef.current;
		if (!el) return;
		if (open && !el.open) {
			el.showModal();
		} else if (!open && el.open) {
			el.close();
		}
	}, [open]);

	const doImport = useCallback(
		(yamlStr: string) => {
			const result = yamlToDiagram(yamlStr);
			if (
				result.errors.length > 0 &&
				result.diagram.components.length === 0
			) {
				setErrors(result.errors);
				return;
			}
			setErrors(result.errors);
			if (result.diagram.components.length > 0) {
				const positions = computeTierLayout(result.diagram.components);
				loadDiagram({ ...result.diagram, positions });
				onClose();
				setErrors([]);
				setPasteValue("");
				setTimeout(() => reactFlow.fitView({ padding: 0.2 }), 50);
			}
		},
		[loadDiagram, onClose, reactFlow],
	);

	const onFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = () => {
				doImport(reader.result as string);
			};
			reader.readAsText(file);
			e.target.value = "";
		},
		[doImport],
	);

	const tabBtn = (active: boolean): React.CSSProperties => ({
		...BTN,
		background: active ? "var(--wf-card)" : "transparent",
		color: active ? "var(--wf-text)" : "var(--wf-text-dim)",
		fontWeight: active ? 600 : 400,
		border: active
			? "1px solid var(--wf-text-sec)"
			: "1px solid var(--wf-border)",
	});

	return (
		<dialog
			ref={dialogRef}
			onClose={onClose}
			style={{
				background: "var(--wf-bg)",
				border: "1px solid var(--wf-border)",
				borderRadius: 12,
				padding: 20,
				width: 440,
				maxHeight: "80vh",
				overflow: "auto",
				color: "var(--wf-text)",
				fontFamily: "'Space Grotesk', sans-serif",
				boxShadow: "0 8px 32px oklch(0 0 0 / 0.2)",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 16,
				}}
			>
				<span style={LABEL}>Import YAML</span>
				<button
					type="button"
					onClick={onClose}
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						color: "var(--wf-text-dim)",
						fontSize: 18,
						lineHeight: 1,
					}}
				>
					&times;
				</button>
			</div>

			<div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
				<button
					type="button"
					onClick={() => setTab("upload")}
					style={tabBtn(tab === "upload")}
				>
					Upload File
				</button>
				<button
					type="button"
					onClick={() => setTab("paste")}
					style={tabBtn(tab === "paste")}
				>
					Paste YAML
				</button>
			</div>

			{tab === "upload" ? (
				<div>
					<input
						type="file"
						accept=".yaml,.yml"
						onChange={onFileChange}
						style={{
							fontFamily: "'Space Grotesk', sans-serif",
							fontSize: 12,
							color: "var(--wf-text)",
						}}
					/>
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<textarea
						rows={10}
						value={pasteValue}
						onChange={(e) => setPasteValue(e.target.value)}
						placeholder="Paste your architecture.yaml contents here..."
						style={{
							width: "100%",
							boxSizing: "border-box",
							background: "var(--wf-card)",
							border: "1px solid var(--wf-border)",
							borderRadius: 6,
							padding: "8px 10px",
							fontFamily: "'JetBrains Mono', monospace",
							fontSize: 11,
							color: "var(--wf-text)",
							resize: "vertical",
							outline: "none",
						}}
					/>
					<button
						type="button"
						onClick={() => doImport(pasteValue)}
						disabled={!pasteValue.trim()}
						style={{
							...BTN,
							alignSelf: "flex-end",
							opacity: pasteValue.trim() ? 1 : 0.4,
							color: "var(--wf-text)",
							fontWeight: 600,
						}}
					>
						Import
					</button>
				</div>
			)}

			{errors.length > 0 && (
				<div
					style={{
						marginTop: 12,
						padding: "8px 10px",
						background: "oklch(0.55 0.15 30 / 0.1)",
						border: "1px solid oklch(0.55 0.15 30 / 0.3)",
						borderRadius: 6,
						fontSize: 11,
						color: "var(--wf-text)",
					}}
				>
					<div style={{ fontWeight: 600, marginBottom: 4 }}>
						{errors.length} validation{" "}
						{errors.length === 1 ? "error" : "errors"}:
					</div>
					<ul
						style={{
							margin: 0,
							paddingLeft: 16,
							display: "flex",
							flexDirection: "column",
							gap: 2,
						}}
					>
						{errors.map((err, i) => (
							<li key={i}>{err}</li>
						))}
					</ul>
				</div>
			)}
		</dialog>
	);
}

// --- Settings Modal ---

function SettingsModal({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const apiKey = useBuilderStore((s) => s.apiKey);
	const aiBaseUrl = useBuilderStore((s) => s.aiBaseUrl);
	const snapToGrid = useBuilderStore((s) => s.snapToGrid);
	const gridSize = useBuilderStore((s) => s.gridSize);
	const setApiKey = useBuilderStore((s) => s.setApiKey);
	const setAiBaseUrl = useBuilderStore((s) => s.setAiBaseUrl);
	const setSnapToGrid = useBuilderStore((s) => s.setSnapToGrid);
	const [showKey, setShowKey] = useState(false);

	useEffect(() => {
		const el = dialogRef.current;
		if (!el) return;
		if (open && !el.open) {
			el.showModal();
		} else if (!open && el.open) {
			el.close();
		}
	}, [open]);

	const inputStyle: React.CSSProperties = {
		width: "100%",
		boxSizing: "border-box",
		background: "var(--wf-card)",
		border: "1px solid var(--wf-border)",
		borderRadius: 6,
		padding: "6px 10px",
		fontFamily: "'JetBrains Mono', monospace",
		fontSize: 11,
		color: "var(--wf-text)",
		outline: "none",
	};

	const fieldLabel: React.CSSProperties = {
		fontFamily: "'Space Grotesk', sans-serif",
		fontSize: 11,
		fontWeight: 500,
		color: "var(--wf-text-sec)",
		marginBottom: 4,
		display: "block",
	};

	return (
		<dialog
			ref={dialogRef}
			onClose={onClose}
			style={{
				background: "var(--wf-bg)",
				border: "1px solid var(--wf-border)",
				borderRadius: 12,
				padding: 20,
				width: 360,
				maxHeight: "80vh",
				overflow: "auto",
				color: "var(--wf-text)",
				fontFamily: "'Space Grotesk', sans-serif",
				boxShadow: "0 8px 32px oklch(0 0 0 / 0.2)",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 16,
				}}
			>
				<span style={LABEL}>Settings</span>
				<button
					type="button"
					onClick={onClose}
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						color: "var(--wf-text-dim)",
						fontSize: 18,
						lineHeight: 1,
					}}
				>
					&times;
				</button>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
				<div>
					<label style={fieldLabel}>API Key</label>
					<div style={{ display: "flex", gap: 4 }}>
						<input
							type={showKey ? "text" : "password"}
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							placeholder="sk-ant-..."
							style={{ ...inputStyle, flex: 1 }}
						/>
						<button
							type="button"
							onClick={() => setShowKey(!showKey)}
							style={ICON_BTN}
							title={showKey ? "Hide API key" : "Show API key"}
						>
							{showKey ? (
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
									<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
									<line x1="1" y1="1" x2="23" y2="23" />
								</svg>
							) : (
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
									<circle cx="12" cy="12" r="3" />
								</svg>
							)}
						</button>
					</div>
				</div>

				<div>
					<label style={fieldLabel}>AI Base URL</label>
					<input
						type="text"
						value={aiBaseUrl}
						onChange={(e) => setAiBaseUrl(e.target.value)}
						placeholder="http://localhost:3456"
						style={inputStyle}
					/>
					<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--wf-text-dim)", marginTop: 2, display: "block" }}>
						Local proxy: http://localhost:3456
					</span>
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<label style={{ ...fieldLabel, marginBottom: 0 }}>
						Snap to Grid
					</label>
					<button
						type="button"
						onClick={() => setSnapToGrid(!snapToGrid)}
						style={{
							width: 36,
							height: 20,
							borderRadius: 10,
							border: "1px solid var(--wf-border)",
							background: snapToGrid
								? "var(--wf-accent)"
								: "var(--wf-card)",
							cursor: "pointer",
							position: "relative",
							transition: "background 0.15s ease",
							padding: 0,
						}}
						title="Toggle snap to grid"
					>
						<div
							style={{
								width: 14,
								height: 14,
								borderRadius: "50%",
								background: "var(--wf-text)",
								position: "absolute",
								top: 2,
								left: snapToGrid ? 19 : 2,
								transition: "left 0.15s ease",
							}}
						/>
					</button>
				</div>

				<div>
					<label style={fieldLabel}>Grid Size (px)</label>
					<input
						type="number"
						min={5}
						max={100}
						step={5}
						value={gridSize}
						onChange={(e) => {
							const v = parseInt(e.target.value, 10);
							if (v >= 5 && v <= 100) {
								useBuilderStore.setState({ gridSize: v });
							}
						}}
						style={{ ...inputStyle, width: 80 }}
					/>
				</div>
			</div>
		</dialog>
	);
}

// --- Toolbar ---

export function Toolbar() {
	const name = useBuilderStore((s) => s.name);
	const description = useBuilderStore((s) => s.description);
	const components = useBuilderStore((s) => s.components);
	const connections = useBuilderStore((s) => s.connections);
	const positions = useBuilderStore((s) => s.positions);
	const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
	const selectedEdgeId = useBuilderStore((s) => s.selectedEdgeId);
	const removeComponent = useBuilderStore((s) => s.removeComponent);
	const removeConnection = useBuilderStore((s) => s.removeConnection);
	const clearSelection = useBuilderStore((s) => s.clearSelection);
	const updatePositions = useBuilderStore((s) => s.updatePositions);

	const canUndo = useStore(
		useBuilderStore.temporal,
		(s) => s.pastStates.length > 0,
	);
	const canRedo = useStore(
		useBuilderStore.temporal,
		(s) => s.futureStates.length > 0,
	);
	const undo = useStore(useBuilderStore.temporal, (s) => s.undo);
	const redo = useStore(useBuilderStore.temporal, (s) => s.redo);

	const reactFlow = useReactFlow();
	const [copied, setCopied] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const [dirty, setDirty] = useState(false);

	useEffect(() => {
		setDirty(true);
	}, [name, description, components, connections, positions]);

	const hasSelection = selectedNodeId !== null || selectedEdgeId !== null;

	const getYaml = useCallback(
		() => diagramToYaml({ name, description, components, connections }),
		[name, description, components, connections],
	);

	const onDownload = useCallback(() => {
		downloadYaml(getYaml());
		setDirty(false);
	}, [getYaml]);

	const onCopy = useCallback(() => {
		navigator.clipboard.writeText(getYaml()).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	}, [getYaml]);

	const onDelete = useCallback(() => {
		if (selectedNodeId) {
			removeComponent(selectedNodeId);
			clearSelection();
		} else if (selectedEdgeId) {
			const [from, to] = selectedEdgeId.split("->");
			removeConnection(from, to);
			clearSelection();
		}
	}, [
		selectedNodeId,
		selectedEdgeId,
		removeComponent,
		removeConnection,
		clearSelection,
	]);

	const onAutoLayout = useCallback(() => {
		const positions = computeTierLayout(components);
		updatePositions(positions);
		setTimeout(() => reactFlow.fitView({ padding: 0.2 }), 50);
	}, [components, updatePositions, reactFlow]);

	// Keyboard shortcuts (Delete/Backspace handled by React Flow via onNodesChange/onEdgesChange)
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

			const mod = e.metaKey || e.ctrlKey;

			if (mod && e.shiftKey && e.key.toLowerCase() === "z") {
				e.preventDefault();
				redo();
			} else if (mod && e.key.toLowerCase() === "z") {
				e.preventDefault();
				undo();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [undo, redo]);

	return (
		<>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 4,
					padding: "6px 12px",
					borderBottom: "1px solid var(--wf-border)",
					background: "var(--wf-bg)",
					height: 48,
					boxSizing: "border-box",
				}}
			>
				{/* Undo / Redo */}
				<button
					type="button"
					onClick={() => undo()}
					style={canUndo ? ICON_BTN : disabled(ICON_BTN)}
					title="Undo (Ctrl+Z)"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="1 4 1 10 7 10" />
						<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
					</svg>
				</button>
				<button
					type="button"
					onClick={() => redo()}
					style={canRedo ? ICON_BTN : disabled(ICON_BTN)}
					title="Redo (Ctrl+Shift+Z)"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="23 4 23 10 17 10" />
						<path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
					</svg>
				</button>

				<div style={DIVIDER} />

				{/* Delete */}
				<button
					type="button"
					onClick={onDelete}
					style={hasSelection ? ICON_BTN : disabled(ICON_BTN)}
					title="Delete selected (Del)"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
				</button>

				<div style={DIVIDER} />

				{/* Zoom In / Out / Reset / Fit */}
				<button
					type="button"
					onClick={() => reactFlow.zoomIn()}
					style={ICON_BTN}
					title="Zoom in"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
						<line x1="11" y1="8" x2="11" y2="14" />
						<line x1="8" y1="11" x2="14" y2="11" />
					</svg>
				</button>
				<button
					type="button"
					onClick={() => reactFlow.zoomOut()}
					style={ICON_BTN}
					title="Zoom out"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
						<line x1="8" y1="11" x2="14" y2="11" />
					</svg>
				</button>
				<button
					type="button"
					onClick={() =>
						reactFlow.setViewport({ x: 0, y: 0, zoom: 1 })
					}
					style={ICON_BTN}
					title="Reset zoom"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M21 3H3v18h18V3z" />
						<text x="12" y="15" textAnchor="middle" fill="currentColor" stroke="none" fontSize="9" fontFamily="monospace">1:1</text>
					</svg>
				</button>
				<button
					type="button"
					onClick={() => reactFlow.fitView({ padding: 0.2 })}
					style={ICON_BTN}
					title="Fit view"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M8 3H5a2 2 0 0 0-2 2v3" />
						<path d="M21 8V5a2 2 0 0 0-2-2h-3" />
						<path d="M3 16v3a2 2 0 0 0 2 2h3" />
						<path d="M16 21h3a2 2 0 0 0 2-2v-3" />
					</svg>
				</button>

				<div style={DIVIDER} />

				{/* Auto-layout */}
				<button
					type="button"
					onClick={onAutoLayout}
					style={BTN}
					title="Auto-layout by tier"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<rect x="3" y="3" width="7" height="7" />
						<rect x="14" y="3" width="7" height="7" />
						<rect x="3" y="14" width="7" height="7" />
						<rect x="14" y="14" width="7" height="7" />
					</svg>
					Auto-layout
				</button>

				<div style={DIVIDER} />

				{/* YAML: Import / Download / Copy */}
				<button
					type="button"
					onClick={() => setImportOpen(true)}
					style={BTN}
					title="Import YAML file"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="17 8 12 3 7 8" />
						<line x1="12" y1="3" x2="12" y2="15" />
					</svg>
					Import
				</button>
				<button
					type="button"
					onClick={onDownload}
					style={BTN}
					title="Download as YAML"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
					Download
				</button>
				<button
					type="button"
					onClick={onCopy}
					style={{
						...BTN,
						color: copied ? "var(--wf-accent)" : BTN.color,
					}}
					title="Copy YAML to clipboard"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						{copied ? (
							<polyline points="20 6 9 17 4 12" />
						) : (
							<>
								<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
								<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
							</>
						)}
					</svg>
					{copied ? "Copied!" : "Copy"}
				</button>

				<div style={{ flex: 1 }} />

				{/* Diagram name + unsaved indicator */}
				<span
					style={{
						fontFamily: "'Space Grotesk', sans-serif",
						fontSize: 11,
						color: "var(--wf-text-sec)",
						marginRight: 8,
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
						maxWidth: 180,
					}}
					title={dirty ? "Unsaved changes (not exported to file)" : name}
				>
					{dirty && (
						<span style={{ color: "var(--wf-accent)", marginRight: 4 }}>●</span>
					)}
					{name}
				</span>

				{/* Shortcuts help */}
				<button
					type="button"
					onClick={() => setShortcutsOpen(!shortcutsOpen)}
					style={{
						...ICON_BTN,
						fontFamily: "'JetBrains Mono', monospace",
						fontSize: 11,
						fontWeight: 700,
						padding: "4px 8px",
					}}
					title="Keyboard shortcuts"
				>
					?
				</button>

				{/* Settings */}
				<button
					type="button"
					onClick={() => setSettingsOpen(true)}
					style={ICON_BTN}
					title="Settings"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<circle cx="12" cy="12" r="3" />
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
					</svg>
				</button>
			</div>

			<ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
			<SettingsModal
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>
			{shortcutsOpen && (
				<div
					style={{
						position: "fixed",
						top: 110,
						right: 290,
						background: "var(--wf-bg)",
						border: "1px solid var(--wf-border)",
						borderRadius: 10,
						padding: "14px 18px",
						zIndex: 100,
						boxShadow: "0 8px 24px oklch(0 0 0 / 0.2)",
						fontFamily: "'Space Grotesk', sans-serif",
						fontSize: 11,
						color: "var(--wf-text)",
						display: "flex",
						flexDirection: "column",
						gap: 6,
					}}
				>
					<div style={{ fontWeight: 600, marginBottom: 4, color: "var(--wf-text-sec)", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em" }}>
						Keyboard Shortcuts
					</div>
					{[
						["Ctrl/⌘ + Z", "Undo"],
						["Ctrl/⌘ + Shift + Z", "Redo"],
						["Delete / Backspace", "Delete selected"],
						["Ctrl/⌘ + A", "Select all"],
						["Escape", "Deselect all"],
						["Ctrl/⌘ + Shift + F", "Fit view"],
						["Double-click canvas", "Add component"],
					].map(([key, desc]) => (
						<div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
							<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--wf-text-dim)" }}>{key}</span>
							<span>{desc}</span>
						</div>
					))}
				</div>
			)}
		</>
	);
}
