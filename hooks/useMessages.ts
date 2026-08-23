"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { messageService, normalizeSocketMessage } from "@/services/chat";
import { getErrorMessage } from "@/services/api";
import type { Message, SocketMessage } from "@/types";

const PAGE_SIZE = 20;

export const useMessages = (conversationId?: string) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingOlderRef = useRef(false);

  // Derived so the first page never needs a synchronous setState inside the effect
  const loading = Boolean(conversationId) && loadedId !== conversationId;
  const ready = Boolean(conversationId) && loadedId === conversationId;

  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;

    messageService
      .list(conversationId, PAGE_SIZE)
      .then((page) => {
        if (cancelled) return;
        setMessages(page.messages);
        setHasMore(page.hasMore);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setMessages([]);
        setHasMore(false);
        setError(getErrorMessage(err, "Failed to load messages"));
      })
      .finally(() => {
        if (!cancelled) setLoadedId(conversationId);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const loadOlder = useCallback(async () => {
    if (
      !ready ||
      !conversationId ||
      loadingOlderRef.current ||
      !hasMore ||
      messages.length === 0
    ) {
      return;
    }

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await messageService.list(
        conversationId,
        PAGE_SIZE,
        messages[0]._id,
      );
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m._id));
        const fresh = page.messages.filter((m) => !existing.has(m._id));
        return [...fresh, ...prev];
      });
      setHasMore(page.hasMore);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load older messages"));
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [ready, conversationId, hasMore, messages]);

  // Server only broadcasts to other participants, so the sender relies on the REST response
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNewMessage = (raw: SocketMessage) => {
      const message = normalizeSocketMessage(raw);
      if (message.conversation !== conversationId) return;

      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    socket.on("message:new", handleNewMessage);
    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, conversationId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !conversationId || !user) return false;

      const tempId = `pending-${Date.now()}`;
      const optimistic: Message = {
        _id: tempId,
        conversation: conversationId,
        sender: user._id,
        text: trimmed,
        createdAt: new Date().toISOString(),
        pending: true,
      };

      setMessages((prev) => [...prev, optimistic]);
      setSending(true);

      try {
        const saved = await messageService.send(conversationId, trimmed);
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m._id !== tempId);
          if (withoutTemp.some((m) => m._id === saved._id)) return withoutTemp;
          return [...withoutTemp, saved];
        });
        return true;
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId ? { ...m, pending: false, failed: true } : m,
          ),
        );
        setError(getErrorMessage(err, "Failed to send message"));
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, user],
  );

  const retryMessage = useCallback(
    async (messageId: string) => {
      const failed = messages.find((m) => m._id === messageId);
      if (!failed) return;
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      await sendMessage(failed.text);
    },
    [messages, sendMessage],
  );

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    sending,
    error,
    loadOlder,
    sendMessage,
    retryMessage,
    clearError: useCallback(() => setError(null), []),
  };
};
