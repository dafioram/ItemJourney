import { describe, expect, it } from 'vitest';
import { buildSampleProject } from '../sampleProject';
import { resolveTimeline } from '../resolve';
import { generateIssues, reconcile } from '../validate';

describe('bundled sample project', () => {
  it('resolves with no validation issues', () => {
    const project = buildSampleProject();
    const timeline = resolveTimeline(project);
    const issues = generateIssues(project, timeline);
    expect(issues).toEqual([]);
  });

  it('reconciles to the expected final counts (9 active, 1 removed, 1 still pending)', () => {
    const project = buildSampleProject();
    const timeline = resolveTimeline(project);
    const r = reconcile(project, timeline);
    expect(r.total).toBe(11);
    expect(r.active).toBe(9);
    expect(r.removed).toBe(1);
    expect(r.pending).toBe(1);
    expect(r.stillPendingItemIds).toEqual(['it-battery']);
  });
});
