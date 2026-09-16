import { useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { parseCsv, type CsvParseResult } from '../../engine/csv';
import { useStore } from '../../state/store';

const TEMPLATE = 'name,quantity,box\nPassport,1,\nBall,5,Box 1\nSpare Battery,1,pending\n';

export function CsvImportDialog({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore();
  const [raw, setRaw] = useState('');
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function parse(text: string) {
    setRaw(text);
    setResult(text.trim() ? parseCsv(text) : null);
  }

  function commit() {
    if (!result || result.itemsToCreate.length === 0) return;
    dispatch({ type: 'IMPORT_CSV', result });
    onClose();
  }

  return (
    <Modal title="Import items from CSV" onClose={onClose} wide>
      <p className="text-sm text-ink-soft">
        Columns: <code className="font-data">name</code> (required), <code className="font-data">quantity</code> (optional,
        default 1 - each unit becomes its own numbered item), and <code className="font-data">box</code> (optional - blank or
        "none" for unboxed, "pending" for not-yet-introduced, or a box name; boxes that don't exist yet are created
        automatically). This is a one-time initial seed only.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          Upload .csv file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            parse(await file.text());
          }}
        />
        <button className="text-xs text-teal-dark hover:underline" onClick={() => parse(TEMPLATE)}>
          Use example template
        </button>
      </div>

      <textarea
        value={raw}
        data-testid="csv-textarea"
        onChange={(e) => parse(e.target.value)}
        placeholder={TEMPLATE}
        rows={8}
        className="mt-3 w-full rounded-sm border border-line-strong bg-panel-raised px-2 py-2 font-data text-xs"
      />

      {result && (
        <div className="mt-4 rounded border border-line-strong bg-panel p-3">
          <div className="flex flex-wrap gap-4 font-data text-xs text-ink-soft">
            <span>
              Rows read: <strong className="text-ink">{result.rowCount}</strong>
            </span>
            <span>
              Items to create: <strong className="text-ink">{result.itemsToCreate.length}</strong>
            </span>
            <span>
              New boxes referenced: <strong className="text-ink">{result.distinctBoxNames.length || 0}</strong>
              {result.distinctBoxNames.length > 0 && ` (${result.distinctBoxNames.join(', ')})`}
            </span>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-2 rounded border border-brick/50 bg-brick-soft/60 p-2">
              <div className="text-xs font-semibold text-brick-dark">Row issues (these rows were skipped or adjusted):</div>
              <ul className="mt-1 list-inside list-disc text-xs text-brick-dark">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Line {e.sourceLine}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.itemsToCreate.length > 0 && (
            <div className="mt-3 max-h-40 overflow-auto font-data text-xs">
              {result.itemsToCreate.map((r, i) => (
                <div key={i} className="flex justify-between border-b border-line py-0.5">
                  <span>{r.itemName}</span>
                  <span className="text-ink-faint">{r.box.type === 'box' ? r.box.name : r.box.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" data-testid="commit-csv-import-btn" onClick={commit} disabled={!result || result.itemsToCreate.length === 0}>
          Import {result?.itemsToCreate.length ?? 0} item{result?.itemsToCreate.length === 1 ? '' : 's'}
        </Button>
      </div>
    </Modal>
  );
}
