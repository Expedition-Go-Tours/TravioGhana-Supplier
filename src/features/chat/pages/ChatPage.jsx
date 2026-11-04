import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";
import CustomerDetailsPanel from "../components/CustomerDetailsPanel";
import { getConversations, getOrCreateConversation, getMessages, sendMessage, markConversationAsRead, deleteConversation } from "../api";
import { useChatSocket } from "../hooks/useChatSocket";
import { getChatSocket } from "../chatSocket";
import { SHELL_GUTTER } from "@/components/layout/shell";
import { describeActionError } from "@/lib/errorHandler";

const PAGE_SIZE = 50;
const TABS = [
  { key: "all", label: "All Messages" },
  { key: "unread", label: "Unread" },
];

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id;

  const tabParam = searchParams.get("tab") === "unread" ? "unread" : "all";
  const customerIdParam = searchParams.get("customerId");
  const bookingIdParam = searchParams.get("bookingId");
  const bookingNumberParam = searchParams.get("bookingNumber");
  const tourTitleParam = searchParams.get("tourTitle");

  const [activeTab, setActiveTab] = useState(tabParam);
  const [convSearch, setConvSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const isFetchingRef = useRef(false);
  // Monotonic counter for message loads: only the newest fetch may land.
  const loadSeqRef = useRef(0);
  const lastProcessedCustomerId = useRef(null);

  const conversations = useChatStore((s) => s.conversations);
  const selectedConv = useChatStore((s) => s.selectedConv);
  const messages = useChatStore((s) => s.messages);
  const messageStatuses = useChatStore((s) => s.messageStatuses);
  const cursor = useChatStore((s) => s.cursor);
  const hasMore = useChatStore((s) => s.hasMore);
  const loadingConvs = useChatStore((s) => s.loadingConvs);
  const loadingMsgs = useChatStore((s) => s.loadingMsgs);

  const setConversations = useChatStore((s) => s.setConversations);
  const appendConversation = useChatStore((s) => s.appendConversation);
  const touchConversation = useChatStore((s) => s.touchConversation);
  const removeConversation = useChatStore((s) => s.removeConversation);
  const setSelectedConv = useChatStore((s) => s.setSelectedConv);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendMessages = useChatStore((s) => s.appendMessages);
  const setMessageStatuses = useChatStore((s) => s.setMessageStatuses);
  const updateMessageStatuses = useChatStore((s) => s.updateMessageStatuses);
  const setCursor = useChatStore((s) => s.setCursor);
  const setHasMore = useChatStore((s) => s.setHasMore);
  const setLoadingMsgs = useChatStore((s) => s.setLoadingMsgs);
  const markAsRead = useChatStore((s) => s.markAsRead);
  const resetChat = useChatStore((s) => s.resetChat);

  const { onNewMessage, onMarkRead, onDelivered, emitMarkRead, emitDelivered } = useChatSocket(selectedConv?.id, currentUserId);

  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const data = await getConversations();
      setConversations(data);
    } catch {
      // handled globally
    }
  }, [currentUserId, setConversations]);

  // Always refresh conversations on mount to avoid stale data
  useEffect(() => {
    if (!currentUserId) return;
    loadConversations();
  }, [currentUserId, loadConversations]);

  // Live refresh: when a new chat message or notification arrives for this
  // user (e.g. an email reply routed back into a conversation they haven't
  // opened), re-fetch the conversation list so it appears without a manual
  // browser refresh.
  useEffect(() => {
    if (!currentUserId) return;
    const socket = getChatSocket(currentUserId);
    const refresh = () => loadConversations();
    socket.on("chat:message", refresh);
    socket.on("notification", refresh);
    return () => {
      socket.off("chat:message", refresh);
      socket.off("notification", refresh);
    };
  }, [currentUserId, loadConversations]);

  // The open thread must carry the backend's customer stamp. A selection made
  // from data fetched before the stamp existed (or through
  // getOrCreateConversation) arrives without it, and the window then falls back
  // to "the first participant who isn't me" — which is the colleague, not the
  // customer. Adopt the list's copy as soon as a stamped version of the open
  // thread arrives; nothing else about the selection changes.
  useEffect(() => {
    if (!selectedConv?.id || selectedConv.customerUserId) return;
    const fresh = conversations.find((c) => c.id === selectedConv.id && c.customerUserId);
    if (fresh) setSelectedConv(fresh);
  }, [conversations, selectedConv, setSelectedConv]);

  /**
   * Load the first page of one conversation.
   *
   * Conversation switching used to early-return whenever a previous fetch was
   * still in flight, so a fast A→B click left customer A's messages on screen
   * under customer B's header — and then marked B read. Instead, every call
   * bumps a sequence number and only the newest response is allowed to land.
   * Resolves to true when the response was applied.
   */
  const loadMessages = useCallback(async (convId, conv) => {
    if (!convId) return false;
    const requestId = ++loadSeqRef.current;
    setLoadingMsgs(true);
    setMessageStatuses({});
    setMessages([]);
    setCursor(null);
    setHasMore(false);
    try {
      const data = await getMessages(convId, null, PAGE_SIZE);
      // Stale response: another conversation was selected while this fetch was
      // out. Never render it, never mark anything read.
      if (loadSeqRef.current !== requestId) return false;
      const msgs = data.messages || [];
      setMessages(msgs);
      setCursor(data.cursor || null);
      setHasMore(data.hasMore || false);
      const initialStatuses = {};
      // Read receipts come from the CUSTOMER's cursor: a colleague who joined
      // the thread has lastReadAt=now, and picking her would mark everything
      // read before the customer ever opened it.
      const otherParticipant = conv?.customerUserId
        ? conv.participants?.find((p) => p.userId === conv.customerUserId)
        : conv?.participants?.find(
            (p) => currentUserId ? p.userId !== currentUserId : p.user.roles?.includes('admin')
          );
      const lastReadAt = otherParticipant?.lastReadAt ? new Date(otherParticipant.lastReadAt).getTime() : 0;
      msgs.forEach((m) => {
        initialStatuses[m.id] = new Date(m.createdAt).getTime() <= lastReadAt ? "read" : "sent";
      });
      setMessageStatuses(initialStatuses);
      return true;
    } catch {
      // handled globally
      return false;
    } finally {
      if (loadSeqRef.current === requestId) setLoadingMsgs(false);
    }
  }, [currentUserId, setMessages, setCursor, setHasMore, setMessageStatuses, setLoadingMsgs]);

  const handleSelectConversation = useCallback(async (conv) => {
    setSelectedConv(conv);
    setShowDetailsPanel(false);
    setMobileView('chat');
    const applied = await loadMessages(conv.id, conv);
    // Only the conversation actually on screen may be marked read: marking B
    // read because a fetch for it was superseded by A is exactly the bug this
    // guards.
    if (!applied || useChatStore.getState().selectedConv?.id !== conv.id) return;
    try {
      await markConversationAsRead(conv.id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      emitMarkRead(conv.id);
    } catch {
      // silent
    }
    markAsRead(conv.id);
  }, [loadMessages, emitMarkRead, setSelectedConv, markAsRead, queryClient]);

  // Auto-create conversation from customerId param
  useEffect(() => {
    if (!customerIdParam || !currentUserId) return;
    if (lastProcessedCustomerId.current === customerIdParam) return;
    lastProcessedCustomerId.current = customerIdParam;

    const existing = conversations.find(
      (c) =>
        c.type === 'SUPPLIER_CUSTOMER' &&
        c.participants?.some((p) => p.userId === customerIdParam)
    );

    if (existing) {
      Promise.resolve().then(() => handleSelectConversation(existing));
      return;
    }

    getOrCreateConversation(
      customerIdParam,
      'SUPPLIER_CUSTOMER',
      bookingIdParam || bookingNumberParam || tourTitleParam
        ? {
            bookingId: bookingIdParam || undefined,
            bookingNumber: bookingNumberParam || undefined,
            tourTitle: tourTitleParam || undefined,
          }
        : undefined,
    )
      .then((conv) => {
        appendConversation(conv);
        Promise.resolve().then(() => handleSelectConversation(conv));
        // Refresh conversation list to ensure it includes the new conversation
        loadConversations();
      })
      .catch((err) => {
        toast.error(describeActionError(err, "Couldn't open conversation"));
      });
  }, [customerIdParam, bookingIdParam, bookingNumberParam, tourTitleParam, currentUserId, conversations, handleSelectConversation, appendConversation, loadConversations]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetChat();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  const handleLoadMore = async () => {
    if (!selectedConv?.id || !hasMore || loadingMore || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingMore(true);
    const convId = selectedConv.id;
    try {
      const data = await getMessages(convId, cursor, PAGE_SIZE);
      // Conversation switched mid-fetch: older pages of A must not be spliced
      // into B's thread.
      if (useChatStore.getState().selectedConv?.id !== convId) return;
      const msgs = data.messages || [];
      appendMessages(msgs);
      setCursor(data.cursor || null);
      setHasMore(data.hasMore || false);
      const otherParticipant = selectedConv?.customerUserId
        ? selectedConv.participants?.find((p) => p.userId === selectedConv.customerUserId)
        : selectedConv?.participants?.find(
            (p) => currentUserId ? p.userId !== currentUserId : p.user.roles?.includes('admin')
          );
      const lastReadAt = otherParticipant?.lastReadAt ? new Date(otherParticipant.lastReadAt).getTime() : 0;
      const statusUpdates = {};
      msgs.forEach((m) => {
        if (!messageStatuses[m.id]) {
          statusUpdates[m.id] = new Date(m.createdAt).getTime() <= lastReadAt ? "read" : "sent";
        }
      });
      if (Object.keys(statusUpdates).length > 0) {
        updateMessageStatuses((prev) => ({ ...prev, ...statusUpdates }));
      }
    } catch {
      // handled globally
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  const handleSend = async (content, attachment) => {
    if (!selectedConv?.id || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(selectedConv.id, content, attachment);
      addMessage(msg);
      updateMessageStatuses((prev) => ({ ...prev, [msg.id]: "sent" }));
      touchConversation(selectedConv.id, msg);
    } catch {
      // handled globally
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async (conv) => {
    try {
      await deleteConversation(conv.id);
      removeConversation(conv.id);
      if (selectedConv?.id === conv.id) {
        resetChat();
      }
    } catch {
      // handled globally
    }
  };

  useEffect(() => {
    if (!onNewMessage) return;
    const unsub = onNewMessage((msg, convId) => {
      emitDelivered(convId, msg.id);
      if (convId === selectedConv?.id) {
        addMessage(msg);
        touchConversation(convId, msg);
      } else {
        touchConversation(convId, msg);
      }
    });
    return unsub;
  }, [onNewMessage, selectedConv?.id, addMessage, touchConversation, emitDelivered]);

  useEffect(() => {
    if (!onMarkRead) return;
    const unsub = onMarkRead((data) => {
      updateMessageStatuses((prev) => {
        const next = { ...prev };
        (data.messageIds || []).forEach((id) => {
          if (next[id]) next[id] = "read";
        });
        return next;
      });
    });
    return unsub;
  }, [onMarkRead, updateMessageStatuses]);

  useEffect(() => {
    if (!onDelivered) return;
    const unsub = onDelivered((data) => {
      updateMessageStatuses((prev) => {
        const next = { ...prev };
        (data.messageIds || []).forEach((id) => {
          if (next[id] === "sent") next[id] = "delivered";
        });
        return next;
      });
    });
    return unsub;
  }, [onDelivered, updateMessageStatuses]);

  useEffect(() => {
    if (!selectedConv?.id || !currentUserId) return;
    emitMarkRead(selectedConv.id);
  }, [selectedConv?.id, currentUserId, emitMarkRead]);

  // Customer conversations only — admin chats go in the floating bubble
  const customerConversations = conversations.filter((c) => c.type === "SUPPLIER_CUSTOMER");
  const unreadConversations = customerConversations.filter((c) => (c.unreadCount ?? 0) > 0);
  const searchTerm = convSearch.trim().toLowerCase();
  const filteredConversations = (activeTab === "unread" ? unreadConversations : customerConversations)
    .filter((conv) => {
      if (!searchTerm) return true;
      const other = conv.customerUserId
        ? conv.participants?.find((p) => p.userId === conv.customerUserId)
        : conv.participants?.find((p) => p.userId !== currentUserId);
      const name = other?.user?.name || conv.title || "";
      const preview = conv.messages?.[0]?.content || "";
      return `${name} ${preview}`.toLowerCase().includes(searchTerm);
    });

  const otherParticipant = (selectedConv?.customerUserId
    ? selectedConv.participants?.find((p) => p.userId === selectedConv.customerUserId)
    : selectedConv?.participants?.find(
        (p) => currentUserId ? p.userId !== currentUserId : false
      )
  )?.user;
  const isCustomerConv = Boolean(otherParticipant?.roles?.includes("customer"));

  const convListPanel = (
    <>
      <div className="border-b border-slate-200 px-3 pb-3 pt-3 sm:px-4 sm:pt-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Users size={15} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Customers</h2>
            <p className="text-[11px] leading-tight text-slate-400">
              {customerConversations.length} conversation{customerConversations.length !== 1 ? "s" : ""}
              {unreadConversations.length > 0 && ` · ${unreadConversations.length} unread`}
            </p>
          </div>
        </div>

        <div className="relative mt-3">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={convSearch}
            onChange={(e) => setConvSearch(e.target.value)}
            aria-label="Search customers"
            placeholder="Search customers…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {convSearch && (
            <button
              onClick={() => setConvSearch("")}
              aria-label="Clear customer search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const unreadCount = unreadConversations.length;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {tab.label}
                {tab.key === "unread" && unreadCount > 0 && (
                  <span className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    isActive ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConv?.id}
              onSelect={handleSelectConversation}
              onDelete={handleDeleteConversation}
              loading={loadingConvs}
              currentUserId={currentUserId}
              emptyMessage={
                searchTerm
                  ? "No customers match that search."
                  : activeTab === "unread"
                    ? "You are caught up — no unread messages."
                    : "Customer conversations will appear here."
              }
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <div className={`${SHELL_GUTTER} py-2 sm:py-4 h-[calc(100vh-80px)] sm:h-[calc(100vh-120px)]`}>
      <div className="relative flex h-full sm:rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 overflow-hidden">
        {/* Desktop: 3-column layout */}
        <div className="hidden lg:flex h-full w-full">
          <div className="flex w-[340px] shrink-0 flex-col border-r border-slate-200 bg-white">
            {convListPanel}
          </div>
          <div className="flex flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <ChatWindow
                conversation={selectedConv}
                messages={messages}
                messageStatuses={messageStatuses}
                onSendMessage={handleSend}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                loading={loadingMsgs}
                loadingMore={loadingMore}
                sending={sending}
                currentUserId={currentUserId}
                onOpenDetails={() => setShowDetailsPanel((v) => !v)}
                showDetailsButton={isCustomerConv}
                showDetails={showDetailsPanel}
              />
            </div>
            <AnimatePresence>
              {showDetailsPanel && isCustomerConv && (
                <motion.div
                  initial={{ opacity: 0, x: 32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 32 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <CustomerDetailsPanel
                    conversation={selectedConv}
                    currentUserId={currentUserId}
                    onClose={() => setShowDetailsPanel(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile: single-panel views */}
        <div className="flex lg:hidden h-full w-full">
          {mobileView === 'list' && (
            <div className="flex flex-col h-full w-full bg-white">
              {convListPanel}
            </div>
          )}
          {mobileView === 'chat' && (
            <ChatWindow
              conversation={selectedConv}
              messages={messages}
              messageStatuses={messageStatuses}
              onSendMessage={handleSend}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              loading={loadingMsgs}
              loadingMore={loadingMore}
              sending={sending}
              currentUserId={currentUserId}
              onOpenDetails={() => setMobileView('details')}
              showDetailsButton={isCustomerConv}
              showDetails={false}
              showBackButton
              onBack={() => setMobileView('list')}
            />
          )}
        </div>

        {/* Mobile: Customer details overlay */}
        <AnimatePresence>
          {mobileView === 'details' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/20 lg:hidden"
              onClick={() => setMobileView('chat')}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <CustomerDetailsPanel
                  conversation={selectedConv}
                  currentUserId={currentUserId}
                  onClose={() => setMobileView('chat')}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
