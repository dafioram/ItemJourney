import { test, expect } from '@playwright/test';
import { loadSampleProject } from './helpers';

test('shows an empty state and loads the sample project', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('No items yet.')).toBeVisible();
  await expect(page.getByTestId('tally-total')).toHaveText('0');

  await loadSampleProject(page);

  await expect(page.getByTestId('tally-total')).toHaveText('11');
  await expect(page.getByTestId('tally-active')).toHaveText('9');
  await expect(page.getByTestId('tally-pending')).toHaveText('1');
  await expect(page.getByTestId('tally-removed')).toHaveText('1');
  await expect(page.getByRole('cell', { name: 'Passport', exact: true })).toBeVisible();
});

test('every tab renders without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await loadSampleProject(page);

  for (const tab of ['owners', 'events', 'views', 'issues', 'items'] as const) {
    await page.getByTestId(`nav-${tab}`).click();
    await page.waitForTimeout(150);
  }

  expect(errors, `console/page errors seen: ${errors.join('\n')}`).toEqual([]);
});

test('main headings appear for each section', async ({ page }) => {
  await loadSampleProject(page);

  await page.getByTestId('nav-owners').click();
  await expect(page.getByRole('heading', { name: 'Owners' })).toBeVisible();

  await page.getByTestId('nav-events').click();
  await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();

  await page.getByTestId('nav-views').click();
  await expect(page.getByRole('heading', { name: 'Views' })).toBeVisible();

  await page.getByTestId('nav-issues').click();
  await expect(page.getByRole('heading', { name: 'Issues & reconciliation' })).toBeVisible();
});
