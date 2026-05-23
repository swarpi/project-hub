import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { useBuilderStore } from "../store/builder-store";
import { AIPanel } from "./AIPanel";

function setApiKey(key = "test-key") {
  useBuilderStore.setState({ apiKey: key, aiBaseUrl: "https://api.anthropic.com" });
}

function mockApiResponse(text: string) {
  server.use(
    http.post("*/v1/messages", () =>
      HttpResponse.json({ content: [{ type: "text", text }] }),
    ),
  );
}

function mockApiError(status: number, message: string) {
  server.use(
    http.post("*/v1/messages", () =>
      HttpResponse.json(
        { error: { message } },
        { status },
      ),
    ),
  );
}

function mockApiNetworkError() {
  server.use(
    http.post("*/v1/messages", () => HttpResponse.error()),
  );
}

const YAML_RESPONSE = `Here is your architecture:

\`\`\`yaml
name: Test
zones:
  - id: zone-client
    name: Client
    color: indigo
components:
  - id: web-app
    title: Web App
    description: Frontend application
    technology: React
    tier: zone-client
    color: indigo
\`\`\`

This creates a simple frontend setup.`;

const GUIDED_YAML_RESPONSE = `[CONFIDENCE: 75%]

Based on your description, here is a diagram:

\`\`\`yaml
name: Guided Test
zones:
  - id: zone-service
    name: Services
    color: amber
components:
  - id: api-server
    title: API Server
    description: Backend API
    technology: Node.js
    tier: zone-service
    color: amber
\`\`\`

Let me know if you'd like to adjust anything.`;

