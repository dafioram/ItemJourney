import { test, expect } from '@playwright/test';
import { loadSampleProject } from './helpers';

test('create an event, add item changes, bulk-apply an owner, remove a row', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-events').click();
  await page.getByTestId('new-event-btn').click();

  await page.getByTestId('event-name-input').fill('Test Event');

  await page.getByTestId('add-item-change-btn').click();
  await expect(page.getByRole('heading', { name: 'Add item changes' })).toBeVisible();
  await page.getByText('Watch', { exact: true }).click();
  await page.getByText('Spare Battery', { exact: true }).click();
  await page.getByTestId('confirm-add-items-btn').click();

  const watchRow = page.locator('tr', { has: page.getByText('Watch', { exact: true }) });
  const batteryRow = page.locator('tr', { has: page.getByText('Spare Battery', { exact: true }) });
  await expect(watchRow).toBeVisible();
  await expect(batteryRow).toBeVisible();
  await expect(page.getByText('2 changing')).toBeVisible();

  // Inline-create a new owner directly on the Watch row.
  const watchOwnerInput = watchRow.getByRole('combobox', { name: 'Owner' });
  await watchOwnerInput.click();
  await watchOwnerInput.fill('Courier');
  await page.getByText('Add new owner "Courier"').click();
  await expect(watchOwnerInput).toHaveValue('Courier');

  // Bulk-apply an existing owner to the selected row.
  await watchRow.getByRole('checkbox').first().check();
  await expect(page.getByText('1 selected')).toBeVisible();
  const bulkBar = page.getByTestId('bulk-toolbar');
  const bulkOwnerInput = bulkBar.getByRole('combobox', { name: 'Owner' });
  await bulkOwnerInput.click();
  await bulkOwnerInput.fill('Ava');
  await page.getByRole('option', { name: 'Ava' }).click();
  await bulkBar.getByRole('button', { name: 'Apply' }).first().click();
  await expect(watchOwnerInput).toHaveValue('Ava');

  // Remove a row entirely.
  await batteryRow.getByText('Remove').click();
  await expect(batteryRow).not.toBeVisible();
  await expect(page.getByText('1 changing')).toBeVisible();

  await page.getByText('← Back to events').click();
  await expect(page.getByText('Test Event', { exact: true })).toBeVisible();
});

test('duplicating and deleting an event', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-events').click();

  const packRow = page.locator('li', { hasText: 'Pack for shipping' });
  await packRow.getByText('Duplicate').click();

  await expect(page.getByTestId('event-name-input')).toHaveValue('Copy of Pack for shipping');
  await expect(page.getByText('10 changing')).toBeVisible();

  await page.getByText('Delete event').click();
  await expect(page.getByRole('heading', { name: 'Delete this event?' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Delete this event?' }).getByRole('button', { name: 'Delete event' }).click();

  await expect(page.getByText('Copy of Pack for shipping')).not.toBeVisible();
  await expect(page.getByText('Pack for shipping', { exact: true })).toBeVisible();
});
