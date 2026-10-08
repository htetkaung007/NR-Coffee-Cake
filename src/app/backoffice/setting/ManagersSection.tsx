"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import SidePanelDrawer from "@/app/components/SidePanelDrawer";
import type { ManagerSummary } from "@/app/services";
import {
  GRANTABLE_PERMISSIONS,
  permissionChanges,
  type PermissionKey,
} from "@/app/lib/access/permissions";
import { AlwaysAllowedList, OwnerOnlyList } from "./AccessRuleLists";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ManagerAccessEditor from "./ManagerAccessEditor";

const PAGE_HREF = "/backoffice/setting";

/** "What managers can always do / what only you can do", folded away
 *  until asked for. No height animation — it just appears. */
function AccessRulesDisclosure() {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();
  return (
    <Box>
      <Button
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        endIcon={isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ minHeight: 44, px: 1, ml: -1 }}
      >
        What managers can always do / what only you can do
      </Button>
      {isOpen && (
        <Stack id={contentId} spacing={1} sx={{ mt: 1 }}>
          <AlwaysAllowedList title="Managers can always" />
          <OwnerOnlyList title="Only you can" />
        </Stack>
      )}
    </Box>
  );
}

function ManagerCard({ manager }: { manager: ManagerSummary }) {
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ alignItems: { sm: "center" } }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            component="h3"
            sx={{ overflowWrap: "anywhere" }}
          >
            {manager.email}
          </Typography>
          {manager.name && (
            <Typography variant="body2" color="text.secondary">
              {manager.name}
            </Typography>
          )}
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", mt: 1, flexWrap: "wrap" }}
          >
            {manager.locationName && (
              <Chip
                size="small"
                variant="outlined"
                icon={<LocationOnOutlinedIcon />}
                label={
                  <Typography variant="caption" component="span">
                    {manager.locationName}
                  </Typography>
                }
              />
            )}
            <Typography variant="body2" color="text.secondary">
              {manager.permissions.length} of {GRANTABLE_PERMISSIONS.length}{" "}
              extras
            </Typography>
          </Stack>
        </Box>
        <Button
          component={Link}
          href={`${PAGE_HREF}?manager=${manager.id}`}
          scroll={false}
          variant="outlined"
          aria-label={`Edit access for ${manager.email}`}
          sx={{
            minHeight: 44,
            flexShrink: 0,
            alignSelf: { xs: "flex-start", sm: "center" },
          }}
        >
          Edit access
        </Button>
      </Stack>
    </Card>
  );
}

/**
 * Settings → Managers: the managers list, and the selected manager's
 * access editor (?manager=<id>) in the drawer / bottom sheet — so the
 * browser Back button closes it. The ticks are a draft here until Save;
 * closing with unsaved ticks (×, Cancel, Escape, a tap outside) asks
 * "Discard changes?" first.
 */
export default function ManagersSection({
  managers,
  selectedId,
}: {
  managers: ManagerSummary[];
  selectedId: number | null;
}) {
  const router = useRouter();
  const selected =
    managers.find((manager) => manager.id === selectedId) ?? null;
  // The draft belongs to one manager; another manager starts clean.
  const [draft, setDraft] = useState<{
    managerId: number;
    ticks: PermissionKey[];
  } | null>(null);
  const [error, setError] = useState<{
    managerId: number;
    message: string;
  } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [savedFor, setSavedFor] = useState<string | null>(null);

  const ticks =
    selected && draft?.managerId === selected.id
      ? draft.ticks
      : (selected?.permissions ?? []);
  const changes = selected
    ? permissionChanges(selected.permissions, ticks)
    : null;
  const isDirty =
    changes !== null && changes.add.length + changes.remove.length > 0;

  function close() {
    setIsConfirmOpen(false);
    setDraft(null);
    setError(null);
    router.replace(PAGE_HREF, { scroll: false });
  }

  function requestClose() {
    if (isDirty) setIsConfirmOpen(true);
    else close();
  }

  return (
    <>
      <Stack spacing={2}>
        <AccessRulesDisclosure />

        {managers.length === 0 ? (
          <Stack spacing={0.5} sx={{ alignItems: "center", py: 3 }}>
            <PersonOutlinedIcon aria-hidden sx={{ color: "text.secondary" }} />
            <Typography variant="body2">No managers yet.</Typography>
            <Typography variant="body2" color="text.secondary">
              Add one below.
            </Typography>
          </Stack>
        ) : (
          <Stack
            component="ul"
            spacing={1.5}
            sx={{ listStyle: "none", m: 0, p: 0 }}
          >
            {managers.map((manager) => (
              <li key={manager.id}>
                <ManagerCard manager={manager} />
              </li>
            ))}
          </Stack>
        )}
      </Stack>

      <SidePanelDrawer
        open={selected !== null}
        onClose={requestClose}
        label={selected ? `Access for ${selected.email}` : "Manager access"}
      >
        {selected && (
          <ManagerAccessEditor
            manager={selected}
            ticks={ticks}
            isDirty={isDirty}
            error={error?.managerId === selected.id ? error.message : null}
            onTicksChange={(next) => {
              setDraft({ managerId: selected.id, ticks: next });
              setError(null);
            }}
            onError={(message) => setError({ managerId: selected.id, message })}
            onSaved={() => {
              setSavedFor(selected.email);
              close();
            }}
            onRequestClose={requestClose}
          />
        )}
      </SidePanelDrawer>

      <ConfirmDialog
        open={isConfirmOpen}
        title="Discard changes?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={close}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <Snackbar
        open={savedFor !== null}
        autoHideDuration={3000}
        onClose={() => setSavedFor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          Access updated for {savedFor}
        </Alert>
      </Snackbar>
    </>
  );
}
