import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { resolveAsOf } from '../../engine/resolve';
import type { ID } from '../../engine/types';

const UNASSIGNED_KEY = '__unassigned__';

function containerLabel(project: ReturnType<typeof useStore>['project'], containerId: string | null) {
  if (containerId === null) return 'Unboxed';
  return project.containers.find((c) => c.id === containerId)?.name ?? 'Unknown box';
}

export function PersonView({ asOfEventId }: { asOfEventId: ID | null }) {
  const { project, timeline } = useStore();
  const [selected, setSelected] = useState<string | null>(null);

  const resolved = useMemo(() => resolveAsOf(project, timeline, asOfEventId), [project, timeline, asOfEventId]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    c.set(UNASSIGNED_KEY, 0);
    for (const o of project.owners) c.set(o.id, 0);
    for (const item of project.items) {
      const s = resolved.get(item.id);
      if (!s || s.status !== 'active') continue;
      const key = s.ownerId ?? UNASSIGNED_KEY;
      c.set(key, (c.get(key) ?? 0) + 1);
    }
    return c;
  }, [project, resolved]);

  const selectedKey = selected ?? UNASSIGNED_KEY;
  const selectedName = selectedKey === UNASSIGNED_KEY ? 'Unassigned' : project.owners.find((o) => o.id === selectedKey)?.name ?? '';

  const held = useMemo(() => {
    return project.items
      .filter((item) => {
        const s = resolved.get(item.id);
        if (!s || s.status !== 'active') return false;
        return (s.ownerId ?? UNASSIGNED_KEY) === selectedKey;
      })
      .map((item) => ({ item, state: resolved.get(item.id)! }));
  }, [project.items, resolved, selectedKey]);

  const grouped = useMemo(() => {
    const groups = new Map<string, { label: string; items: typeof held }>();
    for (const h of held) {
      const key = h.state.container.kind === 'box' ? h.state.container.containerId : 'none';
      const label = h.state.container.kind === 'box' ? containerLabel(project, key) : 'Unboxed';
      if (!groups.has(key)) groups.set(key, { label, items: [] });
      groups.get(key)!.items.push(h);
    }
    return [...groups.values()];
  }, [held, project]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
      <div>
        <button
          onClick={() => setSelected(UNASSIGNED_KEY)}
          className={`mb-1 flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm ${
            selectedKey === UNASSIGNED_KEY ? 'bg-teal-soft font-medium text-teal-dark' : 'hover:bg-panel'
          }`}
        >
          <span>Unassigned</span>
          <span className="font-data text-xs">{counts.get(UNASSIGNED_KEY) ?? 0}</span>
        </button>
        {project.owners.length === 0 ? (
          <p className="px-3 py-2 text-xs text-ink-faint">No owners yet.</p>
        ) : (
          project.owners.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o.id)}
              className={`mb-1 flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm ${
                selectedKey === o.id ? 'bg-teal-soft font-medium text-teal-dark' : 'hover:bg-panel'
              }`}
            >
              <span>{o.name}</span>
              <span className="font-data text-xs">{counts.get(o.id) ?? 0}</span>
            </button>
          ))
        )}
      </div>

      <div>
        <h2 className="font-display text-2xl font-semibold">{selectedName}</h2>
        {grouped.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Not holding anything at this point in time.</p>
        ) : (
          <div className="mt-2 space-y-4">
            {grouped.map((g) => (
              <div key={g.label}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">{g.label}</div>
                <ul className="text-sm">
                  {g.items.map(({ item }) => (
                    <li key={item.id} className="border-b border-line py-1">
                      {item.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
