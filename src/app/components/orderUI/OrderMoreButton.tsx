"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@mui/material";

import { startNextRoundAction } from "@/app/(storefront)/counter/action";

interface OrderMoreButtonProps {
  /** Where "Order more" lands — the menu, with the same locationId /
   *  tableId the page was opened with. */
  menuHref: string;
  /** Counter QR only: the current round is already in the kitchen, so
   *  ordering more means starting a new round first (same call as
   *  CartPageClient's "Order More"). Table QR just goes back to the menu
   *  — drafts for the next round are added there. */
  startNewRound?: boolean;
}

export default function OrderMoreButton({
  menuHref,
  startNewRound = false,
}: OrderMoreButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!startNewRound) {
    return (
      <Button
        component={Link}
        href={menuHref}
        variant="contained"
        fullWidth
        sx={{ borderRadius: 999, py: 1.25 }}
      >
        Order more
      </Button>
    );
  }

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startNextRoundAction();
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(menuHref);
      router.refresh();
    });
  }

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      <Button
        variant="contained"
        fullWidth
        disabled={isPending}
        onClick={handleClick}
        sx={{ borderRadius: 999, py: 1.25 }}
      >
        Order more
      </Button>
    </>
  );
}
