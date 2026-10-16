import { CompanyService, LocationService } from "@/app/services";
import { landingLocations } from "@/app/lib/storefront/landingLocations";
import StorefrontLanding from "@/app/components/orderUI/StorefrontLanding";

// The shop's locations can change at any time (the online menu switch,
// archiving) — always read them fresh.
export const dynamic = "force-dynamic";

/**
 * `/` — the customers' landing page (DESIGN.md §18). Server-side reads
 * only: the shop name, and each location's id + name + the two flags;
 * just the listed locations' id + name reach the browser.
 */
export default async function LandingPage() {
  const [shopName, facts] = await Promise.all([
    CompanyService.getShopName(),
    LocationService.getLandingLocationFacts(),
  ]);

  return (
    <StorefrontLanding shopName={shopName} locations={landingLocations(facts)} />
  );
}
