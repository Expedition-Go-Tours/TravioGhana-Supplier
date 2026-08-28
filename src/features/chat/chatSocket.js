import { io } from "socket.io-client";
import config from "@/config";

let SOCKET_URL = "";
try {
  const url = new URL(config.api.baseURL);
  url.pathname = "";
  SOCKET_URL = url.toString().replace(/\/$/, "");
} catch {
  SOCKET_URL = "";
}
let socket = null;
let currentUserId = null;

export function getChatSocket(userId) {
  if (!socket || currentUserId !== userId) {
    if (socket) {
      socket.disconnect();
    }
    const token = localStorage.getItem("auth_token");
    socket = io(SOCKET_URL, {
      auth: { userId, role: "supplier", token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on("auth:expired", () => {
      socket.disconnect();
      socket = null;
      currentUserId = null;
    });

    currentUserId = userId;
  }
  return socket;
}

export function isChatSocketConnected() {
  return socket?.connected || false;
}

export function disconnectChatSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentUserId = null;
  }
}
