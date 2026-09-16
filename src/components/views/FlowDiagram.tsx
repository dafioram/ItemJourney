import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { computeFlowLayout } from '../../engine/flowLayout';

const COL_WIDTH = 176;
const LANE_HEIGHT = 56;
const HEADER_HEIGHT = 56;
const LANE_LABEL_WIDTH = 152;

const LANE_TINTS: Record<string, string> = {
  pending: '#f1e4c4',
  removed: '#f0dad5',
};

export function FlowDiagram() {
  const { project, timeline } = useStore();
  const layout = useMemo(() => computeFlowLayout(project, timeline), [project, timeline]);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [filterOwnerId, setFilterOwnerId] = useState<string>('');
  const [filterBox, setFilterBox] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const width = LANE_LABEL_WIDTH + layout.columns.length * COL_WIDTH;
  const height = HEADER_HEIGHT + layout.lanes.length * LANE_HEIGHT;
  const laneY = (laneKey: string) => HEADER_HEIGHT + layout.lanes.findIndex((l) => l.key === laneKey) * LANE_HEIGHT + LANE_HEIGHT / 2;
  const colX = (idx: number) => idx * COL_WIDTH + COL_WIDTH / 2;

  function itemMatchesFilter(itemId: string): boolean {
    if (!filterOwnerId && !filterBox) return true;
    const snaps = timeline.get(itemId) ?? [];
    const final = snaps[snaps.length - 1];
    if (filterOwnerId && final?.ownerId !== filterOwnerId) return false;
    if (filterBox) {
      const inBox = final?.container.kind === 'box' && final.container.containerId === filterBox;
      if (!inBox) return false;
    }
    return true;
  }

  const anyFilterActive = Boolean(focusItemId || filterOwnerId || filterBox);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-line-strong bg-panel p-3">
        <label className="text-xs text-ink-soft">
          Focus item
          <select
            value={focusItemId ?? ''}
            onChange={(e) => setFocusItemId(e.target.value || null)}
            className="ml-2 rounded-sm border border-line-strong bg-panel-raised px-2 py-1"
          >
            <option value="">None</option>
            {project.items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-soft">
          Filter by owner
          <select
            value={filterOwnerId}
            onChange={(e) => setFilterOwnerId(e.target.value)}
            className="ml-2 rounded-sm border border-line-strong bg-panel-raised px-2 py-1"
          >
            <option value="">All</option>
            {project.owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-soft">
          Filter by box (final state)
          <select
            value={filterBox}
            onChange={(e) => setFilterBox(e.target.value)}
            className="ml-2 rounded-sm border border-line-strong bg-panel-raised px-2 py-1"
          >
            <option value="">All</option>
            {project.containers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {layout.staticItemIds.length > 0 && (
          <span className="font-data text-xs text-ink-faint">{layout.staticItemIds.length} item(s) never moved</span>
        )}
      </div>

      {layout.columns.length < 2 ? (
        <p className="text-sm text-ink-soft">Add at least one event to see the flow.</p>
      ) : (
        <div className="flex overflow-hidden rounded border border-line-strong">
          <div className="shrink-0 bg-panel-raised" style={{ width: LANE_LABEL_WIDTH }}>
            <div style={{ height: HEADER_HEIGHT }} className="border-b border-line-strong" />
            {layout.lanes.map((lane) => (
              <div
                key={lane.key}
                style={{ height: LANE_HEIGHT }}
                className="flex items-center border-b border-line px-3 text-xs font-medium text-ink-soft"
              >
                {lane.label}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <svg width={width} height={height} role="img" aria-label="Item flow diagram">
              {layout.lanes.map((lane, li) => (
                <rect
                  key={lane.key}
                  x={0}
                  y={HEADER_HEIGHT + li * LANE_HEIGHT}
                  width={width}
                  height={LANE_HEIGHT}
                  fill={LANE_TINTS[lane.key] ?? (li % 2 === 0 ? '#f1ede1' : '#faf8f2')}
                  opacity={0.6}
                />
              ))}

              {layout.columns.map((col, ci) => (
                <g key={col.key}>
                  <line x1={colX(ci)} y1={HEADER_HEIGHT} x2={colX(ci)} y2={height} stroke="#c9c2ae" strokeWidth={1} />
                  <foreignObject x={ci * COL_WIDTH} y={0} width={COL_WIDTH} height={HEADER_HEIGHT}>
                    <div className="flex h-full flex-col items-center justify-center px-1 text-center">
                      <div className="truncate font-data text-[10px] text-ink-faint">{col.label}</div>
                      {col.eventNames.slice(0, 2).map((n, i) => (
                        <div key={i} className="truncate text-[11px] font-medium leading-tight">
                          {n}
                        </div>
                      ))}
                    </div>
                  </foreignObject>
                </g>
              ))}

              {/* Bundled transitions */}
              {layout.transitions.map((t, idx) => {
                const key = `${t.fromColIndex}:${t.fromLane}:${t.toLane}`;
                const isExpanded = expanded.has(key);
                const x1 = colX(t.fromColIndex);
                const x2 = colX(t.toColIndex);
                const y1 = laneY(t.fromLane);
                const y2 = laneY(t.toLane);
                const matchCount = t.itemIds.filter(itemMatchesFilter).length;
                const dimmed = anyFilterActive && matchCount === 0 && !t.itemIds.includes(focusItemId ?? '');
                const involvesFocus = focusItemId && t.itemIds.includes(focusItemId);

                if (isExpanded) {
                  return (
                    <g key={idx} opacity={dimmed ? 0.15 : 1}>
                      {t.itemIds.map((id, i) => {
                        const spread = (i - (t.itemIds.length - 1) / 2) * 5;
                        const item = project.items.find((p) => p.id === id);
                        return (
                          <path
                            key={id}
                            d={`M ${x1} ${y1 + spread} C ${(x1 + x2) / 2} ${y1 + spread}, ${(x1 + x2) / 2} ${y2 + spread}, ${x2} ${y2 + spread}`}
                            fill="none"
                            stroke={id === focusItemId ? '#2f6b63' : '#a89f85'}
                            strokeWidth={id === focusItemId ? 2.5 : 1}
                          >
                            <title>{item?.name}</title>
                          </path>
                        );
                      })}
                      <rect
                        x={(x1 + x2) / 2 - 10}
                        y={(y1 + y2) / 2 - 8}
                        width={20}
                        height={16}
                        rx={3}
                        fill="#202a33"
                        className="cursor-pointer"
                        onClick={() => setExpanded((s) => { const n = new Set(s); n.delete(key); return n; })}
                      />
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 + 4}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#ede7d6"
                        className="pointer-events-none select-none"
                      >
                        −
                      </text>
                    </g>
                  );
                }

                return (
                  <g key={idx} opacity={dimmed ? 0.15 : 1}>
                    <path
                      d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={involvesFocus ? '#2f6b63' : '#5b5647'}
                      strokeWidth={involvesFocus ? 3 : Math.min(1 + Math.log2(t.itemIds.length + 1), 6)}
                      opacity={involvesFocus ? 1 : 0.55}
                    />
                    <rect
                      x={(x1 + x2) / 2 - 11}
                      y={(y1 + y2) / 2 - 8}
                      width={22}
                      height={16}
                      rx={3}
                      fill="#faf8f2"
                      stroke="#a89f85"
                      className="cursor-pointer"
                      onClick={() => setExpanded((s) => new Set(s).add(key))}
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 + 4}
                      textAnchor="middle"
                      fontSize={10}
                      className="pointer-events-none select-none"
                      fill="#23262b"
                    >
                      ×{t.itemIds.length}
                    </text>
                  </g>
                );
              })}

              {/* Node counts per lane per column */}
              {layout.columns.map((col, ci) =>
                layout.lanes.map((lane) => {
                  const n = layout.counts.get(lane.key)?.[ci] ?? 0;
                  if (n === 0) return null;
                  return (
                    <circle
                      key={`${col.key}:${lane.key}`}
                      cx={colX(ci)}
                      cy={laneY(lane.key)}
                      r={Math.min(6 + Math.sqrt(n) * 2, 20)}
                      fill="#ffffff"
                      stroke="#23262b"
                      strokeWidth={1}
                      opacity={0.9}
                    >
                      <title>
                        {n} item(s) in {lane.label} at {col.label}
                      </title>
                    </circle>
                  );
                }),
              )}
              {layout.columns.map((col, ci) =>
                layout.lanes.map((lane) => {
                  const n = layout.counts.get(lane.key)?.[ci] ?? 0;
                  if (n === 0) return null;
                  return (
                    <text
                      key={`t-${col.key}:${lane.key}`}
                      x={colX(ci)}
                      y={laneY(lane.key) + 3}
                      textAnchor="middle"
                      fontSize={10}
                      className="pointer-events-none select-none"
                      fill="#23262b"
                    >
                      {n}
                    </text>
                  );
                }),
              )}
            </svg>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-ink-faint">
        Each lane is a box (or Pending / Unboxed / Removed). Circles show how many items sit in a lane at that point in
        time; connecting lines show bundled moves between lanes, labeled with a count - click a count to expand it into
        individual item threads. Items that never change lane don't draw a line at all, which is why a fully static
        project looks empty here.
      </p>
    </div>
  );
}
