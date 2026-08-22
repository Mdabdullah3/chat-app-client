export interface User {
  id: string;
  phone: string;
  name: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: User;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  name?: string;
  isGroup: boolean;
  participants: User[];
  admins: string[];
  lastMessage?: Message;
}

export interface AuthResponse {
  token: string;
  user: User;
}