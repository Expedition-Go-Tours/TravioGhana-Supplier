/**
 * Stays customers (chat) API — the Stays mirror of `features/chat/api.js`,
 * backed by the stays mock conversations today and the
 * `/stays/supplier/chat/...` endpoints when the backend ships. There is no
 * websocket in the mock: sending appends and persists locally.
 */
import api from "@/lib/axios";
import { staysMock } from "./mock/store";
import { staysUsesMockData } from "./api";

const BASE = "/stays/supplier";
const requestConfig = { skipGlobalErrorHandler: true };

export async function listStaysConversations() {
  if (staysUsesMockData) return staysMock.listConversations();
  const res = await api.get(`${BASE}/chat/conversations`, requestConfig);
  return res.data?.data?.conversations || [];
}

export async function listStaysConversationMessages(conversationId, cursor, limit = 50) {
  if (staysUsesMockData) {
    return staysMock.listConversationMessages({ conversationId, cursor, limit });
  }
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const res = await api.get(
    `${BASE}/chat/conversations/${conversationId}/messages?${params.toString()}`,
    requestConfig,
  );
  return res.data?.data;
}

export async function sendStaysMessage(conversationId, content, attachment) {
  if (staysUsesMockData) {
    return staysMock.sendConversationMessage({ conversationId, content, attachment });
  }
  const body = { content };
  if (attachment?.url) {
    body.attachmentUrl = attachment.url;
    body.attachmentType = attachment.type || "image";
  }
  const res = await api.post(
    `${BASE}/chat/conversations/${conversationId}/messages`,
    body,
    requestConfig,
  );
  return res.data?.data?.message;
}

export async function markStaysConversationRead(conversationId) {
  if (staysUsesMockData) return staysMock.markConversationRead(conversationId);
  const res = await api.patch(
    `${BASE}/chat/conversations/${conversationId}/read`,
    {},
    requestConfig,
  );
  return res.data?.data;
}

export async function deleteStaysConversation(conversationId) {
  if (staysUsesMockData) return staysMock.deleteConversation(conversationId);
  const res = await api.delete(`${BASE}/chat/conversations/${conversationId}`, requestConfig);
  return res.data?.data;
}

/** Images become data URLs locally; the live backend accepts a multipart upload. */
export async function uploadStaysChatImage(file) {
  if (staysUsesMockData) {
    const url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return { url, type: file.type?.startsWith("image/") ? "image" : "file" };
  }
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`${BASE}/chat/upload`, form, {
    ...requestConfig,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data;
}
