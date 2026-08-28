import { useState, useRef, useEffect, useCallback } from "react";
import { Send, ChevronDown, ChevronLeft, Paperclip } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import MessageBubble from "./MessageBubble";
import { useChatSocket } from "../hooks/useChatSocket";
import { uploadChatImage } from "../api";
import { optimizeImage } from "@/lib/image";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { CHAT_BG_STYLE } from "../utils/chatBackground";
import { useAuthStore } from "@/stores/authStore";

function formatDateSeparator(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function isNewDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() !== db.getFullYear() || da.getMonth() !== db.getMonth() || da.getDate() !== db.getDate();
}

function formatLastSeen(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "online";
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDate.getTime() === today.getTime()) return "last seen today at " + time;
  if (msgDate.getTime() === yesterday.getTime()) return "last seen yesterday at " + time;
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return "last seen " + date + " at " + time;
}

const MessageSkeleton = ({ align = "left" }) => (
  <div className={`flex ${align === "right" ? "justify-end" : "justify-start"} py-1`}>
    <div className={`flex items-end gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
      {align === "left" && <div className="h-7 w-7 shrink-0 rounded-full bg-slate-100 animate-pulse" />}
      <div className="flex flex-col gap-2">
        <div className="rounded-2xl bg-slate-100 animate-pulse"
          style={{ width: "180px", height: "38px" }}
        />
        <div className="rounded-2xl bg-slate-100 animate-pulse"
          style={{ width: "130px", height: "38px" }}
        />
      </div>
    </div>
  </div>
);

export default function ChatWindow({ conversation, messages, messageStatuses, onSendMessage, onLoadMore, hasMore, loading, loadingMore, sending, currentUserId, onOpenDetails, showDetailsButton, showBackButton, onBack }) {
  const currentUser = useAuthStore((s) => s.user);
  const [input, setInput] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const prevCountRef = useRef(messages.length);
  const prevConvIdRef = useRef(null);
  const pendingScrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const typingStopRef = useRef(null);

  const { onTyping, emitTyping } = useChatSocket(conversation?.id, currentUserId);

  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  const scrollToBottom = useCallback((force) => {
    if (force || isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: force ? "auto" : "smooth" });
    }
  }, [isNearBottom]);

  useEffect(() => {
    if (conversation?.id && prevConvIdRef.current !== conversation?.id) {
      prevConvIdRef.current = conversation?.id;
      pendingScrollRef.current = conversation?.id;
    }
  }, [conversation?.id]);

  useEffect(() => {
    if (pendingScrollRef.current === conversation?.id && messages.length > 0) {
      pendingScrollRef.current = null;
      requestAnimationFrame(() => scrollToBottom(true));
    }
    prevCountRef.current = messages.length;
  }, [messages.length, conversation?.id, scrollToBottom]);

  useEffect(() => {
    if (!conversation?.id || !onTyping) return;
    const unsub = onTyping((data) => {
      if (data.conversationId === conversation.id) {
        if (data.isTyping) {
          setAdminTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setAdminTyping(false), 3000);
        } else {
          setAdminTyping(false);
        }
      }
    });
    return () => {
      unsub();
      setAdminTyping(false);
    };
  }, [conversation?.id, onTyping]);

  useEffect(() => {
    if (adminTyping && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [adminTyping]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    setShowScrollBtn(!isNearBottom());
    if (el.scrollTop < 50 && hasMore && !loadingMore && onLoadMore) {
      const prevHeight = el.scrollHeight;
      onLoadMore();
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prevHeight; });
    }
  }, [hasMore, loadingMore, onLoadMore, isNearBottom]);

  const stopTypingSignal = () => {
    if (conversation?.id) {
      emitTyping(conversation.id, false);
    }
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    if (typingStopRef.current) {
      clearTimeout(typingStopRef.current);
      typingStopRef.current = null;
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    if (trimmed.length > 5000) {
      toast.error("Message too long (max 5000 characters)");
      return;
    }
    setInput("");
    stopTypingSignal();
    await onSendMessage(trimmed);
    requestAnimationFrame(() => scrollToBottom(true));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (conversation?.id) {
      emitTyping(conversation.id, true);
      if (!typingIntervalRef.current) {
        typingIntervalRef.current = setInterval(() => {
          if (conversation?.id) emitTyping(conversation.id, true);
        }, 2000);
      }
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      typingStopRef.current = setTimeout(stopTypingSignal, 1500);
    }
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !conversation?.id) return;
    try {
      const { url, type } = await uploadChatImage(file);
      await onSendMessage("", { url, type });
    } catch {
      toast.error("Failed to upload image");
    }
    e.target.value = "";
  };

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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [conversation?.id]);

  const otherParticipant = conversation?.participants?.find(
    (p) => p.userId !== currentUserId
  )?.user || conversation?.participants?.[0]?.user;
  const headerName = otherParticipant?.name || otherParticipant?.email || conversation?.title || "Chat";

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-50/50 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/50">
          <Send className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-600">Select a conversation</p>
        <p className="mt-1 text-xs text-slate-400">Choose a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <style>{`@keyframes chatSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-5 sm:py-3">
        {showBackButton && (
          <button
            onClick={onBack}
            className="shrink-0 flex items-center justify-center rounded-lg p-1.5 -ml-1.5 text-slate-500 hover:bg-slate-100 transition-colors md:hidden"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-sm font-bold text-white shadow-sm">
          <span>{headerName.charAt(0).toUpperCase()}</span>
          {otherParticipant?.photoURL && (
            <OptimizedImage
              src={otherParticipant.photoURL}
              width={36}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{headerName}</p>
          <p className="text-xs text-slate-400">{formatLastSeen(otherParticipant?.lastLoginAt)}</p>
        </div>
        {showDetailsButton && (
          <button
            onClick={onOpenDetails}
            className="shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            Details
          </button>
        )}
      </div>

      <div key={conversation?.id} style={{ animation: "chatSlideIn 0.25s ease-out" }} className="flex flex-1 flex-col min-h-0">
      <div ref={messagesContainerRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto" style={CHAT_BG_STYLE}>
        <div className="px-4 py-3">
          {loading ? (
            <div className="space-y-2 pt-4">
              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 border-t border-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
                <div className="flex-1 border-t border-slate-200" />
              </div>
              <MessageSkeleton align="left" />
              <MessageSkeleton align="left" />
              <MessageSkeleton align="right" />
              <MessageSkeleton align="left" />
              <MessageSkeleton align="right" />
              <MessageSkeleton align="right" />
            </div>
          ) : (
            <>
              {hasMore && (
                <div className="mb-4 flex justify-center">
                  <button onClick={onLoadMore} disabled={loadingMore} className="rounded-lg bg-white px-4 py-1.5 text-xs font-medium text-emerald-600 shadow-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                    {loadingMore ? "Loading..." : "Load older messages"}
                  </button>
                </div>
              )}
              <div className="space-y-1">
                {messages.map((msg, idx) => {
                  const isOwn = currentUserId ? msg.senderId === currentUserId : false;
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const showDateSep = prevMsg && isNewDay(prevMsg.createdAt, msg.createdAt);
                  const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId || isNewDay(prevMsg.createdAt, msg.createdAt);
                  return (
                    <div key={msg.id}>
                      {(showDateSep || idx === 0) && (
                        <div className="my-4 flex items-center gap-3">
                          <div className="flex-1 border-t border-slate-200" />
                          <span className="shrink-0 text-[11px] font-medium text-slate-400">{formatDateSeparator(msg.createdAt)}</span>
                          <div className="flex-1 border-t border-slate-200" />
                        </div>
                      )}
                      <div className="py-0.5">
                        <MessageBubble
                          message={msg}
                          isOwn={isOwn}
                          status={isOwn ? messageStatuses[msg.id] : undefined}
                          showAvatar={showAvatar}
                          senderAvatar={isOwn ? optimizeImage(currentUser?.avatar, 32) : optimizeImage(msg.sender?.photoURL || otherParticipant?.photoURL, 32)}
                          senderName={isOwn ? "You" : headerName}
                        />
                      </div>
                    </div>
                  );
                })}
                {adminTyping && (
                  <div className="flex items-start gap-2 py-1">
                    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-sm">
                      <span>A</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-[18px] rounded-bl-[4px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
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
            </>
          )}
        </div>
      </div>

      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-3 sm:bottom-4 sm:right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
      )}

      <div className="border-t border-slate-200 bg-white px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>
          <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              disabled={loading || sending}
              className="w-full resize-none overflow-y-hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 focus:bg-white transition-all disabled:opacity-50"
              style={{ maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || sending}
            className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-all hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
