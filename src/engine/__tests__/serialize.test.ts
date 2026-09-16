import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../types';
import { exportProject, importProject, ImportError } from '../serialize';

describe('export/import round-trip', () => {
  it('round-trips a project through export then import unchanged', () => {
    const project = createEmptyProject();
    project.items.push({ id: 'i1', name: 'Ball 1' });
    project.owners.push({ id: 'o1', name: 'Johnny' });
    project.initialContainers.i1 = { kind: 'reserved', value: 'None' };

    const saveFile = exportProject(project);
    const json = JSON.parse(JSON.stringify(saveFile));
    const reimported = importProject(json);

    expect(reimported).toEqual(project);
  });

  it('rejects a file missing the fileFormat marker', () => {
    expect(() => importProject({ schemaVersion: 1, project: {} })).toThrow(ImportError);
  });

  it('rejects a file from a newer, unrecognized schema version', () => {
    const project = createEmptyProject();
    expect(() =>
      importProject({ fileFormat: 'manifest-tracker', schemaVersion: 99, project }),
    ).toThrow(/newer version/);
  });

  it('rejects non-object input', () => {
    expect(() => importProject('just a string')).toThrow(ImportError);
    expect(() => importProject(null)).toThrow(ImportError);
  });

  it('rejects a project payload missing required arrays', () => {
    expect(() =>
      importProject({ fileFormat: 'manifest-tracker', schemaVersion: 1, project: { items: [] } }),
    ).toThrow(/incomplete or corrupted/);
  });
});
