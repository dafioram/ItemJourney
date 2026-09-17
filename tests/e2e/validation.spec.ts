import { test, expect } from '@playwright/test';

test('flags a missing owner at activation and jumps back to the event', async ({ page }) => {
  await page.goto('/');

  // Seed one Pending item.
  await page.getByTestId('new-item-name-input').fill('Solo Item');
  const containerCombo = page.getByRole('combobox', { name: 'Starting box or status' });
  await containerCombo.click();
  await containerCombo.fill('Pending');
  await page.getByRole('option', { name: 'Pending (not yet introduced)' }).click();
  await page.getByTestId('add-item-btn').click();
  await expect(page.getByTestId('tally-pending')).toHaveText('1');

  // Bring it online via an event, without assigning an owner.
  await page.getByTestId('nav-events').click();
  await page.getByTestId('new-event-btn').click();
  await page.getByTestId('event-name-input').fill('Bring online');

  await page.getByTestId('add-item-change-btn').click();
  // The picker should show the item's current owner (Unassigned for a fresh Pending item).
  const pickerRow = page.locator('label', { hasText: 'Solo Item' });
  await expect(pickerRow.getByText('Unassigned', { exact: true })).toBeVisible();
  await page.getByText('Solo Item', { exact: true }).click();
  await page.getByTestId('confirm-add-items-btn').click();

  const row = page.locator('tr', { has: page.getByText('Solo Item', { exact: true }) });
  // A Pending item added to an event defaults to None (unboxed), not a redundant "still Pending".
  await expect(row.getByRole('combobox', { name: 'Box' })).toHaveValue('None (unboxed)');

  const boxCombo = row.getByRole('combobox', { name: 'Box' });
  await boxCombo.click();
  await boxCombo.fill('Shelf A');
  await page.getByText('Create new box "Shelf A"').click();

  // The row itself should show an inline flag immediately.
  await expect(row.getByText(/no owner assigned/)).toBeVisible();

  // The nav badge and Issues panel should agree.
  await expect(page.getByTestId('nav-issues')).toContainText('1');
  await page.getByTestId('nav-issues').click();
  await expect(page.locator('li').getByText('Missing owner at activation')).toBeVisible();
  await expect(page.getByText(/Solo Item becomes active at "Bring online"/)).toBeVisible();

  // Every item is still individually accounted for even with a flag present.
  await expect(page.getByText(/1 issue.*flagged/)).toBeVisible();
  await expect(page.getByTestId('tally-active')).toHaveText('1');
  await expect(page.getByTestId('tally-total')).toHaveText('1');

  await page.getByRole('button', { name: /Open "Bring online"/ }).click();
  await expect(page.getByTestId('event-name-input')).toHaveValue('Bring online');
});
