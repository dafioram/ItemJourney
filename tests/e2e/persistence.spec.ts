import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { loadSampleProject } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, 'fixtures', 'mini-project.json');

test('exporting downloads a JSON file describing the current project', async ({ page }) => {
  await loadSampleProject(page);

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-project-btn').click()]);

  expect(download.suggestedFilename()).toMatch(/^manifest-project-.*\.json$/);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const fs = await import('node:fs/promises');
  const contents = JSON.parse(await fs.readFile(filePath!, 'utf-8'));
  expect(contents.fileFormat).toBe('manifest-tracker');
  expect(contents.project.items).toHaveLength(11);
});

test('importing a file replaces the current project after confirmation', async ({ page }) => {
  await loadSampleProject(page);
  await expect(page.getByTestId('tally-total')).toHaveText('11');

  await page.getByTestId('import-project-input').setInputFiles(fixturePath);

  await expect(page.getByRole('heading', { name: 'Replace current project?' })).toBeVisible();
  await page.getByRole('button', { name: 'Replace and import' }).click();

  await expect(page.getByTestId('tally-total')).toHaveText('2');
  await expect(page.getByRole('cell', { name: 'Fixture Item One', exact: true })).toBeVisible();
});

test('rejects a file that is not a valid project export', async ({ page }) => {
  await page.goto('/');
  const fs = await import('node:fs/promises');
  const badPath = path.join(__dirname, 'fixtures', 'not-a-project.json');
  await fs.writeFile(badPath, JSON.stringify({ hello: 'world' }));

  await page.getByTestId('import-project-input').setInputFiles(badPath);
  await expect(page.getByRole('heading', { name: 'Import failed' })).toBeVisible();
  await expect(page.getByText(/does not look like a manifest tracker project/)).toBeVisible();
});

test('autosaves to localStorage and survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('new-item-name-input').fill('Persisted Item');
  await page.getByTestId('add-item-btn').click();
  await expect(page.getByTestId('tally-total')).toHaveText('1');

  // Autosave is debounced; give it a moment before reloading.
  await page.waitForTimeout(600);
  await page.reload();

  await expect(page.getByTestId('tally-total')).toHaveText('1');
  await expect(page.getByRole('cell', { name: 'Persisted Item', exact: true })).toBeVisible();
});
