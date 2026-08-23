import api from './api';
import type {
  AuthResponse,
  Conversation,
  Message,
  MessagePage,
  SocketMessage,
  User,
} from '@/types';

export const authService = {
  login: (phone: string, name: string) =>
    api.post<AuthResponse>('/auth/login', { phone, name }).then((r) => r.data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),
};

export const userService = {
  search: (query: string) =>
    api.get<User[]>('/users/search', { params: { q: query } }).then((r) => r.data),
};

export const conversationService = {
  list: () =>
    api
      .get<{ data: Conversation[] } | Conversation[]>('/conversations')
      .then((r) => (Array.isArray(r.data) ? r.data : r.data.data ?? [])),

  createDirect: (userId: string) =>
    api.post<Conversation>('/conversations', { userId }).then((r) => r.data),

  createGroup: (name: string, participantIds: string[]) =>
    api.post<Conversation>('/conversations/group', { name, participantIds }).then((r) => r.data),

  rename: (conversationId: string, name: string) =>
    api.patch<Conversation>(`/conversations/${conversationId}`, { name }).then((r) => r.data),

  addParticipants: (conversationId: string, userIds: string[]) =>
    api
      .post<Conversation>(`/conversations/${conversationId}/participants`, { userIds })
      .then((r) => r.data),

  removeParticipant: (conversationId: string, userId: string) =>
    api
      .delete<Conversation>(`/conversations/${conversationId}/participants/${userId}`)
      .then((r) => r.data),

  promoteAdmin: (conversationId: string, userId: string) =>
    api.post<Conversation>(`/conversations/${conversationId}/admins`, { userId }).then((r) => r.data),
};

export const messageService = {
  // API returns newest-first; reversed here so the UI can render oldest to newest
  list: (conversationId: string, limit = 20, before?: string) =>
    api
      .get<MessagePage>(`/conversations/${conversationId}/messages`, {
        params: { limit, ...(before ? { before } : {}) },
      })
      .then((r) => ({
        messages: [...(r.data.messages ?? [])].reverse(),
        hasMore: Boolean(r.data.hasMore),
      })),

  send: (conversationId: string, text: string) =>
    api.post<Message>('/messages', { conversationId, text }).then((r) => r.data),
};

export const normalizeSocketMessage = (raw: SocketMessage): Message => ({
  _id: raw._id ?? raw.id ?? `tmp-${Date.now()}`,
  conversation: raw.conversation,
  sender: raw.sender,
  text: raw.text,
  createdAt:
    typeof raw.createdAt === 'number'
      ? new Date(raw.createdAt).toISOString()
      : raw.createdAt ?? new Date().toISOString(),
});
