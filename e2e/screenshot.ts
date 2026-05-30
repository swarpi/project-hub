import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const IS_CI = !!process.env.CI;

export async function expectScreenshot(
	page: Page,
	name: string,
	options?: { fullPage?: boolean; maxDiffPixelRatio?: number },
) {
	if (IS_CI) return;
	await expect(page).toHaveScreenshot(name, options);
}
