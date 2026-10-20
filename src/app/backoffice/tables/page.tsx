import { Box, Typography } from "@mui/material";
import ListPageHeader from "@/app/components/ListPageHeader";
import { TableService } from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/access/backofficeContext";
import { resolveAssetUrl } from "@/app/lib/storage/assetUrl";
import { getTranslations } from "next-intl/server";
import TableCard from "./TableCard";

export default async function TablesPage() {
  const { context, fallback } = await requireBackofficeContext({
    noLocation: "noLocationTables",
    access: "TABLES_MANAGE",
  });
  if (!context) return fallback;
  const { location } = context;
  const t = await getTranslations("bo.tables");

  // Tables are scoped to whichever location the user currently has
  // selected — same "selected location" concept the Menu list uses.
  const tables = await TableService.getTablesByLocation(location.locationId);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <ListPageHeader
        title={t("title")}
        newHref="/backoffice/tables/new"
        newLabel={t("newTable")}
      />

      {tables.length === 0 ? (
        <Typography color="text.secondary">{t("noTables")}</Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            // Phones: one full-width column. From sm: as many ~260–300px
            // cards as fit (two from ~600px).
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(auto-fill, minmax(260px, 300px))",
            },
            gap: { xs: 1, sm: 1.5 },
          }}
        >
          {/* The Counter QR first, then the tables in order. */}
          {[...tables]
            .sort(
              (a, b) =>
                Number(b.isCounter === true) - Number(a.isCounter === true),
            )
            .map((table) => (
              // Only what the card shows — never the whole row: the access
              // key (counterAccessKey) must not reach the browser.
              <TableCard
                key={table.id}
                table={{
                  id: table.id,
                  name: table.name,
                  qrcodeImageUrl: resolveAssetUrl(table.qrcodeImageUrl),
                  isArchived: table.isArchived,
                  isCounter: table.isCounter === true,
                }}
              />
            ))}
        </Box>
      )}
    </Box>
  );
}
