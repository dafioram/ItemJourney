import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { chronological } from '../../engine/resolve';
import type { ContainerRef, ID } from '../../engine/types';
import { formatEventTime } from '../events/datetime';

function shortLabel(project: ReturnType<typeof useStore>['project'], ref: ContainerRef): string {
  if (ref.kind === 'reserved') return ref.value === 'None' ? 'Unboxed' : ref.value.toUpperCase();
  return project.containers.find((c) => c.id === ref.containerId)?.name ?? '?';
}

function ownerName(project: ReturnType<typeof useStore>['project'], ownerId: ID | null): string {
  if (!ownerId) return 'Unassigned';
  return project.owners.find((o) => o.id === ownerId)?.name ?? 'Unknown';
}

const CELL_STYLE: Record<string, string> = {
  pending: 'bg-mustard-soft text-mustard-dark',
  active: 'bg-panel-raised text-ink-soft',
  removed: 'bg-brick-soft text-brick-dark',
};

const CHANGED_ACTIVE = 'bg-teal-soft text-teal-dark';

type Mode = 'container' | 'owner';

export function MatrixView() {
  const { project, timeline } = useStore();
  const order = useMemo(() => chronological(project), [project]);
  const [mode, setMode] = useState<Mode>('container');

  if (project.items.length === 0) {
    return <p className="text-sm text-ink-soft">No items yet.</p>;
  }
  if (order.length === 0) {
    return <p className="text-sm text-ink-soft">No events yet - add one to start building the matrix.</p>;
  }

  return (
    <div>
      <div className="mb-3 inline-flex rounded-sm border border-line-strong bg-panel-raised p-0.5 text-sm">
        <button
          onClick={() => setMode('container')}
          className={`rounded-sm px-3 py-1 ${mode === 'container' ? 'bg-teal text-cream' : 'text-ink-soft hover:text-ink'}`}
        >
          Box &amp; status
        </button>
        <button
          onClick={() => setMode('owner')}
          className={`rounded-sm px-3 py-1 ${mode === 'owner' ? 'bg-teal text-cream' : 'text-ink-soft hover:text-ink'}`}
        >
          Owner
        </button>
      </div>

      <div className="overflow-auto rounded border border-line-strong">
        <table className="border-collapse font-data text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-40 border-b border-r border-line-strong bg-panel-raised px-3 py-2 text-left">
                Item
              </th>
              {order.map((e) => (
                <th
                  key={e.id}
                  className="sticky top-0 z-10 min-w-28 border-b border-r border-line-strong bg-panel-raised px-2 py-2 text-left font-normal"
                >
                  <div className="truncate font-medium normal-case">{e.name || '(untitled)'}</div>
                  <div className="text-[10px] text-ink-faint">{formatEventTime(e.timestamp)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {project.items.map((item) => {
              const snaps = timeline.get(item.id) ?? [];
              return (
                <tr key={item.id}>
                  <td className="sticky left-0 z-10 border-b border-r border-line-strong bg-panel-raised px-3 py-1.5 font-sans font-medium normal-case text-ink">
                    {item.name}
                  </td>
                  {snaps.map((s) => (
                    <td
                      key={s.eventId}
                      className={`border-b border-r border-line px-2 py-1.5 ${
                        s.changed && s.status === 'active' ? CHANGED_ACTIVE : CELL_STYLE[s.status]
                      } ${s.changed ? 'font-semibold ring-1 ring-inset ring-ink/25' : ''}`}
                      title={mode === 'container' ? ownerName(project, s.ownerId) : shortLabel(project, s.container)}
                    >
                      {mode === 'container' ? shortLabel(project, s.container) : ownerName(project, s.ownerId)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center gap-4 border-t border-line-strong bg-panel px-3 py-2 text-[11px] text-ink-soft">
          <span>
            <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-teal-soft ring-1 ring-inset ring-ink/25 align-middle" /> changed
            this event
          </span>
          <span>
            <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-panel-raised border border-line-strong align-middle" /> carried forward
          </span>
          <span>
            <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-mustard-soft align-middle" /> pending
          </span>
          <span>
            <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-brick-soft align-middle" /> removed
          </span>
        </div>
      </div>
    </div>
  );
}
