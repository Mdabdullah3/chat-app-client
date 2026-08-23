'use client';

import React, { useMemo, useState } from 'react';
import { LogOut, Search, SquarePen, MessageSquare, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { getConversationTitle } from '@/hooks/useConversations';
import Avatar from '@/components/ui/Avatar';
import type { Conversation } from '@/types';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (conversation: Conversation) => void;
  onOpenNewChat: () => void;
}

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNowStrict(date, { addSuffix: false })
    .replace(' seconds', 's')
    .replace(' second', 's')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' days', 'd')
    .replace(' day', 'd')
    .replace(' months', 'mo')
    .replace(' month', 'mo')
    .replace(' years', 'y')
    .replace(' year', 'y');
};

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewChat,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [filter, setFilter] = useState('');

  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) =>
      getConversationTitle(c, user?._id).toLowerCase().includes(term)
    );
  }, [conversations, filter, user?._id]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white md:w-80 lg:w-96">
      <header className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={user?.name ?? '?'} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                {connected ? (
                  <Wifi className="h-3 w-3 text-emerald-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-amber-500" />
                )}
                {connected ? 'Online' : 'Connecting...'}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onOpenNewChat}
              title="New chat"
              aria-label="New chat"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <SquarePen className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={logout}
              title="Log out"
              aria-label="Log out"
              className="rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter conversations"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </header>

      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MessageSquare className="mb-2 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              {conversations.length === 0 ? 'No conversations yet' : 'No matches found'}
            </p>
            {conversations.length === 0 && (
              <button
                type="button"
                onClick={onOpenNewChat}
                className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
              >
                Start a new conversation
              </button>
            )}
          </div>
        ) : (
          visible.map((conv) => {
            const isActive = activeConversationId === conv._id;
            const title = getConversationTitle(conv, user?._id);
            const last = conv.lastMessage;
            const isOwnLast = last?.sender === user?._id;

            return (
              <button
                key={conv._id}
                type="button"
                onClick={() => onSelectConversation(conv)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
              >
                <Avatar name={title} isGroup={conv.type === 'group'} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
                    {last?.createdAt && (
                      <span className="flex-shrink-0 text-[10px] font-medium text-slate-400">
                        {formatTime(last.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {last ? (
                      <>
                        {isOwnLast && <span className="font-medium text-slate-600">You: </span>}
                        {last.text}
                      </>
                    ) : (
                      'No messages yet'
                    )}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
