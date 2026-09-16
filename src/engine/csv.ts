import Papa from 'papaparse';
import { isReservedName, type Container, type ContainerRef, type Item, type Project } from './types';
import { makeId } from './id';

export type BoxDescriptor = { type: 'none' } | { type: 'pending' } | { type: 'box'; name: string };

export interface ParsedCsvRow {
  itemName: string;
  box: BoxDescriptor;
  sourceLine: number;
}

export interface CsvRowError {
  sourceLine: number;
  message: string;
}

export interface CsvParseResult {
  itemsToCreate: ParsedCsvRow[];
  errors: CsvRowError[];
  distinctBoxNames: string[];
  rowCount: number;
}

const NAME_HEADERS = ['name', 'item', 'item name', 'itemname'];
const QTY_HEADERS = ['quantity', 'qty', 'count'];
const BOX_HEADERS = ['box', 'box name', 'container', 'boxname'];

function findHeader(fields: string[], candidates: string[]): string | null {
  const lower = fields.map((f) => f.trim().toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c);
    if (idx !== -1) return fields[idx];
  }
  return null;
}

function parseBoxCell(raw: string | undefined): { box: BoxDescriptor; error?: string } {
  const val = (raw ?? '').trim();
  if (val === '' || val.toLowerCase() === 'none') return { box: { type: 'none' } };
  if (val.toLowerCase() === 'pending') return { box: { type: 'pending' } };
  if (val.toLowerCase() === 'removed') {
    return { box: { type: 'none' }, error: "Box can't be \"Removed\" for a newly seeded item; treated as None." };
  }
  return { box: { type: 'box', name: val } };
}

export function parseCsv(text: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const fields = parsed.meta.fields ?? [];
  const nameHeader = findHeader(fields, NAME_HEADERS);
  const qtyHeader = findHeader(fields, QTY_HEADERS);
  const boxHeader = findHeader(fields, BOX_HEADERS);

  const errors: CsvRowError[] = [];
  const itemsToCreate: ParsedCsvRow[] = [];
  const distinctBoxNames = new Set<string>();

  if (!nameHeader) {
    errors.push({ sourceLine: 0, message: 'No "name" column found. Expected a column named name, item, or item name.' });
    return { itemsToCreate, errors, distinctBoxNames: [], rowCount: 0 };
  }

  parsed.data.forEach((row, i) => {
    const sourceLine = i + 2; // +1 header row, +1 for 1-based
    const rawName = (row[nameHeader] ?? '').trim();
    if (!rawName) {
      errors.push({ sourceLine, message: 'Missing item name.' });
      return;
    }

    let qty = 1;
    if (qtyHeader) {
      const rawQty = (row[qtyHeader] ?? '').trim();
      if (rawQty !== '') {
        const n = Number(rawQty);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
          errors.push({ sourceLine, message: `Invalid quantity "${rawQty}" - must be a whole number of 1 or more.` });
          return;
        }
        qty = n;
      }
    }

    const rawBox = boxHeader ? row[boxHeader] : undefined;
    const { box, error } = parseBoxCell(rawBox);
    if (error) errors.push({ sourceLine, message: error });
    if (box.type === 'box') distinctBoxNames.add(box.name);

    if (qty === 1) {
      itemsToCreate.push({ itemName: rawName, box, sourceLine });
    } else {
      for (let n = 1; n <= qty; n += 1) {
        itemsToCreate.push({ itemName: `${rawName} ${n}`, box, sourceLine });
      }
    }
  });

  return { itemsToCreate, errors, distinctBoxNames: [...distinctBoxNames], rowCount: parsed.data.length };
}

/** Applies a parsed CSV result to a project: creates items, auto-creates referenced boxes, sets initial containers. */
export function applyCsvImport(project: Project, result: CsvParseResult): Project {
  const containers = [...project.containers];
  const containerByName = new Map(containers.map((c) => [c.name, c] as const));

  function resolveBoxRef(box: BoxDescriptor): ContainerRef {
    if (box.type === 'none') return { kind: 'reserved', value: 'None' };
    if (box.type === 'pending') return { kind: 'reserved', value: 'Pending' };
    const existing = containerByName.get(box.name);
    if (existing) return { kind: 'box', containerId: existing.id };
    if (isReservedName(box.name)) return { kind: 'reserved', value: 'None' };
    const created: Container = { id: makeId('box'), name: box.name };
    containers.push(created);
    containerByName.set(created.name, created);
    return { kind: 'box', containerId: created.id };
  }

  const newItems: Item[] = [];
  const initialContainers = { ...project.initialContainers };

  for (const row of result.itemsToCreate) {
    const item: Item = { id: makeId('item'), name: row.itemName };
    newItems.push(item);
    initialContainers[item.id] = resolveBoxRef(row.box);
  }

  return {
    ...project,
    items: [...project.items, ...newItems],
    containers,
    initialContainers,
  };
}
