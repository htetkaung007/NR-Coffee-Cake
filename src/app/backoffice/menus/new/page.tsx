// backoffice/menus/new/page.tsx (Server Component)
import { requireBackofficeContext } from "@/app/lib/access/backofficeContext";

import NewMenu from "./NewMenu";

export default async function NewMenuPage() {
  const { context, fallback } = await requireBackofficeContext({
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
