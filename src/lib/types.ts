export interface Agent {
  id: string;
  kind?: 'decision' | 'planning' | 'execution' | 'validation' | 'maintenance';
  title: string;
  tagline: string;
  description: string;
  outputs: string[];
  color: 'indigo' | 'amber' | 'green' | 'blue';
  docLink?: string;
}

export interface Connection {
  from: string;
  to: string;
  artifact: string;
  type?: 'main' | 'feedback';
}

export interface Orchestration {
  name: string;
  description: string;
  agents: Agent[];
  connections: Connection[];
  layout?: 'diamond' | 'horizontal' | 'vertical';
}

export interface Subcomponent {
  name: string;
  detail: string;
}

export interface Zone {
  id: string;
  name: string;
  color: 'indigo' | 'amber' | 'green' | 'blue' | 'rose' | 'teal' | 'purple' | 'slate';
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface ArchComponent {
  [key: string]: unknown;
  id: string;
  title: string;
  description: string;
  technology: string;
  /** Zone ID this component belongs to. Legacy name retained for migration compatibility. */
  tier: string;
  color: 'indigo' | 'amber' | 'green' | 'blue' | 'rose' | 'teal' | 'purple' | 'slate';
  subcomponents?: Subcomponent[];
}

export interface ArchConnection {
  from: string;
  to: string;
  label: string;
  protocol: string;
  style?: 'sync' | 'async' | 'stream';
}

export interface Architecture {
  name: string;
  description: string;
  components: ArchComponent[];
  connections: ArchConnection[];
}

export interface ProjectWithOrchestration {
  name: string;
  description: string;
  url: string;
  language: string | null;
  updatedAt: string;
  stars: number;
  orchestration: Orchestration | null;
  architecture: Architecture | null;
}

export interface HubData {
  pipeline: Orchestration;
  projects: ProjectWithOrchestration[];
  fetchedAt: string;
}
