import { useState } from 'react';
import { StoreProvider } from './state/store';
import { Shell, type Tab } from './components/layout/Shell';
import { ItemsScreen } from './components/items/ItemsScreen';
import { OwnersScreen } from './components/owners/OwnersScreen';
import { EventsScreen } from './components/events/EventsScreen';
import { ViewsScreen } from './components/views/ViewsScreen';
import { IssuesPanel } from './components/issues/IssuesPanel';
import type { ID } from './engine/types';

function AppInner() {
  const [tab, setTab] = useState<Tab>('items');
  const [editingEventId, setEditingEventId] = useState<ID | null>(null);
  const [viewsRequest, setViewsRequest] = useState<{ itemId: ID | null; seq: number }>({ itemId: null, seq: 0 });

  function openItemTimeline(itemId: ID) {
    setViewsRequest({ itemId, seq: viewsRequest.seq + 1 });
    setTab('views');
  }

  function openEventInEditor(eventId: ID) {
    setEditingEventId(eventId);
    setTab('events');
  }

  return (
    <Shell tab={tab} onTab={setTab}>
      {tab === 'items' && <ItemsScreen onOpenItem={openItemTimeline} />}
      {tab === 'owners' && <OwnersScreen />}
      {tab === 'events' && <EventsScreen editingId={editingEventId} onSetEditingId={setEditingEventId} />}
      {tab === 'views' && <ViewsScreen key={viewsRequest.seq} initialItemId={viewsRequest.itemId} />}
      {tab === 'issues' && <IssuesPanel onOpenEvent={openEventInEditor} />}
    </Shell>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
