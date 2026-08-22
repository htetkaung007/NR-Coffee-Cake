// Single, stable import address for every Service — see PROJECT_RULES.md
// Rule 14. Always import Services from "@/app/services", never from a
// concrete file like "@/app/services/app.service". That way, splitting a
// Service into its own file later only requires a change here, not in
// every file that imports it.

export { AppService } from "./app.service";
export { MenuService } from "./menu_menuCategory.service";
export { MenuStockService } from "./menuStock.service";
export { LocationService } from "./location.service";

export { AddonService } from "./addon.service";
export { TableService } from "./table.service";
export { OrderSessionService } from "./orderSession.service";
