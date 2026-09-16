import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { makeId } from '../../engine/id';
import { Button } from '../common/Button';

export function OwnersScreen() {
  const { project, dispatch, timeline } = useStore();
  const [name, setName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const usageCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const snaps of timeline.values()) {
      const last = snaps[snaps.length - 1];
      if (last?.ownerId) counts.set(last.ownerId, (counts.get(last.ownerId) ?? 0) + 1);
    }
    return counts;
  }, [timeline]);

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_OWNER', owner: { id: makeId('owner'), name: trimmed } });
    setName('');
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-4xl font-bold tracking-tight">Owners</h1>
        <p className="mt-1 text-sm text-ink-soft">
          The people items can be held by. You can also add a new owner inline while editing an event.
        </p>
      </header>

      <div className="mb-6 flex items-end gap-3 rounded border border-line-strong bg-panel p-4">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="e.g. Priya"
            className="w-full rounded-sm border border-line-strong bg-panel-raised px-2 py-1.5 text-sm"
          />
        </label>
        <Button variant="primary" onClick={add} disabled={!name.trim()}>
          Add owner
        </Button>
      </div>

      {project.owners.length === 0 ? (
        <div className="rounded border border-dashed border-line-strong bg-panel/50 px-6 py-10 text-center text-ink-soft">
          No owners yet.
        </div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Currently holding</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {project.owners.map((o) => (
              <tr key={o.id} className="ledger-rule border-b hover:bg-panel">
                <td className="py-2 pr-3 font-medium">
                  {renamingId === o.id ? (
                    <input
                      autoFocus
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          dispatch({ type: 'RENAME_OWNER', id: o.id, name: renameText.trim() || o.name });
                          setRenamingId(null);
                        }
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={() => {
                        dispatch({ type: 'RENAME_OWNER', id: o.id, name: renameText.trim() || o.name });
                        setRenamingId(null);
                      }}
                      className="rounded-sm border border-teal bg-panel-raised px-1.5 py-0.5 text-sm"
                    />
                  ) : (
                    o.name
                  )}
                </td>
                <td className="py-2 pr-3 font-data text-xs text-ink-soft">{usageCount.get(o.id) ?? 0} item(s)</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => {
                      setRenamingId(o.id);
                      setRenameText(o.name);
                    }}
                    className="mr-3 text-xs font-medium text-teal-dark hover:underline"
                  >
                    Rename
                  </button>
                  <button
                    disabled={(usageCount.get(o.id) ?? 0) > 0}
                    onClick={() => dispatch({ type: 'DELETE_OWNER', id: o.id })}
                    title={(usageCount.get(o.id) ?? 0) > 0 ? "Can't delete - still holding items" : 'Delete'}
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
    </div>
  );
}
