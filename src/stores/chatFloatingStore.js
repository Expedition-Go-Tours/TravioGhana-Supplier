import { create } from "zustand";

export const useChatFloatingStore = create((set) => ({
  isOpen: false,
  pendingConversationId: null,
  open: (conversationId) =>
    set({ isOpen: true, pendingConversationId: conversationId || null }),
  close: () => set({ isOpen: false, pendingConversationId: null }),
  clearPendingConversation: () => set({ pendingConversationId: null }),
}));
