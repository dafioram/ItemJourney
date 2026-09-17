import { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { ID, Project } from '../../engine/types';
import { containerRefKey } from '../../engine/types';
import type { ResolvedState } from '../../engine/resolve';

interface PickerGroup {
  key: string;
  label: string;
  items: { id: ID; name: string; ownerLabel: string }[];
}

function resolveOwnerLabel(project: Project, ownerId: ID | null): string {
  if (!ownerId) return 'Unassigned';
  return project.owners.find((o) => o.id === ownerId)?.name ?? 'Unknown';
}

function buildGroups(project: Project, beforeState: Map<ID, ResolvedState>, excludeItemIds: Set<ID>): PickerGroup[] {
  const groups = new Map<string, PickerGroup>();
  const order: string[] = [];

  function ensureGroup(key: string, label: string) {
    if (!groups.has(key)) {
      groups.set(key, { key, label, items: [] });
      order.push(key);
    }
    return groups.get(key)!;
  }

  // Fixed ordering: Pending first, then real boxes (by first appearance), then Unboxed last.
  ensureGroup('pending', 'Pending (not yet introduced)');

  for (const item of project.items) {
    if (excludeItemIds.has(item.id)) continue;
    const state = beforeState.get(item.id);
    if (!state) continue;
    if (state.status === 'removed') continue; // no reactivation - never offered for a new change
    const ownerLabel = resolveOwnerLabel(project, state.ownerId);
    if (state.status === 'pending') {
      ensureGroup('pending', 'Pending (not yet introduced)').items.push({ id: item.id, name: item.name, ownerLabel });
      continue;
    }
    const container = state.container;
    if (container.kind === 'box') {
      const key = containerRefKey(container);
      const boxName = project.containers.find((c) => c.id === container.containerId)?.name ?? 'Box';
      ensureGroup(key, boxName).items.push({ id: item.id, name: item.name, ownerLabel });
    } else {
      ensureGroup('none', 'Unboxed').items.push({ id: item.id, name: item.name, ownerLabel });
    }
  }

  // Move "none" group to the end if present.
  const noneIdx = order.indexOf('none');
  if (noneIdx !== -1) {
    order.splice(noneIdx, 1);
    order.push('none');
  }

  return order.map((k) => groups.get(k)!).filter((g) => g.items.length > 0);
}

export function ItemPickerModal({
  project,
  beforeState,
  alreadyInEvent,
  onClose,
  onAdd,
}: {
  project: Project;
  beforeState: Map<ID, ResolvedState>;
  alreadyInEvent: Set<ID>;
  onClose: () => void;
  onAdd: (itemIds: ID[]) => void;
}) {
  const groups = useMemo(() => buildGroups(project, beforeState, alreadyInEvent), [project, beforeState, alreadyInEvent]);
  const [selected, setSelected] = useState<Set<ID>>(new Set());
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  function toggle(id: ID) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(g: PickerGroup) {
    const allSelected = g.items.every((i) => selected.has(i.id));
    setSelected((s) => {
      const next = new Set(s);
      for (const i of g.items) {
        if (allSelected) next.delete(i.id);
        else next.add(i.id);
      }
      return next;
    });
  }

  const totalAvailable = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Modal title="Add item changes" onClose={onClose} wide>
      {totalAvailable === 0 ? (
        <p className="text-sm text-ink-soft">
          Every item is either already listed in this event or has been removed. Nothing left to add.
        </p>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter items..."
            className="mb-3 w-full rounded-sm border border-line-strong bg-panel-raised px-2 py-1.5 text-sm"
          />
          <div className="max-h-96 space-y-4 overflow-y-auto">
            {filteredGroups.map((g) => (
              <div key={g.key}>
                <label className="flex items-center gap-2 border-b border-line pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <input
                    type="checkbox"
                    data-testid={`picker-group-checkbox-${g.key}`}
                    checked={g.items.every((i) => selected.has(i.id))}
                    onChange={() => toggleGroup(g)}
                  />
                  {g.label} <span className="font-data normal-case text-ink-faint">({g.items.length})</span>
                </label>
                <div className="mt-1 grid grid-cols-1 gap-x-3 gap-y-0.5 sm:grid-cols-2">
                  {g.items.map((i) => (
                    <label
                      key={i.id}
                      className="flex items-center justify-between gap-2 rounded-sm px-1 py-1 text-sm hover:bg-panel"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} />
                        {i.name}
                      </span>
                      <span className="shrink-0 font-data text-xs text-ink-faint">{i.ownerLabel}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
        <span className="font-data text-xs text-ink-faint">{selected.size} selected</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            data-testid="confirm-add-items-btn"
            disabled={selected.size === 0}
            onClick={() => {
              onAdd([...selected]);
              onClose();
            }}
          >
            Add {selected.size || ''} item{selected.size === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
