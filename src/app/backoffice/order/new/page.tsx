import { redirect } from "next/navigation";
import { getSessionContext } from "@/app/lib/session";
import { AppService, MenuService } from "@/app/services";
import StaffOrderClient from "./staffOrderClient";

/**
 * Design doc section 7. Reuses the SAME "which location is this user
 * currently working in" resolution every other Backoffice page uses
 * (AppService.getSelectedLocation) rather than adding a new location
 * picker just for this page — a Manager's location is already fixed
 * via User.locationId, an Admin's via their switched SelectedLocation.
 */
export default async function NewStaffOrderPage() {
  const { userId } = await getSessionContext();
  if (!userId) {
    redirect("/auth/signIn");
  }

  const selectedLocation = await AppService.getSelectedLocation(userId);
  if (!selectedLocation) {
    return <StaffOrderClient locationId={null} tables={[]} menus={[]} />;
  }

  const [tables, menus] = await Promise.all([
    AppService.getSelectedLocationTables(selectedLocation.locationId),
    MenuService.getMenusForLocation(selectedLocation.locationId),
  ]);

  return (
    <StaffOrderClient
      locationId={selectedLocation.locationId}
      tables={tables
        .filter((table) => !table.isArchived)
        .map((table) => ({
          id: table.id,
          name: table.name,
          isCounter: table.isCounter === true,
        }))}
      menus={menus.map((menu) => ({
        id: menu.id,
        name: menu.name,
        price: menu.price,
        description: menu.description,
      }))}
    />
  );
}
