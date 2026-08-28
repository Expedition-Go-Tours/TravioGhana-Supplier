import { create } from "zustand";

export const useChatStore = create((set) => ({
  conversations: [],
  selectedConv: null,
  messages: [],
  messageStatuses: {},
  cursor: null,
  hasMore: false,
  loadingConvs: true,
  loadingMsgs: false,
  loaded: false,
  socketListenersReady: false,

  setConversations: (conversations) => set({ conversations, loadingConvs: false, loaded: true }),
  appendConversation: (conv) =>
    set((state) => ({
      conversations: state.conversations.some((c) => c.id === conv.id)
        ? state.conversations
        : [...state.conversations, conv],
    })),
  updateConversation: (convId, updater) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === convId ? updater(c) : c)),
    })),
  removeConversation: (convId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== convId),
    })),
  touchConversation: (convId, msg) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, updatedAt: msg.createdAt, messages: [msg] } : c
      ),
    })),

  setSelectedConv: (conv) => set({ selectedConv: conv }),
  setMessages: (messages) => set({ messages }),
  appendMessages: (messages) =>
    set((state) => ({ messages: [...messages, ...state.messages] })),
  addMessage: (msg) =>
    set((state) => ({ messages: state.messages.some((m) => m.id === msg.id) ? state.messages : [...state.messages, msg] })),
  setMessageStatuses: (statuses) => set({ messageStatuses: statuses }),
  updateMessageStatuses: (updater) =>
    set((state) => ({ messageStatuses: updater(state.messageStatuses) })),
  setCursor: (cursor) => set({ cursor }),
  setHasMore: (hasMore) => set({ hasMore }),
  setLoadingConvs: (loadingConvs) => set({ loadingConvs }),
  setLoadingMsgs: (loadingMsgs) => set({ loadingMsgs }),
  setLoaded: (loaded) => set({ loaded }),
  markAsRead: (convId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  resetChat: () =>
    set({
      selectedConv: null,
      messages: [],
      messageStatuses: {},
      cursor: null,
      hasMore: false,
      loadingMsgs: false,
    }),
}));
