/**
 * Conversation switching in the chat page.
 *
 * `loadMessages` used to early-return whenever another fetch was in flight.
 * A supplier clicking customer A and then customer B while A's request was
 * still out was left with A's messages rendered under B's header — and the
 * page then marked B's conversation read, so the unread badge for the thread
 * actually on screen disappeared without a word being read.
 *
 * These tests drive the real page (the real zustand chat store and auth store)
 * with only the HTTP layer and the heavy presentational children stubbed, and
 * assert that only the NEWEST request may land.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const getConversations = vi.fn();
const getMessages = vi.fn();
const markConversationAsRead = vi.fn();
const sendMessage = vi.fn();
const deleteConversation = vi.fn();

vi.mock('../api', () => ({
  getConversations: (...args) => getConversations(...args),
  getMessages: (...args) => getMessages(...args),
  markConversationAsRead: (...args) => markConversationAsRead(...args),
  sendMessage: (...args) => sendMessage(...args),
  deleteConversation: (...args) => deleteConversation(...args),
  getOrCreateConversation: vi.fn(),
}));

vi.mock('../hooks/useChatSocket', () => ({
  useChatSocket: () => ({
    onNewMessage: () => () => {},
    onMarkRead: () => () => {},
    onDelivered: () => () => {},
    emitMarkRead: vi.fn(),
    emitDelivered: vi.fn(),
  }),
}));

vi.mock('../chatSocket', () => ({
  getChatSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
}));

// The presentational children are not what this test is about: what matters is
// which conversation's messages reached them and which conversation was marked
// read. They are replaced with inert renderers driven by the page's own props.
vi.mock('../components/ConversationList', () => ({
  default: ({ conversations, onSelect }) => (
    <div>
      {conversations.map((conv) => (
        <button key={conv.id} onClick={() => onSelect(conv)}>
          {conv.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../components/ChatWindow', () => ({
  default: ({ conversation, messages, loading }) => (
    <div>
      <span data-testid="open-conversation">{conversation?.id || 'none'}</span>
      <span data-testid="loading">{loading ? 'yes' : 'no'}</span>
      <ul data-testid="messages">
        {messages.map((message) => (
          <li key={message.id}>{message.content}</li>
        ))}
      </ul>
    </div>
  ),
}));

vi.mock('../components/CustomerDetailsPanel', () => ({ default: () => null }));

import ChatPage from '../pages/ChatPage';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';

const SUPPLIER = { id: 'supplier-1', name: 'Ama', roles: ['supplier'] };

const conversation = (id, title) => ({
  id,
  title,
  type: 'SUPPLIER_CUSTOMER',
  unreadCount: 1,
  participants: [
    { userId: SUPPLIER.id, user: SUPPLIER },
    { userId: `customer-${id}`, user: { id: `customer-${id}`, roles: ['customer'], name: title } },
  ],
});

const CONV_A = conversation('conv-a', 'Kwame');
const CONV_B = conversation('conv-b', 'Akosua');

/** A deferred promise so a fetch can be resolved in a chosen order. */
function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderChat() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/chat']}>
        <ChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useChatStore.getState().resetChat();
  useChatStore.setState({ conversations: [], loadingConvs: false, loaded: true });
  useAuthStore.setState({ user: SUPPLIER, isAuthenticated: true });

  getConversations.mockReset().mockResolvedValue([CONV_A, CONV_B]);
  getMessages.mockReset();
  markConversationAsRead.mockReset().mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('switching conversations while a fetch is in flight', () => {
  it('renders the LAST conversation opened, not the one whose fetch resolved later', async () => {
    const user = userEvent.setup();
    const slowA = deferred();
    const fastB = deferred();
    getMessages.mockImplementation((id) =>
      id === 'conv-a' ? slowA.promise : fastB.promise,
    );

    renderChat();
    // Desktop and mobile panels both render the list under jsdom; both drive
    // the same handler, so the first one is enough.
    const [firstKwame] = await screen.findAllByRole('button', { name: 'Kwame' });
    await user.click(firstKwame);
    // Immediately switch again, while A's request is still out.
    const [firstAkosua] = await screen.findAllByRole('button', { name: 'Akosua' });
    await user.click(firstAkosua);

    // B answers first, then A's stale response finally lands.
    await act(async () => {
      fastB.resolve({ messages: [{ id: 'm-b1', content: 'Akosua message' }], hasMore: false });
    });
    await act(async () => {
      slowA.resolve({ messages: [{ id: 'm-a1', content: 'Kwame message' }], hasMore: false });
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('open-conversation')[0].textContent).toBe('conv-b');
    });
    // A's late response must not overwrite B's thread.
    expect(screen.queryByText('Kwame message')).toBeNull();
    expect(screen.getAllByText('Akosua message').length).toBeGreaterThan(0);
  });

  it('marks only the conversation on screen as read', async () => {
    const user = userEvent.setup();
    const slowA = deferred();
    const fastB = deferred();
    getMessages.mockImplementation((id) =>
      id === 'conv-a' ? slowA.promise : fastB.promise,
    );

    renderChat();
    const [kwame] = await screen.findAllByRole('button', { name: 'Kwame' });
    await user.click(kwame);
    const [akosua] = await screen.findAllByRole('button', { name: 'Akosua' });
    await user.click(akosua);

    await act(async () => {
      fastB.resolve({ messages: [{ id: 'm-b1', content: 'Akosua message' }], hasMore: false });
    });
    await act(async () => {
      slowA.resolve({ messages: [{ id: 'm-a1', content: 'Kwame message' }], hasMore: false });
    });

    await waitFor(() => expect(markConversationAsRead).toHaveBeenCalled());
    // B only: marking A read after its fetch lost the race marks a thread the
    // supplier never looked at.
    expect(markConversationAsRead.mock.calls.map(([id]) => id)).toEqual(['conv-b']);
    // The store agrees: B is the selected conversation.
    expect(useChatStore.getState().selectedConv?.id).toBe('conv-b');
    expect(useChatStore.getState().messages.map((m) => m.id)).toEqual(['m-b1']);
  });

  it('does not mark a conversation read when its fetch fails', async () => {
    const user = userEvent.setup();
    getMessages.mockRejectedValue(new Error('boom'));

    renderChat();
    const [kwame] = await screen.findAllByRole('button', { name: 'Kwame' });
    await user.click(kwame);

    await waitFor(() => {
      expect(screen.getAllByTestId('loading')[0].textContent).toBe('no');
    });
    expect(markConversationAsRead).not.toHaveBeenCalled();
  });
});
