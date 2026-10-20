"use client";

import { useTranslations } from "next-intl";
import { useStaffErrorMessage } from "@/app/lib/hooks/useStaffWords";
import { useTransition } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import type { ManagerSummary } from "@/app/services";
import type { PermissionKey } from "@/app/lib/access/permissions";
import { AlwaysAllowedList, OwnerOnlyList } from "./AccessRuleLists";
import PermissionChecklist from "./PermissionChecklist";
import { setManagerPermissionsAction } from "./action";

/**
 * One manager's access, inside the drawer / bottom sheet: what they can
 * always do (read-only), the grantable ticks, what stays owner-only
 * (read-only), then Cancel / Save. Explicit Save — nothing is stored
 * until it's pressed. The ticks are the parent's draft (so the parent
 * can ask "Discard changes?" on any close); on an error they stay as the
 * owner left them.
 */
export default function ManagerAccessEditor({
  manager,
  ticks,
  isDirty,
  error,
  onTicksChange,
  onError,
  onSaved,
  onRequestClose,
}: {
  manager: ManagerSummary;
  ticks: readonly PermissionKey[];
  isDirty: boolean;
  error: string | null;
  onTicksChange: (next: PermissionKey[]) => void;
  onError: (message: string) => void;
  onSaved: () => void;
  /** ×, Cancel — the parent confirms first if there are unsaved ticks. */
  onRequestClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const tCommon = useTranslations("bo.common");
  const errorText = useStaffErrorMessage();

  function handleSave() {
    startTransition(async () => {
      const result = await setManagerPermissionsAction({
        managerId: manager.id,
        permissions: [...ticks],
      });
      if (result.success) onSaved();
      else onError(errorText(result.error));
    });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "flex-start", p: 2, pb: 1, flexShrink: 0 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h2" sx={{ overflowWrap: "anywhere" }}>
            {manager.email}
          </Typography>
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
              sx={{ mt: 0.5 }}
            />
          )}
        </Box>
        <IconButton
          aria-label={tCommon("close")}
          onClick={onRequestClose}
          sx={{ width: 44, height: 44, flexShrink: 0 }}
        >
          <CloseIcon />
        </IconButton>
      </Stack>

      <Stack spacing={2} sx={{ px: 2, pb: 2, overflowY: "auto", flex: 1, minHeight: 0 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <AlwaysAllowedList />
        <Divider />
        <PermissionChecklist value={ticks} onChange={onTicksChange} disabled={isPending} />
        <Divider />
        <OwnerOnlyList />
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          justifyContent: "flex-end",
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Button onClick={onRequestClose} disabled={isPending} sx={{ minHeight: 44 }}>
          {tCommon("cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!isDirty}
          loading={isPending}
          sx={{ minHeight: 44, px: 3 }}
        >
          {tCommon("save")}
        </Button>
      </Stack>
    </Box>
  );
}
