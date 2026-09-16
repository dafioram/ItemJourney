import type { ContainerRef, EventRecord, ID, Project, Status } from './types';
import { NONE_REF, statusOf } from './types';

export interface ResolvedState {
  ownerId: ID | null;
  container: ContainerRef;
  status: Status;
}

export interface ItemSnapshot extends ResolvedState {
  /** Chronological position, 0-based. */
  eventIndex: number;
  eventId: ID;
  /** True if this event carried an explicit change for this item (vs. carried forward). */
  changed: boolean;
}

/**
 * Stable chronological ordering of events. Ties (identical timestamp) are
 * broken by original array order, which is arbitrary but deterministic -
 * intentional per design: simultaneity is allowed and not an error on its own.
 */
export function chronological(project: Project): EventRecord[] {
  return project.events
    .map((e, originalIndex) => ({ e, originalIndex }))
    .sort((a, b) => {
      const ta = Date.parse(a.e.timestamp);
      const tb = Date.parse(b.e.timestamp);
      if (Number.isNaN(ta) || Number.isNaN(tb)) return a.originalIndex - b.originalIndex;
      if (ta !== tb) return ta - tb;
      return a.originalIndex - b.originalIndex;
    })
    .map((x) => x.e);
}

function initialStateOf(project: Project, itemId: ID): ResolvedState {
  const container = project.initialContainers[itemId] ?? NONE_REF;
  return { ownerId: null, container, status: statusOf(container) };
}

/**
 * Full per-item, per-event resolved timeline, computed by forward-filling
 * each item's most recent explicit change in chronological order.
 */
export function resolveTimeline(project: Project): Map<ID, ItemSnapshot[]> {
  const order = chronological(project);
  const result = new Map<ID, ItemSnapshot[]>();

  for (const item of project.items) {
    let current = initialStateOf(project, item.id);
    const snapshots: ItemSnapshot[] = [];
    order.forEach((event, eventIndex) => {
      const change = event.changes.find((c) => c.itemId === item.id);
      if (change) {
        current = { ownerId: change.ownerId, container: change.container, status: statusOf(change.container) };
      }
      snapshots.push({
        ...current,
        eventIndex,
        eventId: event.id,
        changed: Boolean(change),
      });
    });
    result.set(item.id, snapshots);
  }

  return result;
}

/** Resolved state of every item as of a given event (inclusive), or the initial state if eventId is null. */
export function resolveAsOf(project: Project, timeline: Map<ID, ItemSnapshot[]>, eventId: ID | null): Map<ID, ResolvedState> {
  const out = new Map<ID, ResolvedState>();
  if (eventId === null) {
    for (const item of project.items) out.set(item.id, initialStateOf(project, item.id));
    return out;
  }
  for (const item of project.items) {
    const snaps = timeline.get(item.id) ?? [];
    const snap = snaps.find((s) => s.eventId === eventId);
    out.set(item.id, snap ?? initialStateOf(project, item.id));
  }
  return out;
}

/** Final resolved state of every item (as of the last chronological event, or initial state if there are no events). */
export function resolveFinal(project: Project, timeline: Map<ID, ItemSnapshot[]>): Map<ID, ResolvedState> {
  const order = chronological(project);
  const lastEventId = order.length ? order[order.length - 1].id : null;
  return resolveAsOf(project, timeline, lastEventId);
}

/** The resolved state of a single item immediately before a given chronological event index (0 = before the first event). */
export function resolveBeforeIndex(
  project: Project,
  timeline: Map<ID, ItemSnapshot[]>,
  itemId: ID,
  eventIndex: number,
): ResolvedState {
  if (eventIndex <= 0) return initialStateOf(project, itemId);
  const snaps = timeline.get(itemId) ?? [];
  return snaps[eventIndex - 1] ?? initialStateOf(project, itemId);
}
