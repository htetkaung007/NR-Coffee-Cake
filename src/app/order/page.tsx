import { Box, Typography } from "@mui/material";
import { redirect } from "next/navigation";
import {
  AppService,
  LocationService,
  MenuService,
  OrderSessionService,
} from "@/app/services";
import { getCounterSessionIdFromCookie } from "@/app/lib/orderSessionCookie";
import OrderMenuView from "../components/orderUI/OrderMenuView";

interface OrderPageProps {
  searchParams: Promise<{
    locationId?: string;
    tableId?: string;
    key?: string;
  }>;
}

/**
 * Single landing point for all four customer-facing entry points
 * described in order-system-design.md:
 *
 *  - Table QR:    ?locationId=X&tableId=Y where that Table's isCounter
 *                 is false/null → session resolved via
 *                 OrderSessionService.resolveTableSession (Table.activeSessionId,
 *                 no cookie, no approval gate).
 *  - Counter QR:  ?locationId=X&tableId=Y&key=Z on first scan (see
 *                 counter-session/route.ts — it verifies key against
 *                 Table.counterAccessKey, creates a PENDING_APPROVAL
 *                 session, sets the cookie, then redirects back here
 *                 *without* the key). Return visits carry no key, only
 *                 the cookie, and go through resolveCounterSession.
 *  - Online browsing (no tableId, or a bare ?locationId=X link) →
 *                 no session at all, menu renders in view-only mode.
 *
 * This page only decides *which session applies* (or that there isn't
 * one, or that one is pending cashier approval) and passes that down —
 * it doesn't know about cart/ordering UI itself, that's OrderMenuView's job.
 */
export default async function OrderPage({ searchParams }: OrderPageProps) {
  const params = await searchParams;
  const locationId = params.locationId ? Number(params.locationId) : null;
  const tableId = params.tableId ? Number(params.tableId) : null;
  const urlKey = params.key ?? null;

  if (!locationId) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          This link is missing location information. Please scan the QR code
          again.
        </Typography>
      </Box>
    );
  }

  const location = await LocationService.getLocationById(locationId).catch(
    () => null,
  );
  if (!location) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          We could not find this location. Please scan the QR code again.
        </Typography>
      </Box>
    );
  }

  const locationTables = await AppService.getSelectedLocationTables(locationId);

  // --- Resolve session (or none, for plain online browsing) ---
  let activeSessionId: number | null = null;
  let sessionLabel: string | null = null;
  let isReadOnly = false;
  let isPendingApproval = false;

  if (tableId) {
    const table = locationTables.find((t) => t.id === tableId);

    if (table?.isCounter) {
      if (urlKey) {
        // First scan (the printed/saved QR still has the key baked
        // in) — hand off to the Route Handler, which is the only
        // place allowed to set the cookie (see
        // counter-session/route.ts's doc comment for why a Server
        // Component can't do this directly). It verifies the key,
        // creates the PENDING_APPROVAL session, and redirects back
        // to this exact URL with &key= stripped — so the key never
        // persists anywhere past this one redirect.
        redirect(
          `/order/counter-session?locationId=${locationId}&tableId=${tableId}&key=${encodeURIComponent(urlKey)}`,
        );
      }

      // No key on this request — either a returning visit (cookie
      // should still be valid) or someone hit the URL without ever
      // having scanned the real QR. Cookie is the only thing that can
      // legitimately grant access from here; no cookie means no order.
      const cookieSessionId = await getCounterSessionIdFromCookie();
      const session = cookieSessionId
        ? await OrderSessionService.resolveCounterSession(cookieSessionId)
        : null;

      if (session) {
        activeSessionId = session.id;
        sessionLabel = `#${String(session.id).padStart(3, "0")}`;
        isPendingApproval = session.status === "PENDING_APPROVAL";
        isReadOnly = session.status === "PAID";
      }
      // session === null (no cookie, cookie pointed at something
      // gone/PAID/stale) → falls through with activeSessionId still
      // null, which OrderMenuView renders as view-only. Deliberately
      // does NOT create a new session here — only a verified key can
      // do that (see the urlKey branch above).
    } else if (table) {
      const session = await OrderSessionService.resolveTableSession(tableId);
      activeSessionId = session.id;
      sessionLabel = table.name; // e.g. "Table 5" — per design, Table sessions are labeled by table name, not an order number
      // A Table session is never handed back in PAID state — see
      // OrderSessionService.resolveTableSession, it auto-starts a new
      // session the moment the old one is PAID. So isReadOnly stays
      // false here by construction, no separate check needed. Table
      // QR also has no approval gate — see startTableSession's doc
      // comment for why that's specific to Counter QR.
    }
  }
  // tableId absent entirely → online browsing, activeSessionId stays
  // null and isReadOnly stays false (there's no order to be read-only
  // *about* — the cart/order UI is simply never shown, see OrderMenuView).

  const menuItems = await MenuService.getMenusWithDetails(
    location.companyId,
    locationId,
  );

  return (
    <OrderMenuView
      menuItems={menuItems}
      sessionId={activeSessionId}
      sessionLabel={sessionLabel}
      isReadOnly={isReadOnly}
      isPendingApproval={isPendingApproval}
      canOrder={activeSessionId !== null && !isPendingApproval}
    />
  );
}
