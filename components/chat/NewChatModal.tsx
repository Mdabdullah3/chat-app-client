'use client';

import React, { useMemo, useState } from 'react';
import { Check, Loader2, Search, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserSearch } from '@/hooks/useUsers';
import { conversationService } from '@/services/chat';
import { getErrorMessage } from '@/services/api';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import type { Conversation, User } from '@/types';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (conversation: Conversation) => void;
}

// Backend rejects groups smaller than 3 total members (creator included)
const MIN_GROUP_PARTICIPANTS = 2;

export default function NewChatModal({ isOpen, onClose, onCreated }: NewChatModalProps) {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selected, setSelected] = useState<User[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { users, loading: searching } = useUserSearch(query, isOpen);
    const results = useMemo(() => users.filter((u) => u._id !== user?._id), [users, user?._id]);

    const reset = () => {
        setQuery('');
        setIsGroupMode(false);
        setGroupName('');
        setSelected([]);
        setError(null);
        setSubmitting(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const toggleSelected = (target: User) => {
        setSelected((prev) =>
            prev.some((u) => u._id === target._id)
                ? prev.filter((u) => u._id !== target._id)
                : [...prev, target]
        );
    };

    const startDirect = async (target: User) => {
        setSubmitting(true);
        setError(null);
        try {
            const conversation = await conversationService.createDirect(target._id);
            onCreated(conversation);
            handleClose();
        } catch (err) {
            setError(getErrorMessage(err, 'Could not start the conversation'));
        } finally {
            setSubmitting(false);
        }
    };

    const createGroup = async () => {
        if (!groupName.trim() || selected.length < MIN_GROUP_PARTICIPANTS) return;
        setSubmitting(true);
        setError(null);
        try {
            const conversation = await conversationService.createGroup(
                groupName.trim(),
                selected.map((u) => u._id)
            );
            onCreated(conversation);
            handleClose();
        } catch (err) {
            setError(getErrorMessage(err, 'Could not create the group'));
        } finally {
            setSubmitting(false);
        }
    };

    const canCreateGroup = groupName.trim().length > 0 && selected.length >= MIN_GROUP_PARTICIPANTS;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={isGroupMode ? 'New group' : 'New conversation'}
            footer={
                isGroupMode ? (
                    <>
                        <Button variant="secondary" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button onClick={createGroup} loading={submitting} disabled={!canCreateGroup}>
                            <UserPlus className="h-4 w-4" />
                            Create group
                        </Button>
                    </>
                ) : undefined
            }
        >
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={() => {
                        setIsGroupMode((prev) => !prev);
                        setSelected([]);
                        setError(null);
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    <Users className="h-4 w-4" />
                    {isGroupMode ? 'Switch to direct message' : 'Create a group instead'}
                </button>

                {isGroupMode && (
                    <div>
                        <label htmlFor="group-name" className="mb-1 block text-sm font-medium text-slate-700">
                            Group name
                        </label>
                        <input
                            id="group-name"
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Project Alpha"
                            maxLength={60}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Add at least {MIN_GROUP_PARTICIPANTS} people ({selected.length} selected)
                        </p>
                    </div>
                )}

                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name or phone"
                        aria-label="Search users"
                        className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {isGroupMode && selected.length > 0 && (
                    <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2">
                        {selected.map((u) => (
                            <button
                                key={u._id}
                                type="button"
                                onClick={() => toggleSelected(u)}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                            >
                                {u.name}
                                <span aria-hidden>×</span>
                            </button>
                        ))}
                    </div>
                )}

                {error && (
                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
                )}

                <div className="min-h-[8rem]">
                    {searching ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                    ) : results.length > 0 ? (
                        <ul className="max-h-64 space-y-1 overflow-y-auto">
                            {results.map((u) => {
                                const isSelected = selected.some((s) => s._id === u._id);
                                return (
                                    <li key={u._id}>
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => (isGroupMode ? toggleSelected(u) : startDirect(u))}
                                            className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors disabled:opacity-60 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <Avatar name={u.name} size="sm" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-800">{u.name}</p>
                                                <p className="truncate text-xs text-slate-500">{u.phone}</p>
                                            </div>
                                            {isGroupMode && (
                                                <span
                                                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${isSelected
                                                            ? 'border-blue-600 bg-blue-600 text-white'
                                                            : 'border-slate-300'
                                                        }`}
                                                >
                                                    {isSelected && <Check className="h-3 w-3" />}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="py-8 text-center text-sm text-slate-400">
                            {query.trim().length >= 2 ? 'No users found' : 'Type at least 2 characters to search'}
                        </p>
                    )}
                </div>
            </div>
        </Modal>
    );
}
