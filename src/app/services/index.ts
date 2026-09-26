// Single, stable import address for every Service — see CLAUDE.md
// Rule 14. Always import Services from "@/app/services", never from a
// concrete file like "@/app/services/app.service". That way, splitting a
// Service into its own file later only requires a change here, not in
// every file that imports it.

export { AppService } from "./app.service";
export { MenuService } from "./menu.service";
export { MenuCategoryService } from "./menuCategory.service";
export { MenuStockService } from "./menuStock.service";
export { LocationService } from "./location.service";
export { AddonService } from "./addon.service";
export { TableService } from "./table.service";
export { PriceSnapshotService } from "./priceSnapshot.service";
export { BillService } from "./bill.service";
export { OrderHistoryService } from "./orderHistory.service";
export {
  OrderSessionService,
  isSessionTerminal,
} from "./orderService/orderSession.service";
export { OrderSessionApprovalService } from "./orderService/orderSessionApproval.service";
export { OrderSessionCartService } from "./orderService/orderSessionCart.service";
export { TableDraftService } from "./tableDraft.service";
