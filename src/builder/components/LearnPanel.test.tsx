import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { useBuilderStore } from "../store/builder-store";
import { LearnPanel } from "./LearnPanel";
import type { ArchComponent, ArchConnection, Zone } from "@/lib/types";

function seedDiagram() {
  const zones: Zone[] = [
    { id: "zone-client", name: "Client", color: "indigo", position: { x: 0, y: 0 }, width: 400, height: 300 },
    { id: "zone-service", name: "Services", color: "amber", position: { x: 0, y: 350 }, width: 400, height: 300 },
  ];
  const components: ArchComponent[] = [
    { id: "web-app", title: "Web App", description: "Frontend", technology: "React", tier: "zone-client", color: "indigo" },
    { id: "api-server", title: "API Server", description: "Backend API", technology: "Node.js", tier: "zone-service", color: "amber" },
  ];
  const connections: ArchConnection[] = [
    { from: "web-app", to: "api-server", label: "API calls", protocol: "REST", style: "sync" },
  ];

  useBuilderStore.setState({
    apiKey: "test-key",
    zones,
    components,
    connections,
    name: "Test Architecture",
    description: "A test diagram",
  });
}

function seedDiagramNoKey() {
  seedDiagram();
  useBuilderStore.setState({ apiKey: "", aiBaseUrl: "https://api.anthropic.com" });
}

const ANALYSIS_RESPONSE = `## OVERVIEW
This is a standard client-server web architecture with a React frontend and Node.js backend.

## COMPONENT: web-app
The web app serves as the user-facing frontend. It belongs in the client tier because it runs in the browser. An alternative would be Next.js for server-side rendering.

## COMPONENT: api-server
The API server handles business logic and data access. It sits in the services tier as the backend entry point. Express or Fastify are common alternatives.

## CONNECTION: web-app -> api-server
The frontend calls the backend via REST to fetch and mutate data. GraphQL would be better if the frontend needs flexible queries.

## PITFALLS
- Single API server is a single point of failure
- No caching layer between client and server
- Missing authentication/authorization middleware`;

function mockAnalysisResponse() {
  server.use(
    http.post("*/v1/messages", () =>
      HttpResponse.json({
        content: [{ type: "text", text: ANALYSIS_RESPONSE }],
      }),
    ),
  );
}

function mockApiNetworkError() {
  server.use(
    http.post("*/v1/messages", () => HttpResponse.error()),
  );
}

