import { test, expect } from '@playwright/test';
import { loadSampleProject } from './helpers';

test('create an event, add item changes, bulk-apply an owner, remove a row', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-events').click();
  await page.getByTestId('new-event-btn').click();

  await page.getByTestId('event-name-input').fill('Test Event');

  await page.getByTestId('add-item-change-btn').click();
  await expect(page.getByRole('heading', { name: 'Add item changes' })).toBeVisible();
  // The picker shows each item's current owner - a real name for Watch, "Unassigned" for the never-touched Pending item.
  await expect(page.locator('label', { hasText: 'Watch' }).getByText('Bill', { exact: true })).toBeVisible();
  await expect(page.locator('label', { hasText: 'Spare Battery' }).getByText('Unassigned', { exact: true })).toBeVisible();
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

  // Bulk-apply an existing owner to just the Watch row. Adding via the picker now
  // pre-selects everything just added (both rows), so uncheck Battery first to
  // demonstrate a single-row bulk apply.
  await batteryRow.getByRole('checkbox').first().uncheck();
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

test('bulk box/status is tucked behind "Also set box / status" so a plain owner change stays uncluttered', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-events').click();
  await page.getByText('Pack for shipping', { exact: true }).click();

  await page.getByRole('checkbox', { name: 'Select all items in this event' }).check();
  const bulkBar = page.getByTestId('bulk-toolbar');
  await expect(bulkBar.getByText('Set owner')).toBeVisible();
  // The box/status combo should not be present at all until asked for.
  await expect(bulkBar.getByText('Set box / status', { exact: true })).not.toBeVisible();
  await expect(bulkBar.getByRole('combobox', { name: 'Box' })).not.toBeVisible();

  await bulkBar.getByText('+ Also set box / status').click();
  await expect(bulkBar.getByText('Set box / status', { exact: true })).toBeVisible();
  await expect(bulkBar.getByRole('combobox', { name: 'Box' })).toBeVisible();

  await bulkBar.getByText('Hide').click();
  await expect(bulkBar.getByRole('combobox', { name: 'Box' })).not.toBeVisible();
});

test('select-all in the header bulk-applies an owner to every item at once, and Was shows the previous owner', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-events').click();
  // "Meet Johnny at the bar" is chronologically after "Pack for shipping", so its rows'
  // prior owner is a real name (Ava), not just the initial Unassigned state.
  await page.getByText('Meet Johnny at the bar', { exact: true }).click();

  const passportRow = page.locator('tr', { has: page.getByText('Passport', { exact: true }) });
  await expect(passportRow.getByText('Ava', { exact: true })).toBeVisible();

  await page.getByText('← Back to events').click();
  await page.getByText('Pack for shipping', { exact: true }).click();
  await expect(page.getByText('10 changing')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Select all items in this event' }).check();
  await expect(page.getByText('10 selected')).toBeVisible();

  const bulkBar = page.getByTestId('bulk-toolbar');
  const bulkOwnerInput = bulkBar.getByRole('combobox', { name: 'Owner' });
  await bulkOwnerInput.click();
  await bulkOwnerInput.fill('Priya');
  await page.getByRole('option', { name: 'Priya' }).click();
  await bulkBar.getByRole('button', { name: 'Apply' }).first().click();

  // Every row in the event should now be owned by Priya.
  const ownerInputs = page.locator('tbody').getByRole('combobox', { name: 'Owner' });
  await expect(ownerInputs).toHaveCount(10);
  for (const input of await ownerInputs.all()) {
    await expect(input).toHaveValue('Priya');
  }

  // Unchecking select-all clears the selection again.
  await page.getByRole('checkbox', { name: 'Select all items in this event' }).uncheck();
  await expect(page.getByText('selected')).not.toBeVisible();
});

test('typing an owner name that exactly matches commits even without clicking the dropdown option', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-events').click();
  await page.getByTestId('new-event-btn').click();
  await page.getByTestId('event-name-input').fill('Blur commit test');

  await page.getByTestId('add-item-change-btn').click();
  await page.getByText('Passport', { exact: true }).click();
  await page.getByTestId('confirm-add-items-btn').click();

  const row = page.locator('tr', { has: page.getByText('Passport', { exact: true }) });
  const ownerInput = row.getByRole('combobox', { name: 'Owner' });
  await ownerInput.click();
  await ownerInput.fill('Priya');
  // Click a different field instead of the dropdown option or Enter - this used
  // to silently discard the typed value even though it exactly matched an owner.
  await page.getByTestId('event-name-input').click();
  await expect(ownerInput).toHaveValue('Priya');

  // Navigate away and back to prove this is really committed to state, not just lingering text in the input.
  await page.getByText('← Back to events').click();
  await page.getByText('Blur commit test', { exact: true }).click();
  const rowAgain = page.locator('tr', { has: page.getByText('Passport', { exact: true }) });
  await expect(rowAgain.getByRole('combobox', { name: 'Owner' })).toHaveValue('Priya');
});

test('picking a whole box group pre-selects those rows for an immediate bulk owner handoff', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-events').click();
  await page.getByText('Reorganize into three boxes', { exact: true }).click();

  await page.getByTestId('add-item-change-btn').click();
  const picker = page.getByRole('dialog', { name: 'Add item changes' });
  // Select the whole "Box 1" group in one click via its group checkbox (accessible
  // name comes from the wrapping label, e.g. "Box 1 (4)").
  await picker.getByRole('checkbox', { name: /^Box 1/ }).check();
  await expect(picker.getByText('4 selected')).toBeVisible();
  await page.getByTestId('confirm-add-items-btn').click();

  // No manual re-selection needed - the bulk toolbar should already be showing,
  // with exactly the newly-added rows selected.
  const bulkBar = page.getByTestId('bulk-toolbar');
  await expect(bulkBar).toBeVisible();
  await expect(bulkBar.getByText(/^\d+ selected$/)).toHaveText('4 selected');

  const ownerInput = bulkBar.getByRole('combobox', { name: 'Owner' });
  await ownerInput.click();
  await ownerInput.fill('Priya');
  await page.getByRole('option', { name: 'Priya' }).click();
  await bulkBar.getByRole('button', { name: 'Apply' }).first().click();

  for (const name of ['Passport', 'Camera', 'Wallet', 'Keys']) {
    const row = page.locator('tr', { has: page.getByText(name, { exact: true }) });
    await expect(row.getByRole('combobox', { name: 'Owner' })).toHaveValue('Priya');
  }
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
