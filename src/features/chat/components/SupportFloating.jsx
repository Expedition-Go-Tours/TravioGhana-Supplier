import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  MessageCircle, X, Send, Paperclip, Loader2, Headphones,
  Phone, Mail, Clock, ChevronLeft, ChevronRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import config from "@/config";
import { useAuthStore } from "@/stores/authStore";
import { CHAT_BG_STYLE } from "../utils/chatBackground";
import { useChatFloatingStore } from "@/stores/chatFloatingStore";
import MessageBubble from "./MessageBubble";
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
  getOrCreateConversation,
  getAdminSupportId,
  getUnreadCount,
  uploadChatImage,
} from "../api";
import { optimizeImage } from "@/lib/image";

import { getChatSocket, isChatSocketConnected } from "../chatSocket";

const ADMIN_SUPPORT_ID = config.support?.adminId || "";
const POLL_INTERVAL = 30000;
const CONV_CACHE_TTL = 30000;

const SUPPORT_PHONE = "+233 XX XXX XXXX";
const SUPPORT_EMAIL = "support@travioghana.com";
const SUPPORT_HOURS = [
  { label: "Mon - Fri", value: "8:00 AM - 6:00 PM" },
  { label: "Saturday", value: "9:00 AM - 2:00 PM" },
  { label: "Sunday", value: "Closed" },
];

function formatDateSeparator(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function isNewDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return (
    da.getFullYear() !== db.getFullYear() ||
    da.getMonth() !== db.getMonth() ||
    da.getDate() !== db.getDate()
  );
}

