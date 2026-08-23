'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { conversationService, normalizeSocketMessage } from '@/services/chat';
import { getErrorMessage } from '@/services/api';
import type { Conversation, SocketMessage, User } from '@/types';

export const getConversationTitle = (conversation: Conversation, currentUserId?: string) => {
  if (conversation.type === 'group') {
    return conversation.name?.trim() || 'Unnamed Group';
  }
  if (conversation.participant) {
    return conversation.participant.name;
  }
  const other = conversation.participants?.find((p) => p._id !== currentUserId);
  return other?.name || 'Unknown User';
};

export const getConversationMembers = (conversation: Conversation): User[] => {
  if (conversation.participants?.length) return conversation.participants;
  return conversation.participant ? [conversation.participant] : [];
};

export const useConversations = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await conversationService.list();
      setConversations(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load conversations'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  const upsertConversation = useCallback((incoming: Conversation) => {
    setConversations((prev) => {
      const rest = prev.filter((c) => c._id !== incoming._id);
      const existing = prev.find((c) => c._id === incoming._id);
      return [{ ...existing, ...incoming }, ...rest];
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (raw: SocketMessage) => {
      const message = normalizeSocketMessage(raw);
      setConversations((prev) => {
        const target = prev.find((c) => c._id === message.conversation);
        if (!target) {
          load();
          return prev;
        }
        const updated: Conversation = {
          ...target,
          lastMessage: {
            text: message.text,
            sender: message.sender,
            createdAt: message.createdAt,
          },
          updatedAt: message.createdAt,
        };
        return [updated, ...prev.filter((c) => c._id !== message.conversation)];
      });
    };

    const handleConversationUpdated = (incoming: Conversation) => {
      if (incoming?._id) {
        upsertConversation(incoming);
      } else {
        load();
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('conversation:updated', handleConversationUpdated);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('conversation:updated', handleConversationUpdated);
    };
  }, [socket, load, upsertConversation]);

  const sorted = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const aTime = new Date(a.lastMessage?.createdAt ?? a.updatedAt ?? 0).getTime();
        const bTime = new Date(b.lastMessage?.createdAt ?? b.updatedAt ?? 0).getTime();
        return bTime - aTime;
      }),
    [conversations]
  );

  return {
    conversations: sorted,
    loading,
    error,
    reload: load,
    upsertConversation,
    removeConversation: useCallback(
      (id: string) => setConversations((prev) => prev.filter((c) => c._id !== id)),
      []
    ),
  };
};
