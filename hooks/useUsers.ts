"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { userService } from "@/services/chat";
import { getErrorMessage } from "@/services/api";
import type { User } from "@/types";

export const useUserSearch = (query: string, enabled = true) => {
  const [users, setUsers] = useState<User[]>([]);
  const [settledQuery, setSettledQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();
  const active = enabled && trimmed.length >= 2;

  // Loading is derived from the last settled query so the effect sets no state up front
  const loading = active && settledQuery !== trimmed;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      userService
        .search(trimmed)
        .then((data) => {
          if (!cancelled) {
            setUsers(data);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setUsers([]);
            setError(getErrorMessage(err, "Search failed"));
          }
        })
        .finally(() => {
          if (!cancelled) setSettledQuery(trimmed);
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, active]);

  return {
    users: loading || !active ? [] : users,
    loading,
    error: active ? error : null,
  };
};

// Messages only carry a sender id, so participant records are cached for name lookups
export const useUserDirectory = (seed: User[]) => {
  const [directory, setDirectory] = useState<Record<string, User>>({});
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fresh = seed.filter((u) => u && !seenRef.current.has(u._id));
    if (fresh.length === 0) return;

    fresh.forEach((u) => seenRef.current.add(u._id));
    setDirectory((prev) => {
      const next = { ...prev };
      fresh.forEach((u) => {
        next[u._id] = u;
      });
      return next;
    });
  }, [seed]);

  const getName = useCallback(
    (userId: string, fallback = "Unknown") =>
      directory[userId]?.name ?? fallback,
    [directory],
  );

  return { directory, getName };
};
