import { describe, expect, it } from 'vitest';
import { createEmptyProject, NONE_REF, PENDING_REF, type Project } from '../types';
import { chronological, resolveAsOf, resolveFinal, resolveTimeline } from '../resolve';

function baseProject(): Project {
  const p = createEmptyProject();
  p.items = [
    { id: 'i1', name: 'Ball 1' },
    { id: 'i2', name: 'Ball 2' },
    { id: 'i3', name: 'Ball 3' },
  ];
  p.owners = [
    { id: 'o1', name: 'Johnny' },
    { id: 'o2', name: 'Bill' },
  ];
  p.containers = [
    { id: 'b1', name: 'Box 1' },
    { id: 'b2', name: 'Box 2' },
  ];
  p.initialContainers = {
    i1: NONE_REF,
    i2: NONE_REF,
    i3: PENDING_REF,
  };
  return p;
}

describe('chronological ordering', () => {
  it('sorts events by timestamp ascending regardless of array order', () => {
    const p = baseProject();
    p.events = [
      { id: 'e2', name: 'Second', timestamp: '2026-01-02T00:00:00Z', changes: [] },
      { id: 'e1', name: 'First', timestamp: '2026-01-01T00:00:00Z', changes: [] },
    ];
    const order = chronological(p);
    expect(order.map((e) => e.id)).toEqual(['e1', 'e2']);
  });

  it('breaks ties on identical timestamps by original array order (arbitrary but stable)', () => {
    const p = baseProject();
    p.events = [
      { id: 'eA', name: 'A', timestamp: '2026-01-01T00:00:00Z', changes: [] },
      { id: 'eB', name: 'B', timestamp: '2026-01-01T00:00:00Z', changes: [] },
    ];
    const order = chronological(p);
    expect(order.map((e) => e.id)).toEqual(['eA', 'eB']);
  });
});

describe('resolveTimeline - forward fill', () => {
  it('carries forward unchanged items across events', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Pack boxes',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i1', ownerId: 'o1', container: { kind: 'box', containerId: 'b1' } }],
      },
      {
        id: 'e2',
        name: 'Move box 1',
        timestamp: '2026-01-02T00:00:00Z',
        changes: [{ itemId: 'i1', ownerId: 'o1', container: { kind: 'box', containerId: 'b2' } }],
      },
    ];
    const timeline = resolveTimeline(p);
    const i2snaps = timeline.get('i2')!;
    // i2 never has an explicit change - should carry forward its initial state (None) at every event.
    expect(i2snaps[0].changed).toBe(false);
    expect(i2snaps[0].container).toEqual(NONE_REF);
    expect(i2snaps[1].changed).toBe(false);
    expect(i2snaps[1].container).toEqual(NONE_REF);

    const i1snaps = timeline.get('i1')!;
    expect(i1snaps[0].changed).toBe(true);
    expect(i1snaps[0].container).toEqual({ kind: 'box', containerId: 'b1' });
    expect(i1snaps[1].changed).toBe(true);
    expect(i1snaps[1].container).toEqual({ kind: 'box', containerId: 'b2' });
  });

  it('an item added later with no events resolves to its initial state everywhere', () => {
    const p = baseProject();
    p.events = [{ id: 'e1', name: 'Something', timestamp: '2026-01-01T00:00:00Z', changes: [] }];
    const timeline = resolveTimeline(p);
    const i3snaps = timeline.get('i3')!;
    expect(i3snaps[0].status).toBe('pending');
    expect(i3snaps[0].changed).toBe(false);
  });

  it('resolves events out of chronological authoring order correctly', () => {
    const p = baseProject();
    // Authored out of order: the "later" event appears first in the array.
    p.events = [
      {
        id: 'e2',
        name: 'Later event',
        timestamp: '2026-03-01T00:00:00Z',
        changes: [{ itemId: 'i1', ownerId: 'o2', container: { kind: 'box', containerId: 'b2' } }],
      },
      {
        id: 'e1',
        name: 'Earlier event',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i1', ownerId: 'o1', container: { kind: 'box', containerId: 'b1' } }],
      },
    ];
    const timeline = resolveTimeline(p);
    const snaps = timeline.get('i1')!;
    // Chronologically, e1 comes first regardless of array order.
    expect(snaps[0].eventId).toBe('e1');
    expect(snaps[0].ownerId).toBe('o1');
    expect(snaps[1].eventId).toBe('e2');
    expect(snaps[1].ownerId).toBe('o2');
  });
});

describe('resolveAsOf / resolveFinal', () => {
  it('resolveAsOf(null) returns initial state for every item', () => {
    const p = baseProject();
    const timeline = resolveTimeline(p);
    const asOf = resolveAsOf(p, timeline, null);
    expect(asOf.get('i3')!.status).toBe('pending');
    expect(asOf.get('i1')!.status).toBe('active');
  });

  it('resolveFinal reflects the last chronological event', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Only event',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i3', ownerId: 'o1', container: { kind: 'box', containerId: 'b1' } }],
      },
    ];
    const timeline = resolveTimeline(p);
    const final = resolveFinal(p, timeline);
    expect(final.get('i3')!.status).toBe('active');
    expect(final.get('i3')!.ownerId).toBe('o1');
  });

  it('resolveFinal with zero events falls back to initial state', () => {
    const p = baseProject();
    const timeline = resolveTimeline(p);
    const final = resolveFinal(p, timeline);
    expect(final.get('i1')!.container).toEqual(NONE_REF);
  });
});
