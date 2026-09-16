import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import type { IssueType } from '../../engine/validate';

const TYPE_LABELS: Record<IssueType, string> = {
  'missing-owner-activation': 'Missing owner at activation',
  'missing-owner-removal': 'Missing owner at removal',
  'backward-transition': 'Backward status change',
  'container-owner-conflict': 'Box has more than one owner',
  'simultaneous-conflict': 'Ambiguous simultaneous order',
  'duplicate-change-in-event': 'Duplicate row in event',
  'reserved-name-conflict': 'Reserved name conflict',
};

export function IssuesPanel({ onOpenEvent }: { onOpenEvent: (eventId: string) => void }) {
  const { project, issues, reconciliation } = useStore();
  const [filterType, setFilterType] = useState<IssueType | ''>('');

  const grouped = useMemo(() => {
    const counts = new Map<IssueType, number>();
    for (const i of issues) counts.set(i.type, (counts.get(i.type) ?? 0) + 1);
    return counts;
  }, [issues]);

  const visible = filterType ? issues.filter((i) => i.type === filterType) : issues;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-4xl font-bold tracking-tight">Issues &amp; reconciliation</h1>
        <p className="mt-1 text-sm text-ink-soft">Everything the app has flagged, plus whether every item is accounted for.</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total items" value={reconciliation.total} />
        <StatCard label="Active" value={reconciliation.active} tone="teal" />
        <StatCard label="Pending" value={reconciliation.pending} tone="mustard" />
        <StatCard label="Removed" value={reconciliation.removed} tone="brick" />
      </div>

      <div
        className={`mb-6 rounded border px-4 py-3 text-sm ${
          issues.length === 0 ? 'border-teal bg-teal-soft text-teal-dark' : 'border-brick bg-brick-soft text-brick-dark'
        }`}
      >
        {issues.length === 0 ? (
          <>
            ✓ {reconciliation.total} of {reconciliation.total} items accounted for ({reconciliation.active} active,{' '}
            {reconciliation.removed} removed, {reconciliation.pending} still pending). No issues flagged.
          </>
        ) : (
          <>
            ⚑ {issues.length} issue{issues.length === 1 ? '' : 's'} flagged below. All {reconciliation.total} items are
            still individually accounted for (present, removed, or pending) - these are data-quality flags, not missing
            items.
          </>
        )}
      </div>

      {reconciliation.stillPendingItemIds.length > 0 && (
        <div className="mb-6 rounded border border-mustard bg-mustard-soft px-4 py-3 text-sm text-mustard-dark">
          {reconciliation.stillPendingItemIds.length} item(s) are still Pending at the end - planned, but never brought
          in by any event:{' '}
          {reconciliation.stillPendingItemIds.map((id) => project.items.find((i) => i.id === id)?.name).join(', ')}
        </div>
      )}

      {issues.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('')}
              className={`rounded-full border px-3 py-1 text-xs ${
                filterType === '' ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line-strong text-ink-soft'
              }`}
            >
              All ({issues.length})
            </button>
            {[...grouped.entries()].map(([type, count]) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  filterType === type ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line-strong text-ink-soft'
                }`}
              >
                {TYPE_LABELS[type]} ({count})
              </button>
            ))}
          </div>

          <ul className="space-y-2">
            {visible.map((issue) => (
              <li key={issue.id} className="rounded border border-line-strong bg-panel p-3 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brick-dark">
                  {TYPE_LABELS[issue.type]}
                </div>
                <div>{issue.message}</div>
                {issue.eventIds.length > 0 && (
                  <div className="mt-1 flex gap-2">
                    {issue.eventIds.map((eid) => (
                      <button
                        key={eid}
                        onClick={() => onOpenEvent(eid)}
                        className="text-xs font-medium text-teal-dark hover:underline"
                      >
                        Open "{project.events.find((e) => e.id === eid)?.name || '(untitled)'}" →
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'teal' | 'mustard' | 'brick' }) {
  const toneClass = tone === 'teal' ? 'text-teal-dark' : tone === 'mustard' ? 'text-mustard-dark' : tone === 'brick' ? 'text-brick-dark' : 'text-ink';
  return (
    <div className="rounded border border-line-strong bg-panel p-3">
      <div className="font-data text-xs uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`font-display text-3xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
