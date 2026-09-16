import { useState } from 'react';
import { useStore } from '../../state/store';
import { chronological } from '../../engine/resolve';
import { makeId } from '../../engine/id';
import type { ID } from '../../engine/types';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EventEditor } from './EventEditor';
import { formatEventTime } from './datetime';

export function EventsScreen({
  editingId,
  onSetEditingId,
}: {
  editingId: ID | null;
  onSetEditingId: (id: ID | null) => void;
}) {
  const { project, dispatch, issues } = useStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<ID | null>(null);
  const setEditingId = onSetEditingId;

  if (editingId) {
    return <EventEditor eventId={editingId} onDone={() => setEditingId(null)} />;
  }

  const order = chronological(project);

  function newEvent() {
    const id = makeId('event');
    dispatch({ type: 'ADD_EVENT', event: { id, name: '', timestamp: new Date().toISOString(), changes: [] } });
    setEditingId(id);
  }

  function duplicate(sourceId: ID) {
    const source = project.events.find((e) => e.id === sourceId);
    if (!source) return;
    const id = makeId('event');
    dispatch({
      type: 'ADD_EVENT',
      event: { id, name: `Copy of ${source.name || 'event'}`, timestamp: source.timestamp, changes: source.changes.map((c) => ({ ...c })) },
    });
    setEditingId(id);
  }

  function issueCountFor(eventId: ID) {
    return issues.filter((i) => i.eventIds.includes(eventId)).length;
  }

  return (
    <div>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Points in time where items change hands or boxes. Ordered by time, not by when you entered them.
          </p>
        </div>
        <Button variant="primary" data-testid="new-event-btn" onClick={newEvent}>
          + New event
        </Button>
      </header>

      {order.length === 0 ? (
        <div className="rounded border border-dashed border-line-strong bg-panel/50 px-6 py-10 text-center text-ink-soft">
          No events yet. Create one to start recording who has what, and when.
        </div>
      ) : (
        <ol className="space-y-2">
          {order.map((event, idx) => {
            const sameTimeAsPrev = idx > 0 && order[idx - 1].timestamp === event.timestamp;
            const nCount = issueCountFor(event.id);
            return (
              <li key={event.id}>
                {sameTimeAsPrev && (
                  <div className="ml-4 border-l-2 border-dashed border-line-strong pl-3 text-[10px] uppercase tracking-wide text-ink-faint">
                    same time
                  </div>
                )}
                <div
                  className="flex cursor-pointer items-center justify-between rounded border border-line-strong bg-panel px-4 py-3 hover:border-teal"
                  onClick={() => setEditingId(event.id)}
                >
                  <div>
                    <div className="font-display text-lg font-semibold">{event.name || '(untitled event)'}</div>
                    <div className="font-data text-xs text-ink-soft">
                      {formatEventTime(event.timestamp)} · {event.changes.length} item change
                      {event.changes.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {nCount > 0 && (
                      <span className="rounded-full bg-brick-soft px-2 py-0.5 font-data text-xs text-brick-dark">
                        {nCount} flag{nCount === 1 ? '' : 's'}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicate(event.id);
                      }}
                      className="text-xs font-medium text-teal-dark hover:underline"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(event.id);
                      }}
                      className="text-xs font-medium text-brick-dark hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete this event?"
          message="This removes the event and all its item changes. This can't be undone."
          confirmLabel="Delete event"
          danger
          onConfirm={() => {
            dispatch({ type: 'DELETE_EVENT', eventId: confirmDeleteId });
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