export default function SupportFloating() {
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id;

  const { isOpen, open: openStore, close: closeStore } = useChatFloatingStore();
  const [, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageStatuses, setMessageStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadBadge, setUnreadBadge] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState("");
  const [adminTyping, setAdminTyping] = useState(false);
  const [welcomePage, setWelcomePage] = useState("main");
  const [slideDir, setSlideDir] = useState("right");

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isFetchingRef = useRef(false);
  const selectedIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const typingStopRef = useRef(null);
  const convCacheRef = useRef({ data: null, time: 0 });
  const scrollPosRef = useRef(0);

  useEffect(() => {
    selectedIdRef.current = selectedConv?.id || null;
  }, [selectedConv?.id]);

  const loadAndSetMessages = useCallback(async (convId) => {
    if (!convId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setMessages([]);
    setMessageStatuses({});
    setCursor(null);
    setHasMore(false);
    try {
      const data = await getMessages(convId, null, 50);
      const msgs = data.messages || [];
      setMessages(msgs);
      setCursor(data.cursor || null);
      setHasMore(data.hasMore || false);
      const statuses = {};
      msgs.forEach((m) => { statuses[m.id] = "sent"; });
      setMessageStatuses(statuses);
    } catch (err) {
      console.error('[SupportFloating] Failed to load messages:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setInput("");
      setWelcomePage("main");
      setSelectedConv(null);
      setMessages([]);
      try {
        const now = Date.now();
        const state = useChatFloatingStore.getState();
        const targetConvId = state.pendingConversationId;
        if (targetConvId) state.clearPendingConversation();
        let convs = null;
        if (!targetConvId && (now - convCacheRef.current.time < CONV_CACHE_TTL)) {
          convs = convCacheRef.current.data;
        }
        if (!convs) {
          convs = await getConversations();
          convCacheRef.current = { data: convs, time: now };
        }
        if (cancelled) return;
        setConversations(convs);
        let target = null;
        if (targetConvId) {
          target = convs.find((c) => c.id === targetConvId) || null;
        } else {
          target = convs.find((c) => c.type === "SUPPLIER_ADMIN") || null;
        }
        if (target) {
          setSelectedConv(target);
          await loadAndSetMessages(target.id);
          if (!cancelled) {
            try { await markConversationAsRead(target.id); } catch (err) { console.error('[SupportFloating] Failed to mark as read:', err); }
          }
        }
        if (!cancelled) {
          const badgeCount = convs.reduce((sum, c) => sum + (c.id === target?.id ? 0 : (c.unreadCount || 0)), 0);
          setUnreadBadge(badgeCount);
        }
      } catch (err) { console.error('[SupportFloating] Failed to load conversations:', err); } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, currentUserId, loadAndSetMessages]);

  useEffect(() => {
    if (!currentUserId) return;
    const socket = getChatSocket(currentUserId);

    const onMessage = (data) => {
      const { message: msg, conversationId } = data;
      socket.emit("chat:delivered", { conversationId, messageIds: [msg.id] });
      if (conversationId === selectedIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setMessageStatuses((prev) => ({ ...prev, [msg.id]: "delivered" }));
      } else {
        setConversations((prev) => {
          if (prev.some((c) => c.id === conversationId)) {
            return prev.map((c) =>
              c.id === conversationId ? { ...c, updatedAt: msg.createdAt, messages: [msg] } : c
            );
          }
          return [{ id: conversationId, messages: [msg], updatedAt: msg.createdAt, unreadCount: 1 }, ...prev];
        });
        setUnreadBadge((prev) => prev + 1);
      }
    };

    const onTyping = (data) => {
      if (data.conversationId === selectedIdRef.current) {
        if (data.isTyping) {
          setAdminTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setAdminTyping(false), 3000);
        } else {
          setAdminTyping(false);
        }
      }
    };

    const onMarkRead = (data) => {
      if (data.conversationId === selectedIdRef.current) {
        setMessageStatuses((prev) => {
          const next = { ...prev };
          for (const id of Object.keys(next)) {
            if (next[id] === "sent" || next[id] === "delivered") next[id] = "read";
          }
          return next;
        });
      }
    };

    socket.on("chat:message", onMessage);
    socket.on("chat:typing", onTyping);
    socket.on("chat:mark-read", onMarkRead);

    if (!socket.connected) socket.connect();

    if (selectedIdRef.current) socket.emit("chat:join", { conversationId: selectedIdRef.current });

    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:typing", onTyping);
      socket.off("chat:mark-read", onMarkRead);
    };
  }, [currentUserId, isOpen]);

  useEffect(() => {
    const socket = getChatSocket(currentUserId);
    if (!selectedConv?.id) return;
    socket.emit("chat:join", { conversationId: selectedConv.id });
    return () => { socket.emit("chat:leave", { conversationId: selectedConv.id }); };
  }, [selectedConv?.id, currentUserId]);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      if (typingStopRef.current) {
        clearTimeout(typingStopRef.current);
        typingStopRef.current = null;
      }
    };
  }, [selectedConv?.id]);

  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current && !loadingMore) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, loadingMore]);

  useEffect(() => {
    if (adminTyping && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [adminTyping]);

  useEffect(() => {
    if (!currentUserId) return;
    const poll = async () => {
      try {
        const count = await getUnreadCount();
        setUnreadBadge(count);
      } catch (err) { console.error('[SupportFloating] Failed to poll unread count:', err); }
    };
    if (!isChatSocketConnected()) poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [currentUserId]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isChatSocketConnected()) {
        convCacheRef.current = { data: null, time: 0 };
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const ensureConversation = useCallback(async () => {
    let conv = selectedConv;
    if (!conv) {
      let adminId = ADMIN_SUPPORT_ID;
      if (!adminId) {
        try {
          adminId = await getAdminSupportId();
        } catch (err) {
          console.error('[SupportFloating] Failed to fetch admin support ID:', err);
        }
      }
      if (!adminId) {
        toast.error("Support is not configured yet");
        return null;
      }
      conv = await getOrCreateConversation(adminId, "SUPPLIER_ADMIN");
      setSelectedConv(conv);
      setConversations((prev) => [conv, ...prev]);
      getChatSocket(currentUserId).emit("chat:join", { conversationId: conv.id });
    }
    return conv;
  }, [selectedConv, currentUserId]);

  const stopTypingSignal = useCallback(() => {
    const socket = getChatSocket(currentUserId);
    if (selectedConv?.id) {
      socket.emit("chat:typing", { conversationId: selectedConv.id, isTyping: false });
    }
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    if (typingStopRef.current) {
      clearTimeout(typingStopRef.current);
      typingStopRef.current = null;
    }
  }, [selectedConv, currentUserId]);

  const handleSend = useCallback(async (content, attachment) => {
    const text = content?.trim();
    if (!text && !attachment) return;
    if (sending) return;
    setSending(true);
    stopTypingSignal();
    try {
      const conv = await ensureConversation();
      if (!conv) { setSending(false); return; }
      const msg = await sendMessage(conv.id, text || "", attachment);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setMessageStatuses((prev) => ({ ...prev, [msg.id]: "sent" }));
      setConversations((prev) =>
        prev.map((c) => c.id === conv.id ? { ...c, updatedAt: msg.createdAt, messages: [msg] } : c)
      );
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }, [sending, ensureConversation, stopTypingSignal]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || sending) return;
    const val = input;
    setInput("");
    handleSend(val);
  }, [input, sending, handleSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url, type } = await uploadChatImage(file);
      await handleSend("", { url, type });
    } catch {
      toast.error("Failed to upload image");
    }
    e.target.value = "";
  }, [handleSend]);

  const handleInputChange = useCallback((value) => {
    setInput(value);
    if (selectedConv?.id) {
      const socket = getChatSocket(currentUserId);
      if (!typingIntervalRef.current) {
        socket.emit("chat:typing", { conversationId: selectedConv.id, isTyping: true });
        typingIntervalRef.current = setInterval(() => {
          const s = getChatSocket(currentUserId);
          if (selectedConv?.id) s.emit("chat:typing", { conversationId: selectedConv.id, isTyping: true });
        }, 2000);
      }
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      typingStopRef.current = setTimeout(() => {
        stopTypingSignal();
      }, 1500);
    }
  }, [selectedConv, currentUserId, stopTypingSignal]);

  const handleLoadMore = useCallback(async () => {
    if (!selectedConv?.id || !hasMore || loadingMore || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const data = await getMessages(selectedConv.id, cursor, 50);
      const msgs = data.messages || [];
      setMessages((prev) => [...msgs, ...prev]);
      setCursor(data.cursor || null);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('[SupportFloating] Failed to load more messages:', err);
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [selectedConv, hasMore, loadingMore, cursor]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el || !hasMore || loadingMore) return;
    if (el.scrollTop < 50) {
      scrollPosRef.current = el.scrollHeight;
      handleLoadMore();
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight - scrollPosRef.current;
        }
      });
    }
  }, [hasMore, loadingMore, handleLoadMore]);

  const showContactPage = useCallback(() => {
    setSlideDir("right");
    setWelcomePage("contact");
  }, []);

  const showMainPage = useCallback(() => {
    setSlideDir("left");
    setWelcomePage("main");
  }, []);

  return (
    <>
      <button
        onClick={() => openStore()}
        className={cn(
          "group fixed bottom-6 right-6 z-50 flex h-14 items-center rounded-full bg-emerald-600 text-white shadow-lg transition-[width,box-shadow,transform] duration-300 ease-out hover:shadow-xl active:scale-95",
          "w-14 hover:w-[180px]",
          isOpen && "hidden"
        )}
      >
        <span className="relative flex h-full w-14 shrink-0 items-center justify-center">
          <MessageCircle className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
          {unreadBadge > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white">
              {unreadBadge > 99 ? "99+" : unreadBadge}
            </span>
          )}
        </span>
        <div className="overflow-hidden transition-all duration-300 ease-out max-w-0 group-hover:max-w-[120px]">
          <span className="block whitespace-nowrap pr-5 text-sm font-semibold opacity-0 transition-opacity duration-200 delay-100 group-hover:opacity-100">
            Need help?
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
            onClick={closeStore}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-6 right-6 w-[380px] max-w-[calc(100vw-36px)] origin-bottom-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl" style={{ height: "528px", maxHeight: "calc(100vh-120px)" }}>
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between rounded-t-2xl bg-emerald-600 px-4 py-3 text-white">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedConv && (
                      <button onClick={() => { setSelectedConv(null); setMessages([]); setMessageStatuses({}); setWelcomePage("main"); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/20 hover:text-white">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    )}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <Headphones className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight">Admin Support</p>
                      <p className="truncate text-[10px] text-white/70 leading-tight">
                        {selectedConv ? (
                          <span className="flex items-center gap-1">
                            <motion.span className="h-1.5 w-1.5 rounded-full bg-green-400" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                            <span className="text-green-300">Online</span>
                          </span>
                        ) : (
                          "Typically replies in minutes"
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeStore}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden">
                  {loading ? (
                    <div className="flex h-full flex-col gap-3 p-5">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className={cn("flex items-start gap-3 animate-pulse", i % 2 === 0 && "flex-row-reverse")}>
                          <div className="h-6 w-6 rounded-full bg-gray-200 shrink-0" />
                          <div className={cn("space-y-2", i % 2 === 0 ? "items-end" : "")}>
                            <div className={cn("h-8 rounded-2xl bg-gray-100", i % 2 === 0 ? "w-48" : "w-36")} />
                            <div className={cn("h-4 w-16 rounded bg-gray-50", i % 2 === 0 ? "ml-auto" : "")} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedConv ? (
                    <motion.div
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="flex h-full flex-col"
                    >
                      <div
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto px-4 py-3"
                        style={CHAT_BG_STYLE}
                      >
                        {hasMore && (
                          <div className="mb-3 flex justify-center">
                            <button
                              onClick={handleLoadMore}
                              disabled={loadingMore}
                              className="rounded-full bg-white px-3 py-1 text-[10px] font-medium text-emerald-600 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                            >
                              {loadingMore ? "Loading..." : "Load older messages"}
                            </button>
                          </div>
                        )}
                        <div className="space-y-1">
                          {messages.map((msg, idx) => {
                            const isOwn = currentUserId ? msg.senderId === currentUserId : false;
                            const prevMsg = idx > 0 ? messages[idx - 1] : null;
                            const showDateSep = prevMsg && isNewDay(prevMsg.createdAt, msg.createdAt);
                            const showAvatar = true;
                            return (
                              <div key={msg.id}>
                                {(showDateSep || idx === 0) && (
                                  <div className="my-3 flex items-center gap-3">
                                    <div className="flex-1 border-t border-gray-200" />
                                    <span className="shrink-0 text-[10px] font-medium text-gray-400">
                                      {formatDateSeparator(msg.createdAt)}
                                    </span>
                                    <div className="flex-1 border-t border-gray-200" />
                                  </div>
                                )}
                                <MessageBubble
                                  message={msg}
                                  isOwn={isOwn}
                                  status={isOwn ? messageStatuses[msg.id] : undefined}
                                  showAvatar={showAvatar}
                                  senderAvatar={isOwn ? optimizeImage(user?.avatar, 24) : undefined}
                                  senderName={isOwn ? "You" : "Admin Support"}
                                  avatarIcon={!isOwn ? <span className="text-xs">🤖</span> : undefined}
                                  compact
                                />
                              </div>
                            );
                          })}
                          {adminTyping && (
                            <div className="flex items-start gap-2 py-0.5">
                              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                                <span>A</span>
                              </div>
                              <div className="flex items-center gap-1.5 rounded-[18px] rounded-bl-[4px] border border-gray-200 bg-white px-4 py-3 shadow-sm">
                                <span className="flex gap-1">
                                  {[0, 1, 2].map((i) => (
                                    <motion.span
                                      key={i}
                                      className="h-2 w-2 rounded-full bg-emerald-600"
                                      animate={{ y: [0, -5, 0] }}
                                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                                    />
                                  ))}
                                </span>
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </div>
                      <InputBar value={input} onChange={handleInputChange} onSend={handleSubmit} onKeyDown={handleKeyDown} onFileChange={handleFileChange} sending={sending} fileInputRef={fileInputRef} />
                    </motion.div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={welcomePage}
                        initial={{ opacity: 0, x: slideDir === "right" ? 24 : -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: slideDir === "right" ? -24 : 24 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="flex h-full flex-col"
                      >
                        {welcomePage === "main" ? (
                          <>
                            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-600 to-emerald-700 shadow-lg shadow-emerald-600/20"
                              >
                                <MessageCircle className="h-8 w-8 text-white" />
                              </motion.div>
                              <h3 className="mt-4 text-base font-bold text-gray-900">Hi! Welcome to Travio Ghana</h3>
                              <p className="mt-1.5 text-xs leading-relaxed text-gray-500 max-w-[260px]">
                                We're here to help. Choose an option below or send us a message.
                              </p>
                              <div className="mt-6 w-full max-w-[280px] space-y-2.5">
                                <button
                                  onClick={showContactPage}
                                  className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all duration-200 hover:border-emerald-600/30 hover:shadow-md hover:-translate-y-0.5"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 transition-colors group-hover:bg-emerald-600/15">
                                    <Phone className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900">Contact Us</p>
                                    <p className="truncate text-[11px] text-gray-500">Call or email our support team</p>
                                  </div>
                                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                                </button>
                                <button
                                  onClick={async () => {
                                    setSelectedConv({ id: "optimistic", participants: [] });
                                    setMessages([]);
                                    setMessageStatuses({});
                                    let adminId = ADMIN_SUPPORT_ID;
                                    if (!adminId) { try { adminId = await getAdminSupportId(); } catch { /* ignore */ } }
                                    if (!adminId) { toast.error("Support is not configured yet"); return; }
                                    try {
                                      const conv = await getOrCreateConversation(adminId, "SUPPLIER_ADMIN");
                                      setSelectedConv(conv);
                                      setConversations((prev) => prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]);
                                      getChatSocket(currentUserId).emit("chat:join", { conversationId: conv.id });
                                      loadAndSetMessages(conv.id);
                                    } catch { toast.error("Failed to start conversation"); }
                                  }}
                                  className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all duration-200 hover:border-emerald-600/30 hover:shadow-md hover:-translate-y-0.5"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 transition-colors group-hover:bg-emerald-600/15">
                                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900">Chat with us</p>
                                    <p className="truncate text-[11px] text-gray-500">Send a message in real-time</p>
                                  </div>
                                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 overflow-y-auto px-5 py-4">
                              <button
                                onClick={showMainPage}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-emerald-600 mb-5"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                Back
                              </button>

                              <div className="flex flex-col items-center text-center mb-5">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-600 to-emerald-700 shadow-lg shadow-emerald-600/20 mb-3">
                                  <Headphones className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-base font-bold text-gray-900">Get in Touch</h3>
                                <p className="mt-1 text-xs text-gray-500 max-w-[240px]">
                                  We aim to respond within 2 hours during business hours
                                </p>
                              </div>

                              <div className="space-y-3">
                                <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
                                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-50 to-emerald-100">
                                    <Phone className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-medium text-gray-400">Call us</p>
                                    <p className="mt-0.5 text-xs text-gray-900">{SUPPORT_PHONE}</p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Call</span>
                                </a>

                                <a href={`mailto:${SUPPORT_EMAIL}`}
                                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-50 to-emerald-100">
                                    <Mail className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-medium text-gray-400">Email us</p>
                                    <p className="mt-0.5 text-xs text-gray-900">{SUPPORT_EMAIL}</p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Email</span>
                                </a>
                              </div>

                              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                                <div className="flex items-center gap-2.5 mb-3">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="text-xs font-semibold text-gray-700">Business Hours</span>
                                </div>
                                <div className="space-y-2">
                                  {SUPPORT_HOURS.map((item) => (
                                    <div key={item.label} className="flex items-center justify-between text-xs">
                                      <span className="text-gray-500">{item.label}</span>
                                      <span className={cn("font-medium", item.value === "Closed" ? "text-red-500" : "text-gray-800")}>
                                        {item.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="mt-5 rounded-xl bg-linear-to-r from-emerald-600/5 to-emerald-700/5 border border-emerald-600/10 p-4 text-center">
                                <p className="text-xs font-medium text-gray-700">Prefer instant messaging?</p>
                                <button onClick={showMainPage} className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                                  Go back & start a chat →
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function InputBar({ value, onChange, onSend, onKeyDown, onFileChange, sending, fileInputRef, inputId }) {
  const handleChange = useCallback((e) => onChange(e.target.value), [onChange]);

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-2.5">
      <div className="flex items-end gap-1.5">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-emerald-600"
          type="button"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
        <div className="relative flex-1">
          <textarea
            id={inputId}
            value={value}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={sending}
            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-emerald-600 focus-visible:bg-white transition-colors disabled:opacity-60"
            style={{ maxHeight: "80px" }}
          />
        </div>
        <button
          onClick={onSend}
          disabled={!value.trim() || sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
