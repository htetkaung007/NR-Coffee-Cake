"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SidePanelDrawer from "@/app/components/SidePanelDrawer";
import { addonGroupAvailability } from "@/app/lib/addonSelection";
import { hoverCapableMedia, topBarHeight } from "@/app/lib/theme/sharedThemeTokens";
import AddonGroupPanel, { type AddonGroup } from "./AddonGroupPanel";
import RequiredChip from "./RequiredChip";
import { setAddonAvailableAction, setAddonGroupRequiredAction } from "./action";

const PANEL_WIDTH = 400;
const PAGE_HREF = "/backoffice/addons";

/** A switch's optimistic value, keyed `addon-<id>` / `required-<id>`. */
type Overrides = Record<string, boolean>;

/** The groups as shown: the server's values with any optimistic switch
 *  flips laid over them. */
function applyOverrides(groups: readonly AddonGroup[], overrides: Overrides) {
  return groups.map((group) => ({
    ...group,
    isRequired: overrides[`required-${group.id}`] ?? group.isRequired,
    addons: group.addons.map((addon) => ({
      ...addon,
      isAvailable: overrides[`addon-${addon.id}`] ?? addon.isAvailable,
    })),
  }));
}

/** One group in the list: name, Required/Optional, "3 of 4 on", and a
 *  warning when a required group has nothing on. The whole card is ONE
 *  link (?group=<id>) — selecting keeps the view state in the URL. */
function GroupCard({ group, selected }: { group: AddonGroup; selected: boolean }) {
  const { onCount, total, isBlocked } = addonGroupAvailability(
    group.isRequired,
    group.addons,
  );
  return (
    <Box
      component={Link}
      href={`${PAGE_HREF}?group=${group.id}`}
      scroll={false}
      aria-current={selected ? "true" : undefined}
      sx={(theme) => ({
        display: "block",
        minHeight: 44,
        p: { xs: 1.5, sm: 2 },
        color: "inherit",
        textDecoration: "none",
        border: 1,
        borderColor: selected ? "primary.main" : "divider",
        borderRadius: 2.5,
        bgcolor: selected
          ? alpha(theme.palette.primary.main, 0.08)
          : "background.paper",
        transition: "background-color 150ms ease, border-color 150ms ease",
        "&:focus-visible": {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
        [hoverCapableMedia]: {
          "&:hover": selected ? undefined : { bgcolor: "action.hover" },
        },
      })}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="body1" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
          {group.name}
        </Typography>
        <RequiredChip isRequired={group.isRequired} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {onCount} of {total} on
      </Typography>
      {isBlocked && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "center", mt: 0.5, color: "warning.dark" }}
        >
          <WarningAmberIcon fontSize="small" />
          <Typography variant="body2" sx={{ color: "text.primary" }}>
            All options off — its menus can&apos;t be ordered
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

/**
 * The Add-ons page: groups on the left, the selected group's quick
 * settings (AddonGroupPanel) beside them from md — sticky — or in the
 * drawer / bottom sheet below md. The selection lives in the URL
 * (?group=<id>); closing the drawer clears it. Switches update at once
 * (optimistic), pause while their request runs, and roll back with the
 * error if it fails.
 */
export default function AddonsView({
  groups,
  selectedId,
  isOwner,
}: {
  groups: AddonGroup[];
  selectedId: number | null;
  /** Display only — every change is checked by the Server Action. */
  isOwner: boolean;
}) {
  const router = useRouter();
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("md"));
  const [overrides, setOverrides] = useState<Overrides>({});
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(new Set());
  const [message, setMessage] = useState<{
    text: string;
    severity: "success" | "error";
  } | null>(null);

  const shown = applyOverrides(groups, overrides);
  const selected = shown.find((group) => group.id === selectedId) ?? null;

  async function toggle(
    key: string,
    value: boolean,
    run: () => Promise<{ success: boolean; error?: { message: string } }>,
    confirmation: string,
  ) {
    setOverrides((current) => ({ ...current, [key]: value }));
    setPendingKeys((current) => new Set(current).add(key));
    const result = await run();
    setPendingKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    if (result.success) {
      setMessage({ text: confirmation, severity: "success" });
      router.refresh();
    } else {
      setOverrides((current) => {
        const { [key]: _rolledBack, ...rest } = current;
        void _rolledBack;
        return rest;
      });
      setMessage({
        text: result.error?.message ?? "Something went wrong.",
        severity: "error",
      });
    }
  }

  function closeDrawer() {
    router.replace(PAGE_HREF, { scroll: false });
  }

  const panel = (group: AddonGroup, onClose?: () => void) => (
    <AddonGroupPanel
      group={group}
      isOwner={isOwner}
      pendingKeys={pendingKeys}
      onClose={onClose}
      onToggleAddon={(addonId, isAvailable) => {
        const name = group.addons.find((addon) => addon.id === addonId)?.name ?? "Option";
        void toggle(
          `addon-${addonId}`,
          isAvailable,
          () => setAddonAvailableAction(addonId, isAvailable),
          `${name} turned ${isAvailable ? "on" : "off"}`,
        );
      }}
      onToggleRequired={(isRequired) =>
        void toggle(
          `required-${group.id}`,
          isRequired,
          () => setAddonGroupRequiredAction(group.id, isRequired),
          `${group.name} is now ${isRequired ? "required" : "optional"}`,
        )
      }
    />
  );

  return (
    <>
      <Box
        sx={{
          display: { md: "grid" },
          gridTemplateColumns: { md: `minmax(0, 1fr) ${PANEL_WIDTH}px` },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Stack component="nav" aria-label="Add-on groups" spacing={1.5}>
          {shown.map((group) => (
            <GroupCard key={group.id} group={group} selected={group.id === selectedId} />
          ))}
        </Stack>

        {/* md and up: the panel beside the list, sticky below the top bar. */}
        <Box
          component="aside"
          aria-label="Add-on group"
          sx={(theme) => ({
            display: { xs: "none", md: "block" },
            position: "sticky",
            top: topBarHeight(theme) + 16,
            border: 1,
            borderColor: "divider",
            borderRadius: 2.5,
            bgcolor: "background.paper",
            maxHeight: `calc(100vh - ${topBarHeight(theme) + 32}px)`,
            overflowY: "auto",
          })}
        >
          {selected ? (
            panel(selected)
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Select a group to turn its options on or off.
            </Typography>
          )}
        </Box>
      </Box>

      {/* Below md: the same panel in the drawer / bottom sheet. */}
      <SidePanelDrawer
        open={!isWide && selected !== null}
        onClose={closeDrawer}
        label={selected ? selected.name : "Add-on group"}
      >
        {selected && panel(selected, closeDrawer)}
      </SidePanelDrawer>

      <Snackbar
        open={message !== null}
        autoHideDuration={2000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={message?.severity ?? "success"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </>
  );
}
