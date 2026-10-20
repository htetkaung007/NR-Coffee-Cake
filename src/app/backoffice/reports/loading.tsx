import { Box } from "@mui/material";
import { getTranslations } from "next-intl/server";
import OrdersPageHeader from "../order/OrdersPageHeader";
import { OverviewSkeleton } from "./ReportStates";

/** What shows while the Reports page first loads: the same title, then
 *  the Overview's skeleton (shaped like the real thing, so nothing jumps). */
export default async function ReportsLoading() {
  const t = await getTranslations("bo.reports");
  return (
    <Box>
      <Box sx={{ px: { xs: 0, sm: 2, md: 3 }, pb: 2 }}>
        <OrdersPageHeader title={t("title")} showSectionNav={false} />
      </Box>
      <Box sx={{ px: { xs: 0, sm: 2, md: 3 }, pb: 3 }}>
        <OverviewSkeleton />
      </Box>
    </Box>
  );
}
