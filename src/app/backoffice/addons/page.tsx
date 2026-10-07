import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import NewItemFab, { NewItemFabSpacer } from "@/app/components/NewItemFab";
import { AddonService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import AddonsView from "./AddonsView";

/** Add-ons: every group, and the selected one's quick settings (?group=
 *  <id>) — options on/off for everyone signed in, Required and Edit for
 *  the owner (Admin). Names, prices and options change on the Edit page. */
export default async function AddonsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  const { companyId, role } = await getSessionContext();
  if (!companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to view add-ons.
        </Typography>
      </Box>
    );
  }

  const groups = await AddonService.getAddonGroupsOverview(companyId);
  const selectedId = group && /^\d+$/.test(group) ? Number(group) : null;
  const isOwner = role === "ADMIN";

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
      >
        <Typography variant="h6">Add-ons</Typography>
        <Link href="/backoffice/addons/new">
          <Button
            variant="contained"
            size="small"
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            + New Add-on Group
          </Button>
        </Link>
      </Stack>

      <NewItemFab
        href="/backoffice/addons/new"
        label="New add-on group"
        hideFrom="sm"
      />

      {groups.length === 0 ? (
        <Typography color="text.secondary">No addon groups yet.</Typography>
      ) : (
        <AddonsView groups={groups} selectedId={selectedId} isOwner={isOwner} />
      )}

      <NewItemFabSpacer hideFrom="sm" />
    </Box>
  );
}
