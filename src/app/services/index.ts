// Single, stable import address for every Service — see CLAUDE.md
// Rule 14. Always import Services from "@/app/services", never from a
// concrete file like "@/app/services/app.service". That way, splitting a
// Service into its own file later only requires a change here, not in
// every file that imports it.

export { AppService } from "./app.service";
export { CompanyService } from "./company.service";
export { MenuService } from "./menu.service";
export { MenuCategoryService } from "./menuCategory.service";
export { MenuStockService } from "./menuStock.service";
export { MenuLocationService } from "./menuLocation.service";
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
export { TableSessionService } from "./orderService/tableSession.service";
export { CounterSessionService } from "./orderService/counterSession.service";
export { StaffOrderService } from "./orderService/staffOrder.service";
export { OrderApprovalService } from "./orderService/orderApproval.service";
export { OrderPaymentService } from "./orderService/orderPayment.service";
export { OrderListService } from "./orderService/orderList.service";
export { OrderSessionCartService } from "./orderService/orderSessionCart.service";
export { TableDraftService } from "./tableDraft.service";
export { CartValidationService } from "./cartValidation.service";
export { CartSubmitService } from "./cartSubmit.service";
export { ReportService } from "./report.service";
export { PermissionService } from "./permission.service";
export { ManagerService, type ManagerSummary } from "./manager.service";
