export interface User {
  _id: string;
  name: string;
  phone: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type ConversationType = "direct" | "group";

export interface LastMessage {
  text: string;
  sender: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  type: ConversationType;
  name?: string;
  createdBy?: string;
  admins: string[];
  participants: User[];
  participant?: User;
  lastMessage?: LastMessage;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
}

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
}

// Socket `message:new` uses `id` and an epoch timestamp instead of `_id`/ISO string
export interface SocketMessage {
  id?: string;
  _id?: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: string | number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: { path: string; message: string }[];
}
