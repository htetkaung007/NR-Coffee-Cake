// backoffice/menus/new/page.tsx (Server Component)
import { getSessionContext } from "@/app/lib/session";
import { MenuService } from "@/app/services";
import NewMenu from "./newMenu";

export default async function NewMenuPage() {
  const { companyId } = await getSessionContext();
  if (!companyId) {
    return null;
  }

  const categories = await MenuService.getMenuCategories(companyId);

  return <NewMenu categories={categories} />;
}
