import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import NewItemFab, { NewItemFabSpacer } from "@/app/components/NewItemFab";
import { AddonService } from "@/app/services";
import { requireBackofficeAccess } from "@/app/lib/backofficeContext";
import AddonsView from "./AddonsView";

/** Add-ons: every group, and the selected one's quick settings (?group=
 *  <id>) — options on/off for the owner and managers granted
 *  ADDON_AVAILABILITY; Required, Edit and New group for the owner only.
 *  Names, prices and options change on the Edit page. */
export default async function AddonsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: "Please sign in to view add-ons.",
    access: "staff",
  });
  if (!scope) return fallback;

  const groups = await AddonService.getAddonGroupsOverview(scope.companyId);
  const selectedId = group && /^\d+$/.test(group) ? Number(group) : null;
  // Display only — the add-on actions check the session themselves.
  const isOwner = scope.role === "ADMIN";

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
      >
        <Typography variant="h6">Add-ons</Typography>
        {/* New groups are the owner's (the page checks too). */}
        {isOwner && (
          <Link href="/backoffice/addons/new">
            <Button
              variant="contained"
              size="small"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              + New Add-on Group
            </Button>
          </Link>
        )}
      </Stack>

      {isOwner && (
        <NewItemFab
          href="/backoffice/addons/new"
          label="New add-on group"
          hideFrom="sm"
        />
      )}

      {groups.length === 0 ? (
        <Typography color="text.secondary">No addon groups yet.</Typography>
      ) : (
        <AddonsView groups={groups} selectedId={selectedId} isOwner={isOwner} />
      )}

      {isOwner && <NewItemFabSpacer hideFrom="sm" />}
    </Box>
  );
}
