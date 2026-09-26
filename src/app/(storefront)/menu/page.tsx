import { cookies } from "next/headers";
import {
  OrderSessionService,
  MenuService,
  LocationService,
  TableDraftService,
} from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";
import { getContributorToken } from "@/app/lib/contributorToken";
import CounterOrderClient from "@/app/components/orderUI/CounterOrderClient";
import TableOrderClient from "@/app/components/orderUI/TableOrderClient";

// Session/cart state can change between one visit and the next (a
// customer's own submit, or another contributor's draft add) —
// cookies() already makes this render dynamic, but forcing it
// explicitly also stops Next's client Router Cache from ever serving
// a stale copy of this route after navigating away and back (e.g. the
// cart icon then the browser's own Back button).
export const dynamic = "force-dynamic";

function buildMenuOptions(
  menus: Awaited<ReturnType<typeof MenuService.getMenusForLocation>>,
) {
  return menus.map((menu) => ({
    id: menu.id,
    name: menu.name,
    price: menu.price,
    description: menu.description,
    categories: menu.categories,
    imageUrl: menu.imageUrl,
    stockQuantity: menu.stockQuantity,
    // getMenusForLocation exposes isManuallyDisabled (staff toggle),
    // not isAvailable directly — OdMenuCard's own isAvailable check
    // ANDs this with stockQuantity > 0, matching
    // getMenuDetailForCustomer's `!isManuallyDisabled` definition.
    isAvailable: !menu.isManuallyDisabled,
  }));
}

/**
 * View + Order UI ကို page တစ်ခုတည်းထဲ ပေါင်းထားတယ် — Table QR (per-
 * customer draft design) vs Counter QR/plain-browsing (session cookie)
 * ကို branch ခွဲပြီး client component သီးခြားစီ (TableOrderClient vs
 * CounterOrderClient) ကို ခေါ်တယ်, menu list query ကတော့ ၂ ခုစလုံး
 * အတွက် တူတူပဲ (buildMenuOptions).
 *
 * tableId ရှိရင်တောင် contributorToken မရှိရင် (ဒီ browser ဒီ table
 * ကို scan ဝင်ခဲ့ဖူးတာ မဟုတ်ဘူး — url ကို လက်နဲ့ ရိုက်ထည့်တာမျိုး)
 * ဒါမှမဟုတ် token က stale ဖြစ်နေရင် (Table.contributorEpoch ကျော်
 * သွားပြီ — table ကို paid လုပ်ပြီးသွားလို့, ပြန် scan မှသာ token
 * အသစ်ရမယ်) Table branch ကို မယုံဘဲ ပုံမှန် browsing view ဆီ
 * ဆက်သွားတယ်.
 *
 * SECURITY NOTE: ဒီမှာ hasSession=false ဖြစ်ရင် Add/Submit button
 * hide လုပ်တာက UX ချည်းပဲ — တကယ့် access control က
 * customer/action.ts ရဲ့ requireSessionFromCookie()/
 * requireContributorToken() (Server Action boundary) မှာပဲရှိတယ်.
 * Cookie မရှိတဲ့သူက button ကို hide ထားရင်တောင် Server Action ကို
 * တိုက်ရိုက်ခေါ်ဖို့ ကြိုးစားရင် UNAUTHORIZED AppError နဲ့ reject
 * ခံရမယ် — ဒီ page က ဒါကို ထပ်မလုပ်တော့ဘူး, Service/Action layer
 * ကိုပဲ ယုံတယ်.
 */
export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string; tableId?: string }>;
}) {
  const { locationId: locationIdParam, tableId: tableIdParam } =
    await searchParams;
  const locationId = Number(locationIdParam);
  const tableId = tableIdParam ? Number(tableIdParam) : null;

  if (tableId) {
    const contributorToken = await getContributorToken(tableId);
    const isTokenCurrent =
      contributorToken !== null &&
      (await TableDraftService.isTokenCurrentForTable(
        tableId,
        contributorToken,
      ));
    if (contributorToken && isTokenCurrent) {
      const [menus, shopName, draftItems, activeRound] = await Promise.all([
        MenuService.getMenusForLocation(locationId),
        LocationService.getShopNameForLocation(locationId),
        TableDraftService.getDraftItemsForTable(tableId),
        OrderSessionService.getActiveRoundForTable(tableId),
      ]);

      return (
        <TableOrderClient
          tableId={tableId}
          locationId={locationId}
          shopName={shopName}
          myContributorToken={contributorToken}
          initialDraftItems={draftItems.map((item) => ({
            id: item.id,
            menuId: item.menuId,
            menuName: item.menu.name,
            quantity: item.quantity,
            price: item.unitPrice,
            contributorToken: item.contributorToken ?? "",
            addonNames: item.OrdersAddons.map((link) => link.addon.name),
            addonIds: item.OrdersAddons.map((link) => link.addonId),
            note: item.note,
          }))}
          initialAwaitingApproval={activeRound?.status === "PENDING_APPROVAL"}
          activeRoundId={activeRound?.id ?? null}
          menus={buildMenuOptions(menus)}
        />
      );
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COUNTER_SESSION_COOKIE)?.value;

  const session = token
    ? await OrderSessionService.getActiveSessionByToken(token)
    : null;

  // Session ရှိရင် session ရဲ့ locationId ကို ယုံ (query param ကို
  // customer က ကိုယ်တိုင် ပြောင်းလို့ရလို့) — မရှိမှသာ query param ကို သုံး.
  const effectiveLocationId = session ? session.locationId : locationId;

  const [menus, shopName, bill] = await Promise.all([
    MenuService.getMenusForLocation(effectiveLocationId),
    LocationService.getShopNameForLocation(effectiveLocationId),
    // "Order More" can split one bill into several rounds — the
    // header shows the BILL's number (matches the cashier's Order
    // List card), never this particular round's own number.
    session ? OrderSessionService.getBillForSession(session) : null,
  ]);

  return (
    <CounterOrderClient
      hasSession={session !== null}
      locationId={effectiveLocationId}
      orderNumber={bill?.billNumber ?? ""}
      shopName={shopName}
      initialStatus={session?.status ?? "CART"}
      initialCart={
        session?.orders.map((order) => ({
          id: order.id,
          menuId: order.menuId,
          menuName: order.menu.name,
          quantity: order.quantity,
          price: order.unitPrice,
          note: order.note,
        })) ?? []
      }
      menus={buildMenuOptions(menus)}
    />
  );
}
