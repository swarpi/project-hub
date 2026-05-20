import yaml from "js-yaml";
import type { DiagramModel } from "./yaml-export";
import type { ArchComponent, ArchConnection } from "@/lib/types";

const LEGACY_TIER_MAP: Record<string, string> = {
	client: "zone-client",
	service: "zone-service",
	engine: "zone-engine",
	data: "zone-data",
};
const VALID_COLORS = new Set(["indigo", "amber", "green", "blue", "rose", "teal", "purple", "slate"]);
const VALID_STYLES = new Set(["sync", "async", "stream"]);
const TIER_COLOR: Record<string, string> = {
	"zone-client": "indigo",
	"zone-service": "amber",
	"zone-engine": "green",
	"zone-data": "blue",
};

export function yamlToDiagram(yamlString: string): {
	diagram: DiagramModel;
	errors: string[];
} {
	const errors: string[] = [];

	let raw: unknown;
	try {
		raw = yaml.load(yamlString);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return {
			diagram: { name: "Untitled", description: "", zones: [], components: [], connections: [] },
			errors: [`Invalid YAML: ${msg}`],
		};
	}

	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		return {
			diagram: { name: "Untitled", description: "", zones: [], components: [], connections: [] },
			errors: ["YAML root must be an object with name, components, and connections"],
		};
	}

	const doc = raw as Record<string, unknown>;

	const name = typeof doc.name === "string" ? doc.name : "Untitled";
	if (typeof doc.name !== "string") {
		errors.push("Missing or invalid 'name' field, defaulting to 'Untitled'");
	}

	const description = typeof doc.description === "string" ? doc.description : "";

	const components: ArchComponent[] = [];
	const rawComps = Array.isArray(doc.components) ? doc.components : [];
	if (!Array.isArray(doc.components)) {
		errors.push("Missing or invalid 'components' array");
	}

	for (let i = 0; i < rawComps.length; i++) {
		const c = rawComps[i] as Record<string, unknown>;
		if (typeof c !== "object" || c === null) {
			errors.push(`Component at index ${i} is not an object`);
			continue;
		}

		if (typeof c.id !== "string" || c.id.trim() === "") {
			errors.push(`Component at index ${i} is missing required field 'id'`);
			continue;
		}

		if (typeof c.title !== "string") {
			errors.push(`Component '${c.id}' is missing required field 'title'`);
			continue;
		}

		let tier = String(c.tier ?? "");
		if (LEGACY_TIER_MAP[tier]) {
			tier = LEGACY_TIER_MAP[tier];
		}
		if (!tier.startsWith("zone-") && !tier.startsWith("zone_")) {
			errors.push(`Component '${c.id}' has invalid tier '${tier}', skipping`);
			continue;
		}

		let color = String(c.color ?? "");
		if (!VALID_COLORS.has(color)) {
			color = TIER_COLOR[tier] ?? "indigo";
		}

		const comp: ArchComponent = {
			id: c.id,
			title: c.title,
			description: typeof c.description === "string" ? c.description : "",
			technology: typeof c.technology === "string" ? c.technology : "",
			tier,
			color: color as ArchComponent["color"],
		};

		if (Array.isArray(c.subcomponents) && c.subcomponents.length > 0) {
			comp.subcomponents = (c.subcomponents as Record<string, unknown>[])
				.filter(
					(s) =>
						typeof s === "object" &&
						s !== null &&
						typeof s.name === "string",
				)
				.map((s) => ({
					name: String(s.name),
					detail: typeof s.detail === "string" ? String(s.detail) : "",
				}));
		}

		components.push(comp);
	}

	const validIds = new Set(components.map((c) => c.id));
	const connections: ArchConnection[] = [];
	const rawConns = Array.isArray(doc.connections) ? doc.connections : [];

	for (let i = 0; i < rawConns.length; i++) {
		const c = rawConns[i] as Record<string, unknown>;
		if (typeof c !== "object" || c === null) {
			errors.push(`Connection at index ${i} is not an object`);
			continue;
		}

		const from = String(c.from ?? "");
		const to = String(c.to ?? "");

		if (!validIds.has(from)) {
			errors.push(`Connection at index ${i}: 'from' references unknown component '${from}'`);
			continue;
		}
		if (!validIds.has(to)) {
			errors.push(`Connection at index ${i}: 'to' references unknown component '${to}'`);
			continue;
		}

		const style = typeof c.style === "string" && VALID_STYLES.has(c.style)
			? (c.style as ArchConnection["style"])
			: undefined;

		connections.push({
			from,
			to,
			label: typeof c.label === "string" ? c.label : "",
			protocol: typeof c.protocol === "string" ? c.protocol : "",
			style,
		});
	}

	return { diagram: { name, description, zones: [], components, connections }, errors };
}
