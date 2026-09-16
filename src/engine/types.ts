// Core domain types.
//
// Design summary (see README for the full rationale):
// - Item, Owner, Container are the three roster entities.
// - Container has three reserved sentinel values that double as an item's
//   status: "None" (active, not boxed), "Pending" (not yet introduced),
//   "Removed" (permanently exited). Anything else is a real, named box.
// - An Event is a single point in time (required timestamp, no duration)
//   that carries a set of per-item "changes". A change is a full
//   (owner, container) snapshot for that item as of that event - fields are
//   NOT independently forward-filled, they move together as one row.
// - Only items that actually change appear in an event's change list.
//   Everything else is resolved by carrying forward the most recent
//   chronological change (or the item's initial state if it has none yet).

export type ID = string;

export interface Item {
  id: ID;
  name: string;
}

export interface Owner {
  id: ID;
  name: string;
}

export interface Container {
  id: ID;
  name: string;
}

/** Reserved container sentinels. Case-insensitive; cannot be used as a real box name. */
export const RESERVED_CONTAINERS = ['None', 'Pending', 'Removed'] as const;
export type ReservedContainer = (typeof RESERVED_CONTAINERS)[number];

export function isReservedName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return RESERVED_CONTAINERS.some((r) => r.toLowerCase() === lower);
}

/** A container value as actually stored on a change/initial-state row. */
export type ContainerRef =
  | { kind: 'reserved'; value: ReservedContainer }
  | { kind: 'box'; containerId: ID };

export const NONE_REF: ContainerRef = { kind: 'reserved', value: 'None' };
export const PENDING_REF: ContainerRef = { kind: 'reserved', value: 'Pending' };
export const REMOVED_REF: ContainerRef = { kind: 'reserved', value: 'Removed' };

export function containerRefKey(ref: ContainerRef): string {
  return ref.kind === 'reserved' ? `reserved:${ref.value}` : `box:${ref.containerId}`;
}

export function containerRefsEqual(a: ContainerRef, b: ContainerRef): boolean {
  return containerRefKey(a) === containerRefKey(b);
}

export type Status = 'pending' | 'active' | 'removed';

export const STATUS_RANK: Record<Status, number> = {
  pending: 0,
  active: 1,
  removed: 2,
};

export function statusOf(ref: ContainerRef): Status {
  if (ref.kind === 'box') return 'active';
  if (ref.value === 'Pending') return 'pending';
  if (ref.value === 'Removed') return 'removed';
  return 'active'; // 'None'
}

/** One item's resolved (owner, container) snapshot as of a single change. */
export interface ItemChange {
  itemId: ID;
  ownerId: ID | null;
  container: ContainerRef;
}

export interface EventRecord {
  id: ID;
  name: string;
  /** Required. ISO 8601 datetime string. No duration. */
  timestamp: string;
  changes: ItemChange[];
}

export interface Project {
  schemaVersion: 1;
  items: Item[];
  owners: Owner[];
  containers: Container[];
  /** Initial (pre-any-event) container per item. Owner is always null initially. */
  initialContainers: Record<ID, ContainerRef>;
  events: EventRecord[];
}

export function createEmptyProject(): Project {
  return {
    schemaVersion: 1,
    items: [],
    owners: [],
    containers: [],
    initialContainers: {},
    events: [],
  };
}
