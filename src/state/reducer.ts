import { applyCsvImport, type CsvParseResult } from '../engine/csv';
import type { Container, ContainerRef, EventRecord, ID, Item, Owner, Project } from '../engine/types';

export type Action =
  | { type: 'SET_PROJECT'; project: Project }
  | { type: 'ADD_ITEM'; item: Item; initialContainer: ContainerRef }
  | { type: 'IMPORT_CSV'; result: CsvParseResult }
  | { type: 'ADD_OWNER'; owner: Owner }
  | { type: 'RENAME_OWNER'; id: ID; name: string }
  | { type: 'DELETE_OWNER'; id: ID }
  | { type: 'ADD_CONTAINER'; container: Container }
  | { type: 'ADD_EVENT'; event: EventRecord }
  | { type: 'UPDATE_EVENT_META'; eventId: ID; name: string; timestamp: string }
  | { type: 'DELETE_EVENT'; eventId: ID }
  | { type: 'SET_EVENT_CHANGES'; eventId: ID; changes: EventRecord['changes'] };

export function projectReducer(project: Project, action: Action): Project {
  switch (action.type) {
    case 'SET_PROJECT':
      return action.project;

    case 'ADD_ITEM':
      return {
        ...project,
        items: [...project.items, action.item],
        initialContainers: { ...project.initialContainers, [action.item.id]: action.initialContainer },
      };

    case 'IMPORT_CSV':
      return applyCsvImport(project, action.result);

    case 'ADD_OWNER':
      if (project.owners.some((o) => o.id === action.owner.id)) return project;
      return { ...project, owners: [...project.owners, action.owner] };

    case 'RENAME_OWNER':
      return {
        ...project,
        owners: project.owners.map((o) => (o.id === action.id ? { ...o, name: action.name } : o)),
      };

    case 'DELETE_OWNER':
      return { ...project, owners: project.owners.filter((o) => o.id !== action.id) };

    case 'ADD_CONTAINER':
      if (project.containers.some((c) => c.id === action.container.id)) return project;
      return { ...project, containers: [...project.containers, action.container] };

    case 'ADD_EVENT':
      return { ...project, events: [...project.events, action.event] };

    case 'UPDATE_EVENT_META':
      return {
        ...project,
        events: project.events.map((e) =>
          e.id === action.eventId ? { ...e, name: action.name, timestamp: action.timestamp } : e,
        ),
      };

    case 'DELETE_EVENT':
      return { ...project, events: project.events.filter((e) => e.id !== action.eventId) };

    case 'SET_EVENT_CHANGES':
      return {
        ...project,
        events: project.events.map((e) => (e.id === action.eventId ? { ...e, changes: action.changes } : e)),
      };

    default:
      return project;
  }
}
