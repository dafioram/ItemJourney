import type { Project } from './types';

/**
 * A worked example matching the "pack, reorganize, shuffle, deliver" scenario,
 * with a couple of extra edge cases (a pending item that never ships, and an
 * item that gets removed along the way) so every view has something to show.
 */
export function buildSampleProject(): Project {
  const items = [
    { id: 'it-passport', name: 'Passport' },
    { id: 'it-camera', name: 'Camera' },
    { id: 'it-laptop', name: 'Laptop' },
    { id: 'it-charger', name: 'Charger' },
    { id: 'it-wallet', name: 'Wallet' },
    { id: 'it-keys', name: 'Keys' },
    { id: 'it-book', name: 'Book' },
    { id: 'it-headphones', name: 'Headphones' },
    { id: 'it-umbrella', name: 'Umbrella' },
    { id: 'it-watch', name: 'Watch' },
    { id: 'it-battery', name: 'Spare Battery' }, // stays Pending the whole time on purpose
  ];

  const owners = [
    { id: 'ow-ava', name: 'Ava' },
    { id: 'ow-johnny', name: 'Johnny' },
    { id: 'ow-bill', name: 'Bill' },
    { id: 'ow-priya', name: 'Priya' },
  ];

  const containers = [
    { id: 'bx-1', name: 'Box 1' },
    { id: 'bx-2', name: 'Box 2' },
    { id: 'bx-3', name: 'Box 3' },
    { id: 'bx-4', name: 'Box 4' },
  ];

  const initialContainers: Project['initialContainers'] = {
    'it-passport': { kind: 'reserved', value: 'None' },
    'it-camera': { kind: 'reserved', value: 'None' },
    'it-laptop': { kind: 'reserved', value: 'None' },
    'it-charger': { kind: 'reserved', value: 'None' },
    'it-wallet': { kind: 'reserved', value: 'None' },
    'it-keys': { kind: 'reserved', value: 'None' },
    'it-book': { kind: 'reserved', value: 'None' },
    'it-headphones': { kind: 'reserved', value: 'None' },
    'it-umbrella': { kind: 'reserved', value: 'None' },
    'it-watch': { kind: 'reserved', value: 'None' },
    'it-battery': { kind: 'reserved', value: 'Pending' },
  };

  const box = (id: string) => ({ kind: 'box' as const, containerId: id });
  const none = { kind: 'reserved' as const, value: 'None' as const };
  const removed = { kind: 'reserved' as const, value: 'Removed' as const };

  const events: Project['events'] = [
    {
      id: 'ev-pack',
      name: 'Pack for shipping',
      timestamp: '2026-01-01T09:00:00-08:00',
      changes: [
        { itemId: 'it-passport', ownerId: 'ow-ava', container: box('bx-1') },
        { itemId: 'it-camera', ownerId: 'ow-ava', container: box('bx-1') },
        { itemId: 'it-laptop', ownerId: 'ow-ava', container: box('bx-1') },
        { itemId: 'it-charger', ownerId: 'ow-ava', container: box('bx-1') },
        { itemId: 'it-wallet', ownerId: 'ow-ava', container: box('bx-1') },
        { itemId: 'it-keys', ownerId: 'ow-ava', container: box('bx-1') },
        { itemId: 'it-book', ownerId: 'ow-ava', container: box('bx-2') },
        { itemId: 'it-headphones', ownerId: 'ow-ava', container: box('bx-2') },
        { itemId: 'it-umbrella', ownerId: 'ow-ava', container: box('bx-2') },
        { itemId: 'it-watch', ownerId: 'ow-ava', container: box('bx-2') },
      ],
    },
    {
      id: 'ev-reorg',
      name: 'Reorganize into three boxes',
      timestamp: '2026-01-03T10:00:00-08:00',
      changes: [
        { itemId: 'it-laptop', ownerId: 'ow-ava', container: box('bx-3') },
        { itemId: 'it-charger', ownerId: 'ow-ava', container: box('bx-3') },
        { itemId: 'it-book', ownerId: 'ow-ava', container: box('bx-3') },
        { itemId: 'it-headphones', ownerId: 'ow-ava', container: box('bx-1') },
      ],
    },
    {
      id: 'ev-meet-johnny',
      name: 'Meet Johnny at the bar',
      timestamp: '2026-01-05T18:00:00-08:00',
      changes: [
        { itemId: 'it-passport', ownerId: 'ow-johnny', container: none },
        { itemId: 'it-wallet', ownerId: 'ow-johnny', container: none },
      ],
    },
    {
      id: 'ev-meet-bill',
      name: 'Meet Bill at the bar',
      timestamp: '2026-01-05T18:00:00-08:00',
      changes: [
        { itemId: 'it-watch', ownerId: 'ow-bill', container: none },
      ],
    },
    {
      id: 'ev-open-box1',
      name: 'Open Box 1, merge remainder into Box 4',
      timestamp: '2026-01-06T12:00:00-08:00',
      changes: [
        { itemId: 'it-camera', ownerId: 'ow-priya', container: box('bx-4') },
        { itemId: 'it-keys', ownerId: 'ow-priya', container: box('bx-4') },
        { itemId: 'it-headphones', ownerId: 'ow-priya', container: box('bx-4') },
      ],
    },
    {
      id: 'ev-shuffle',
      name: 'Courier shuffle',
      timestamp: '2026-01-08T15:00:00-08:00',
      changes: [
        { itemId: 'it-laptop', ownerId: 'ow-priya', container: box('bx-4') },
        { itemId: 'it-charger', ownerId: 'ow-priya', container: box('bx-4') },
        { itemId: 'it-book', ownerId: 'ow-priya', container: box('bx-3') },
        { itemId: 'it-umbrella', ownerId: 'ow-priya', container: removed },
      ],
    },
    {
      id: 'ev-final-delivery',
      name: 'Final delivery - open everything',
      timestamp: '2026-01-10T09:00:00-08:00',
      changes: [
        { itemId: 'it-camera', ownerId: 'ow-priya', container: none },
        { itemId: 'it-keys', ownerId: 'ow-priya', container: none },
        { itemId: 'it-headphones', ownerId: 'ow-priya', container: none },
        { itemId: 'it-laptop', ownerId: 'ow-priya', container: none },
        { itemId: 'it-charger', ownerId: 'ow-priya', container: none },
        { itemId: 'it-book', ownerId: 'ow-priya', container: none },
      ],
    },
  ];

  const project: Project = {
    schemaVersion: 1,
    items,
    owners,
    containers,
    initialContainers,
    events,
  };
  return project;
}
