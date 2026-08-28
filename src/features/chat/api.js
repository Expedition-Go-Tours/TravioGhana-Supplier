import api from "@/lib/axios";

export async function getConversations() {
  const res = await api.get("/chat/conversations");
  return res.data.data?.conversations || [];
}

export async function getOrCreateConversation(recipientId, type) {
  const body = { recipientId };
  if (type) body.type = type;
  const res = await api.post("/chat/conversations", body);
  return res.data.data.conversation;
}

export async function getMessages(conversationId, cursor, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const res = await api.get(
    `/chat/conversations/${conversationId}/messages?${params.toString()}`
  );
  return res.data.data;
}

export async function sendMessage(conversationId, content, attachment) {
  const body = { content };
  if (attachment?.url) {
    body.attachmentUrl = attachment.url;
    body.attachmentType = attachment.type || "image";
  }
  const res = await api.post(`/chat/conversations/${conversationId}/messages`, body);
  return res.data.data.message;
}

export async function markConversationAsRead(conversationId) {
  const res = await api.patch(`/chat/conversations/${conversationId}/read`);
  return res.data.data;
}

export async function getUnreadCount() {
  const res = await api.get("/chat/conversations/unread-count");
  return res.data.data?.unreadCount ?? 0;
}

export async function uploadChatImage(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/chat/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}

export async function getAdminSupportId() {
  const res = await api.get("/chat/admin-support");
  return res.data.data?.adminId || null;
}

export async function deleteConversation(conversationId) {
  const res = await api.delete(`/chat/conversations/${conversationId}`);
  return res.data;
}