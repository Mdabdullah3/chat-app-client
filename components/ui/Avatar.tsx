'use client';

import React from 'react';
import { Users } from 'lucide-react';

interface AvatarProps {
  name: string;
  isGroup?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-12 w-12 text-base',
};

const palette = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

// Deterministic colour so the same person always gets the same avatar tint
const tintFor = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

export default function Avatar({ name, isGroup = false, size = 'md' }: AvatarProps) {
  const tint = isGroup ? 'bg-indigo-100 text-indigo-700' : tintFor(name || '?');

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-semibold ${sizeMap[size]} ${tint}`}
      aria-hidden
    >
      {isGroup ? <Users className="h-1/2 w-1/2" /> : (name?.charAt(0) || '?').toUpperCase()}
    </div>
  );
}
