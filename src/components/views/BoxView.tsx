import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { chronological, resolveAsOf } from '../../engine/resolve';
import type { ID } from '../../engine/types';
import { formatEventTime } from '../events/datetime';

const UNBOXED_KEY = '__unboxed__';

export function BoxView({ asOfEventId }: { asOfEventId: ID | null }) {
  const { project, timeline } = useStore();
  const [selected, setSelected] = useState<string | null>(null);

  const resolved = useMemo(() => resolveAsOf(project, timeline, asOfEventId), [project, timeline, asOfEventId]);
  const order = useMemo(() => chronological(project), [project]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    c.set(UNBOXED_KEY, 0);
    for (const box of project.containers) c.set(box.id, 0);
    for (const item of project.items) {
      const s = resolved.get(item.id);
      if (!s || s.status !== 'active') continue;
      if (s.container.kind === 'box') c.set(s.container.containerId, (c.get(s.container.containerId) ?? 0) + 1);
      else c.set(UNBOXED_KEY, (c.get(UNBOXED_KEY) ?? 0) + 1);
    }
    return c;
  }, [project, resolved]);

  const selectedKey = selected ?? UNBOXED_KEY;
  const selectedName = selectedKey === UNBOXED_KEY ? 'Unboxed' : project.containers.find((c) => c.id === selectedKey)?.name ?? '';

  const contents = useMemo(() => {
    return project.items
      .filter((item) => {
        const s = resolved.get(item.id);
        if (!s || s.status !== 'active') return false;
        if (selectedKey === UNBOXED_KEY) return s.container.kind === 'reserved';
        return s.container.kind === 'box' && s.container.containerId === selectedKey;
      })
      .map((item) => ({ item, state: resolved.get(item.id)! }));
  }, [project.items, resolved, selectedKey]);

  const history = useMemo(() => {
    if (selectedKey === UNBOXED_KEY) return [];
    return order
      .map((event) => {
        const touches = event.changes.filter((c) => c.container.kind === 'box' && c.container.containerId === selectedKey);
        return { event, touches };
      })
      .filter((x) => x.touches.length > 0);
  }, [order, selectedKey]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
      <div>
        <button
          onClick={() => setSelected(UNBOXED_KEY)}
          className={`mb-1 flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm ${
            selectedKey === UNBOXED_KEY ? 'bg-teal-soft font-medium text-teal-dark' : 'hover:bg-panel'
          }`}
        >
          <span>Unboxed</span>
          <span className="font-data text-xs">{counts.get(UNBOXED_KEY) ?? 0}</span>
        </button>
        {project.containers.length === 0 ? (
          <p className="px-3 py-2 text-xs text-ink-faint">No named boxes yet - they're created automatically the first time you use one in an event or CSV import.</p>
        ) : (
          project.containers.map((box) => (
            <button
              key={box.id}
              onClick={() => setSelected(box.id)}
              className={`mb-1 flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm ${
                selectedKey === box.id ? 'bg-teal-soft font-medium text-teal-dark' : 'hover:bg-panel'
              }`}
            >
              <span>{box.name}</span>
              <span className="font-data text-xs">{counts.get(box.id) ?? 0}</span>
            </button>
          ))
        )}
      </div>

      <div>
        <h2 className="font-display text-2xl font-semibold">{selectedName}</h2>
        {contents.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Nothing here at this point in time.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-1.5 pr-3 font-medium">Item</th>
                <th className="py-1.5 font-medium">Held by</th>
              </tr>
            </thead>
            <tbody>
              {contents.map(({ item, state }) => (
                <tr key={item.id} className="ledger-rule border-b">
                  <td className="py-1.5 pr-3">{item.name}</td>
                  <td className="py-1.5 text-ink-soft">
                    {state.ownerId ? project.owners.find((o) => o.id === state.ownerId)?.name : 'Unassigned'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selectedKey !== UNBOXED_KEY && (
          <div className="mt-6">
            <h3 className="font-display text-lg font-semibold">History</h3>
            {history.length === 0 ? (
              <p className="mt-1 text-sm text-ink-soft">This box hasn't been used in any event yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {history.map(({ event, touches }) => (
                  <li key={event.id} className="border-l-2 border-line-strong pl-3">
                    <div className="font-medium">
                      {event.name || '(untitled)'} <span className="font-data text-xs text-ink-faint">· {formatEventTime(event.timestamp)}</span>
                    </div>
                    <div className="text-xs text-ink-soft">
                      {touches
                        .map((t) => project.items.find((i) => i.id === t.itemId)?.name ?? t.itemId)
                        .join(', ')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
