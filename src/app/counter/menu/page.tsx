import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrderSessionService, MenuService } from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";
import CounterOrderClient from "./counterorderclient";

export default async function CounterMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>;
}) {
  const { locationId: locationIdParam } = await searchParams;
  const locationId = Number(locationIdParam);

  const cookieStore = await cookies();
  const token = cookieStore.get(COUNTER_SESSION_COOKIE)?.value;

  // Middleware already redirects if the cookie is entirely absent —
  // this is the real (DB-backed) check for "is it still good", which
  // middleware deliberately doesn't do (see middleware.ts comment).
  // getActiveSessionByToken is the single source of truth for what
  // counts as "still good" (see its comment in the Service) — this
  // page doesn't re-derive that itself.
  const session = token
    ? await OrderSessionService.getActiveSessionByToken(token)
    : null;

  if (!session) {
    redirect(`/menu?locationId=${locationId}`);
  }

  const menus = await MenuService.getMenusForLocation(session.locationId);

  return (
    <CounterOrderClient
      locationId={session.locationId}
      orderNumber={session.orderNumber}
      initialStatus={session.status}
      initialCart={session.orders.map((order) => ({
        id: order.id,
        menuName: order.menu.name,
        quantity: order.quantity,
        price: order.menu.price,
      }))}
      menus={menus.map((menu) => ({
        id: menu.id,
        name: menu.name,
        price: menu.price,
        description: menu.description,
      }))}
    />
  );
}
