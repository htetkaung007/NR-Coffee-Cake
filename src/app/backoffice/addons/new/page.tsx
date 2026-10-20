import { MenuService } from "@/app/services";
import { requireBackofficeAccess } from "@/app/lib/access/backofficeContext";
import NewAddon from "./NewAddon";

export default async function NewAddonPage() {
  const { scope, fallback } = await requireBackofficeAccess({
    access: "owner",
  });
  if (!scope) return fallback;

  const menusData = await MenuService.getMenus(scope.companyId);
  const menus = menusData.map((menu) => ({
    id: menu.id,
    name: menu.name,
    nameMy: menu.nameMy,
  }));

  return <NewAddon menus={menus} />;
}
