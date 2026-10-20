"use client";

import { useEffect } from "react";

/**
 * The `scanned` URL marker (set by the QR Route Handlers after a scan) is
 * one-time: once the page has shown its "Scanned" note, drop it from the
 * address so a reload or Back never shows the note again. The cart page
 * and the Counter menu both use it.
 */
export function useDropScannedMarker(justScanned: boolean) {
  useEffect(() => {
    if (!justScanned) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("scanned");
    window.history.replaceState(null, "", url);
  }, [justScanned]);
}
