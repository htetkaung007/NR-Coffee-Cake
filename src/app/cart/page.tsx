import { cookies } from "next/headers";
import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { OrderSessionService, LocationService } from "@/app/services";
import {
  COUNTER_SESSION_COOKIE,
  TABLE_SESSION_COOKIE,
} from "@/app/lib/orderSessionCookie";
import CartPageClient from "../components/orderUI/CartPageClient";
import OrderTopBar from "../components/orderUI/OrderTopBar";
import { CartButtonStatus } from "../components/orderUI/CartButton";

// Same reasoning as /menu — see that page's dynamic export comment.
export const dynamic = "force-dynamic";

/**
 * Its own route (not a section within /menu) — per design feedback,
 * the cart is somewhere the customer navigates TO (via the top bar's
 * cart icon), not a block that lives inline below the menu grid.
 * Status (submitted / confirmed) shows on this page's own Submit
 * button, not a full-page swap — so unlike an earlier version of this
 * page, a non-CART session status is NOT redirected away: reloading
 * /cart while PENDING_APPROVAL must still show that state, which is
 * why session.status is passed through as initialStatus below.
 *
 * A visitor with no session at all (someone just browsing online —
 * never scanned a table/counter QR, so no order exists yet) is NOT an
 * error case: the cart icon is always visible in the top bar
 * regardless of hasSession (see counterorderclient.tsx), so this page
 * has to make sense for that visitor too. It gets a plain "No order
 * yet" message here instead of redirecting — a redirect back to
 * /menu with no locationId to carry over previously produced a broken
 * page (MenuService queried with an invalid id).
 */
export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>;
}) {
  const { locationId: locationIdParam } = await searchParams;

  const cookieStore = await cookies();
  const token =
    cookieStore.get(COUNTER_SESSION_COOKIE)?.value ??
    cookieStore.get(TABLE_SESSION_COOKIE)?.value;

  const session = token
    ? await OrderSessionService.getActiveSessionByToken(token)
    : null;

  if (!session) {
    const backHref = locationIdParam
      ? `/menu?locationId=${locationIdParam}`
      : "/menu";
    return (
      <Box sx={{ minHeight: "100vh" }}>
        <OrderTopBar shopName={null} cartItemCount={0} />
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: "auto" }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No order
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You don&apos;t have an active order yet. Scan the table or counter
            QR to start one.
          </Typography>
          <Link href={backHref} style={{ color: "inherit" }}>
            <Typography variant="body2" sx={{ textDecoration: "underline" }}>
              Back to menu
            </Typography>
          </Link>
        </Box>
      </Box>
    );
  }

  const shopName = await LocationService.getShopNameForLocation(
    session.locationId,
  );

  return (
    <CartPageClient
      locationId={session.locationId}
      orderNumber={session.orderNumber}
      shopName={shopName}
      initialStatus={session.status as CartButtonStatus}
      initialCart={session.orders.map((order) => ({
        id: order.id,
        menuName: order.menu.name,
        quantity: order.quantity,
        price: order.menu.price,
      }))}
    />
  );
}
