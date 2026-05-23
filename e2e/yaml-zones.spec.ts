import { test, expect } from "@playwright/test";

const BUILDER_URL = "/#/builder";

async function navigateToBuilder(page: import("@playwright/test").Page) {
  await page.goto(BUILDER_URL);
  await page.locator(".react-flow").waitFor({ state: "visible" });

  // Dismiss restore banner if it appears
  const banner = page.getByRole("button", { name: "Start fresh" });
  const isBannerVisible = await banner
    .isVisible({ timeout: 1500 })
    .catch(() => false);
  if (isBannerVisible) {
    await banner.click();
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

test("YAML preview shows diagram content", async ({ page }) => {
  await navigateToBuilder(page);

  // Get the first two palette zone cards and double-click each to add a component
  const zoneCards = page.locator('[draggable="true"]');
  await expect(zoneCards.first()).toBeVisible();

  await zoneCards.nth(0).dblclick();
  await zoneCards.nth(1).dblclick();

  // Verify at least one component node appeared
  await expect(page.locator(".react-flow__node-archComponent").first()).toBeVisible();

  // Switch to YAML tab
  await page.getByRole("button", { name: "YAML" }).click();

  // Assert the <pre> element contains YAML content
  const pre = page.locator("pre");
  await expect(pre).toBeVisible();
  const yamlText = await pre.evaluate((el: HTMLElement) => el.innerText);
  expect(yamlText.length).toBeGreaterThan(0);
  // YAML should have at least one key-value pattern
  expect(yamlText).toMatch(/\w+:/);

  // Fit view before screenshot
  await page.getByTitle("Fit view").first().click();

  await expect(page).toHaveScreenshot("yaml-preview.png", {
    maxDiffPixelRatio: 0.01,
  });
});

test("YAML round-trip via import", async ({ page }) => {
  await navigateToBuilder(page);

  // Add 2 components via double-click on zone cards
  const zoneCards = page.locator('[draggable="true"]');
  await expect(zoneCards.first()).toBeVisible();

  await zoneCards.nth(0).dblclick();
  await zoneCards.nth(1).dblclick();

  // Verify components appeared
  await expect(
    page.locator(".react-flow__node-archComponent").first()
  ).toBeVisible();
  const initialCount = await page
    .locator(".react-flow__node-archComponent")
    .count();

  // Switch to YAML tab and capture the YAML content
  await page.getByRole("button", { name: "YAML" }).click();

  const pre = page.locator("pre");
  await expect(pre).toBeVisible();
  const yaml = await pre.evaluate((el: HTMLElement) => el.innerText);
  expect(yaml.length).toBeGreaterThan(0);

  // Clear the diagram by clearing localStorage and reloading
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator(".react-flow").waitFor({ state: "visible" });

  // Dismiss restore banner if needed
  const banner = page.getByRole("button", { name: "Start fresh" });
  const isBannerVisible = await banner
    .isVisible({ timeout: 1500 })
    .catch(() => false);
  if (isBannerVisible) {
    await banner.click();
  }

  // Click Import in toolbar
  await page.getByRole("button", { name: "Import" }).click();

  // Click "Paste YAML" tab in the dialog
  await page.getByRole("button", { name: "Paste YAML" }).click();

  // Fill the textarea with the captured YAML
  const textarea = page.locator('textarea[placeholder*="Paste your"]');
  await textarea.fill(yaml);

  // Click Import submit button in dialog
  await page.locator("dialog").getByRole("button", { name: "Import" }).click();

  // Assert component nodes appear matching the original count
  await expect(page.locator(".react-flow__node-archComponent")).toHaveCount(
    initialCount
  );

  // Fit view before screenshot
  await page.getByTitle("Fit view").first().click();

  await expect(page).toHaveScreenshot("yaml-roundtrip.png", {
    maxDiffPixelRatio: 0.01,
  });
});

test("Add zone", async ({ page }) => {
  await navigateToBuilder(page);

  // Count initial zone cards in palette and zone nodes on canvas
  const zoneCards = page.locator('[draggable="true"]');
  await expect(zoneCards.first()).toBeVisible();
  const initialCardCount = await zoneCards.count();

  const zoneNodes = page.locator(".react-flow__node-tierZone");
  const initialNodeCount = await zoneNodes.count();

  // Click "Add Zone" button
  await page.getByRole("button", { name: "Add Zone" }).click();

  // Assert the number of zone cards in palette increased
  await expect(zoneCards).toHaveCount(initialCardCount + 1);

  // Assert a new zone node appears on the canvas
  await expect(zoneNodes).toHaveCount(initialNodeCount + 1);

  // Fit view before screenshot
  await page.getByTitle("Fit view").first().click();

  await expect(page).toHaveScreenshot("zone-added.png", {
    maxDiffPixelRatio: 0.01,
  });
});

test("Rename zone", async ({ page }) => {
  await navigateToBuilder(page);

  // Click on a zone node on the canvas to select it
  const zoneNode = page.locator(".react-flow__node-tierZone").first();
  await expect(zoneNode).toBeVisible();
  await zoneNode.click();

  // Assert Properties panel shows "Zone" heading
  await expect(page.getByRole("heading", { name: "Zone" })).toBeVisible();

  // Change the Name input (label has no htmlFor, so locate via label text's parent div)
  const nameField = page
    .locator("label")
    .filter({ hasText: /^Name$/ })
    .first()
    .locator("..")
    .locator("input");
  await nameField.clear();
  await nameField.fill("Renamed Zone");

  // Assert the zone label on canvas updates
  await expect(zoneNode).toContainText("Renamed Zone");
});

test("Delete zone", async ({ page }) => {
  await navigateToBuilder(page);

  // Count initial zone nodes
  const zoneNodes = page.locator(".react-flow__node-tierZone");
  await expect(zoneNodes.first()).toBeVisible();
  const initialCount = await zoneNodes.count();

  // Click on a zone node to select it
  await zoneNodes.first().click();

  // Assert Properties panel shows "Zone" heading
  await expect(page.getByRole("heading", { name: "Zone" })).toBeVisible();

  // Click "Delete Zone" button
  await page.getByRole("button", { name: /Delete Zone/ }).click();

  // Assert zone count decreased
  await expect(zoneNodes).toHaveCount(initialCount - 1);

  // Fit view before screenshot
  await page.getByTitle("Fit view").first().click();

  await expect(page).toHaveScreenshot("zone-deleted.png", {
    maxDiffPixelRatio: 0.01,
  });
});
