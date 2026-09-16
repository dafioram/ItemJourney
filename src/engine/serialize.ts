import type { Project } from './types';

export const CURRENT_SCHEMA_VERSION = 1;

export interface SaveFile {
  fileFormat: 'manifest-tracker';
  schemaVersion: number;
  exportedAt: string;
  project: Project;
}

export function exportProject(project: Project): SaveFile {
  return {
    fileFormat: 'manifest-tracker',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project,
  };
}

export class ImportError extends Error {}

/** Parses and lightly validates an uploaded save file. Throws ImportError with a human-readable message on failure. */
export function importProject(raw: unknown): Project {
  if (typeof raw !== 'object' || raw === null) {
    throw new ImportError('That file is not a valid project export - it does not contain a JSON object.');
  }
  const data = raw as Partial<SaveFile> & { project?: unknown };

  if (data.fileFormat !== 'manifest-tracker' || !data.project) {
    throw new ImportError('That file does not look like a manifest tracker project export.');
  }
  if (typeof data.schemaVersion !== 'number') {
    throw new ImportError('Missing schema version in the file.');
  }
  if (data.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new ImportError(
      `This file was saved by a newer version of the app (schema v${data.schemaVersion}). Loading it here may lose data.`,
    );
  }

  const project = data.project as Project;
  if (!Array.isArray(project.items) || !Array.isArray(project.events) || !Array.isArray(project.owners) || !Array.isArray(project.containers)) {
    throw new ImportError('The project data in this file is incomplete or corrupted.');
  }

  return {
    schemaVersion: 1,
    items: project.items,
    owners: project.owners,
    containers: project.containers,
    initialContainers: project.initialContainers ?? {},
    events: project.events,
  };
}
