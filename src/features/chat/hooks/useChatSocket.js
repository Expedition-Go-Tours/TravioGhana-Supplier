import { useEffect, useCallback } from "react";
import { getChatSocket } from "../chatSocket";

export function useChatSocket(conversationId, userId) {
  const socket = getChatSocket(userId);

  useEffect(() => {
    if (!conversationId) return;
    socket.emit("chat:join", { conversationId });
    return () => {
      socket.emit("chat:leave", { conversationId });
    };
  }, [conversationId, socket]);

  const onNewMessage = useCallback((cb) => {
    const handler = (data) => cb(data.message, data.conversationId);
    socket.on("chat:message", handler);
    return () => { socket.off("chat:message", handler); };
  }, [socket]);

  const onMarkRead = useCallback((cb) => {
    const handler = (data) => cb(data);
    socket.on("chat:mark-read", handler);
    return () => { socket.off("chat:mark-read", handler); };
  }, [socket]);

  const onDelivered = useCallback((cb) => {
    const handler = (data) => cb(data);
    socket.on("chat:delivered", handler);
    return () => { socket.off("chat:delivered", handler); };
  }, [socket]);

  const emitTyping = useCallback((convId, isTyping) => {
    socket.emit("chat:typing", { conversationId: convId, isTyping });
  }, [socket]);

  const emitMarkRead = useCallback((convId) => {
    socket.emit("chat:mark-read", { conversationId: convId });
  }, [socket]);

  const onTyping = useCallback((cb) => {
    const handler = (data) => cb(data);
    socket.on("chat:typing", handler);
    return () => { socket.off("chat:typing", handler); };
  }, [socket]);

  const emitDelivered = useCallback((convId, messageIds) => {
    socket.emit("chat:delivered", {
      conversationId: convId,
      messageIds: Array.isArray(messageIds) ? messageIds : [messageIds],
    });
  }, [socket]);

  return { onNewMessage, onMarkRead, onDelivered, onTyping, emitTyping, emitMarkRead, emitDelivered };
}
