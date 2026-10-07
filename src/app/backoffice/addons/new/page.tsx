import { MenuService } from "@/app/services";
import { requireBackofficeAccess } from "@/app/lib/backofficeContext";
import NewAddon from "./NewAddon";

export default async function NewAddonPage() {
  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: "Please sign in to create an addon group.",
    access: "owner",
  });
  if (!scope) return fallback;

  const menusData = await MenuService.getMenus(scope.companyId);
  const menus = menusData.map((menu) => ({ id: menu.id, name: menu.name }));

  return <NewAddon menus={menus} />;
}
