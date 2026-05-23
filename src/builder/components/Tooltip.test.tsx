import { render, screen, act, fireEvent } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderTooltip(
  props: {
    delay?: number;
    content?: string;
    placement?: "top" | "bottom" | "left" | "right" | "auto";
  } = {},
) {
  const { delay, content = "Tooltip content", placement } = props;
  return render(
    <Tooltip content={content} delay={delay} placement={placement}>
      {({ onMouseEnter, onMouseLeave, ref }) => (
        <button
          ref={ref as React.RefObject<HTMLButtonElement>}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          Trigger
        </button>
      )}
    </Tooltip>,
  );
}

function hoverTrigger() {
  fireEvent.mouseEnter(screen.getByText("Trigger"));
}

function unhoverTrigger() {
  fireEvent.mouseLeave(screen.getByText("Trigger"));
}

describe("Tooltip", () => {
  describe("initial state", () => {
    it("renders the trigger element", () => {
      renderTooltip();
      expect(screen.getByText("Trigger")).toBeInTheDocument();
    });

    it("does not render tooltip content initially", () => {
      renderTooltip();
      expect(screen.queryByText("Tooltip content")).not.toBeInTheDocument();
    });
  });

  describe("show on hover with delay", () => {
    it("shows tooltip content after hovering and waiting for delay", () => {
      renderTooltip();
      hoverTrigger();

      act(() => {
        vi.advanceTimersByTime(400);
      });
      act(() => {
        vi.advanceTimersByTime(16);
      });

      expect(screen.getByText("Tooltip content")).toBeInTheDocument();
    });

    it("does not show tooltip before delay completes", () => {
      renderTooltip();
      hoverTrigger();

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(screen.queryByText("Tooltip content")).not.toBeInTheDocument();
    });

    it("uses custom delay when provided", () => {
      renderTooltip({ delay: 100 });
      hoverTrigger();

      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        vi.advanceTimersByTime(16);
      });

      expect(screen.getByText("Tooltip content")).toBeInTheDocument();
    });

    it("renders tooltip via portal into document.body", () => {
      renderTooltip();
      hoverTrigger();

      act(() => {
        vi.advanceTimersByTime(400);
      });

      const tooltip = screen.getByText("Tooltip content");
      const portalRoot = tooltip.parentElement!.parentElement!;
      expect(portalRoot).toBe(document.body);
    });
  });

  describe("hide on unhover", () => {
    it("hides tooltip when mouse leaves the trigger", () => {
      renderTooltip();
      hoverTrigger();

      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.getByText("Tooltip content")).toBeInTheDocument();

      unhoverTrigger();

      expect(screen.queryByText("Tooltip content")).not.toBeInTheDocument();
    });

    it("clears pending timer if mouse leaves before delay", () => {
      renderTooltip();
      hoverTrigger();

      act(() => {
        vi.advanceTimersByTime(200);
      });

      unhoverTrigger();

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(screen.queryByText("Tooltip content")).not.toBeInTheDocument();
    });
  });

  describe("placement variants", () => {
    it("renders with placement='bottom'", () => {
      renderTooltip({ placement: "bottom" });
      hoverTrigger();
      act(() => { vi.advanceTimersByTime(400); });
      act(() => { vi.advanceTimersByTime(16); });
      expect(screen.getByText("Tooltip content")).toBeInTheDocument();
    });

    it("renders with placement='left'", () => {
      renderTooltip({ placement: "left" });
      hoverTrigger();
      act(() => { vi.advanceTimersByTime(400); });
      act(() => { vi.advanceTimersByTime(16); });
      expect(screen.getByText("Tooltip content")).toBeInTheDocument();
    });

    it("renders with placement='right'", () => {
      renderTooltip({ placement: "right" });
      hoverTrigger();
      act(() => { vi.advanceTimersByTime(400); });
      act(() => { vi.advanceTimersByTime(16); });
      expect(screen.getByText("Tooltip content")).toBeInTheDocument();
    });
  });

  describe("hide with relatedTarget", () => {
    it("stays visible when mouse moves to a child of the anchor", () => {
      renderTooltip();
      const trigger = screen.getByText("Trigger");

      const child = document.createElement("span");
      trigger.appendChild(child);

      hoverTrigger();
      act(() => { vi.advanceTimersByTime(400); });
      act(() => { vi.advanceTimersByTime(16); });
      expect(screen.getByText("Tooltip content")).toBeInTheDocument();

      fireEvent.mouseLeave(trigger, { relatedTarget: child });
      expect(screen.getByText("Tooltip content")).toBeInTheDocument();

      trigger.removeChild(child);
    });
  });

  describe("cleanup", () => {
    it("clears timeout on unmount without errors", () => {
      const { unmount } = renderTooltip();
      hoverTrigger();
      unmount();

      expect(() => {
        act(() => {
          vi.advanceTimersByTime(500);
        });
      }).not.toThrow();
    });
  });
});
