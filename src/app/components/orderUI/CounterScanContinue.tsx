"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import { useBrowserCart } from "@/app/lib/hooks/useBrowserCart";

/**
 * Right after a counter-QR scan: a cart this browser already built for
 * the location (while browsing Online) opens ready to send; an empty one
 * goes to the menu, as a scan always did. Either destination shows a
 * one-time "scanned" note (the `scanned=1` marker). Only a spinner shows
 * while the stored cart is read, so nothing else flashes first.
 */
export default function CounterScanContinue({
  locationId,
}: {
  locationId: number;
}) {
  const router = useRouter();
  const { isLoaded, itemCount } = useBrowserCart(locationId);

  useEffect(() => {
    if (!isLoaded) return;
    const destination = itemCount > 0 ? "/cart" : "/menu";
    router.replace(`${destination}?locationId=${locationId}&scanned=1`);
  }, [isLoaded, itemCount, locationId, router]);

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress aria-label="Opening your order" />
    </Box>
  );
}
