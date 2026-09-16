import { describe, expect, it } from 'vitest';
import { createEmptyProject, NONE_REF, PENDING_REF, type Project } from '../types';
import { resolveTimeline } from '../resolve';
import { generateIssues, reconcile } from '../validate';

function baseProject(): Project {
  const p = createEmptyProject();
  p.items = [
    { id: 'i1', name: 'Ball 1' },
    { id: 'i2', name: 'Ball 2' },
  ];
  p.owners = [
    { id: 'o1', name: 'Johnny' },
    { id: 'o2', name: 'Bill' },
  ];
  p.containers = [{ id: 'b1', name: 'Box 1' }];
  p.initialContainers = { i1: PENDING_REF, i2: NONE_REF };
  return p;
}

function issuesOf(p: Project) {
  const t = resolveTimeline(p);
  return generateIssues(p, t);
}

describe('missing owner at activation', () => {
  it('flags when an item goes active with no owner', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Bring online',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i1', ownerId: null, container: { kind: 'box', containerId: 'b1' } }],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'missing-owner-activation' && i.itemIds.includes('i1'))).toBe(true);
  });

  it('does not flag when owner is set at activation', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Bring online',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i1', ownerId: 'o1', container: { kind: 'box', containerId: 'b1' } }],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'missing-owner-activation')).toBe(false);
  });
});

describe('missing owner at removal', () => {
  it('flags first removal with no owner', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Dispose',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i2', ownerId: null, container: { kind: 'reserved', value: 'Removed' } }],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'missing-owner-removal' && i.itemIds.includes('i2'))).toBe(true);
  });

  it('does not require owner on later events that merely keep an item removed', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Dispose',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i2', ownerId: 'o1', container: { kind: 'reserved', value: 'Removed' } }],
      },
      {
        id: 'e2',
        name: 'Touch again',
        timestamp: '2026-01-02T00:00:00Z',
        changes: [{ itemId: 'i2', ownerId: null, container: { kind: 'reserved', value: 'Removed' } }],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'missing-owner-removal')).toBe(false);
  });

  it('allows skipping straight from Pending to Removed, still requiring owner', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Cancel before start',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i1', ownerId: null, container: { kind: 'reserved', value: 'Removed' } }],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'missing-owner-removal' && i.itemIds.includes('i1'))).toBe(true);
  });
});

describe('backward transitions', () => {
  it('flags Removed -> Active as backward', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Remove',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i2', ownerId: 'o1', container: { kind: 'reserved', value: 'Removed' } }],
      },
      {
        id: 'e2',
        name: 'Bring back (mistake)',
        timestamp: '2026-01-02T00:00:00Z',
        changes: [{ itemId: 'i2', ownerId: 'o1', container: { kind: 'box', containerId: 'b1' } }],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'backward-transition' && i.itemIds.includes('i2'))).toBe(true);
  });

  it('does not flag staying at the same rank (moving boxes while active)', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Move',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i2', ownerId: 'o1', container: { kind: 'box', containerId: 'b1' } }],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'backward-transition')).toBe(false);
  });
});

describe('container/owner consistency', () => {
  it('flags two different owners resolved into the same box at the same event', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Pack',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [
          { itemId: 'i1', ownerId: 'o1', container: { kind: 'box', containerId: 'b1' } },
          { itemId: 'i2', ownerId: 'o2', container: { kind: 'box', containerId: 'b1' } },
        ],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'container-owner-conflict')).toBe(true);
  });

  it('does not flag when one of the items has no owner yet (null is a wildcard)', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Pack',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [
          { itemId: 'i1', ownerId: 'o1', container: { kind: 'box', containerId: 'b1' } },
          { itemId: 'i2', ownerId: null, container: { kind: 'box', containerId: 'b1' } },
        ],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'container-owner-conflict')).toBe(false);
  });

  it('does not flag the None sentinel even with multiple owners (exempt wildcard)', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Loose',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [
          { itemId: 'i1', ownerId: 'o1', container: NONE_REF },
          { itemId: 'i2', ownerId: 'o2', container: NONE_REF },
        ],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'container-owner-conflict')).toBe(false);
  });
});

describe('simultaneous event conflicts', () => {
  it('flags the same item touched by two events at an identical timestamp', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Meet Johnny',
        timestamp: '2026-01-01T18:00:00Z',
        changes: [{ itemId: 'i1', ownerId: 'o1', container: { kind: 'box', containerId: 'b1' } }],
      },
      {
        id: 'e2',
        name: 'Meet Bill',
        timestamp: '2026-01-01T18:00:00Z',
        changes: [{ itemId: 'i1', ownerId: 'o2', container: NONE_REF }],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'simultaneous-conflict' && i.itemIds.includes('i1'))).toBe(true);
  });

  it('does not flag two simultaneous events touching mutually exclusive items', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Meet Johnny',
        timestamp: '2026-01-01T18:00:00Z',
        changes: [{ itemId: 'i1', ownerId: 'o1', container: { kind: 'box', containerId: 'b1' } }],
      },
      {
        id: 'e2',
        name: 'Meet Bill',
        timestamp: '2026-01-01T18:00:00Z',
        changes: [{ itemId: 'i2', ownerId: 'o2', container: NONE_REF }],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'simultaneous-conflict')).toBe(false);
  });
});

describe('duplicate change within one event', () => {
  it('flags an item listed twice in the same event', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Weird import',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [
          { itemId: 'i1', ownerId: 'o1', container: NONE_REF },
          { itemId: 'i1', ownerId: 'o2', container: NONE_REF },
        ],
      },
    ];
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'duplicate-change-in-event')).toBe(true);
  });
});

describe('reserved name conflicts', () => {
  it('flags a container whose name collides with a reserved word', () => {
    const p = baseProject();
    p.containers.push({ id: 'bad', name: 'removed' });
    const issues = issuesOf(p);
    expect(issues.some((i) => i.type === 'reserved-name-conflict')).toBe(true);
  });
});

describe('reconciliation', () => {
  it('counts active/pending/removed correctly at the final state', () => {
    const p = baseProject();
    p.events = [
      {
        id: 'e1',
        name: 'Activate i2',
        timestamp: '2026-01-01T00:00:00Z',
        changes: [{ itemId: 'i2', ownerId: 'o1', container: { kind: 'box', containerId: 'b1' } }],
      },
    ];
    const t = resolveTimeline(p);
    const r = reconcile(p, t);
    expect(r.total).toBe(2);
    expect(r.active).toBe(1); // i2
    expect(r.pending).toBe(1); // i1 was never touched, stays Pending
    expect(r.removed).toBe(0);
    expect(r.stillPendingItemIds).toEqual(['i1']);
  });
});
