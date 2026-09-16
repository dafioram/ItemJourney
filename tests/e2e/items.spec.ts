import { test, expect } from '@playwright/test';

test('adding an item manually shows it in the roster', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('new-item-name-input').fill('Test Widget');
  await page.getByTestId('add-item-btn').click();

  await expect(page.getByRole('cell', { name: 'Test Widget', exact: true })).toBeVisible();
  await expect(page.getByTestId('tally-total')).toHaveText('1');
  await expect(page.getByTestId('tally-active')).toHaveText('1');
});

test('CSV import previews row counts and errors, then commits', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-csv-import-btn').click();
  await expect(page.getByRole('heading', { name: 'Import items from CSV' })).toBeVisible();

  await page.getByText('Use example template').click();

  // Template: Passport(1) + Ball x5 + Spare Battery(1) = 7 items, 1 new box (Box 1), 0 errors.
  await expect(page.getByText('Items to create: 7')).toBeVisible();
  await expect(page.getByText(/New boxes referenced: 1/)).toBeVisible();

  await page.getByTestId('commit-csv-import-btn').click();
  await expect(page.getByRole('heading', { name: 'Import items from CSV' })).not.toBeVisible();

  await expect(page.getByTestId('tally-total')).toHaveText('7');
  await expect(page.getByTestId('tally-pending')).toHaveText('1');
  await expect(page.getByRole('cell', { name: 'Ball 3', exact: true })).toBeVisible();
});

test('CSV import surfaces row errors without crashing', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-csv-import-btn').click();
  await page.getByTestId('csv-textarea').fill('name,quantity\n,2\nGood Item,abc\n');

  await expect(page.getByText(/Missing item name/)).toBeVisible();
  await expect(page.getByText(/Invalid quantity/)).toBeVisible();
  await expect(page.getByText('Items to create: 0')).toBeVisible();
});
