import axios from "axios";
import Cookies from "js-cookie";
import { io } from "socket.io-client";

const API_BASE = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

const authHeaders = () => ({
  Authorization: `Bearer ${Cookies.get("token")}`,
});

export const getCurrentUser = () => {
  try { return JSON.parse(Cookies.get("user") || "null"); } catch { return null; }
};

export const api = {
  listConversations: () =>
    axios.get(`${API_BASE}/conversations`, { headers: authHeaders() }).then((r) => r.data),

  listMessages: (conversationId) =>
    axios.get(`${API_BASE}/conversations/${conversationId}/messages`, { headers: authHeaders() }).then((r) => r.data),

  createGroup: (name, memberIds) =>
    axios.post(`${API_BASE}/conversations/create-group`, { name, memberIds }, { headers: authHeaders() }).then((r) => r.data),

  invite: (conversationId, userId) =>
    axios.post(`${API_BASE}/conversations/invite`, { conversationId, userId }, { headers: authHeaders() }).then((r) => r.data),

  acceptInvite: (conversationId) =>
    axios.post(`${API_BASE}/conversations/${conversationId}/accept`, {}, { headers: authHeaders() }).then((r) => r.data),

  rejectInvite: (conversationId) =>
    axios.post(`${API_BASE}/conversations/${conversationId}/reject`, {}, { headers: authHeaders() }).then((r) => r.data),

  renameGroup: (conversationId, name) =>
    axios.put(`${API_BASE}/conversations/${conversationId}`, { name }, { headers: authHeaders() }).then((r) => r.data),

  deleteGroup: (conversationId) =>
    axios.delete(`${API_BASE}/conversations/${conversationId}`, { headers: authHeaders() }).then((r) => r.data),

  leaveGroup: (conversationId) =>
    axios.post(`${API_BASE}/conversations/${conversationId}/leave`, {}, { headers: authHeaders() }).then((r) => r.data),

  banUser: (conversationId, userId) =>
    axios.post(`${API_BASE}/conversations/${conversationId}/ban`, { userId }, { headers: authHeaders() }).then((r) => r.data),

  sendMessage: (conversationId, content) =>
    axios.post(`${API_BASE}/messages/send`, { conversationId, content }, { headers: authHeaders() }).then((r) => r.data),

  sendPrivate: (recipientId, content) =>
    axios.post(`${API_BASE}/messages/private`, { recipientId, content }, { headers: authHeaders() }).then((r) => r.data),

  searchUsers: (q = "") =>
    axios.get(`${API_BASE}/users-search`, { params: { q }, headers: authHeaders() }).then((r) => r.data),

  listNotifications: () =>
    axios.get(`${API_BASE}/notifications`, { headers: authHeaders() }).then((r) => r.data),

  markNotificationRead: (id) =>
    axios.put(`${API_BASE}/notifications/${id}/read`, {}, { headers: authHeaders() }).then((r) => r.data),
};

// Singleton socket — connects once per app session and survives route changes.
let socket = null;
export const getSocket = () => {
  if (socket) return socket;
  const user = getCurrentUser();
  if (!user?.id) return null;
  socket = io(SOCKET_URL, {
    auth: { userId: user.id },
    transports: ["websocket", "polling"],
  });
  return socket;
};
