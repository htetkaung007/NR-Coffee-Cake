"use client";

import { useEffect } from "react";

/** Sets document.title while the calling component is mounted (and
 *  whenever `title` changes), restoring whatever it was before once it
 *  unmounts. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    // Each change's cleanup restores the original before the next run
    // captures it, so `previous` is always the pre-hook title.
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

// "(3) Orders" — the count prefix useDocumentTitleCount adds.
const COUNT_PREFIX = /^\(\d+\) (.*)$/;
// Most Backoffice pages set no title of their own; "(3) " alone would
// read as nothing, so a bare count gets this after it instead.
const FALLBACK_TITLE = "Backoffice";

/** The title with any count prefix removed (and the fallback, if that's
 *  all the prefix was attached to). */
function withoutCount(title: string) {
  const match = COUNT_PREFIX.exec(title);
  if (!match) return title;
  return match[1] === FALLBACK_TITLE ? "" : match[1];
}

/**
 * Prefixes whatever title the current page has with "(count) " while
 * count > 0, and removes it at 0 and on unmount — for a count that
 * outlives page navigation (mounted from a layout).
 *
 * The page's own title can change underneath it (a page's
 * useDocumentTitle mounting, or restoring a stale prefixed title on
 * unmount), so a MutationObserver on <head> re-applies the prefix to
 * whatever title is current. Setting a title that's already correct is
 * skipped, so the observer's own write doesn't loop.
 */
export function useDocumentTitleCount(count: number) {
  useEffect(() => {
    function apply() {
      const base = withoutCount(document.title);
      const next = count > 0 ? `(${count}) ${base || FALLBACK_TITLE}` : base;
      if (document.title !== next) document.title = next;
    }

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      document.title = withoutCount(document.title);
    };
  }, [count]);
}
