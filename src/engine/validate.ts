import { chronological, resolveBeforeIndex, resolveFinal, type ItemSnapshot } from './resolve';
import {
  containerRefKey,
  isReservedName,
  STATUS_RANK,
  type ContainerRef,
  type ID,
  type Project,
} from './types';

export type IssueType =
  | 'missing-owner-activation'
  | 'missing-owner-removal'
  | 'backward-transition'
  | 'container-owner-conflict'
  | 'simultaneous-conflict'
  | 'duplicate-change-in-event'
  | 'reserved-name-conflict';

export interface Issue {
  id: string;
  type: IssueType;
  message: string;
  itemIds: ID[];
  eventIds: ID[];
  containerId?: ID;
}

function label(project: Project, itemId: ID): string {
  return project.items.find((i) => i.id === itemId)?.name ?? itemId;
}
function eventLabel(project: Project, eventId: ID): string {
  return project.events.find((e) => e.id === eventId)?.name ?? eventId;
}
function ownerLabel(project: Project, ownerId: ID | null): string {
  if (!ownerId) return 'Unassigned';
  return project.owners.find((o) => o.id === ownerId)?.name ?? ownerId;
}
function containerLabel(project: Project, ref: ContainerRef): string {
  if (ref.kind === 'reserved') return ref.value;
  return project.containers.find((c) => c.id === ref.containerId)?.name ?? ref.containerId;
}

