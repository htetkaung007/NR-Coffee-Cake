"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ActionResult } from "@/app/lib/actionResult";
import { useStaffErrorMessage } from "@/app/lib/hooks/useStaffWords";

export type ResourceState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: T };

/** What's kept per key: the data, or the action's error as it came (null
 *  when the request itself failed) — put into words when read, in the
 *  staff's language. */
type Entry<T> =
  | { status: "ok"; data: T }
  | {
      status: "error";
      error: { message: string; code: string; params?: Record<string, string | number> } | null;
    };

/**
 * One server-action result per `key`, fetched in the background the first
 * time that key is wanted and kept — so going back to a key already seen
 * (a tab switch, the previous month) shows it at once without asking
 * again. Each answer is stored under the key it was asked for and only
 * the CURRENT key is ever read, so a slow answer for something the user
 * has already moved away from can never replace what they're looking at.
 * `key` null means nothing to load yet. `retry` forgets the current key's
 * (failed) answer and asks again.
 *
 * The load function is read through a ref, so callers can pass a fresh
 * inline closure every render without re-triggering the fetch — only a
 * different key (or a retry) does.
 */
export function useKeyedResource<T>(
  key: string | null,
  load: () => Promise<ActionResult<T>>,
) {
  const t = useTranslations("bo.reports");
  const errorText = useStaffErrorMessage();
  const [entries, setEntries] = useState<Record<string, Entry<T>>>({});
  const [attempt, setAttempt] = useState(0);
  const requested = useRef(new Set<string>());
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (key === null) return;
    const requestId = `${key}#${attempt}`;
    if (requested.current.has(requestId)) return;
    requested.current.add(requestId);

    function store(entry: Entry<T>) {
      setEntries((current) => ({ ...current, [key!]: entry }));
    }
    loadRef
      .current()
      .then((result) =>
        store(
          result.success
            ? { status: "ok", data: result.data }
            : { status: "error", error: result.error },
        ),
      )
      .catch(() => store({ status: "error", error: null }));
  }, [key, attempt]);

  const retry = useCallback(() => {
    if (key === null) return;
    setEntries((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setAttempt((value) => value + 1);
  }, [key]);

  const entry = key === null ? undefined : entries[key];
  const state: ResourceState<T> = !entry
    ? { status: "loading" }
    : entry.status === "ok"
      ? entry
      : {
          status: "error",
          message: entry.error ? errorText(entry.error) : t("loadErrorThis"),
        };
  return { state, retry };
}