describe("AIPanel", () => {
  describe("no API key", () => {
    it("renders no-key message when apiKey is empty and not localhost", () => {
      useBuilderStore.setState({ apiKey: "", aiBaseUrl: "https://api.anthropic.com" });
      render(<AIPanel />);
      expect(
        screen.getByText(/Add your Anthropic API key/),
      ).toBeInTheDocument();
    });
  });

  describe("mode toggle", () => {
    it("renders Freeform and Guided toggle buttons", () => {
      setApiKey();
      render(<AIPanel />);
      expect(screen.getByText("Freeform")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guided" })).toBeInTheDocument();
    });

    it("defaults to freeform mode with correct placeholder", () => {
      setApiKey();
      render(<AIPanel />);
      expect(
        screen.getByPlaceholderText("Describe an architecture to generate..."),
      ).toBeInTheDocument();
    });

    it("switching to guided mode shows guided placeholder", async () => {
      const user = userEvent.setup();
      setApiKey();
      render(<AIPanel />);
      await user.click(screen.getByRole("button", { name: "Guided" }));
      expect(
        screen.getByPlaceholderText("Describe what you're building..."),
      ).toBeInTheDocument();
    });
  });

  describe("freeform mode", () => {
    it("shows empty state message when no messages", () => {
      setApiKey();
      render(<AIPanel />);
      expect(
        screen.getByText(
          /Describe an architecture and click Generate/,
        ),
      ).toBeInTheDocument();
    });

    it("shows hint about guided mode when canvas is empty", () => {
      setApiKey();
      render(<AIPanel />);
      expect(
        screen.getByText(/Starting from scratch/),
      ).toBeInTheDocument();
    });

    it("typing and submitting triggers POST /v1/messages", async () => {
      const user = userEvent.setup();
      let requestCaptured = false;
      server.use(
        http.post("*/v1/messages", () => {
          requestCaptured = true;
          return HttpResponse.json({
            content: [{ type: "text", text: "Got it!" }],
          });
        }),
      );

      setApiKey();
      render(<AIPanel />);
      const textarea = screen.getByPlaceholderText(
        "Describe an architecture to generate...",
      );
      await user.type(textarea, "Build me a chat app");
      await user.keyboard("{Enter}");

      await waitFor(() => expect(requestCaptured).toBe(true));
    });

    it("after MSW resolves, response text appears in conversation", async () => {
      const user = userEvent.setup();
      mockApiResponse("Here is a simple architecture overview.");

      setApiKey();
      render(<AIPanel />);
      const textarea = screen.getByPlaceholderText(
        "Describe an architecture to generate...",
      );
      await user.type(textarea, "Design a blog");
      await user.keyboard("{Enter}");

      expect(
        await screen.findByText(/simple architecture overview/),
      ).toBeInTheDocument();
    });

    it("shows action buttons: Generate Diagram, Review Architecture, Suggest Components", () => {
      setApiKey();
      render(<AIPanel />);
      expect(screen.getByText("Generate Diagram")).toBeInTheDocument();
      expect(screen.getByText("Review Architecture")).toBeInTheDocument();
      expect(screen.getByText("Suggest Components")).toBeInTheDocument();
    });

    it("clicking Generate Diagram sends predefined prompt", async () => {
      const user = userEvent.setup();
      let capturedBody: Record<string, unknown> | null = null;
      server.use(
        http.post("*/v1/messages", async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            content: [{ type: "text", text: "Generated." }],
          });
        }),
      );

      setApiKey();
      render(<AIPanel />);
      await user.click(screen.getByText("Generate Diagram"));

      await waitFor(() => expect(capturedBody).not.toBeNull());
      const messages = capturedBody!.messages as Array<{ content: string }>;
      expect(messages[0].content).toContain("Generate a complete architecture");
    });
  });

  describe("guided mode", () => {
    it("shows guided empty state message", async () => {
      const user = userEvent.setup();
      setApiKey();
      render(<AIPanel />);
      await user.click(screen.getByRole("button", { name: "Guided" }));
      expect(
        screen.getByText(/step by step/),
      ).toBeInTheDocument();
    });

    it("after messages, shows Generate Now button", async () => {
      const user = userEvent.setup();
      mockApiResponse("What kind of system are you building?");

      setApiKey();
      render(<AIPanel />);
      await user.click(screen.getByRole("button", { name: "Guided" }));

      const textarea = screen.getByPlaceholderText(
        "Describe what you're building...",
      );
      await user.type(textarea, "A chat application");
      await user.keyboard("{Enter}");

      expect(await screen.findByText("Generate Now")).toBeInTheDocument();
    });

    it("response with [CONFIDENCE: 75%] updates confidence display", async () => {
      const user = userEvent.setup();
      server.use(
        http.post("*/v1/messages", () =>
          HttpResponse.json({
            content: [
              { type: "text", text: "[CONFIDENCE: 75%]\nGood, tell me more." },
            ],
          }),
        ),
      );

      setApiKey();
      render(<AIPanel />);
      await user.click(screen.getByRole("button", { name: "Guided" }));

      const textarea = screen.getByPlaceholderText(
        "Describe what you're building...",
      );
      await user.type(textarea, "An e-commerce site");
      await user.keyboard("{Enter}");

      expect(await screen.findByText("75%")).toBeInTheDocument();
    });

    it("response with YAML block: Apply to Canvas updates store", async () => {
      const user = userEvent.setup();
      server.use(
        http.post("*/v1/messages", () =>
          HttpResponse.json({
            content: [{ type: "text", text: GUIDED_YAML_RESPONSE }],
          }),
        ),
      );

      setApiKey();
      render(<AIPanel />);
      await user.click(screen.getByRole("button", { name: "Guided" }));

      const textarea = screen.getByPlaceholderText(
        "Describe what you're building...",
      );
      await user.type(textarea, "A microservice backend");
      await user.keyboard("{Enter}");

      const applyBtn = await screen.findByText("Apply to Canvas");
      await user.click(applyBtn);

      await waitFor(() =>
        expect(useBuilderStore.getState().components.length).toBeGreaterThan(0),
      );
      expect(
        useBuilderStore.getState().components.find((c) => c.id === "api-server"),
      ).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("401 error from MSW shows error message in chat", async () => {
      const user = userEvent.setup();
      mockApiError(401, "Invalid API key");

      setApiKey();
      render(<AIPanel />);
      const textarea = screen.getByPlaceholderText(
        "Describe an architecture to generate...",
      );
      await user.type(textarea, "Build something");
      await user.keyboard("{Enter}");

      expect(await screen.findByText("Invalid API key")).toBeInTheDocument();
    });

    it("network error shows error message in chat", async () => {
      const user = userEvent.setup();
      mockApiNetworkError();

      setApiKey();
      render(<AIPanel />);
      const textarea = screen.getByPlaceholderText(
        "Describe an architecture to generate...",
      );
      await user.type(textarea, "Build something");
      await user.keyboard("{Enter}");

      expect(
        await screen.findByText(/Network error/),
      ).toBeInTheDocument();
    });
  });

  describe("YAML blocks", () => {
    it("response containing yaml block renders Apply to Canvas button", async () => {
      const user = userEvent.setup();
      server.use(
        http.post("*/v1/messages", () =>
          HttpResponse.json({
            content: [{ type: "text", text: YAML_RESPONSE }],
          }),
        ),
      );

      setApiKey();
      render(<AIPanel />);
      const textarea = screen.getByPlaceholderText(
        "Describe an architecture to generate...",
      );
      await user.type(textarea, "Create a frontend app");
      await user.keyboard("{Enter}");

      expect(await screen.findByText("Apply to Canvas")).toBeInTheDocument();
      expect(screen.getByText("YAML Diagram")).toBeInTheDocument();
    });

    it("clicking Apply to Canvas applies YAML and shows Applied state", async () => {
      const user = userEvent.setup();
      server.use(
        http.post("*/v1/messages", () =>
          HttpResponse.json({
            content: [{ type: "text", text: YAML_RESPONSE }],
          }),
        ),
      );

      setApiKey();
      render(<AIPanel />);
      const textarea = screen.getByPlaceholderText(
        "Describe an architecture to generate...",
      );
      await user.type(textarea, "Create a frontend app");
      await user.keyboard("{Enter}");

      const applyBtn = await screen.findByText("Apply to Canvas");
      await user.click(applyBtn);

      expect(await screen.findByText("Applied")).toBeInTheDocument();
      await waitFor(() =>
        expect(
          useBuilderStore.getState().components.find((c) => c.id === "web-app"),
        ).toBeDefined(),
      );
    });
  });

  describe("Update Diagram button", () => {
    async function triggerYamlResponse(user: ReturnType<typeof userEvent.setup>) {
      mockApiResponse(YAML_RESPONSE);
      const textarea = screen.getByPlaceholderText(
        "Describe an architecture to generate...",
      );
      await user.type(textarea, "Update my diagram");
      await user.keyboard("{Enter}");
      await screen.findByText("Apply to Canvas");
    }

    it("no Update Diagram button when response has no YAML block", async () => {
      const user = userEvent.setup();
      mockApiResponse("Here is some advice about your architecture.");
      setApiKey();
      render(<AIPanel />);
      const textarea = screen.getByPlaceholderText(
        "Describe an architecture to generate...",
      );
      await user.type(textarea, "Review my app");
      await user.keyboard("{Enter}");
      await screen.findByText(/some advice/);
      expect(screen.queryByText("Update Diagram")).not.toBeInTheDocument();
    });

    it("appears alongside Apply to Canvas when YAML block is present", async () => {
      const user = userEvent.setup();
      setApiKey();
      render(<AIPanel />);
      await triggerYamlResponse(user);
      expect(screen.getByText("Update Diagram")).toBeInTheDocument();
      expect(screen.getByText("Apply to Canvas")).toBeInTheDocument();
    });

    it("disabled when canvas has no components", async () => {
      const user = userEvent.setup();
      useBuilderStore.setState({ components: [] });
      setApiKey();
      render(<AIPanel />);
      await triggerYamlResponse(user);
      const btn = screen.getByText("Update Diagram").closest("button")!;
      expect(btn).toBeDisabled();
    });

    it("enabled when canvas has components", async () => {
      const user = userEvent.setup();
      useBuilderStore.setState({
        components: [
          { id: "existing", title: "Existing", description: "", technology: "Go", tier: "zone-service", color: "amber" },
        ],
        positions: { existing: { x: 50, y: 50 } },
      });
      setApiKey();
      render(<AIPanel />);
      await triggerYamlResponse(user);
      const btn = screen.getByText("Update Diagram").closest("button")!;
      expect(btn).not.toBeDisabled();
    });

    it("disabled button has tooltip", async () => {
      const user = userEvent.setup();
      useBuilderStore.setState({ components: [] });
      setApiKey();
      render(<AIPanel />);
      await triggerYamlResponse(user);
      const btn = screen.getByText("Update Diagram").closest("button")!;
      expect(btn).toHaveAttribute("title", "No existing diagram to update");
    });

    it("clicking Update Diagram merges YAML into store", async () => {
      const user = userEvent.setup();
      useBuilderStore.setState({
        components: [
          { id: "existing", title: "Existing", description: "", technology: "Go", tier: "zone-service", color: "amber" },
        ],
        positions: { existing: { x: 50, y: 50 } },
      });
      setApiKey();
      render(<AIPanel />);
      await triggerYamlResponse(user);
      const btn = screen.getByText("Update Diagram").closest("button")!;
      await user.click(btn);

      await waitFor(() =>
        expect(
          useBuilderStore.getState().components.find((c) => c.id === "web-app"),
        ).toBeDefined(),
      );
    });

    it("preserves existing component position after Update Diagram", async () => {
      const user = userEvent.setup();
      const YAML_WITH_EXISTING = `Here is your updated architecture:

\`\`\`yaml
name: Updated
zones:
  - id: zone-client
    name: Client
    color: indigo
components:
  - id: web-app
    title: Web App
    description: Frontend application
    technology: React
    tier: zone-client
    color: indigo
  - id: new-service
    title: New Service
    description: A new service
    technology: Node.js
    tier: zone-client
    color: amber
\`\`\`

Added a new service.`;

      mockApiResponse(YAML_WITH_EXISTING);
      useBuilderStore.setState({
        components: [
          { id: "web-app", title: "Web App", description: "Frontend", technology: "React", tier: "zone-client", color: "indigo" },
        ],
        positions: { "web-app": { x: 100, y: 200 } },
      });
      setApiKey();
      render(<AIPanel />);

      const textarea = screen.getByPlaceholderText(
        "Describe an architecture to generate...",
      );
      await user.type(textarea, "Add a new service");
      await user.keyboard("{Enter}");

      const btn = await screen.findByText("Update Diagram");
      await user.click(btn.closest("button")!);

      await waitFor(() =>
        expect(
          useBuilderStore.getState().components.find((c) => c.id === "new-service"),
        ).toBeDefined(),
      );
      expect(useBuilderStore.getState().positions["web-app"]).toEqual({ x: 100, y: 200 });
    });

    it("Apply to Canvas still replaces entire store", async () => {
      const user = userEvent.setup();
      useBuilderStore.setState({
        components: [
          { id: "old-comp", title: "Old", description: "", technology: "Go", tier: "zone-service", color: "amber" },
        ],
        positions: { "old-comp": { x: 50, y: 50 } },
      });
      setApiKey();
      render(<AIPanel />);
      await triggerYamlResponse(user);

      const applyBtn = screen.getByText("Apply to Canvas");
      await user.click(applyBtn);

      await waitFor(() =>
        expect(
          useBuilderStore.getState().components.find((c) => c.id === "web-app"),
        ).toBeDefined(),
      );
      expect(
        useBuilderStore.getState().components.find((c) => c.id === "old-comp"),
      ).toBeUndefined();
    });
  });
});
