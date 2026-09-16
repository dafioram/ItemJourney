import { describe, expect, it } from 'vitest';
import { applyCsvImport, parseCsv } from '../csv';
import { createEmptyProject } from '../types';

describe('parseCsv', () => {
  it('expands quantity > 1 into individually numbered items', () => {
    const csv = 'name,quantity,box\nBall,3,Box 1\n';
    const result = parseCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.itemsToCreate.map((r) => r.itemName)).toEqual(['Ball 1', 'Ball 2', 'Ball 3']);
    expect(result.itemsToCreate.every((r) => r.box.type === 'box' && r.box.name === 'Box 1')).toBe(true);
  });

  it('keeps a quantity-1 item name as-is (no numbering)', () => {
    const csv = 'name,quantity,box\nWidget,1,\n';
    const result = parseCsv(csv);
    expect(result.itemsToCreate.map((r) => r.itemName)).toEqual(['Widget']);
    expect(result.itemsToCreate[0].box).toEqual({ type: 'none' });
  });

  it('treats a blank box cell as None', () => {
    const csv = 'name,box\nLoose Item,\n';
    const result = parseCsv(csv);
    expect(result.itemsToCreate[0].box).toEqual({ type: 'none' });
  });

  it('recognizes "pending" (case-insensitive) as the Pending sentinel', () => {
    const csv = 'name,box\nFuture Item,PENDING\n';
    const result = parseCsv(csv);
    expect(result.itemsToCreate[0].box).toEqual({ type: 'pending' });
  });

  it('rejects "Removed" as a seed value, downgrading to None with an error', () => {
    const csv = 'name,box\nBad Item,Removed\n';
    const result = parseCsv(csv);
    expect(result.itemsToCreate[0].box).toEqual({ type: 'none' });
    expect(result.errors.length).toBe(1);
  });

  it('flags a missing item name', () => {
    const csv = 'name,quantity\n,2\n';
    const result = parseCsv(csv);
    expect(result.errors.some((e) => e.message.includes('Missing item name'))).toBe(true);
    expect(result.itemsToCreate.length).toBe(0);
  });

  it('flags an invalid quantity', () => {
    const csv = 'name,quantity\nWidget,abc\n';
    const result = parseCsv(csv);
    expect(result.errors.some((e) => e.message.includes('Invalid quantity'))).toBe(true);
  });

  it('flags a zero or negative quantity', () => {
    const csv = 'name,quantity\nWidget,0\n';
    const result = parseCsv(csv);
    expect(result.errors.some((e) => e.message.includes('Invalid quantity'))).toBe(true);
  });

  it('collects distinct box names referenced for preview', () => {
    const csv = 'name,box\nA,Box 1\nB,Box 2\nC,Box 1\n';
    const result = parseCsv(csv);
    expect(result.distinctBoxNames.sort()).toEqual(['Box 1', 'Box 2']);
  });

  it('reports an error when there is no name column at all', () => {
    const csv = 'foo,bar\n1,2\n';
    const result = parseCsv(csv);
    expect(result.errors.length).toBe(1);
    expect(result.itemsToCreate.length).toBe(0);
  });
});

describe('applyCsvImport', () => {
  it('creates items, auto-creates referenced boxes, and sets initial containers', () => {
    const project = createEmptyProject();
    const result = parseCsv('name,quantity,box\nBall,2,Box 1\nWidget,1,\n');
    const updated = applyCsvImport(project, result);

    expect(updated.items.length).toBe(3);
    expect(updated.containers.map((c) => c.name)).toEqual(['Box 1']);

    const ball1 = updated.items.find((i) => i.name === 'Ball 1')!;
    const widget = updated.items.find((i) => i.name === 'Widget')!;
    expect(updated.initialContainers[ball1.id]).toEqual({ kind: 'box', containerId: updated.containers[0].id });
    expect(updated.initialContainers[widget.id]).toEqual({ kind: 'reserved', value: 'None' });
  });

  it('reuses an existing container by exact name match instead of creating a duplicate', () => {
    let project = createEmptyProject();
    project = { ...project, containers: [{ id: 'existing-box', name: 'Box 1' }] };
    const result = parseCsv('name,box\nBall,Box 1\n');
    const updated = applyCsvImport(project, result);

    expect(updated.containers.length).toBe(1);
    const ball = updated.items[0];
    expect(updated.initialContainers[ball.id]).toEqual({ kind: 'box', containerId: 'existing-box' });
  });
});
