import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { chronological, resolveBeforeIndex } from '../../engine/resolve';
import { NONE_REF, type ContainerRef, type ID, type ItemChange } from '../../engine/types';
import { OwnerCombo } from '../common/OwnerCombo';
import { ContainerCombo } from '../common/ContainerCombo';
import { StatusStamp } from '../common/StatusStamp';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ItemPickerModal } from './ItemPickerModal';
import { isoToLocalInput, localInputToIso } from './datetime';

function containerText(project: ReturnType<typeof useStore>['project'], ref: ContainerRef): string {
  if (ref.kind === 'reserved') return ref.value === 'None' ? 'Unboxed' : ref.value;
  return project.containers.find((c) => c.id === ref.containerId)?.name ?? 'Unknown box';
}

export function EventEditor({ eventId, onDone }: { eventId: ID; onDone: () => void }) {
  const { project, dispatch, ensureOwner, ensureContainer, issues, timeline } = useStore();
  const [showPicker, setShowPicker] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<ID>>(new Set());
  const [bulkOwnerId, setBulkOwnerId] = useState<ID | null>(null);
  const [bulkContainer, setBulkContainer] = useState<ContainerRef>(NONE_REF);
  const [confirmCopyFrom, setConfirmCopyFrom] = useState<ID | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const event = project.events.find((e) => e.id === eventId);
  const order = useMemo(() => chronological(project), [project]);
  const eventIndex = order.findIndex((e) => e.id === eventId);

  const beforeState = useMemo(() => {
    const map = new Map<ID, ReturnType<typeof resolveBeforeIndex>>();
    const idx = eventIndex < 0 ? order.length : eventIndex;
    for (const item of project.items) {
      map.set(item.id, resolveBeforeIndex(project, timeline, item.id, idx));
    }
    return map;
  }, [project, eventIndex, order.length, timeline]);

  const simultaneousEvents = order.filter((e) => e.id !== eventId && event && e.timestamp === event.timestamp);

  if (!event) {
    return (
      <div className="rounded border border-dashed border-line-strong p-8 text-center text-ink-soft">
        This event no longer exists.{' '}
        <button className="text-teal-dark underline" onClick={onDone}>
          Back to events
        </button>
      </div>
    );
  }

  const changedIds = new Set(event.changes.map((c) => c.itemId));
  const unchangedItems = project.items.filter((i) => !changedIds.has(i.id));

  function updateChanges(next: ItemChange[]) {
    dispatch({ type: 'SET_EVENT_CHANGES', eventId, changes: next });
  }

  function updateRow(itemId: ID, patch: Partial<ItemChange>) {
    updateChanges(event!.changes.map((c) => (c.itemId === itemId ? { ...c, ...patch } : c)));
  }

  function removeRow(itemId: ID) {
    updateChanges(event!.changes.filter((c) => c.itemId !== itemId));
    setSelectedRows((s) => {
      const next = new Set(s);
      next.delete(itemId);
      return next;
    });
  }

  function addItems(itemIds: ID[]) {
    const additions: ItemChange[] = itemIds.map((itemId) => {
      const prior = beforeState.get(itemId)!;
      // A Pending item being added to an event is, by definition, becoming active -
      // default its box to None (unboxed) rather than leaving the redundant Pending value.
      const container = prior.status === 'pending' ? NONE_REF : prior.container;
      return { itemId, ownerId: prior.ownerId, container };
    });
    updateChanges([...event!.changes, ...additions]);
  }

  function applyBulkOwner() {
    updateChanges(event!.changes.map((c) => (selectedRows.has(c.itemId) ? { ...c, ownerId: bulkOwnerId } : c)));
  }
  function applyBulkContainer() {
    updateChanges(event!.changes.map((c) => (selectedRows.has(c.itemId) ? { ...c, container: bulkContainer } : c)));
  }

  function issuesFor(itemId: ID) {
    return issues.filter((iss) => iss.eventIds.includes(eventId) && iss.itemIds.includes(itemId));
  }

  const otherEvents = project.events.filter((e) => e.id !== eventId);

  return (
    <div>
      <button onClick={onDone} className="mb-4 text-sm text-teal-dark hover:underline">
        ← Back to events
      </button>

      <div className="mb-5 rounded border border-line-strong bg-panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-56">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Event name</span>
            <input
              value={event.name}
              data-testid="event-name-input"
              onChange={(e) => dispatch({ type: 'UPDATE_EVENT_META', eventId, name: e.target.value, timestamp: event.timestamp })}
              placeholder='e.g. "Meet Johnny at the bar"'
              className="w-full rounded-sm border border-line-strong bg-panel-raised px-2 py-1.5 text-sm font-medium"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-soft">Time</span>
            <input
              type="datetime-local"
              value={isoToLocalInput(event.timestamp)}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_EVENT_META', eventId, name: event.name, timestamp: localInputToIso(e.target.value) })
              }
              className="rounded-sm border border-line-strong bg-panel-raised px-2 py-1.5 text-sm"
            />
          </label>
          {otherEvents.length > 0 && (
            <label>
              <span className="mb-1 block text-xs font-medium text-ink-soft">Copy changes from...</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) setConfirmCopyFrom(e.target.value);
                  e.target.value = '';
                }}
                className="rounded-sm border border-line-strong bg-panel-raised px-2 py-1.5 text-sm"
              >
                <option value="" disabled>
                  Choose an event...
                </option>
                {otherEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name || '(untitled)'}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete event
          </Button>
        </div>

        {simultaneousEvents.length > 0 && (
          <p className="mt-2 font-data text-xs text-mustard-dark">
            Same time as: {simultaneousEvents.map((e) => e.name || '(untitled)').join(', ')}. That's fine as long as they
            don't touch the same items.
          </p>
        )}

        <p className="mt-3 font-data text-xs text-ink-faint">
          {event.changes.length} changing · {unchangedItems.length} unchanged · {project.items.length} total
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Item changes</h2>
        <Button variant="primary" data-testid="add-item-change-btn" onClick={() => setShowPicker(true)}>
          + Add item change
        </Button>
      </div>

      {selectedRows.size > 0 && (
        <div data-testid="bulk-toolbar" className="mb-3 flex flex-wrap items-end gap-3 rounded border border-teal bg-teal-soft p-3">
          <span className="font-data text-xs text-teal-dark">{selectedRows.size} selected</span>
          <div className="flex items-end gap-1.5">
            <label>
              <span className="mb-1 block text-xs text-teal-dark">Set owner</span>
              <OwnerCombo ownerId={bulkOwnerId} owners={project.owners} onChange={setBulkOwnerId} onCreate={ensureOwner} />
            </label>
            <Button variant="secondary" onClick={applyBulkOwner}>
              Apply
            </Button>
          </div>
          <div className="flex items-end gap-1.5">
            <label>
              <span className="mb-1 block text-xs text-teal-dark">Set box / status</span>
              <ContainerCombo
                value={bulkContainer}
                containers={project.containers}
                onChange={setBulkContainer}
                onCreateBox={(n) => ensureContainer(n)!}
              />
            </label>
            <Button variant="secondary" onClick={applyBulkContainer}>
              Apply
            </Button>
          </div>
          <Button variant="ghost" onClick={() => setSelectedRows(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      {event.changes.length === 0 ? (
        <div className="rounded border border-dashed border-line-strong bg-panel/50 px-6 py-8 text-center text-ink-soft">
          No item changes yet. Click "Add item change" to select which items move at this event.
        </div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="w-8 py-2" />
              <th className="py-2 pr-3 font-medium">Item</th>
              <th className="py-2 pr-3 font-medium">Owner</th>
              <th className="py-2 pr-3 font-medium">Box / status</th>
              <th className="py-2 pr-3 font-medium">Was</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {event.changes.map((c) => {
              const item = project.items.find((i) => i.id === c.itemId);
              const prior = beforeState.get(c.itemId);
              const rowIssues = issuesFor(c.itemId);
              return (
                <tr key={c.itemId} className="ledger-rule border-b align-top hover:bg-panel">
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(c.itemId)}
                      onChange={() =>
                        setSelectedRows((s) => {
                          const next = new Set(s);
                          if (next.has(c.itemId)) next.delete(c.itemId);
                          else next.add(c.itemId);
                          return next;
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-3 font-medium">{item?.name ?? c.itemId}</td>
                  <td className="min-w-40 py-2 pr-3">
                    <OwnerCombo
                      ownerId={c.ownerId}
                      owners={project.owners}
                      onChange={(id) => updateRow(c.itemId, { ownerId: id })}
                      onCreate={ensureOwner}
                    />
                  </td>
                  <td className="min-w-48 py-2 pr-3">
                    <ContainerCombo
                      value={c.container}
                      containers={project.containers}
                      onChange={(ref) => updateRow(c.itemId, { container: ref })}
                      onCreateBox={(n) => ensureContainer(n)!}
                    />
                    {rowIssues.map((iss) => (
                      <p key={iss.id} className="mt-1 font-data text-[11px] text-brick-dark">
                        ⚑ {iss.message}
                      </p>
                    ))}
                  </td>
                  <td className="py-2 pr-3 text-xs text-ink-faint">
                    {prior ? (
                      <>
                        <StatusStamp status={prior.status} className="mb-1" />
                        <div>{containerText(project, prior.container)}</div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <button onClick={() => removeRow(c.itemId)} className="text-xs text-brick-dark hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {unchangedItems.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowUnchanged((v) => !v)}
            className="font-data text-xs text-ink-soft hover:text-teal-dark hover:underline"
          >
            {showUnchanged ? '▾' : '▸'} {unchangedItems.length} unchanged item{unchangedItems.length === 1 ? '' : 's'} (carried
            forward)
          </button>
          {showUnchanged && (
            <table className="mt-2 w-full border-collapse text-sm text-ink-soft">
              <tbody>
                {unchangedItems.map((item) => {
                  const s = beforeState.get(item.id);
                  return (
                    <tr key={item.id} className="ledger-rule border-b">
                      <td className="py-1.5 pr-3">{item.name}</td>
                      <td className="py-1.5 pr-3">{s && <StatusStamp status={s.status} />}</td>
                      <td className="py-1.5 pr-3 text-xs">
                        {s?.ownerId ? project.owners.find((o) => o.id === s.ownerId)?.name : 'Unassigned'}
                      </td>
                      <td className="py-1.5 text-xs">{s && containerText(project, s.container)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showPicker && (
        <ItemPickerModal
          project={project}
          beforeState={beforeState}
          alreadyInEvent={changedIds}
          onClose={() => setShowPicker(false)}
          onAdd={addItems}
        />
      )}

      {confirmCopyFrom && (
        <ConfirmDialog
          title="Copy changes from this event?"
          message={
            event.changes.length > 0
              ? "This replaces every item change currently in this event with a copy of the source event's changes. This can't be undone."
              : "This copies every item change from the source event into this one, as a starting point you can then edit."
          }
          confirmLabel="Copy changes"
          danger={event.changes.length > 0}
          onConfirm={() => {
            const source = project.events.find((e) => e.id === confirmCopyFrom);
            if (source) updateChanges(source.changes.map((c) => ({ ...c })));
            setConfirmCopyFrom(null);
          }}
          onCancel={() => setConfirmCopyFrom(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this event?"
          message="This removes the event and all its item changes. Items will resolve as if it never happened. This can't be undone."
          confirmLabel="Delete event"
          danger
          onConfirm={() => {
            dispatch({ type: 'DELETE_EVENT', eventId });
            onDone();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
