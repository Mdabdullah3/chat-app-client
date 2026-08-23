'use client';

import React from 'react';
import { format } from 'date-fns';
import { AlertCircle, Check, Clock, RotateCcw } from 'lucide-react';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName: string;
  showSender: boolean;
  onRetry: (messageId: string) => void;
}

const safeTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, 'hh:mm a');
};

export default function MessageBubble({
  message,
  isOwn,
  senderName,
  showSender,
  onRetry,
}: MessageBubbleProps) {
  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      {showSender && !isOwn && (
        <span className="mb-1 ml-3 text-[11px] font-semibold text-slate-500">{senderName}</span>
      )}

      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[70%] ${
          isOwn
            ? message.failed
              ? 'bg-rose-500 text-white'
              : 'bg-blue-600 text-white'
            : 'border border-slate-100 bg-white text-slate-800'
        } ${message.pending ? 'opacity-70' : ''}`}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>

        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
            isOwn ? 'text-blue-100' : 'text-slate-400'
          }`}
        >
          <span>{safeTime(message.createdAt)}</span>
          {isOwn && message.pending && <Clock className="h-3 w-3" />}
          {isOwn && message.failed && <AlertCircle className="h-3 w-3" />}
          {isOwn && !message.pending && !message.failed && <Check className="h-3 w-3" />}
        </div>
      </div>

      {message.failed && (
        <button
          type="button"
          onClick={() => onRetry(message._id)}
          className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline"
        >
          <RotateCcw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}
