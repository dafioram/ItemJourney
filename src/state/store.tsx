import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { makeId } from '../engine/id';
import { resolveTimeline, type ItemSnapshot } from '../engine/resolve';
import { exportProject, importProject, ImportError, type SaveFile } from '../engine/serialize';
import { createEmptyProject, isReservedName, type Container, type ID, type Owner, type Project } from '../engine/types';
import { generateIssues, reconcile, type Issue, type Reconciliation } from '../engine/validate';
import { projectReducer, type Action } from './reducer';

const STORAGE_KEY = 'manifest-tracker:autosave:v1';

interface StoreValue {
  project: Project;
  dispatch: React.Dispatch<Action>;
  timeline: Map<ID, ItemSnapshot[]>;
  issues: Issue[];
  reconciliation: Reconciliation;
  ensureOwner: (name: string) => ID;
  ensureContainer: (name: string) => ID | null; // null if name is reserved (caller should treat as sentinel instead)
  exportToFile: () => void;
  importFromFile: (file: File) => Promise<void>;
  loadSample: () => void;
  resetProject: () => void;
  lastSavedAt: Date | null;
}

const StoreContext = createContext<StoreValue | null>(null);

function loadInitialProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyProject();
    const parsed = JSON.parse(raw) as SaveFile;
    return importProject(parsed);
  } catch {
    return createEmptyProject();
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [project, dispatch] = useReducer(projectReducer, undefined, loadInitialProject);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exportProject(project)));
        setLastSavedAt(new Date());
      } catch {
        // localStorage can fail (private mode, quota). Autosave is a convenience, not the source of truth.
      }
    }, 300);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [project]);

  const timeline = useMemo(() => resolveTimeline(project), [project]);
  const issues = useMemo(() => generateIssues(project, timeline), [project, timeline]);
  const reconciliation = useMemo(() => reconcile(project, timeline), [project, timeline]);

  const ensureOwner = useCallback(
    (name: string): ID => {
      const trimmed = name.trim();
      const existing = project.owners.find((o: Owner) => o.name === trimmed);
      if (existing) return existing.id;
      const id = makeId('owner');
      dispatch({ type: 'ADD_OWNER', owner: { id, name: trimmed } });
      return id;
    },
    [project.owners],
  );

  const ensureContainer = useCallback(
    (name: string): ID | null => {
      const trimmed = name.trim();
      if (isReservedName(trimmed)) return null;
      const existing = project.containers.find((c: Container) => c.name === trimmed);
      if (existing) return existing.id;
      const id = makeId('box');
      dispatch({ type: 'ADD_CONTAINER', container: { id, name: trimmed } });
      return id;
    },
    [project.containers],
  );

  const exportToFile = useCallback(() => {
    const data = exportProject(project);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `manifest-project-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [project]);

  const importFromFile = useCallback(async (file: File) => {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ImportError('That file is not valid JSON.');
    }
    const loaded = importProject(parsed);
    dispatch({ type: 'SET_PROJECT', project: loaded });
  }, []);

  const loadSample = useCallback(() => {
    import('../engine/sampleProject').then(({ buildSampleProject }) => {
      dispatch({ type: 'SET_PROJECT', project: buildSampleProject() });
    });
  }, []);

  const resetProject = useCallback(() => {
    dispatch({ type: 'SET_PROJECT', project: createEmptyProject() });
  }, []);

  const value: StoreValue = {
    project,
    dispatch,
    timeline,
    issues,
    reconciliation,
    ensureOwner,
    ensureContainer,
    exportToFile,
    importFromFile,
    loadSample,
    resetProject,
    lastSavedAt,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
