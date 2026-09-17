import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { makeId } from '../../engine/id';
import { NONE_REF, type ContainerRef, type ID } from '../../engine/types';
import { resolveFinal } from '../../engine/resolve';
import { ContainerCombo } from '../common/ContainerCombo';
import { StatusStamp } from '../common/StatusStamp';
import { Button } from '../common/Button';
import { CsvImportDialog } from './CsvImportDialog';

function containerText(project: ReturnType<typeof useStore>['project'], ref: ContainerRef): string {
  if (ref.kind === 'reserved') return ref.value === 'None' ? 'Unboxed' : ref.value;
  return project.containers.find((c) => c.id === ref.containerId)?.name ?? 'Unknown box';
}

export function ItemsScreen({ onOpenItem }: { onOpenItem: (itemId: ID) => void }) {
  const { project, dispatch, ensureContainer, timeline } = useStore();
  const [name, setName] = useState('');
  const [newContainer, setNewContainer] = useState<ContainerRef>(NONE_REF);
  const [showCsv, setShowCsv] = useState(false);
  const [filter, setFilter] = useState('');

  const final = useMemo(() => resolveFinal(project, timeline), [project, timeline]);

  const referencedItemIds = useMemo(() => {
    const ids = new Set<ID>();
    for (const event of project.events) {
      for (const change of event.changes) ids.add(change.itemId);
    }
    return ids;
  }, [project.events]);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return project.items
      .filter((i) => !q || i.name.toLowerCase().includes(q))
      .map((item) => ({
        item,
        initial: project.initialContainers[item.id] ?? NONE_REF,
        final: final.get(item.id)!,
      }));
  }, [project.items, project.initialContainers, filter, final]);

  function addItem() {
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_ITEM', item: { id: makeId('item'), name: trimmed }, initialContainer: newContainer });
    setName('');
    setNewContainer(NONE_REF);
  }

  return (
    <div>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Items</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Every distinct item you're tracking. Add items one at a time, or bring in a batch from a CSV.
          </p>
        </div>
        <Button variant="secondary" data-testid="open-csv-import-btn" onClick={() => setShowCsv(true)}>
          Import CSV...
        </Button>
      </header>

      <div className="mb-6 rounded border border-line-strong bg-panel p-4">
        <h2 className="font-display text-lg font-semibold">Add an item</h2>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-48">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Name</span>
            <input
              value={name}
              data-testid="new-item-name-input"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              placeholder="e.g. Passport"
              className="w-full rounded-sm border border-line-strong bg-panel-raised px-2 py-1.5 text-sm"
            />
          </label>
          <label className="w-64">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Starting box / status</span>
            <ContainerCombo
              value={newContainer}
              containers={project.containers}
              onChange={setNewContainer}
              onCreateBox={ensureContainer as (name: string) => ID}
              allowRemoved={false}
              aria-label="Starting box or status"
            />
          </label>
          <Button variant="primary" data-testid="add-item-btn" onClick={addItem} disabled={!name.trim()}>
            Add item
          </Button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter items..."
          className="w-64 rounded-sm border border-line-strong bg-panel-raised px-2 py-1.5 text-sm"
        />
        <span className="font-data text-xs text-ink-faint">{rows.length} of {project.items.length} shown</span>
      </div>

      {project.items.length === 0 ? (
        <div className="rounded border border-dashed border-line-strong bg-panel/50 px-6 py-10 text-center text-ink-soft">
          No items yet. Add one above, or import a CSV to seed a batch at once.
        </div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Starting point</th>
              <th className="py-2 pr-3 font-medium">Current status</th>
              <th className="py-2 pr-3 font-medium">Currently with</th>
              <th className="py-2 pr-3 font-medium">In box</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, initial, final: f }) => (
              <tr key={item.id} className="ledger-rule border-b hover:bg-panel">
                <td className="py-2 pr-3 font-medium">{item.name}</td>
                <td className="py-2 pr-3 font-data text-xs text-ink-soft">{containerText(project, initial)}</td>
                <td className="py-2 pr-3">
                  <StatusStamp status={f.status} />
                </td>
                <td className="py-2 pr-3 text-ink-soft">
                  {f.ownerId ? project.owners.find((o) => o.id === f.ownerId)?.name : '—'}
                </td>
                <td className="py-2 pr-3 text-ink-soft">{f.status === 'active' ? containerText(project, f.container) : '—'}</td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button onClick={() => onOpenItem(item.id)} className="mr-3 text-xs font-medium text-teal-dark hover:underline">
                    Timeline →
                  </button>
                  <button
                    disabled={referencedItemIds.has(item.id)}
                    onClick={() => dispatch({ type: 'DELETE_ITEM', id: item.id })}
                    title={referencedItemIds.has(item.id) ? "Can't delete - this item is referenced by one or more events" : 'Delete'}
                    className="text-xs font-medium text-brick-dark hover:underline disabled:cursor-not-allowed disabled:text-ink-faint disabled:no-underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCsv && <CsvImportDialog onClose={() => setShowCsv(false)} />}
    </div>
  );
}
