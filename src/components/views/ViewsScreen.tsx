import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { chronological } from '../../engine/resolve';
import type { ID } from '../../engine/types';
import { formatEventTime } from '../events/datetime';
import { BoxView } from './BoxView';
import { PersonView } from './PersonView';
import { ItemTimelineView } from './ItemTimelineView';
import { MatrixView } from './MatrixView';
import { FlowDiagram } from './FlowDiagram';

type SubTab = 'box' | 'person' | 'timeline' | 'matrix' | 'flow';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'box', label: 'Boxes' },
  { key: 'person', label: 'People' },
  { key: 'timeline', label: 'Item timeline' },
  { key: 'matrix', label: 'Matrix' },
  { key: 'flow', label: 'Flow diagram' },
];

export function ViewsScreen({ initialItemId }: { initialItemId?: ID | null }) {
  const { project } = useStore();
  const [sub, setSub] = useState<SubTab>(initialItemId ? 'timeline' : 'box');
  const [asOf, setAsOf] = useState<ID | 'final'>('final');
  const [timelineItemId, setTimelineItemId] = useState<ID | null>(initialItemId ?? null);

  const order = useMemo(() => chronological(project), [project]);
  const asOfEventId = asOf === 'final' ? (order.length ? order[order.length - 1].id : null) : asOf;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-4xl font-bold tracking-tight">Views</h1>
        <p className="mt-1 text-sm text-ink-soft">Browse the same data from different angles.</p>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line-strong">
        <nav className="flex gap-1">
          {SUB_TABS.map((t) => (
            <button
              key={t.key}
              data-testid={`subnav-${t.key}`}
              onClick={() => setSub(t.key)}
              className={`border-b-2 px-3 py-2 font-display text-base tracking-wide ${
                sub === t.key ? 'border-teal text-teal-dark' : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {(sub === 'box' || sub === 'person') && (
          <label className="mb-2 flex items-center gap-2 text-xs text-ink-soft">
            As of:
            <select
              value={asOf}
              onChange={(e) => setAsOf(e.target.value as ID | 'final')}
              className="rounded-sm border border-line-strong bg-panel-raised px-2 py-1 text-xs"
            >
              <option value="final">Final state</option>
              {order.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name || '(untitled)'} — {formatEventTime(e.timestamp)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {sub === 'box' && <BoxView asOfEventId={asOfEventId} />}
      {sub === 'person' && <PersonView asOfEventId={asOfEventId} />}
      {sub === 'timeline' && <ItemTimelineView selectedItemId={timelineItemId} onSelectItem={setTimelineItemId} />}
      {sub === 'matrix' && <MatrixView />}
      {sub === 'flow' && <FlowDiagram />}
    </div>
  );
}
