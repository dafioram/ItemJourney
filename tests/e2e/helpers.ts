import type { Page } from '@playwright/test';

export async function loadSampleProject(page: Page) {
  await page.goto('/');
  await page.getByTestId('load-sample-btn').click();
  const confirmBtn = page.getByRole('button', { name: /Replace with sample/i });
  if (await confirmBtn.count()) await confirmBtn.click();
  // Wait for sample data to actually land (11 total items in the tally).
  await page.getByText('Total').waitFor();
}

export async function gotoFresh(page: Page) {
  await page.goto('/');
}
