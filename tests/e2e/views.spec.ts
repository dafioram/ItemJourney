import { test, expect } from '@playwright/test';
import { loadSampleProject } from './helpers';

test('box view lists boxes, shows contents change by "as of" event', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-views').click();
  await page.getByTestId('subnav-box').click();

  await page.getByText('Box 1', { exact: true }).click();
  await expect(page.getByText('Nothing here at this point in time.')).toBeVisible();

  const select = page.getByLabel('As of:');
  const optionValue = await select.locator('option', { hasText: 'Pack for shipping' }).getAttribute('value');
  await select.selectOption(optionValue!);
  await expect(page.getByRole('cell', { name: 'Passport', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Charger', exact: true })).toBeVisible();
});

test('person view lists owners and what they currently hold', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-views').click();
  await page.getByTestId('subnav-person').click();

  await page.getByText('Priya', { exact: true }).click();
  await expect(page.getByText('Camera', { exact: true })).toBeVisible();
  await expect(page.getByText('Unboxed', { exact: true }).first()).toBeVisible();
});

test('item timeline shows the path and stops at Removed', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-views').click();
  await page.getByTestId('subnav-timeline').click();

  await page.getByPlaceholder('Find an item...').fill('Umbrella');
  await page.getByText('Umbrella', { exact: true }).click();

  await expect(page.getByText('REMOVED', { exact: true })).toBeVisible();
  await expect(page.getByText('Removed here - path ends.')).toBeVisible();
});

test('matrix view renders a full item x event grid', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-views').click();
  await page.getByTestId('subnav-matrix').click();

  await expect(page.getByRole('columnheader', { name: /Pack for shipping/ })).toBeVisible();
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(11);
  const batteryRow = page.locator('tbody tr', { has: page.getByText('Spare Battery', { exact: true }) });
  await expect(batteryRow.getByText('PENDING').first()).toBeVisible();
});

test('flow diagram renders an svg with the expected lanes', async ({ page }) => {
  await loadSampleProject(page);
  await page.getByTestId('nav-views').click();
  await page.getByTestId('subnav-flow').click();

  await expect(page.locator('svg[aria-label="Item flow diagram"]')).toBeVisible();
  await expect(page.getByRole('main').getByText('Pending', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('Removed', { exact: true })).toBeVisible();
  await expect(page.getByText(/item\(s\) never moved/)).toBeVisible();
});
