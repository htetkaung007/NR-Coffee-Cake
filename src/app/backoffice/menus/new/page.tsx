// backoffice/menus/new/page.tsx (Server Component)
import { requireBackofficeContext } from "@/app/lib/backofficeContext";

import NewMenu from "./NewMenu";

export default async function NewMenuPage() {
  const { context, fallback } = await requireBackofficeContext({
    signedOut: "Please sign in to create a menu.",
    access: "owner",
  });
  if (!context) return fallback;

  return (
    <NewMenu
      companyId={context.companyId}
      currentLocationId={context.location.locationId}
    />
  );
}
