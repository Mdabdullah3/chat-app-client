'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ArrowLeft, ChevronDown, Info, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { getConversationMembers, getConversationTitle } from '@/hooks/useConversations';
import { useUserDirectory } from '@/hooks/useUsers';
import Avatar from '@/components/ui/Avatar';
import MessageBubble from './MessageBubble';
import type { Conversation, Message } from '@/types';

interface ChatAreaProps {
    conversation: Conversation;
    onBack: () => void;
    onOpenInfo: () => void;
}

const dayLabel = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
};

export default function ChatArea({ conversation, onBack, onOpenInfo }: ChatAreaProps) {
    const { user } = useAuth();
    const {
        messages,
        loading,
        loadingOlder,
        hasMore,
        sending,
        error,
        loadOlder,
        sendMessage,
        retryMessage,
    } = useMessages(conversation._id);

    const [draft, setDraft] = useState('');
    const [showJumpToLatest, setShowJumpToLatest] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);
    const prevHeightRef = useRef(0);
    const lastMessageIdRef = useRef<string | null>(null);

    const members = useMemo(() => getConversationMembers(conversation), [conversation]);
    const { getName } = useUserDirectory(members);
    const title = getConversationTitle(conversation, user?._id);
    const isGroup = conversation.type === 'group';

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior });
        isAtBottomRef.current = true;
        setShowJumpToLatest(false);
    }, []);

    // Keep the newest message in view, but never yank the user away from history
    useEffect(() => {
        if (loading || messages.length === 0) return;

        const latestId = messages[messages.length - 1]._id;
        if (latestId === lastMessageIdRef.current) return;

        const isFirstRender = lastMessageIdRef.current === null;
        lastMessageIdRef.current = latestId;

        if (isFirstRender) {
            scrollToBottom('auto');
        } else if (isAtBottomRef.current) {
            scrollToBottom('smooth');
        } else {
            setShowJumpToLatest(true);
        }
    }, [messages, loading, scrollToBottom]);

    useEffect(() => {
        lastMessageIdRef.current = null;
    }, [conversation._id]);

    // Preserve scroll position after prepending older messages
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || loadingOlder || prevHeightRef.current === 0) return;
        const delta = el.scrollHeight - prevHeightRef.current;
        if (delta > 0) el.scrollTop = delta;
        prevHeightRef.current = 0;
    }, [messages, loadingOlder]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        if (isAtBottomRef.current) setShowJumpToLatest(false);

        if (el.scrollTop < 60 && hasMore && !loadingOlder) {
            prevHeightRef.current = el.scrollHeight;
            loadOlder();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = draft;
        if (!text.trim() || sending) return;
        setDraft('');
        isAtBottomRef.current = true;
        await sendMessage(text);
    };

    const grouped = useMemo(() => {
        const rows: { message: Message; showSender: boolean; dayDivider: string | null }[] = [];
        messages.forEach((message, index) => {
            const prev = index > 0 ? messages[index - 1] : null;
            const sameSender = prev?.sender === message.sender;
            const prevDay = prev ? dayLabel(prev.createdAt) : null;
            const currentDay = dayLabel(message.createdAt);
            rows.push({
                message,
                showSender: !sameSender,
                dayDivider: currentDay && currentDay !== prevDay ? currentDay : null,
            });
        });
        return rows;
    }, [messages]);

    return (
        <section className="relative flex h-full flex-col bg-slate-50">
            <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to conversations"
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 md:hidden"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <Avatar name={title} isGroup={isGroup} size="sm" />
                    <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
                        <p className="truncate text-xs text-slate-500">
                            {isGroup ? `${members.length} participants` : conversation.participant?.phone ?? 'Direct message'}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onOpenInfo}
                    aria-label="Conversation details"
                    className="flex-shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                    <Info className="h-5 w-5" />
                </button>
            </header>

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5"
            >
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <>
                        {loadingOlder && (
                            <div className="flex justify-center py-2">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            </div>
                        )}
                        {!hasMore && messages.length > 0 && (
                            <p className="py-2 text-center text-[11px] text-slate-400">
                                Start of the conversation
                            </p>
                        )}

                        {messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <p className="text-sm text-slate-400">No messages yet. Send the first one.</p>
                            </div>
                        ) : (
                            grouped.map(({ message, showSender, dayDivider }) => (
                                <React.Fragment key={message._id}>
                                    {dayDivider && (
                                        <div className="flex justify-center py-2">
                                            <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                {dayDivider}
                                            </span>
                                        </div>
                                    )}
                                    <MessageBubble
                                        message={message}
                                        isOwn={message.sender === user?._id}
                                        senderName={getName(message.sender, 'Member')}
                                        showSender={isGroup && showSender}
                                        onRetry={retryMessage}
                                    />
                                </React.Fragment>
                            ))
                        )}
                    </>
                )}
            </div>

            {showJumpToLatest && (
                <button
                    type="button"
                    onClick={() => scrollToBottom('smooth')}
                    className="absolute bottom-24 right-4 z-20 flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-blue-700"
                >
                    <ChevronDown className="h-4 w-4" />
                    New messages
                </button>
            )}

            {error && (
                <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-600">{error}</p>
            )}

            <form
                onSubmit={handleSubmit}
                className="flex flex-shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-3 py-3 sm:px-4"
            >
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message"
                    maxLength={2000}
                    disabled={loading}
                    aria-label="Message text"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
                <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    aria-label="Send message"
                    className="flex-shrink-0 rounded-xl bg-blue-600 p-2.5 text-white transition-colors hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
                >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
            </form>
        </section>
    );
}
