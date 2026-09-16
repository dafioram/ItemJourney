import { useRef, useState, type ReactNode } from 'react';
import { useStore } from '../../state/store';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ImportError } from '../../engine/serialize';

export type Tab = 'items' | 'owners' | 'events' | 'views' | 'issues';

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'items', label: 'Items', hint: 'Roster' },
  { key: 'owners', label: 'Owners', hint: 'Roster' },
  { key: 'events', label: 'Events', hint: 'Timeline' },
  { key: 'views', label: 'Views', hint: 'Browse' },
  { key: 'issues', label: 'Issues', hint: 'Verify' },
];

export function Shell({ tab, onTab, children }: { tab: Tab; onTab: (t: Tab) => void; children: ReactNode }) {
  const { project, reconciliation, issues, exportToFile, importFromFile, loadSample, resetProject, lastSavedAt } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmAction, setConfirmAction] = useState<null | 'import' | 'reset' | 'sample'>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);

  async function doImport(file: File) {
    try {
      await importFromFile(file);
      setImportErr(null);
    } catch (e) {
      setImportErr(e instanceof ImportError ? e.message : 'Could not import that file.');
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper text-ink">
      <aside className="flex w-60 shrink-0 flex-col bg-navy text-cream">
        <div className="border-b border-navy-line px-5 py-5">
          <div className="font-display text-2xl font-bold tracking-tight">MANIFEST</div>
          <div className="text-xs text-cream/60">chain-of-custody ledger</div>
        </div>

        <nav className="flex flex-col py-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              data-testid={`nav-${t.key}`}
              onClick={() => onTab(t.key)}
              className={`group flex items-center justify-between border-l-4 px-5 py-2.5 text-left transition-colors ${
                tab === t.key
                  ? 'border-teal bg-navy-soft text-cream'
                  : 'border-transparent text-cream/70 hover:border-navy-line hover:bg-navy-soft/60 hover:text-cream'
              }`}
            >
              <span className="font-display text-lg tracking-wide">{t.label}</span>
              <span className="font-data text-[10px] uppercase text-cream/40">{t.hint}</span>
              {t.key === 'issues' && issues.length > 0 && (
                <span className="ml-2 rounded-full bg-brick px-1.5 py-0.5 text-[10px] font-semibold text-cream">
                  {issues.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-navy-line px-5 py-4">
          <div className="mb-3 grid grid-cols-2 gap-x-2 gap-y-1 font-data text-xs text-cream/80">
            <span>Total</span>
            <span className="text-right" data-testid="tally-total">{reconciliation.total}</span>
            <span>Active</span>
            <span className="text-right text-teal-soft" data-testid="tally-active">{reconciliation.active}</span>
            <span>Pending</span>
            <span className="text-right text-mustard-soft" data-testid="tally-pending">{reconciliation.pending}</span>
            <span>Removed</span>
            <span className="text-right text-brick-soft" data-testid="tally-removed">{reconciliation.removed}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Button variant="secondary" className="w-full !bg-navy-soft !text-cream !border-navy-line hover:!border-teal" data-testid="export-project-btn"
              onClick={exportToFile}>
              Save project (.json)
            </Button>
            <Button
              variant="secondary"
              className="w-full !bg-navy-soft !text-cream !border-navy-line hover:!border-teal"
              data-testid="import-project-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Import project...
            </Button>
            <input
              ref={fileInputRef}
              data-testid="import-project-input"
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                if (project.items.length > 0) {
                  setPendingFile(file);
                  setConfirmAction('import');
                } else {
                  doImport(file);
                }
              }}
            />
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                className="flex-1 !text-cream/60 hover:!bg-navy-soft hover:!text-cream"
                data-testid="load-sample-btn"
                onClick={() => (project.items.length > 0 ? setConfirmAction('sample') : loadSample())}
              >
                Sample
              </Button>
              <Button
                variant="ghost"
                className="flex-1 !text-cream/60 hover:!bg-navy-soft hover:!text-cream"
                data-testid="reset-project-btn"
                onClick={() => setConfirmAction('reset')}
              >
                Reset
              </Button>
            </div>
          </div>
          <div className="mt-3 font-data text-[10px] text-cream/40">
            {lastSavedAt ? `Autosaved ${lastSavedAt.toLocaleTimeString()}` : 'Not yet saved'}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">{children}</div>
      </main>

      {importErr && (
        <ConfirmDialog
          title="Import failed"
          message={importErr}
          confirmLabel="OK"
          onConfirm={() => setImportErr(null)}
          onCancel={() => setImportErr(null)}
        />
      )}

      {confirmAction === 'import' && pendingFile && (
        <ConfirmDialog
          title="Replace current project?"
          message="Importing a file replaces everything currently in the app - items, owners, boxes, and events. This can't be undone. Make sure you've saved your current project first if you want to keep it."
          confirmLabel="Replace and import"
          danger
          onConfirm={() => {
            doImport(pendingFile);
            setPendingFile(null);
            setConfirmAction(null);
          }}
          onCancel={() => {
            setPendingFile(null);
            setConfirmAction(null);
          }}
        />
      )}

      {confirmAction === 'sample' && (
        <ConfirmDialog
          title="Load sample project?"
          message="This replaces everything currently in the app with a worked example. This can't be undone."
          confirmLabel="Replace with sample"
          danger
          onConfirm={() => {
            loadSample();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === 'reset' && (
        <ConfirmDialog
          title="Reset project?"
          message="This clears everything currently in the app - items, owners, boxes, and events. This can't be undone."
          confirmLabel="Reset"
          danger
          onConfirm={() => {
            resetProject();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
