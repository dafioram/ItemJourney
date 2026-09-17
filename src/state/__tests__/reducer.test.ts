import { describe, expect, it } from 'vitest';
import { createEmptyProject, NONE_REF } from '../../engine/types';
import { parseCsv } from '../../engine/csv';
import { projectReducer } from '../reducer';

describe('projectReducer', () => {
  it('ADD_ITEM adds the item and sets its initial container', () => {
    const p = createEmptyProject();
    const next = projectReducer(p, { type: 'ADD_ITEM', item: { id: 'i1', name: 'Ball' }, initialContainer: NONE_REF });
    expect(next.items).toEqual([{ id: 'i1', name: 'Ball' }]);
    expect(next.initialContainers.i1).toEqual(NONE_REF);
  });

  it('DELETE_ITEM removes the item and its initial container entry', () => {
    let p = createEmptyProject();
    p = projectReducer(p, { type: 'ADD_ITEM', item: { id: 'i1', name: 'Ball' }, initialContainer: NONE_REF });
    p = projectReducer(p, { type: 'ADD_ITEM', item: { id: 'i2', name: 'Widget' }, initialContainer: NONE_REF });
    const next = projectReducer(p, { type: 'DELETE_ITEM', id: 'i1' });
    expect(next.items).toEqual([{ id: 'i2', name: 'Widget' }]);
    expect(next.initialContainers.i1).toBeUndefined();
    expect(next.initialContainers.i2).toEqual(NONE_REF);
  });

  it('IMPORT_CSV delegates to applyCsvImport and merges into existing project', () => {
    let p = createEmptyProject();
    p = projectReducer(p, { type: 'ADD_ITEM', item: { id: 'existing', name: 'Already here' }, initialContainer: NONE_REF });
    const csvResult = parseCsv('name,box\nBall,Box 1\n');
    const next = projectReducer(p, { type: 'IMPORT_CSV', result: csvResult });
    expect(next.items.length).toBe(2);
    expect(next.containers.length).toBe(1);
  });

  it('ADD_OWNER is idempotent by id', () => {
    let p = createEmptyProject();
    p = projectReducer(p, { type: 'ADD_OWNER', owner: { id: 'o1', name: 'Ava' } });
    p = projectReducer(p, { type: 'ADD_OWNER', owner: { id: 'o1', name: 'Ava' } });
    expect(p.owners.length).toBe(1);
  });

  it('ADD_CONTAINER is idempotent by id', () => {
    let p = createEmptyProject();
    p = projectReducer(p, { type: 'ADD_CONTAINER', container: { id: 'b1', name: 'Box 1' } });
    p = projectReducer(p, { type: 'ADD_CONTAINER', container: { id: 'b1', name: 'Box 1' } });
    expect(p.containers.length).toBe(1);
  });

  it('SET_EVENT_CHANGES replaces only the targeted event', () => {
    let p = createEmptyProject();
    p = projectReducer(p, { type: 'ADD_EVENT', event: { id: 'e1', name: 'A', timestamp: 't', changes: [] } });
    p = projectReducer(p, { type: 'ADD_EVENT', event: { id: 'e2', name: 'B', timestamp: 't2', changes: [] } });
    p = projectReducer(p, {
      type: 'SET_EVENT_CHANGES',
      eventId: 'e1',
      changes: [{ itemId: 'i1', ownerId: null, container: NONE_REF }],
    });
    expect(p.events.find((e) => e.id === 'e1')!.changes.length).toBe(1);
    expect(p.events.find((e) => e.id === 'e2')!.changes.length).toBe(0);
  });

  it('DELETE_EVENT removes only that event', () => {
    let p = createEmptyProject();
    p = projectReducer(p, { type: 'ADD_EVENT', event: { id: 'e1', name: 'A', timestamp: 't', changes: [] } });
    p = projectReducer(p, { type: 'ADD_EVENT', event: { id: 'e2', name: 'B', timestamp: 't2', changes: [] } });
    p = projectReducer(p, { type: 'DELETE_EVENT', eventId: 'e1' });
    expect(p.events.map((e) => e.id)).toEqual(['e2']);
  });

  it('RENAME_OWNER updates the name in place', () => {
    let p = createEmptyProject();
    p = projectReducer(p, { type: 'ADD_OWNER', owner: { id: 'o1', name: 'Jon' } });
    p = projectReducer(p, { type: 'RENAME_OWNER', id: 'o1', name: 'John' });
    expect(p.owners[0].name).toBe('John');
  });
});
