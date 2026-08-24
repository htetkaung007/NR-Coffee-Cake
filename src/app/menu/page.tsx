import { cookies } from "next/headers";
import { OrderSessionService, MenuService } from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";
import CounterOrderClient from "@/app/customer/menu/counterorderclient";

/**
 * View + Order UI ကို page တစ်ခုတည်းထဲ ပေါင်းထားတယ် — cookie session
 * ရှိမရှိအလိုက် CounterOrderClient ကို hasSession flag နဲ့ ခေါ်တာပဲ
 * ကွာသွားတယ်, menu list display ကတော့ ၂ ခုစလုံးအတွက် တူတူပဲ.
 *
 * SECURITY NOTE: ဒီမှာ hasSession=false ဖြစ်ရင် Add/Submit button
 * hide လုပ်တာက UX ချည်းပဲ — တကယ့် access control က
 * customer/menu/action.ts ရဲ့ requireSessionFromCookie() (Server
 * Action boundary) မှာပဲရှိတယ်. Cookie မရှိတဲ့သူက button ကို hide
 * ထားရင်တောင် Server Action ကို တိုက်ရိုက်ခေါ်ဖို့ ကြိုးစားရင်
 * UNAUTHORIZED AppError နဲ့ reject ခံရမယ် — ဒီ page က ဒါကို
 * ထပ်မလုပ်တော့ဘူး, Service/Action layer ကိုပဲ ယုံတယ်.
 */
export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>;
}) {
  const { locationId: locationIdParam } = await searchParams;
  const locationId = Number(locationIdParam);

  const cookieStore = await cookies();
  const token = cookieStore.get(COUNTER_SESSION_COOKIE)?.value;

  // /menu ကို cookie ရှိသူ၊ မရှိသူ နှစ်ဦးစလုံး ရောက်ခွင့်ရှိတယ်
  // (middleware guard မလိုတော့ဘူး) — ဒါကြောင့် ဒီမှာကိုယ်တိုင်
  // real (DB-backed) check ကို getActiveSessionByToken နဲ့ လုပ်ရမယ်.
  const session = token
    ? await OrderSessionService.getActiveSessionByToken(token)
    : null;

  // Session ရှိရင် session ရဲ့ locationId ကို ယုံ (query param ကို
  // customer က ကိုယ်တိုင် ပြောင်းလို့ရလို့) — မရှိမှသာ query param ကို သုံး.
  const effectiveLocationId = session ? session.locationId : locationId;

  const menus = await MenuService.getMenusForLocation(effectiveLocationId);

  return (
    <CounterOrderClient
      hasSession={session !== null}
      locationId={effectiveLocationId}
      orderNumber={session?.orderNumber ?? ""}
      initialStatus={session?.status ?? "CART"}
      initialCart={
        session?.orders.map((order) => ({
          id: order.id,
          menuName: order.menu.name,
          quantity: order.quantity,
          price: order.menu.price,
        })) ?? []
      }
      menus={menus.map((menu) => ({
        id: menu.id,
        name: menu.name,
        price: menu.price,
        description: menu.description,
      }))}
    />
  );
}
