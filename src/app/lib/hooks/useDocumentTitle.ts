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
