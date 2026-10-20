import { getTranslations } from "next-intl/server";
import CenteredPage from "@/app/components/CenteredPage";
import type { ReactNode } from "react";
import { Box, Card, Divider, Stack, Typography } from "@mui/material";
import { CompanyService, LocationService, ManagerService } from "@/app/services";
import { requireBackofficeAccess } from "@/app/lib/access/backofficeContext";
import OrdersPageHeader from "../order/OrdersPageHeader";
import { sectionHeadingSx } from "../order/orderTypography";
import AddManagerForm from "./AddManagerForm";
import CompanyNameForm from "./CompanyNameForm";
import ManagersSection from "./ManagersSection";

/** One Settings section: a card with a heading and a one-line
 *  description, then its form. */
function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card
      component="section"
      variant="outlined"
      aria-labelledby={id}
      sx={{ p: { xs: 2, sm: 3 } }}
    >
      <Typography id={id} variant="body1" component="h2" sx={sectionHeadingSx}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        {description}
      </Typography>
      {children}
    </Card>
  );
}

/** ?manager=<id> opens that manager's access editor. */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ manager?: string }>;
}) {
  const { manager } = await searchParams;
  const { scope, fallback } = await requireBackofficeAccess({
    access: "owner",
  });
  if (!scope) return fallback;
  const { companyId } = scope;

  const [locations, companyName, managers] = await Promise.all([
    LocationService.getActiveLocations(companyId),
    CompanyService.getName(companyId),
    ManagerService.listManagers(companyId),
  ]);
  const t = await getTranslations("bo.settings");
  const selectedManagerId =
    manager && /^\d+$/.test(manager) ? Number(manager) : null;

  return (
    <CenteredPage>
      <Box sx={{ pb: 2 }}>
        <OrdersPageHeader title={t("title")} showSectionNav={false} />
      </Box>
      <Stack spacing={2}>
        <SettingsSection
          id="settings-company"
          title={t("company")}
          description={t("companyHint")}
        >
          <CompanyNameForm initialName={companyName} />
        </SettingsSection>
        <SettingsSection
          id="settings-managers"
          title={t("managers")}
          description={t("managersHint")}
        >
          <ManagersSection
            managers={managers}
            locations={locations.map(({ id, name }) => ({ id, name }))}
            selectedId={selectedManagerId}
          />
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" component="h3" sx={{ mb: 2 }}>
            {t("addManagerTitle")}
          </Typography>
          <AddManagerForm locations={locations} />
        </SettingsSection>
      </Stack>
    </CenteredPage>
  );
}
