import yaml from "js-yaml";
import type { ArchComponent, ArchConnection, Zone } from "@/lib/types";

export interface DiagramModel {
	name: string;
	description: string;
	zones: Zone[];
	components: ArchComponent[];
	connections: ArchConnection[];
}

export function diagramToYaml(diagram: DiagramModel): string {
	const zones = diagram.zones.map((z) => ({
		id: z.id,
		name: z.name,
		color: z.color,
	}));

	const components = diagram.components.map((c) => {
		const out: Record<string, unknown> = {
			id: c.id,
			title: c.title,
			description: c.description,
			technology: c.technology,
			tier: c.tier,
			color: c.color,
		};
		if (c.subcomponents && c.subcomponents.length > 0) {
			out.subcomponents = c.subcomponents.map((s) => ({
				name: s.name,
				detail: s.detail,
			}));
		}
		return out;
	});

	const connections = diagram.connections.map((c) => {
		const out: Record<string, unknown> = {
			from: c.from,
			to: c.to,
			label: c.label,
			protocol: c.protocol,
		};
		if (c.style && c.style !== "sync") {
			out.style = c.style;
		}
		return out;
	});

	return yaml.dump(
		{ name: diagram.name, description: diagram.description, zones, components, connections },
		{ indent: 2, lineWidth: -1, noRefs: true },
	);
}

export function downloadYaml(yamlStr: string): void {
	const blob = new Blob([yamlStr], { type: "text/yaml" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "architecture.yaml";
	a.click();
	URL.revokeObjectURL(url);
}