describe("LearnPanel", () => {
  describe("empty diagram", () => {
    it("renders 'Add components' message when no components", () => {
      render(<LearnPanel />);
      expect(
        screen.getByText(/Add components to your diagram/),
      ).toBeInTheDocument();
    });
  });

  describe("with components, no API key", () => {
    it("renders static overview with component and connection counts", () => {
      seedDiagramNoKey();
      render(<LearnPanel />);
      expect(screen.getByText(/2 components/)).toBeInTheDocument();
      expect(screen.getByText(/1 connection/)).toBeInTheDocument();
    });

    it("renders 'Add an API key in Settings' hint", () => {
      seedDiagramNoKey();
      render(<LearnPanel />);
      expect(
        screen.getByText(/Add an API key in Settings/),
      ).toBeInTheDocument();
    });

    it("does not render Generate Analysis button", () => {
      seedDiagramNoKey();
      render(<LearnPanel />);
      expect(screen.queryByText("Generate Analysis")).not.toBeInTheDocument();
    });
  });

  describe("with components and API key", () => {
    it("renders Generate Analysis button", () => {
      seedDiagram();
      render(<LearnPanel />);
      expect(screen.getByText("Generate Analysis")).toBeInTheDocument();
    });

    it("clicking Generate Analysis triggers POST /v1/messages", async () => {
      const user = userEvent.setup();
      let requestCaptured = false;
      server.use(
        http.post("*/v1/messages", () => {
          requestCaptured = true;
          return HttpResponse.json({
            content: [{ type: "text", text: ANALYSIS_RESPONSE }],
          });
        }),
      );

      seedDiagram();
      render(<LearnPanel />);
      await user.click(screen.getByText("Generate Analysis"));

      await waitFor(() => expect(requestCaptured).toBe(true));
    });

    it("shows loading spinner with 'Analyzing...' during request", async () => {
      const user = userEvent.setup();
      let resolveRequest!: () => void;
      const pending = new Promise<void>((r) => {
        resolveRequest = r;
      });

      server.use(
        http.post("*/v1/messages", async () => {
          await pending;
          return HttpResponse.json({
            content: [{ type: "text", text: ANALYSIS_RESPONSE }],
          });
        }),
      );

      seedDiagram();
      render(<LearnPanel />);
      await user.click(screen.getByText("Generate Analysis"));

      expect(await screen.findByText("Analyzing...")).toBeInTheDocument();

      resolveRequest();
      await waitFor(() =>
        expect(screen.queryByText("Analyzing...")).not.toBeInTheDocument(),
      );
    });

    it("after MSW resolves, parsed overview appears", async () => {
      const user = userEvent.setup();
      mockAnalysisResponse();

      seedDiagram();
      render(<LearnPanel />);
      await user.click(screen.getByText("Generate Analysis"));

      expect(
        await screen.findByText(/standard client-server web architecture/),
      ).toBeInTheDocument();
    });

    it("after MSW resolves, component analysis text appears", async () => {
      const user = userEvent.setup();
      mockAnalysisResponse();

      seedDiagram();
      render(<LearnPanel />);
      await user.click(screen.getByText("Generate Analysis"));

      expect(
        await screen.findByText(/serves as the user-facing frontend/),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(/handles business logic/),
      ).toBeInTheDocument();
    });

    it("after MSW resolves, connection analysis text appears", async () => {
      const user = userEvent.setup();
      mockAnalysisResponse();

      seedDiagram();
      render(<LearnPanel />);
      await user.click(screen.getByText("Generate Analysis"));

      expect(
        await screen.findByText(/frontend calls the backend via REST/),
      ).toBeInTheDocument();
    });

    it("after MSW resolves, pitfalls section renders", async () => {
      const user = userEvent.setup();
      mockAnalysisResponse();

      seedDiagram();
      render(<LearnPanel />);
      await user.click(screen.getByText("Generate Analysis"));

      expect(
        await screen.findByText(/Single API server is a single point of failure/),
      ).toBeInTheDocument();
    });

    it("Refresh Analysis button appears after first analysis", async () => {
      const user = userEvent.setup();
      mockAnalysisResponse();

      seedDiagram();
      render(<LearnPanel />);
      await user.click(screen.getByText("Generate Analysis"));

      expect(
        await screen.findByText("Refresh Analysis"),
      ).toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("network error shows error message", async () => {
      const user = userEvent.setup();
      mockApiNetworkError();

      seedDiagram();
      render(<LearnPanel />);
      await user.click(screen.getByText("Generate Analysis"));

      expect(
        await screen.findByText(/Network error/),
      ).toBeInTheDocument();
    });

    it("error does not crash the component — Generate Analysis still visible", async () => {
      const user = userEvent.setup();
      mockApiNetworkError();

      seedDiagram();
      render(<LearnPanel />);
      await user.click(screen.getByText("Generate Analysis"));

      await screen.findByText(/Network error/);
      expect(screen.getByText("Generate Analysis")).toBeInTheDocument();
    });
  });

  describe("stale detection", () => {
    it("changing diagram after analysis shows 'Diagram changed' message", async () => {
      const user = userEvent.setup();
      mockAnalysisResponse();

      seedDiagram();
      const { rerender } = render(<LearnPanel />);
      await user.click(screen.getByText("Generate Analysis"));

      await screen.findByText("Refresh Analysis");

      useBuilderStore.setState({
        components: [
          ...useBuilderStore.getState().components,
          { id: "cache", title: "Cache", description: "Redis cache", technology: "Redis", tier: "zone-service", color: "rose" },
        ],
      });
      rerender(<LearnPanel />);

      expect(
        screen.getByText(/Diagram changed since last analysis/),
      ).toBeInTheDocument();
    });
  });
});
