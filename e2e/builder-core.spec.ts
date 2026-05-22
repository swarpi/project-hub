import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the ReactFlow canvas root locator. */
function reactFlowCanvas(page: Page) {
  return page.locator(".react-flow");
}

/** Clears persisted Zustand store state and reloads to a clean builder. */
async function resetBuilderState(page: Page): Promise<void> {
  await page.goto("/#/builder");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Dismiss restore banner if it appears after a previous run left state
  const restoreBanner = page.getByRole("button", { name: "Start fresh" });
  if (await restoreBanner.isVisible()) {
    await restoreBanner.click();
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

/**
 * Builder core E2E tests.
 *
 * Tests run in serial order so that earlier tests do not interfere with later
 * ones. Each test resets localStorage before running to guarantee a clean
 * diagram state and avoid the restore banner.
 */
test.describe.serial("Builder core flows", () => {
  test.beforeEach(async ({ page }) => {
    await resetBuilderState(page);
  });

  // -------------------------------------------------------------------------
  // 1. Builder loads correctly
  // -------------------------------------------------------------------------
  test("builder loads with ReactFlow canvas visible", async ({ page }) => {
    await expect(reactFlowCanvas(page)).toBeVisible();
    await expect(page.locator(".react-flow__renderer")).toBeVisible();

    await expect(page).toHaveScreenshot("builder-empty.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  // -------------------------------------------------------------------------
  // 2. Empty-state hint
  // -------------------------------------------------------------------------
  test("shows hint text when no components exist", async ({ page }) => {
    await expect(reactFlowCanvas(page)).toBeVisible();

    await expect(
      page.getByText("Drag a component from the palette"),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 3. Zone nodes present on canvas by default
  // -------------------------------------------------------------------------
  test("tier zone nodes are visible by default", async ({ page }) => {
    await expect(reactFlowCanvas(page)).toBeVisible();

    const zoneNodes = page.locator(".react-flow__node-tierZone");
    await expect(zoneNodes.first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 4. Add component via double-click on canvas pane
  // -------------------------------------------------------------------------
  test("double-clicking canvas pane adds a component node", async ({
    page,
  }) => {
    await expect(reactFlowCanvas(page)).toBeVisible();

    const componentsBefore = await page
      .locator(".react-flow__node-archComponent")
      .count();

    // onDoubleClick handler on the canvas wrapper adds to the first zone
    await page.locator(".react-flow__pane").dblclick();

    await expect(page.locator(".react-flow__node-archComponent")).toHaveCount(
      componentsBefore + 1,
    );

    await expect(page).toHaveScreenshot("builder-one-component.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  // -------------------------------------------------------------------------
  // 5. Add component via palette zone card double-click
  // -------------------------------------------------------------------------
  test("double-clicking palette zone card adds a component", async ({
    page,
  }) => {
    await expect(reactFlowCanvas(page)).toBeVisible();

    const componentsBefore = await page
      .locator(".react-flow__node-archComponent")
      .count();

    const firstZoneCard = page.locator('[draggable="true"]').first();
    await expect(firstZoneCard).toBeVisible();
    await firstZoneCard.dblclick();

    await expect(page.locator(".react-flow__node-archComponent")).toHaveCount(
      componentsBefore + 1,
    );
  });

  // -------------------------------------------------------------------------
  // 6. Select component and inspect properties panel
  // -------------------------------------------------------------------------
  test("clicking a component node shows Component heading in properties panel", async ({
    page,
  }) => {
    // Add a component first
    await page.locator(".react-flow__pane").dblclick();

    const componentNode = page
      .locator(".react-flow__node-archComponent")
      .first();
    await expect(componentNode).toBeVisible();

    // Before selection: properties panel shows the Diagram section
    await expect(page.getByRole("heading", { name: "Diagram" })).toBeVisible();

    // Select the component
    await componentNode.click();

    // After selection: Component section heading appears
    await expect(
      page.getByRole("heading", { name: "Component" }),
    ).toBeVisible();

    await expect(page).toHaveScreenshot("builder-component-selected.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  // -------------------------------------------------------------------------
  // 7. Edit component title and verify canvas label updates
  // -------------------------------------------------------------------------
  test("editing Title field updates the component label on canvas", async ({
    page,
  }) => {
    await page.locator(".react-flow__pane").dblclick();

    const componentNode = page
      .locator(".react-flow__node-archComponent")
      .first();
    await componentNode.click();

    await expect(
      page.getByRole("heading", { name: "Component" }),
    ).toBeVisible();

    // The Title label in PropertiesPanel is a <label> element without htmlFor,
    // so we locate the sibling input via XPath.
    const titleInput = page
      .locator("label")
      .filter({ hasText: /^Title$/ })
      .locator("xpath=following-sibling::input[1]");

    await expect(titleInput).toBeVisible();
    await titleInput.fill("My Test Service");
    await expect(titleInput).toHaveValue("My Test Service");

    // The component node on the canvas should now display the updated label
    await expect(componentNode).toContainText("My Test Service");
  });

  // -------------------------------------------------------------------------
  // 8. Right sidebar tab switching
  // -------------------------------------------------------------------------
  test("right sidebar tabs switch between Properties, YAML, and AI panels", async ({
    page,
  }) => {
    await expect(reactFlowCanvas(page)).toBeVisible();

    // Switch to YAML tab
    await page.getByRole("button", { name: "YAML" }).click();
    // YAML tab button should still be visible (panel is shown)
    await expect(page.getByRole("button", { name: "YAML" })).toBeVisible();

    // Switch to AI tab
    await page.getByRole("button", { name: "AI" }).click();
    await expect(page.getByRole("button", { name: "AI" })).toBeVisible();

    // Return to Properties tab
    await page.getByRole("button", { name: "Properties" }).click();
    await expect(
      page.getByRole("heading", { name: "Diagram" }),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 9. Navigation: Hub and Builder
  // -------------------------------------------------------------------------
  test("navigates between hub and builder views", async ({ page }) => {
    // Navigate to hub
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Hub renders sections — wait for at least one visible section element
    await expect(page.locator("section").first()).toBeVisible();

    await expect(page).toHaveScreenshot("hub-dashboard.png", {
      maxDiffPixelRatio: 0.01,
    });

    // Navigate back to builder
    const builderLink = page.getByRole("link", { name: "Builder" });
    if (await builderLink.isVisible()) {
      await builderLink.click();
    } else {
      await page.goto("/#/builder");
    }
    await page.waitForLoadState("networkidle");

    await expect(reactFlowCanvas(page)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 10. Undo / Redo
  // -------------------------------------------------------------------------
  test("undo removes a component and redo restores it", async ({ page }) => {
    await expect(reactFlowCanvas(page)).toBeVisible();

    const countBefore = await page
      .locator(".react-flow__node-archComponent")
      .count();

    // Add a component via canvas double-click
    await page.locator(".react-flow__pane").dblclick();
    await expect(page.locator(".react-flow__node-archComponent")).toHaveCount(
      countBefore + 1,
    );

    // Undo — component should be removed
    await page.getByTitle("Undo (Ctrl+Z)").click();
    await expect(page.locator(".react-flow__node-archComponent")).toHaveCount(
      countBefore,
    );

    // Redo — component should reappear
    await page.getByTitle("Redo (Ctrl+Shift+Z)").click();
    await expect(page.locator(".react-flow__node-archComponent")).toHaveCount(
      countBefore + 1,
    );
  });

  // -------------------------------------------------------------------------
  // 11. Visual regression: builder with multiple components after auto-layout
  // -------------------------------------------------------------------------
  test("visual regression with multiple components after auto-layout and fit view", async ({
    page,
  }) => {
    await expect(reactFlowCanvas(page)).toBeVisible();

    const zoneCards = page.locator('[draggable="true"]');
    const cardCount = await zoneCards.count();

    // Add a component via canvas double-click
    await page.locator(".react-flow__pane").dblclick();
    await expect(page.locator(".react-flow__node-archComponent")).toHaveCount(
      1,
    );

    // Add a component from the first palette zone card
    if (cardCount > 0) {
      await zoneCards.first().dblclick();
    }

    // Add a component from the second palette zone card if it exists
    if (cardCount > 1) {
      await zoneCards.nth(1).dblclick();
    }

    // Verify at least the components we added are present
    const expectedCount = 1 + (cardCount > 0 ? 1 : 0) + (cardCount > 1 ? 1 : 0);
    await expect(page.locator(".react-flow__node-archComponent")).toHaveCount(
      expectedCount,
    );

    // Auto-layout positions components within their zones
    await page.getByRole("button", { name: "Auto-layout" }).click();

    // Fit view normalises the viewport for consistent screenshots
    await page.getByTitle("Fit view").click();

    // Allow layout animation to settle
    await page.locator(".react-flow__renderer").waitFor({ state: "visible" });

    await expect(page).toHaveScreenshot("builder-multi-component.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
});
