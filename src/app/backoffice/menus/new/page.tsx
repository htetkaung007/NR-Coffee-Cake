// backoffice/menus/new/page.tsx (Server Component)
import { getSessionContext } from "@/app/lib/session";

import NewMenu from "./NewMenu";

export default async function NewMenuPage() {
  const { companyId } = await getSessionContext();
  if (!companyId) {
    return null;
  }

  return <NewMenu />;
}
