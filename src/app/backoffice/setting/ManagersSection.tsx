"use client";

import { useTranslations } from "next-intl";
import { useStaffErrorMessage } from "@/app/lib/hooks/useStaffWords";
import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
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
import StatusSnackbar, {
  type StatusMessage,
} from "@/app/components/StatusSnackbar";
import ManagerAccessEditor from "./ManagerAccessEditor";
import { moveManagerAction, removeManagerAction } from "./action";

/** A location a manager can be moved to (the company's open ones). */
interface LocationOption {
  id: number;
  name: string;
}

const PAGE_HREF = "/backoffice/setting";

/** "What managers can always do / what only you can do", folded away
 *  until asked for. No height animation — it just appears. */
function AccessRulesDisclosure() {
  const t = useTranslations("bo.settings");
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
        {t("rulesToggle")}
      </Button>
      {isOpen && (
        <Stack id={contentId} spacing={1} sx={{ mt: 1 }}>
          <AlwaysAllowedList title={t("managersCanAlways")} />
          <OwnerOnlyList title={t("onlyYouCan")} />
        </Stack>
      )}
    </Box>
  );
}

/** "Move to…": the company's open locations, the current one shown
 *  selected and disabled. Saved as soon as one is picked (no Save
 *  button); the field is disabled while it saves. A manager at a closed
 *  location still sees it, disabled, so the field says where they are. */
function MoveManagerSelect({
  manager,
  locations,
  onStatus,
}: {
  manager: ManagerSummary;
  locations: LocationOption[];
  onStatus: (message: StatusMessage) => void;
}) {
  const [pendingLocationId, setPendingLocationId] = useState<number | null>(
    null,
  );
  const [isMoving, startMoving] = useTransition();
  const fieldId = useId();
  const t = useTranslations("bo.settings");
  const errorText = useStaffErrorMessage();

  const options =
    manager.locationId === null ||
    locations.some((location) => location.id === manager.locationId)
      ? locations
      : [
          ...locations,
          { id: manager.locationId, name: manager.locationName ?? t("closedLocation") },
        ];
  const value = pendingLocationId ?? manager.locationId ?? "";

  function move(locationId: number) {
    const target = options.find((location) => location.id === locationId);
    setPendingLocationId(locationId);
    startMoving(async () => {
      const result = await moveManagerAction(manager.id, locationId);
      setPendingLocationId(null);
      onStatus(
        result.success
          ? {
              text: t("movedTo", {
                email: manager.email,
                location: target?.name ?? t("newLocation"),
              }),
              severity: "success",
            }
          : { text: errorText(result.error), severity: "error" },
      );
    });
  }

  return (
    <TextField
      select
      id={fieldId}
      label={t("moveTo")}
      value={value}
      disabled={isMoving || options.length < 2}
      onChange={(event) => move(Number(event.target.value))}
      helperText={
        options.length < 2 ? t("addAnotherLocation") : undefined
      }
      sx={{ minWidth: { sm: 200 }, width: { xs: "100%", sm: "auto" } }}
    >
      {options.map((location) => (
        <MenuItem
          key={location.id}
          value={location.id}
          disabled={location.id === manager.locationId}
          sx={{ minHeight: 44 }}
        >
          {location.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

function ManagerCard({
  manager,
  locations,
  onStatus,
}: {
  manager: ManagerSummary;
  locations: LocationOption[];
  onStatus: (message: StatusMessage) => void;
}) {
  const t = useTranslations("bo.settings");
  const tCommon = useTranslations("bo.common");
  const errorText = useStaffErrorMessage();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isRemoving, startRemoving] = useTransition();
  const displayName = manager.name || manager.email;

  function remove() {
    startRemoving(async () => {
      const result = await removeManagerAction(manager.id);
      setIsRemoveOpen(false);
      onStatus(
        result.success
          ? { text: t("removed", { name: displayName }), severity: "success" }
          : { text: errorText(result.error), severity: "error" },
      );
    });
  }

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ minWidth: 0 }}>
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
              {t("extras", {
                count: manager.permissions.length,
                total: GRANTABLE_PERMISSIONS.length,
              })}
            </Typography>
          </Stack>
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          useFlexGap
          // Wraps in the centred column (and with longer Myanmar words)
          // instead of running past the card.
          sx={{ alignItems: { xs: "stretch", sm: "center" }, flexWrap: "wrap", gap: 1 }}
        >
          <MoveManagerSelect
            manager={manager}
            locations={locations}
            onStatus={onStatus}
          />
          <Box sx={{ flex: 1, display: { xs: "none", sm: "block" } }} />
          <Button
            component={Link}
            href={`${PAGE_HREF}?manager=${manager.id}`}
            scroll={false}
            variant="outlined"
            aria-label={t("editAccessFor", { email: manager.email })}
            sx={{ minHeight: 44, flexShrink: 0 }}
          >
            {t("editAccess")}
          </Button>
          <Button
            color="error"
            disabled={isRemoving}
            onClick={() => setIsRemoveOpen(true)}
            aria-label={t("removeManagerLabel", { email: manager.email })}
            sx={{ minHeight: 44, flexShrink: 0 }}
          >
            {t("remove")}
          </Button>
        </Stack>
      </Stack>

      <ConfirmDialog
        open={isRemoveOpen}
        title={t("removeTitle", { name: displayName })}
        message={t("removeMessage")}
        confirmLabel={t("removeConfirm")}
        pendingLabel={t("removing")}
        cancelLabel={tCommon("cancel")}
        destructive
        pending={isRemoving}
        onConfirm={remove}
        onCancel={() => setIsRemoveOpen(false)}
      />
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
  locations,
  selectedId,
}: {
  managers: ManagerSummary[];
  /** The company's open locations — the "Move to…" choices. */
  locations: LocationOption[];
  selectedId: number | null;
}) {
  const t = useTranslations("bo.settings");
  const tCategories = useTranslations("bo.categories");
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
  // Move / Remove results — outside the cards, so a removed manager's
  // card can disappear while its message stays.
  const [status, setStatus] = useState<StatusMessage | null>(null);

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
            <Typography variant="body2">{t("noManagers")}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t("addOneBelow")}
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
                <ManagerCard
                  manager={manager}
                  locations={locations}
                  onStatus={setStatus}
                />
              </li>
            ))}
          </Stack>
        )}
      </Stack>

      <SidePanelDrawer
        open={selected !== null}
        onClose={requestClose}
        label={selected ? t("accessFor", { email: selected.email }) : t("managerAccess")}
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
        title={tCategories("discardTitle")}
        confirmLabel={tCategories("discard")}
        cancelLabel={tCategories("keepEditing")}
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
          {t("accessUpdated", { email: savedFor ?? "" })}
        </Alert>
      </Snackbar>

      <StatusSnackbar message={status} onClose={() => setStatus(null)} />
    </>
  );
}
