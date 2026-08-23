'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import Sidebar from '@/components/chat/Sidebar';
import ChatArea from '@/components/chat/ChatArea';
import NewChatModal from '@/components/chat/NewChatModal';
import GroupInfoModal from '@/components/chat/GroupInfoModal';
import Button from '@/components/ui/Button';
import type { Conversation } from '@/types';

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { conversations, loading, error, reload, upsertConversation, removeConversation } =
    useConversations();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c._id === activeId) ?? null,
    [conversations, activeId]
  );

  const handleCreated = (conversation: Conversation) => {
    upsertConversation(conversation);
    setActiveId(conversation._id);
  };

  const handleLeft = (conversationId: string) => {
    removeConversation(conversationId);
    setActiveId(null);
  };

  if (authLoading || (loading && conversations.length === 0)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">Loading your chats...</p>
        </div>
      </div>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-50 px-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-rose-500" />
          <p className="text-sm text-slate-600">{error}</p>
          <Button onClick={reload}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-white">
      <div className={`h-full w-full md:block ${activeConversation ? 'hidden' : 'block'}`}>
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversation?._id}
          onSelectConversation={(conv) => setActiveId(conv._id)}
          onOpenNewChat={() => setNewChatOpen(true)}
        />
      </div>

      <div className={`h-full min-w-0 flex-1 ${activeConversation ? 'block' : 'hidden md:block'}`}>
        {activeConversation ? (
          <ChatArea
            key={activeConversation._id}
            conversation={activeConversation}
            onBack={() => setActiveId(null)}
            onOpenInfo={() => setInfoOpen(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-slate-50 px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">No chat selected</h2>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Pick a conversation from the list or start a new one to begin messaging.
            </p>
          </div>
        )}
      </div>

      <NewChatModal
        isOpen={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={handleCreated}
      />

      {activeConversation && (
        <GroupInfoModal
          isOpen={infoOpen}
          onClose={() => setInfoOpen(false)}
          conversation={activeConversation}
          onUpdated={upsertConversation}
          onLeft={handleLeft}
        />
      )}
    </main>
  );
}
