export interface ParsedAnalysis {
	overview: string;
	components: Record<string, string>;
	connections: Record<string, string>;
	pitfalls: string;
}

export function buildLearnSystemPrompt(yaml: string): string {
	return `You are an expert software architecture educator. The user has created (or generated) an architecture diagram and wants to understand the design decisions behind it.

Analyze the following architecture diagram and produce a structured educational breakdown. Write at a beginner-to-intermediate level — assume the reader knows basic programming but is learning system design.

Use these exact section markers in your response:

## OVERVIEW
Identify the architecture pattern (e.g. "3-tier web application", "event-driven microservices", "monolith with external services"). Explain in 2-3 sentences what this system does and why it is structured this way.

## COMPONENT: <component-id>
For each component in the diagram, write a short section using the component's exact id. Cover:
- What this component does in the system
- Why it belongs in its current tier/zone
- One alternative technology or approach and when you'd pick it instead

## CONNECTION: <from-id> -> <to-id>
For each connection, write a short section using the exact component ids. Cover:
- Why these two components need to communicate
- Why this protocol was chosen (and one scenario where a different protocol would be better)

## PITFALLS
List 3-5 common mistakes, scaling concerns, or single points of failure in this architecture. Be specific to the components and connections in the diagram, not generic advice.

Rules:
- Use the exact component and connection IDs from the YAML below
- Keep each section to 2-4 short sentences or a small bullet list
- Write for a narrow sidebar panel (268px) — no long paragraphs, prefer bullets
- Do not use sub-headings within sections (no ### or ####)
- Target 3000-4000 tokens total

The diagram:

\`\`\`yaml
${yaml}\`\`\``;
}

export function parseLearnAnalysis(raw: string): ParsedAnalysis {
	const result: ParsedAnalysis = {
		overview: "",
		components: {},
		connections: {},
		pitfalls: "",
	};

	const parts = raw.split(/^##\s+/m);

	if (parts.length <= 1) {
		result.overview = raw.trim();
		return result;
	}

	const preamble = parts[0].trim();
	if (preamble) {
		result.overview = preamble;
	}

	for (let i = 1; i < parts.length; i++) {
		const chunk = parts[i];
		const newlineIdx = chunk.indexOf("\n");
		const header = (newlineIdx === -1 ? chunk : chunk.slice(0, newlineIdx)).trim();
		const body = (newlineIdx === -1 ? "" : chunk.slice(newlineIdx + 1)).trim();

		const headerLower = header.toLowerCase();

		if (headerLower.startsWith("overview")) {
			result.overview = result.overview
				? result.overview + "\n\n" + body
				: body;
		} else if (headerLower.startsWith("component:")) {
			const id = header.slice("component:".length).trim();
			if (id) {
				result.components[id] = body;
			}
		} else if (headerLower.startsWith("connection:")) {
			const rest = header.slice("connection:".length).trim();
			const match = rest.match(/^(.+?)\s*->\s*(.+)$/);
			if (match) {
				const key = `${match[1].trim()}->${match[2].trim()}`;
				result.connections[key] = body;
			}
		} else if (headerLower.startsWith("pitfall")) {
			result.pitfalls = result.pitfalls
				? result.pitfalls + "\n\n" + body
				: body;
		}
	}

	return result;
}
