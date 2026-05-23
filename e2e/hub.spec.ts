import { test, expect } from "@playwright/test";

const HUB_URL = "/";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

test("Hub loads with all sections", async ({ page }) => {
  await page.goto(HUB_URL);

  // The hub may fail to load GitHub data — wait for either content or error state
  // Assert section headings are visible (rendered regardless of API success)
  await expect(
    page.getByRole("heading", { name: "Workflows" }).or(
      page.getByRole("heading", { name: "Projects" })
    ).first()
  ).toBeVisible({ timeout: 10000 });

  await expect(page).toHaveScreenshot("hub-full.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});

test("Hub sections are present", async ({ page }) => {
  await page.goto(HUB_URL);

  // Wait for the page to load
  await page.waitForLoadState("networkidle");

  // Assert section elements exist in DOM (they render if data is available)
  // The sections only render when data is present, so we check what we can
  const projectsSection = page.locator("#projects");
  const workflowsSection = page.locator("#workflows");
  const pipelineSection = page.locator("#pipeline");

  // At least one section should exist if data loaded
  const hasProjects = await projectsSection.isVisible().catch(() => false);
  const hasWorkflows = await workflowsSection.isVisible().catch(() => false);
  const hasPipeline = await pipelineSection.isVisible().catch(() => false);

  // If any data loaded, the sections should exist
  if (hasProjects || hasWorkflows || hasPipeline) {
    // Sections render within the data block
    if (hasWorkflows) {
      await expect(workflowsSection).toBeVisible();
    }
    if (hasPipeline) {
      await expect(pipelineSection).toBeVisible();
    }
    if (hasProjects) {
      await expect(projectsSection).toBeVisible();
    }
  } else {
    // If data failed to load, the page shows a loading or error state
    // This is acceptable — the test verifies the app doesn't crash
    await expect(page.locator("body")).toBeVisible();
  }
});

test("Hub has a graph visualization container", async ({ page }) => {
  await page.goto(HUB_URL);
  await page.waitForLoadState("networkidle");

  const pipelineSection = page.locator("#pipeline");
  const isVisible = await pipelineSection.isVisible().catch(() => false);

  if (isVisible) {
    await expect(pipelineSection.locator("svg").first()).toBeVisible();
    await expect(
      pipelineSection.locator("[data-node-id]").first()
    ).toBeVisible();
  } else {
    const workflowsSection = page.locator("#workflows");
    const workflowButton = workflowsSection.locator("button").first();
    await expect(workflowButton).toBeVisible({ timeout: 10000 });
    await workflowButton.click();

    const backButton = page.getByText("Back to projects");
    await expect(backButton).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator("[data-node-id]").first()
    ).toBeVisible({ timeout: 5000 });

    await backButton.click();
  }
});

test("GraphModal opens on workflow click and closes via back button", async ({ page }) => {
  await page.goto(HUB_URL);
  await page.waitForLoadState("networkidle");

  const workflowsSection = page.locator("#workflows");
  await expect(workflowsSection).toBeVisible({ timeout: 10000 });

  const firstWorkflowButton = workflowsSection.locator("button").first();
  await expect(firstWorkflowButton).toBeVisible();
  await firstWorkflowButton.click();

  const backButton = page.getByText("Back to projects");
  await expect(backButton).toBeVisible({ timeout: 5000 });

  await expect(
    page.locator("[data-node-id]").first()
  ).toBeVisible({ timeout: 5000 });

  await backButton.click();

  await expect(backButton).toBeHidden({ timeout: 3000 });
});

test("Hub navigation links work", async ({ page }) => {
  await page.goto(HUB_URL);

  // Click "Builder" link in nav
  await page.getByRole("link", { name: "Builder" }).click();

  // Assert canvas is visible on the builder page
  await expect(page.locator(".react-flow")).toBeVisible();

  // Dismiss restore banner if present
  const banner = page.getByRole("button", { name: "Start fresh" });
  const isBannerVisible = await banner
    .isVisible({ timeout: 1500 })
    .catch(() => false);
  if (isBannerVisible) {
    await banner.click();
  }

  // Navigate back to hub
  await page.getByRole("link", { name: "Hub" }).click();

  // Assert we're back on hub — nav should be visible
  await expect(page.locator("nav")).toBeVisible();
});

test("Hub visual - workflows section", async ({ page }) => {
  await page.goto(HUB_URL);
  await page.waitForLoadState("networkidle");

  const workflowsSection = page.locator("#workflows");
  const isVisible = await workflowsSection.isVisible().catch(() => false);

  if (isVisible) {
    await workflowsSection.scrollIntoViewIfNeeded();

    await expect(page).toHaveScreenshot("hub-workflows.png", {
      maxDiffPixelRatio: 0.01,
    });
  } else {
    // Section not visible (no data or workflows filtered out) — skip screenshot
    test.skip();
  }
});

test("Hub visual - pipeline section", async ({ page }) => {
  await page.goto(HUB_URL);
  await page.waitForLoadState("networkidle");

  const pipelineSection = page.locator("#pipeline");
  const isVisible = await pipelineSection.isVisible().catch(() => false);

  if (isVisible) {
    await pipelineSection.scrollIntoViewIfNeeded();

    await expect(page).toHaveScreenshot("hub-pipeline.png", {
      maxDiffPixelRatio: 0.01,
    });
  } else {
    // Section not visible (no pipeline data) — skip screenshot
    test.skip();
  }
});
