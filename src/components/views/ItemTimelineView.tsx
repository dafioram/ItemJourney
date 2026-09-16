import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { NONE_REF, type ContainerRef, type ID } from '../../engine/types';
import { StatusStamp } from '../common/StatusStamp';
import { formatEventTime } from '../events/datetime';

function containerText(project: ReturnType<typeof useStore>['project'], ref: ContainerRef): string {
  if (ref.kind === 'reserved') return ref.value === 'None' ? 'Unboxed' : ref.value;
  return project.containers.find((c) => c.id === ref.containerId)?.name ?? 'Unknown box';
}

export function ItemTimelineView({
  selectedItemId,
  onSelectItem,
}: {
  selectedItemId: ID | null;
  onSelectItem: (id: ID | null) => void;
}) {
  const { project, timeline } = useStore();
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');

  const filteredItems = project.items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));
  const item = project.items.find((i) => i.id === selectedItemId);
  const snaps = useMemo(
    () => (selectedItemId ? timeline.get(selectedItemId) ?? [] : []),
    [selectedItemId, timeline],
  );

  const rows = useMemo(() => {
    if (!selectedItemId) return [];
    const initial = project.initialContainers[selectedItemId] ?? NONE_REF;
    const all = [
      { key: 'initial', label: 'Initial state', time: null as string | null, ownerId: null as ID | null, container: initial, status: initial.kind === 'reserved' && initial.value === 'Pending' ? ('pending' as const) : ('active' as const), changed: true },
      ...snaps.map((s) => ({
        key: s.eventId,
        label: project.events.find((e) => e.id === s.eventId)?.name || '(untitled)',
        time: project.events.find((e) => e.id === s.eventId)?.timestamp ?? null,
        ownerId: s.ownerId,
        container: s.container,
        status: s.status,
        changed: s.changed,
      })),
    ];

    // Flow visually stops at Removed: truncate right after the first removed row.
    const removedIdx = all.findIndex((r) => r.status === 'removed');
    const truncated = removedIdx === -1 ? all : all.slice(0, removedIdx + 1);

    if (showAll) return truncated;
    // Always keep the initial row plus every row where something actually changed.
    return truncated.filter((r, i) => i === 0 || r.changed);
  }, [selectedItemId, snaps, project, showAll]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
      <div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find an item..."
          className="mb-2 w-full rounded-sm border border-line-strong bg-panel-raised px-2 py-1.5 text-sm"
        />
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredItems.map((i) => (
            <button
              key={i.id}
              onClick={() => onSelectItem(i.id)}
              className={`mb-1 block w-full truncate rounded-sm px-3 py-1.5 text-left text-sm ${
                selectedItemId === i.id ? 'bg-teal-soft font-medium text-teal-dark' : 'hover:bg-panel'
              }`}
            >
              {i.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        {!item ? (
          <p className="text-sm text-ink-soft">Choose an item to see its path.</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">{item.name}</h2>
              <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                Show every event (including unchanged)
              </label>
            </div>

            <ol className="relative border-l-2 border-line-strong pl-5">
              {rows.map((r) => (
                <li key={r.key} className="mb-5 last:mb-0">
                  <span
                    className={`absolute -ml-[27px] mt-1 h-3 w-3 rounded-full border-2 ${
                      r.status === 'removed'
                        ? 'border-brick bg-brick-soft'
                        : r.status === 'pending'
                          ? 'border-mustard bg-mustard-soft'
                          : 'border-teal bg-teal-soft'
                    }`}
                  />
                  <div className={r.status === 'pending' ? 'opacity-60' : ''}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.label}</span>
                      {r.time && <span className="font-data text-xs text-ink-faint">{formatEventTime(r.time)}</span>}
                      {!r.changed && r.key !== 'initial' && (
                        <span className="font-data text-[10px] uppercase text-ink-faint">carried forward</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
                      <StatusStamp status={r.status} />
                      <span>{containerText(project, r.container)}</span>
                      <span>·</span>
                      <span>{r.ownerId ? project.owners.find((o) => o.id === r.ownerId)?.name : 'Unassigned'}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            {rows[rows.length - 1]?.status === 'removed' && (
              <p className="mt-2 font-data text-xs text-brick-dark">⚑ Removed here - path ends.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
