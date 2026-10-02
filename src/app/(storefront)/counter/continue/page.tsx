import { redirect } from "next/navigation";
import CounterScanContinue from "@/app/components/orderUI/CounterScanContinue";

/**
 * Where a successful counter-QR scan lands (see ../route.ts — the key is
 * checked and the cookie set there, before this page). Only the browser
 * knows whether it already has a cart for this location (it lives in
 * localStorage), so the choice between the cart and the menu is made
 * client-side, in CounterScanContinue.
 */
export default async function CounterContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>;
}) {
  const { locationId: locationIdParam } = await searchParams;
  const locationId = Number(locationIdParam);
  if (!Number.isInteger(locationId) || locationId <= 0) redirect("/menu");

  return <CounterScanContinue locationId={locationId} />;
}
