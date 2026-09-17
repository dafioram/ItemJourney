import { test, expect } from '@playwright/test';

test('adding an item manually shows it in the roster', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('new-item-name-input').fill('Test Widget');
  await page.getByTestId('add-item-btn').click();

  await expect(page.getByRole('cell', { name: 'Test Widget', exact: true })).toBeVisible();
  await expect(page.getByTestId('tally-total')).toHaveText('1');
  await expect(page.getByTestId('tally-active')).toHaveText('1');
});

test('deleting an unused item removes it, but a referenced item cannot be deleted', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('new-item-name-input').fill('Mistake Item');
  await page.getByTestId('add-item-btn').click();
  await page.getByTestId('new-item-name-input').fill('Keeper Item');
  await page.getByTestId('add-item-btn').click();
  await expect(page.getByTestId('tally-total')).toHaveText('2');

  // Reference "Keeper Item" in an event so it's no longer safe to delete.
  await page.getByTestId('nav-events').click();
  await page.getByTestId('new-event-btn').click();
  await page.getByTestId('event-name-input').fill('Touch keeper');
  await page.getByTestId('add-item-change-btn').click();
  await page.getByText('Keeper Item', { exact: true }).click();
  await page.getByTestId('confirm-add-items-btn').click();
  await page.getByTestId('nav-items').click();

  const keeperRow = page.locator('tr', { has: page.getByText('Keeper Item', { exact: true }) });
  const keeperDelete = keeperRow.getByRole('button', { name: 'Delete' });
  await expect(keeperDelete).toBeDisabled();

  const mistakeRow = page.locator('tr', { has: page.getByText('Mistake Item', { exact: true }) });
  await mistakeRow.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('Mistake Item', { exact: true })).not.toBeVisible();
  await expect(page.getByText('Keeper Item', { exact: true })).toBeVisible();
  await expect(page.getByTestId('tally-total')).toHaveText('1');
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
