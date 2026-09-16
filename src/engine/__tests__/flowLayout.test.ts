import { describe, expect, it } from 'vitest';
import { createEmptyProject, NONE_REF, type Project } from '../types';
import { resolveTimeline } from '../resolve';
import { computeFlowLayout } from '../flowLayout';
import { buildSampleProject } from '../sampleProject';

function baseProject(): Project {
  const p = createEmptyProject();
  p.items = [
    { id: 'i1', name: 'A' },
    { id: 'i2', name: 'B' },
    { id: 'i3', name: 'C' },
  ];
  p.containers = [{ id: 'b1', name: 'Box 1' }];
  p.initialContainers = { i1: NONE_REF, i2: NONE_REF, i3: NONE_REF };
  return p;
}

describe('computeFlowLayout', () => {
  it('bundles identical parallel moves into one transition', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Pack',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [
          { itemId: 'i1', ownerId: null, container: { kind: 'box', containerId: 'b1' } },
          { itemId: 'i2', ownerId: null, container: { kind: 'box', containerId: 'b1' } },
        ],
      },
    ];
    const timeline = resolveTimeline(p);
    const layout = computeFlowLayout(p, timeline);
    const t = layout.transitions.find((t) => t.fromLane === 'none' && t.toLane === 'box:b1');
    expect(t).toBeTruthy();
    expect(t!.itemIds.sort()).toEqual(['i1', 'i2']);
  });

  it('identifies items that never change lane as static', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Pack',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i1', ownerId: null, container: { kind: 'box', containerId: 'b1' } }],
      },
    ];
    const timeline = resolveTimeline(p);
    const layout = computeFlowLayout(p, timeline);
    expect(layout.staticItemIds).toContain('i2');
    expect(layout.staticItemIds).toContain('i3');
    expect(layout.staticItemIds).not.toContain('i1');
  });

  it('groups simultaneous events into a single column', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Meet Johnny',
        timestamp: '2026-01-01T18:00:00Z',
        changes: [{ itemId: 'i1', ownerId: null, container: NONE_REF }],
      },
      {
        id: 'e2',
        name: 'Meet Bill',
        timestamp: '2026-01-01T18:00:00Z',
        changes: [{ itemId: 'i2', ownerId: null, container: NONE_REF }],
      },
    ];
    const timeline = resolveTimeline(p);
    const layout = computeFlowLayout(p, timeline);
    // 'initial' + one shared column for both simultaneous events
    expect(layout.columns.length).toBe(2);
    expect(layout.columns[1].eventNames.sort()).toEqual(['Meet Bill', 'Meet Johnny']);
  });

  it('computes without throwing on the full sample project', () => {
    const p = buildSampleProject();
    const timeline = resolveTimeline(p);
    const layout = computeFlowLayout(p, timeline);
    expect(layout.columns.length).toBeGreaterThan(1);
    expect(layout.lanes.length).toBeGreaterThan(1);
    expect(layout.transitions.length).toBeGreaterThan(0);
  });
});
