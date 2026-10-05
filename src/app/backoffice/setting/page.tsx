import type { ReactNode } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import { AppService, LocationService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import OrdersPageHeader from "../order/OrdersPageHeader";
import { sectionHeadingSx } from "../order/orderTypography";
import AddManagerForm from "./AddManagerForm";
import CompanyNameForm from "./CompanyNameForm";

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

export default async function SettingsPage() {
  const { companyId, role } = await getSessionContext();

  if (!companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to view settings.
        </Typography>
      </Box>
    );
  }

  if (role !== "ADMIN") {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Only Admins can access Settings.
        </Typography>
      </Box>
    );
  }

  const [locations, companyName] = await Promise.all([
    LocationService.getActiveLocations(companyId),
    AppService.getCompanyNameByCompanyId(companyId),
  ]);

  return (
    <Box sx={{ px: { xs: 0, sm: 2, md: 3 }, pb: 3 }}>
      <Box sx={{ pb: 2 }}>
        <OrdersPageHeader title="Settings" showSectionNav={false} />
      </Box>
      <Stack spacing={2} sx={{ maxWidth: 720 }}>
        <SettingsSection
          id="settings-company"
          title="Company"
          description="Your business's name across the Backoffice."
        >
          <CompanyNameForm initialName={companyName} />
        </SettingsSection>
        <SettingsSection
          id="settings-managers"
          title="Managers"
          description="Managers work at one assigned location: they take and approve orders and can edit menus, add-ons and tables, but can't open Reports, Locations or Settings."
        >
          <AddManagerForm locations={locations} />
        </SettingsSection>
      </Stack>
    </Box>
  );
}
