import { useMemo, useState, useCallback } from "react";
import { useBuilderStore } from "../store/builder-store";
import { diagramToYaml, downloadYaml } from "../lib/yaml-export";

function highlightYaml(yaml: string): React.ReactElement[] {
	return yaml.split("\n").map((line, i) => {
		if (/^\s*#/.test(line)) {
			return (
				<div key={i} style={{ color: "var(--wf-text-dim)" }}>
					{line}
				</div>
			);
		}

		const keyMatch = line.match(/^(\s*)(- )?([\w-]+)(:)(.*)/);
		if (keyMatch) {
			const [, indent, listMarker, key, colon, rest] = keyMatch;
			return (
				<div key={i}>
					{indent}
					{listMarker && (
						<span style={{ color: "var(--wf-text-dim)" }}>- </span>
					)}
					<span style={{ color: "var(--wf-accent)" }}>{key}</span>
					<span style={{ color: "var(--wf-text-dim)" }}>{colon}</span>
					{rest && <span>{rest}</span>}
				</div>
			);
		}

		const listMatch = line.match(/^(\s*)(- )(.*)/);
		if (listMatch) {
			const [, indent, marker, rest] = listMatch;
			return (
				<div key={i}>
					{indent}
					<span style={{ color: "var(--wf-text-dim)" }}>{marker}</span>
					{rest}
				</div>
			);
		}

		return <div key={i}>{line}</div>;
	});
}

export function YamlPreview(): React.ReactElement {
	const name = useBuilderStore((s) => s.name);
	const description = useBuilderStore((s) => s.description);
	const zones = useBuilderStore((s) => s.zones);
	const components = useBuilderStore((s) => s.components);
	const connections = useBuilderStore((s) => s.connections);
	const [copied, setCopied] = useState(false);

	const yamlStr = useMemo(
		() => diagramToYaml({ name, description, zones, components, connections }),
		[name, description, zones, components, connections],
	);

	const highlighted = useMemo(() => highlightYaml(yamlStr), [yamlStr]);

	const onCopy = useCallback(() => {
		navigator.clipboard.writeText(yamlStr).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	}, [yamlStr]);

	const onDownload = useCallback(() => {
		downloadYaml(yamlStr);
	}, [yamlStr]);

	return (
		<div
			style={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				gap: 10,
				padding: 12,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<span
					style={{
						fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
						fontSize: 11,
						fontWeight: 600,
						color: "var(--wf-text-sec)",
						textTransform: "uppercase",
						letterSpacing: "0.05em",
					}}
				>
					YAML Preview
				</span>
				<div style={{ display: "flex", gap: 4 }}>
					<button
						onClick={onCopy}
						title="Copy YAML"
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: 4,
							borderRadius: 4,
							color: copied
								? "var(--wf-accent)"
								: "var(--wf-text-dim)",
							display: "flex",
							alignItems: "center",
						}}
					>
						{copied ? (
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<polyline points="20 6 9 17 4 12" />
							</svg>
						) : (
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<rect
									x="9"
									y="9"
									width="13"
									height="13"
									rx="2"
								/>
								<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
							</svg>
						)}
					</button>
					<button
						onClick={onDownload}
						title="Download YAML"
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: 4,
							borderRadius: 4,
							color: "var(--wf-text-dim)",
							display: "flex",
							alignItems: "center",
						}}
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="7 10 12 15 17 10" />
							<line x1="12" y1="15" x2="12" y2="3" />
						</svg>
					</button>
				</div>
			</div>

			<pre
				style={{
					flex: 1,
					margin: 0,
					padding: 12,
					background: "var(--wf-card)",
					border: "1px solid var(--wf-border)",
					borderRadius: 8,
					overflow: "auto",
					fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, monospace",
					fontSize: 11,
					lineHeight: 1.6,
					color: "var(--wf-text)",
					whiteSpace: "pre",
					tabSize: 2,
				}}
			>
				<code>{highlighted}</code>
			</pre>
		</div>
	);
}
