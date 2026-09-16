import { chronological, resolveAsOf, type ItemSnapshot, type ResolvedState } from './resolve';
import type { ID, Project } from './types';

export interface FlowColumn {
  key: string; // 'initial' or a timestamp string
  label: string;
  eventNames: string[];
}

export interface FlowLane {
  key: string; // 'pending' | 'removed' | 'none' | `box:{id}`
  label: string;
}

export interface FlowTransition {
  fromColIndex: number;
  toColIndex: number;
  fromLane: string;
  toLane: string;
  itemIds: ID[];
}

export interface FlowLayout {
  columns: FlowColumn[];
  lanes: FlowLane[];
  /** laneAt[itemId][columnIndex] = lane key */
  laneAt: Map<ID, string[]>;
  /** counts[laneKey][columnIndex] = number of items in that lane at that column */
  counts: Map<string, number[]>;
  transitions: FlowTransition[];
  staticItemIds: ID[];
}

export function laneKeyOf(state: ResolvedState): string {
  if (state.status === 'pending') return 'pending';
  if (state.status === 'removed') return 'removed';
  if (state.container.kind === 'box') return `box:${state.container.containerId}`;
  return 'none';
}

export function laneLabel(project: Project, key: string): string {
  if (key === 'pending') return 'Pending';
  if (key === 'removed') return 'Removed';
  if (key === 'none') return 'Unboxed';
  const id = key.slice(4);
  return project.containers.find((c) => c.id === id)?.name ?? 'Unknown box';
}

export function computeFlowLayout(project: Project, timeline: Map<ID, ItemSnapshot[]>): FlowLayout {
  const order = chronological(project);

  // Columns: 'initial', then one per distinct timestamp (grouping simultaneous events).
  const columns: FlowColumn[] = [{ key: 'initial', label: 'Initial', eventNames: [] }];
  const lastEventIndexOfColumn: (number | null)[] = [null];
  let i = 0;
  while (i < order.length) {
    const ts = order[i].timestamp;
    const group: string[] = [];
    let j = i;
    while (j < order.length && order[j].timestamp === ts) {
      group.push(order[j].name || '(untitled)');
      j += 1;
    }
    columns.push({ key: ts, label: new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), eventNames: group });
    lastEventIndexOfColumn.push(j - 1);
    i = j;
  }

  // Lane order: pending, boxes by first-appearance, unboxed, removed.
  const laneOrder: string[] = ['pending'];
  const seenBoxes = new Set<string>();
  for (const item of project.items) {
    const snaps = timeline.get(item.id) ?? [];
    const initial = resolveAsOf(project, timeline, null).get(item.id)!;
    for (const s of [initial, ...snaps]) {
      const key = laneKeyOf(s);
      if (key.startsWith('box:') && !seenBoxes.has(key)) {
        seenBoxes.add(key);
        laneOrder.push(key);
      }
    }
  }
  laneOrder.push('none', 'removed');
  const lanes: FlowLane[] = laneOrder.map((key) => ({ key, label: laneLabel(project, key) }));

  // laneAt per item per column.
  const laneAt = new Map<ID, string[]>();
  for (const item of project.items) {
    const snaps = timeline.get(item.id) ?? [];
    const seq: string[] = [];
    for (const col of columns) {
      if (col.key === 'initial') {
        seq.push(laneKeyOf(resolveAsOf(project, timeline, null).get(item.id)!));
      } else {
        const idx = lastEventIndexOfColumn[columns.indexOf(col)]!;
        const snap = snaps[idx];
        seq.push(snap ? laneKeyOf(snap) : seq[seq.length - 1]);
      }
    }
    laneAt.set(item.id, seq);
  }

  // Counts per lane per column.
  const counts = new Map<string, number[]>();
  for (const lane of lanes) counts.set(lane.key, new Array(columns.length).fill(0));
  for (const item of project.items) {
    const seq = laneAt.get(item.id)!;
    seq.forEach((laneKey, colIdx) => {
      counts.get(laneKey)![colIdx] += 1;
    });
  }

  // Transitions: for each gap between consecutive columns, bundle items whose lane changed.
  const transitions: FlowTransition[] = [];
  for (let c = 0; c < columns.length - 1; c += 1) {
    const buckets = new Map<string, ID[]>();
    for (const item of project.items) {
      const seq = laneAt.get(item.id)!;
      const from = seq[c];
      const to = seq[c + 1];
      if (from === to) continue;
      const key = `${from}=>${to}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(item.id);
    }
    for (const [key, itemIds] of buckets.entries()) {
      const [fromLane, toLane] = key.split('=>');
      transitions.push({ fromColIndex: c, toColIndex: c + 1, fromLane, toLane, itemIds });
    }
  }

  const staticItemIds = project.items
    .filter((item) => {
      const seq = laneAt.get(item.id)!;
      return seq.every((k) => k === seq[0]);
    })
    .map((i) => i.id);

  return { columns, lanes, laneAt, counts, transitions, staticItemIds };
}
