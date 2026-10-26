/**
 * Which side of a supplier's chat a message renders on.
 *
 * A booking thread is 1-on-1 until a supplier colleague replies by email: she
 * becomes a third participant (holding a *customer* role, so roles cannot
 * classify her) and the old rule, "right side = the message is from me", put her
 * reply on the customer's side and let the header resolve to her instead of the
 * customer. The backend stamps `customerUserId`; everything below renders off it.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("../hooks/useChatSocket", () => ({
  // `onTyping` hands back the unsubscribe the window calls on cleanup.
  useChatSocket: () => ({ onTyping: () => () => {}, emitTyping: () => {} }),
}));

vi.mock("../api", () => ({
  uploadChatImage: vi.fn(),
  deleteConversation: vi.fn(),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector) =>
    selector({ user: { id: "supplier-1", name: "Expedition-Go Tours LTD", avatar: null } }),
}));

vi.mock("@/lib/image", () => ({
  optimizeImage: (url) => url || "",
}));

vi.mock("@/components/shared/OptimizedImage", () => ({
  __esModule: true,
  default: ({ src, alt }) => (src ? <img src={src} alt={alt || ""} /> : null),
}));

import ChatWindow from "../components/ChatWindow";
import ConversationList from "../components/ConversationList";

const customer = {
  userId: "customer-1",
  user: { id: "customer-1", name: "Veronica Cavazos", email: "veronica@example.com", roles: ["customer"], photoURL: null, lastLoginAt: "2026-10-26T01:08:33.000Z" },
};
const supplier = {
  userId: "supplier-1",
  user: { id: "supplier-1", name: "Expedition-Go Tours LTD", email: "supplier@example.com", roles: ["supplier"], photoURL: null, lastLoginAt: null },
};
// The colleague holds a CUSTOMER role - role-based classification cannot work.
const colleague = {
  userId: "staff-1",
  user: { id: "staff-1", name: "Emmanuella", email: "secretary@example.com", roles: ["customer"], photoURL: null, lastLoginAt: "2026-10-26T15:13:47.000Z" },
};

const message = (id, senderId, content) => ({
  id,
  senderId,
  content,
  createdAt: "2026-10-26T12:00:00.000Z",
  sender: [customer, supplier, colleague].find((p) => p.userId === senderId)?.user,
});

/** Walk up from a message's text to its MessageBubble wrapper. */
function sideOf(text) {
  let el = screen.getByText(text);
  while (el && el !== document.body) {
    const cls = typeof el.className === "string" ? el.className : "";
    if (cls.includes("flex-row-reverse")) return "right";
    if (cls.includes("flex-row")) return "left";
    el = el.parentElement;
  }
  return "unknown";
}

function renderWindow(conversation, messages) {
  return render(
    <ChatWindow
      conversation={conversation}
      messages={messages}
      messageStatuses={{}}
      onSendMessage={() => {}}
      onLoadMore={() => {}}
      hasMore={false}
      loading={false}
      loadingMore={false}
      sending={false}
      currentUserId="supplier-1"
      showDetailsButton
      onOpenDetails={() => {}}
    />
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => cleanup());

describe("ChatWindow side and header", () => {
  const conversation = {
    id: "c-1",
    type: "SUPPLIER_CUSTOMER",
    bookingId: "b-1",
    customerUserId: "customer-1",
    participants: [supplier, customer, colleague],
    title: "Veronica Cavazos",
  };

  it("puts a colleague's email reply on the supplier's side and the customer's on theirs", () => {
    renderWindow(conversation, [
      message("m-1", "customer-1", "What time is pickup?"),
      message("m-2", "staff-1", "Pickup will be at 08:00"),
      message("m-3", "supplier-1", "Confirmed"),
    ]);

    expect(sideOf("What time is pickup?")).toBe("left");
    expect(sideOf("Pickup will be at 08:00")).toBe("right");
    expect(sideOf("Confirmed")).toBe("right");
  });

  it("keeps the header on the customer even with a colleague in the thread", () => {
    renderWindow(conversation, [message("m-1", "staff-1", "Pickup will be at 08:00")]);

    expect(screen.getByText("Veronica Cavazos")).toBeInTheDocument();
    expect(screen.queryByText("Emmanuella")).not.toBeInTheDocument();
  });

  it("falls back to the author rule when a conversation has no stamped customer", () => {
    const legacy = { ...conversation, customerUserId: undefined };

    renderWindow(legacy, [message("m-1", "staff-1", "Pickup will be at 08:00")]);

    // Legacy behaviour, unchanged: without the stamp the old "from me" rule wins.
    expect(sideOf("Pickup will be at 08:00")).toBe("left");
    expect(screen.getByText("Veronica Cavazos")).toBeInTheDocument();
  });
});

describe("ConversationList row identity", () => {
  const conversations = [
    {
      id: "c-1",
      type: "SUPPLIER_CUSTOMER",
      bookingId: "b-1",
      customerUserId: "customer-1",
      updatedAt: "2026-10-26T15:13:47.000Z",
      unreadCount: 1,
      lastMessage: "Pickup will be at 08:00",
      participants: [supplier, customer, colleague],
      messages: [],
      title: "Veronica Cavazos",
    },
  ];

  it("names the row after the customer, not after the colleague who replied", () => {
    render(
      <ConversationList
        conversations={conversations}
        selectedId="c-1"
        onSelect={() => {}}
        onDelete={() => {}}
        loading={false}
        currentUserId="supplier-1"
      />
    );

    expect(screen.getByText("Veronica Cavazos")).toBeInTheDocument();
    expect(screen.queryByText("Emmanuella")).not.toBeInTheDocument();
  });

  it("keeps the old identity for conversations stamped before the customer existed", () => {
    const legacy = conversations.map((c) => ({ ...c, customerUserId: undefined }));

    render(
      <ConversationList
        conversations={legacy}
        selectedId="c-1"
        onSelect={() => {}}
        onDelete={() => {}}
        loading={false}
        currentUserId="supplier-1"
      />
    );

    // First non-viewer participant is still the customer in a 1-on-1 thread.
    expect(screen.getByText("Veronica Cavazos")).toBeInTheDocument();
  });
});
