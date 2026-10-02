import type { ReactElement } from "react";
import { Box, Typography } from "@mui/material";
import { LocationService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";

type SelectedLocation = NonNullable<
  Awaited<ReturnType<typeof LocationService.getSelectedLocation>>
>;

export interface BackofficeContext {
  userId: number;
  companyId: number;
  location: SelectedLocation;
}

/** The muted one-liner a Backoffice page shows instead of its content. */
function BackofficeNotice({ message }: { message: string }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}

/**
 * Session → companyId/userId → selected location, the sequence every
 * location-scoped Backoffice page starts with. Pages don't redirect when
 * something is missing — they render a notice in place — so this hands
 * back either the context or that notice:
 *
 *   const { context, fallback } = await requireBackofficeContext({
 *     signedOut: "Please sign in to view orders.",
 *   });
 *   if (!context) return fallback;
 *
 * Lives in lib/ next to getSessionContext for the same reason: reading
 * the session is a Controller-layer concern (Rule 1).
 */
export async function requireBackofficeContext(messages: {
  signedOut: string;
  noLocation?: string;
}): Promise<
  | { context: BackofficeContext; fallback: null }
  | { context: null; fallback: ReactElement }
> {
  const { companyId, userId } = await getSessionContext();
  if (!companyId || !userId) {
    return {
      context: null,
      fallback: <BackofficeNotice message={messages.signedOut} />,
    };
  }

  const location = await LocationService.getSelectedLocation(userId);
  if (!location) {
    return {
      context: null,
      fallback: (
        <BackofficeNotice
          message={
            messages.noLocation ??
            "No location selected. Please choose a location first."
          }
        />
      ),
    };
  }

  return { context: { userId, companyId, location }, fallback: null };
}