export function generateIssues(project: Project, timeline: Map<ID, ItemSnapshot[]>): Issue[] {
  const issues: Issue[] = [];
  const order = chronological(project);

  // 1-3: per-item, per-event transition checks (missing owner at activation/removal, backward moves).
  for (const item of project.items) {
    const snaps = timeline.get(item.id) ?? [];
    snaps.forEach((snap, idx) => {
      if (!snap.changed) return; // only check events that explicitly touch this item
      const prev = resolveBeforeIndex(project, timeline, item.id, idx);
      const prevRank = STATUS_RANK[prev.status];
      const newRank = STATUS_RANK[snap.status];

      if (newRank < prevRank) {
        issues.push({
          id: `backward:${item.id}:${snap.eventId}`,
          type: 'backward-transition',
          message: `${label(project, item.id)} moved backward from ${prev.status} to ${snap.status} at "${eventLabel(project, snap.eventId)}". Items shouldn't go back once active or removed.`,
          itemIds: [item.id],
          eventIds: [snap.eventId],
        });
        return;
      }

      if (prev.status !== 'active' && snap.status === 'active' && snap.ownerId === null) {
        issues.push({
          id: `missing-owner-activate:${item.id}:${snap.eventId}`,
          type: 'missing-owner-activation',
          message: `${label(project, item.id)} becomes active at "${eventLabel(project, snap.eventId)}" with no owner assigned.`,
          itemIds: [item.id],
          eventIds: [snap.eventId],
        });
      }

      if (prev.status !== 'removed' && snap.status === 'removed' && snap.ownerId === null) {
        issues.push({
          id: `missing-owner-remove:${item.id}:${snap.eventId}`,
          type: 'missing-owner-removal',
          message: `${label(project, item.id)} is removed at "${eventLabel(project, snap.eventId)}" with no owner recorded as responsible.`,
          itemIds: [item.id],
          eventIds: [snap.eventId],
        });
      }
    });
  }

  // 4: container/owner consistency - items sharing a real box at the same event should share one owner.
  order.forEach((event) => {
    const byBox = new Map<string, { containerId: ID; entries: { itemId: ID; ownerId: ID | null }[] }>();
    for (const item of project.items) {
      const snaps = timeline.get(item.id) ?? [];
      const snap = snaps.find((s) => s.eventId === event.id);
      if (!snap) continue;
      if (snap.container.kind !== 'box') continue; // sentinels are exempt
      const key = containerRefKey(snap.container);
      if (!byBox.has(key)) byBox.set(key, { containerId: snap.container.containerId, entries: [] });
      byBox.get(key)!.entries.push({ itemId: item.id, ownerId: snap.ownerId });
    }
    for (const { containerId, entries } of byBox.values()) {
      const distinctOwners = new Set(entries.filter((e) => e.ownerId !== null).map((e) => e.ownerId));
      if (distinctOwners.size > 1) {
        const boxName = project.containers.find((c) => c.id === containerId)?.name ?? containerId;
        const ownersText = [...distinctOwners].map((o) => ownerLabel(project, o)).join(', ');
        issues.push({
          id: `container-conflict:${containerId}:${event.id}`,
          type: 'container-owner-conflict',
          message: `Box "${boxName}" has items owned by more than one person at "${event.name}" (${ownersText}).`,
          itemIds: entries.map((e) => e.itemId),
          eventIds: [event.id],
          containerId,
        });
      }
    }
  });

  // 5: simultaneous events touching the same item - ambiguous ordering.
  const byTimestamp = new Map<string, typeof order>();
  for (const e of order) {
    const key = e.timestamp;
    if (!byTimestamp.has(key)) byTimestamp.set(key, []);
    byTimestamp.get(key)!.push(e);
  }
  for (const group of byTimestamp.values()) {
    if (group.length < 2) continue;
    const itemToEvents = new Map<ID, ID[]>();
    for (const e of group) {
      for (const c of e.changes) {
        if (!itemToEvents.has(c.itemId)) itemToEvents.set(c.itemId, []);
        itemToEvents.get(c.itemId)!.push(e.id);
      }
    }
    for (const [itemId, eventIds] of itemToEvents.entries()) {
      if (eventIds.length > 1) {
        const names = eventIds.map((id) => eventLabel(project, id)).join(', ');
        issues.push({
          id: `simultaneous:${itemId}:${eventIds.join(',')}`,
          type: 'simultaneous-conflict',
          message: `${label(project, itemId)} is changed by more than one event at the same time (${names}). Order between them is ambiguous.`,
          itemIds: [itemId],
          eventIds,
        });
      }
    }
  }

  // 6: duplicate change rows for the same item within a single event (defensive - UI prevents this).
  for (const event of project.events) {
    const seen = new Map<ID, number>();
    for (const c of event.changes) seen.set(c.itemId, (seen.get(c.itemId) ?? 0) + 1);
    for (const [itemId, count] of seen.entries()) {
      if (count > 1) {
        issues.push({
          id: `duplicate:${event.id}:${itemId}`,
          type: 'duplicate-change-in-event',
          message: `"${event.name}" lists ${label(project, itemId)} more than once.`,
          itemIds: [itemId],
          eventIds: [event.id],
        });
      }
    }
  }

  // 7: a real container's name collides with a reserved word (only possible via hand-edited JSON).
  for (const c of project.containers) {
    if (isReservedName(c.name)) {
      issues.push({
        id: `reserved-name:${c.id}`,
        type: 'reserved-name-conflict',
        message: `Box "${c.name}" uses a reserved status word and can't be treated as a real box.`,
        itemIds: [],
        eventIds: [],
        containerId: c.id,
      });
    }
  }

  return issues;
}

export interface Reconciliation {
  total: number;
  active: number;
  pending: number;
  removed: number;
  stillPendingItemIds: ID[];
}

export function reconcile(project: Project, timeline: Map<ID, ItemSnapshot[]>): Reconciliation {
  const final = resolveFinal(project, timeline);
  let active = 0;
  let pending = 0;
  let removed = 0;
  const stillPendingItemIds: ID[] = [];
  for (const item of project.items) {
    const s = final.get(item.id);
    if (!s) continue;
    if (s.status === 'active') active += 1;
    else if (s.status === 'removed') removed += 1;
    else {
      pending += 1;
      stillPendingItemIds.push(item.id);
    }
  }
  return { total: project.items.length, active, pending, removed, stillPendingItemIds };
}

export { containerLabel, ownerLabel, label as itemLabel, eventLabel };
