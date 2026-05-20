export const TIER_EXPLANATIONS: Record<string, { summary: string; when: string; examples: string }> = {
  "zone-client": {
    summary: "The presentation layer — user-facing interfaces that people interact with directly.",
    when: "Use for frontends, mobile apps, CLI tools, browser extensions, or any component a user sees and touches.",
    examples: "React SPA, iOS app, Electron desktop app, CLI tool",
  },
  "zone-service": {
    summary: "The application layer — APIs and backend services that process requests and enforce business rules.",
    when: "Use for REST APIs, GraphQL servers, microservices, API gateways, or auth services.",
    examples: "Express API, Spring Boot service, API Gateway, Auth server",
  },
  "zone-engine": {
    summary: "The processing layer — background workers and computation engines that handle heavy lifting.",
    when: "Use for async job processors, ML pipelines, ETL workflows, search indexers, or notification dispatchers.",
    examples: "Celery worker, Spark job, ML inference server, cron scheduler",
  },
  "zone-data": {
    summary: "The persistence layer — databases, caches, queues, and storage that hold system state.",
    when: "Use for relational DBs, document stores, caches, message brokers, blob storage, or search indices.",
    examples: "PostgreSQL, Redis, S3, Kafka, Elasticsearch",
  },
};

export const PROTOCOL_EXPLANATIONS: Record<string, { summary: string; tradeoff: string }> = {
  REST: {
    summary: "Stateless HTTP-based API using standard methods (GET, POST, PUT, DELETE).",
    tradeoff: "Simple and widely supported, but verbose for complex queries and no built-in streaming.",
  },
  "REST API": {
    summary: "Stateless HTTP-based API using standard methods (GET, POST, PUT, DELETE).",
    tradeoff: "Simple and widely supported, but verbose for complex queries and no built-in streaming.",
  },
  HTTP: {
    summary: "Direct HTTP requests between services.",
    tradeoff: "Universal protocol support, but synchronous by default and no type safety.",
  },
  gRPC: {
    summary: "High-performance RPC framework using Protocol Buffers for serialization.",
    tradeoff: "Very fast with strong typing and streaming support, but harder to debug and requires code generation.",
  },
  GraphQL: {
    summary: "Query language that lets clients request exactly the data they need.",
    tradeoff: "Flexible and reduces over-fetching, but adds complexity and can be hard to cache.",
  },
  WebSocket: {
    summary: "Bidirectional persistent connection for real-time communication.",
    tradeoff: "Enables push updates and low latency, but harder to scale and requires connection management.",
  },
  SQL: {
    summary: "Structured Query Language for relational database access.",
    tradeoff: "Powerful for complex queries and transactions, but tight coupling to database schema.",
  },
  AMQP: {
    summary: "Advanced Message Queuing Protocol for reliable async messaging.",
    tradeoff: "Guaranteed delivery and complex routing, but adds operational complexity.",
  },
  Kafka: {
    summary: "Distributed event streaming platform for high-throughput messaging.",
    tradeoff: "Excellent for event sourcing and replay, but complex setup and eventual consistency.",
  },
  Redis: {
    summary: "In-memory data structure store used as cache, message broker, or database.",
    tradeoff: "Extremely fast reads/writes, but memory-limited and data loss risk without persistence.",
  },
  MCP: {
    summary: "Model Context Protocol — standard for AI/LLM tool integrations.",
    tradeoff: "Enables AI agents to use external tools, but still an emerging standard.",
  },
  TCP: {
    summary: "Low-level reliable transport protocol.",
    tradeoff: "Full control over the wire format, but you build everything above it yourself.",
  },
};

export const STYLE_EXPLANATIONS: Record<string, { summary: string; when: string }> = {
  sync: {
    summary: "Request-response — the caller sends a request and waits for the response before continuing.",
    when: "Use when the caller needs the result immediately, like a page load fetching data or a form submission.",
  },
  async: {
    summary: "Fire-and-forget or event-driven — the caller continues without waiting for a response.",
    when: "Use for background jobs, notifications, emails, or anything where the caller doesn't need an immediate result.",
  },
  stream: {
    summary: "Continuous data flow — the producer pushes ongoing updates to the consumer.",
    when: "Use for real-time feeds, log tailing, live dashboards, chat messages, or event streams.",
  },
};

export function getProtocolInfo(protocol: string): { summary: string; tradeoff: string } | null {
  const normalized = protocol.trim();
  const direct = PROTOCOL_EXPLANATIONS[normalized];
  if (direct) return direct;

  const upper = normalized.toUpperCase();
  for (const [key, value] of Object.entries(PROTOCOL_EXPLANATIONS)) {
    if (key.toUpperCase() === upper) return value;
  }

  return null;
}
