'use client';

import React, { useMemo, useState } from 'react';
import { Crown, Loader2, LogOut, Pencil, Search, ShieldCheck, UserMinus, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserSearch } from '@/hooks/useUsers';
import { getConversationMembers, getConversationTitle } from '@/hooks/useConversations';
import { conversationService } from '@/services/chat';
import { getErrorMessage } from '@/services/api';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import type { Conversation } from '@/types';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  onUpdated: (conversation: Conversation) => void;
  onLeft: (conversationId: string) => void;
}

export default function GroupInfoModal({
  isOpen,
  onClose,
  conversation,
  onUpdated,
  onLeft,
}: GroupInfoModalProps) {
  const { user } = useAuth();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(conversation.name ?? '');
  const [addQuery, setAddQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGroup = conversation.type === 'group';
  const members = useMemo(() => getConversationMembers(conversation), [conversation]);
  const isAdmin = Boolean(user && conversation.admins?.includes(user._id));

  const { users: searchResults, loading: searching } = useUserSearch(addQuery, isOpen && isAdmin);
  const addable = useMemo(
    () => searchResults.filter((u) => !members.some((m) => m._id === u._id)),
    [searchResults, members]
  );

  const run = async (key: string, action: () => Promise<Conversation>) => {
    setBusyId(key);
    setError(null);
    try {
      onUpdated(await action());
      return true;
    } catch (err) {
      setError(getErrorMessage(err, 'Action failed'));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleRename = async () => {
    const next = nameDraft.trim();
    if (!next || next === conversation.name) {
      setRenaming(false);
      return;
    }
    const ok = await run('rename', () => conversationService.rename(conversation._id, next));
    if (ok) setRenaming(false);
  };

  const handleLeave = async () => {
    if (!user) return;
    setBusyId('leave');
    setError(null);
    try {
      await conversationService.removeParticipant(conversation._id, user._id);
      onLeft(conversation._id);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not leave the group'));
    } finally {
      setBusyId(null);
    }
  };

  if (!isGroup) {
    const other = conversation.participant ?? members.find((m) => m._id !== user?._id);
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Contact details">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Avatar name={other?.name ?? '?'} size="lg" />
          <div>
            <p className="text-base font-semibold text-slate-900">{other?.name}</p>
            <p className="text-sm text-slate-500">{other?.phone}</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group details">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Avatar name={getConversationTitle(conversation, user?._id)} isGroup size="lg" />
          <div className="min-w-0 flex-1">
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={60}
                  aria-label="Group name"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button onClick={handleRename} loading={busyId === 'rename'} className="px-2.5 py-1.5">
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-semibold text-slate-900">
                  {conversation.name || 'Unnamed Group'}
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(conversation.name ?? '');
                      setRenaming(true);
                    }}
                    aria-label="Rename group"
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              {members.length} members
              {isAdmin && (
                <>
                  <span aria-hidden>·</span>
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  You are an admin
                </>
              )}
            </p>
          </div>
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Members
          </p>
          <ul className="space-y-1">
            {members.map((member) => {
              const memberIsAdmin = conversation.admins?.includes(member._id);
              const isSelf = member._id === user?._id;
              return (
                <li
                  key={member._id}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50"
                >
                  <Avatar name={member.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {member.name}
                      {isSelf && <span className="text-slate-400"> (you)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">{member.phone}</p>
                  </div>

                  {memberIsAdmin ? (
                    <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      <Crown className="h-3 w-3" />
                      Admin
                    </span>
                  ) : (
                    isAdmin && (
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={busyId === member._id}
                          onClick={() =>
                            run(member._id, () =>
                              conversationService.promoteAdmin(conversation._id, member._id)
                            )
                          }
                          title="Make admin"
                          aria-label={`Make ${member.name} an admin`}
                          className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                        >
                          <Crown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busyId === member._id}
                          onClick={() =>
                            run(member._id, () =>
                              conversationService.removeParticipant(conversation._id, member._id)
                            )
                          }
                          title="Remove from group"
                          aria-label={`Remove ${member.name}`}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {isAdmin && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Add members
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                placeholder="Search by name or phone"
                aria-label="Search users to add"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {searching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : (
              addable.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {addable.map((candidate) => (
                    <li key={candidate._id}>
                      <button
                        type="button"
                        disabled={busyId === candidate._id}
                        onClick={async () => {
                          const ok = await run(candidate._id, () =>
                            conversationService.addParticipants(conversation._id, [candidate._id])
                          );
                          if (ok) setAddQuery('');
                        }}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Avatar name={candidate.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {candidate.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">{candidate.phone}</p>
                        </div>
                        <UserPlus className="h-4 w-4 flex-shrink-0 text-blue-600" />
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <Button variant="danger" onClick={handleLeave} loading={busyId === 'leave'}>
            <LogOut className="h-4 w-4" />
            Leave group
          </Button>
        </div>
      </div>
    </Modal>
  );
}
