/**
 * The open thread must carry the backend's `customerUserId` stamp.
 *
 * A conversation selected from data fetched before the stamp existed (or
 * through getOrCreateConversation) arrives without it, and the window then
 * falls back to "the first participant who isn't me" - which, in a thread a
 * colleague has replied to by email, is her rather than the customer. The page
 * must re-adopt the list's stamped copy the moment it arrives, so the side and
 * the header correct themselves without a browser refresh.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const getConversations = vi.fn();
const getMessages = vi.fn();
const markConversationAsRead = vi.fn();
const sendMessage = vi.fn();
const deleteConversation = vi.fn();

// ChatPage re-fetches the list whenever the socket reports a new message; the
// test drives that handler directly to simulate the refresh.
const socketHandlers = vi.hoisted(() => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }));

vi.mock("../api", () => ({
  getConversations: (...a) => getConversations(...a),
  getMessages: (...a) => getMessages(...a),
  markConversationAsRead: (...a) => markConversationAsRead(...a),
  sendMessage: (...a) => sendMessage(...a),
  deleteConversation: (...a) => deleteConversation(...a),
  getOrCreateConversation: vi.fn(),
}));

vi.mock("../chatSocket", () => ({ getChatSocket: () => socketHandlers }));

vi.mock("../hooks/useChatSocket", () => ({
  useChatSocket: () => ({
    onNewMessage: () => () => {},
    onMarkRead: () => () => {},
    onDelivered: () => () => {},
    emitMarkRead: vi.fn(),
    emitDelivered: vi.fn(),
  }),
}));

vi.mock("../components/ConversationList", () => ({
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

vi.mock("../components/ChatWindow", () => ({
  default: ({ conversation }) => (
    <div>
      <span data-testid="open-conversation">{conversation?.id || "none"}</span>
      <span data-testid="stamp">{conversation?.customerUserId || "none"}</span>
    </div>
  ),
}));

vi.mock("../components/CustomerDetailsPanel", () => ({ default: () => null }));

import ChatPage from "../pages/ChatPage";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";

const SUPPLIER = { id: "supplier-1", name: "Ama", roles: ["supplier"] };
const CUSTOMER = { id: "customer-1", name: "Kwame", roles: ["customer"] };
const COLLEAGUE = { id: "staff-1", name: "Secretary", roles: ["customer"] };

/** Participant order deliberately puts the colleague before the customer, the
 *  order that makes the un-stamped fallback name her instead of the customer. */
const conversation = (stamped) => ({
  id: "conv-a",
  title: "Kwame",
  type: "SUPPLIER_CUSTOMER",
  unreadCount: 0,
  ...(stamped ? { customerUserId: CUSTOMER.id } : {}),
  participants: [
    { userId: SUPPLIER.id, user: SUPPLIER },
    { userId: COLLEAGUE.id, user: COLLEAGUE },
    { userId: CUSTOMER.id, user: CUSTOMER },
  ],
});

function renderChat() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/chat"]}>
        <ChatPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** The page mounts a desktop and a mobile panel, so every instance counts. */
function stamps() {
  return screen.getAllByTestId("stamp").map((el) => el.textContent);
}

/** The `chat:message` handler ChatPage registered on the socket. */
function refreshHandler() {
  const call = socketHandlers.on.mock.calls.find(([event]) => event === "chat:message");
  return call?.[1];
}

beforeEach(() => {
  vi.clearAllMocks();
  useChatStore.getState().resetChat();
  useChatStore.setState({ conversations: [], loadingConvs: false, loaded: true });
  useAuthStore.setState({ user: SUPPLIER, isAuthenticated: true });

  getConversations.mockResolvedValue([conversation(false)]);
  getMessages.mockResolvedValue({ messages: [], cursor: null, hasMore: false });
  markConversationAsRead.mockResolvedValue({ ok: true });
});

afterEach(() => cleanup());

describe("customer stamp on the open conversation", () => {
  it("shows the fallback side/header while the selection is unstamped", async () => {
    const user = userEvent.setup();
    renderChat();

    const [open] = await screen.findAllByRole("button", { name: "Kwame" });
    await user.click(open);

    await waitFor(() => expect(screen.getAllByTestId("open-conversation").length).toBeGreaterThan(0));
    expect(screen.getAllByTestId("open-conversation").every((el) => el.textContent === "conv-a")).toBe(true);
    // Documented fallback: without the stamp the old rule decides, and in this
    // participant order that rule names the colleague.
    expect(stamps().every((value) => value === "none")).toBe(true);
  });

  it("re-adopts the stamped copy as soon as the refreshed list delivers it", async () => {
    const user = userEvent.setup();
    renderChat();

    const [open] = await screen.findAllByRole("button", { name: "Kwame" });
    await user.click(open);
    await waitFor(() => expect(stamps().length).toBeGreaterThan(0));
    expect(stamps().every((value) => value === "none")).toBe(true);

    // The list refreshes over the socket with the stamped payload...
    getConversations.mockResolvedValue([conversation(true)]);
    const handler = refreshHandler();
    expect(handler).toBeTypeOf("function");
    handler();

    // ...and the open thread picks it up without a browser refresh.
    await waitFor(() =>
      expect(stamps().every((value) => value === "customer-1")).toBe(true)
    );
  });

  it("leaves a conversation alone once it carries the stamp", async () => {
    getConversations.mockResolvedValue([conversation(true)]);
    const user = userEvent.setup();
    renderChat();

    const [open] = await screen.findAllByRole("button", { name: "Kwame" });
    await user.click(open);

    await waitFor(() => expect(stamps().length).toBeGreaterThan(0));
    expect(stamps().every((value) => value === "customer-1")).toBe(true);
  });
});
