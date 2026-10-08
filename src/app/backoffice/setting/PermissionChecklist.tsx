"use client";

import { Box, Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";
import {
  GRANTABLE_PERMISSIONS,
  type PermissionGroup,
  type PermissionKey,
} from "@/app/lib/access/permissions";

// The catalog's groups, in the catalog's order (Orders, Daily, …).
const GROUPS = [...new Set(GRANTABLE_PERMISSIONS.map((entry) => entry.group))];

function entriesIn(group: PermissionGroup) {
  return GRANTABLE_PERMISSIONS.filter((entry) => entry.group === group);
}

/**
 * The grantable permissions as checkboxes, one fieldset (with its legend)
 * per catalog group, each box labelled with the catalog's label and
 * description — the ONE checklist both the access editor and the "add a
 * manager" form use. The whole row (box + words) is the click target,
 * at least 44px tall.
 */
export default function PermissionChecklist({
  value,
  onChange,
  disabled = false,
}: {
  value: readonly PermissionKey[];
  onChange: (next: PermissionKey[]) => void;
  disabled?: boolean;
}) {
  function toggle(key: PermissionKey, checked: boolean) {
    onChange(
      checked
        ? [...value.filter((existing) => existing !== key), key]
        : value.filter((existing) => existing !== key),
    );
  }

  return (
    <Stack spacing={2}>
      {GROUPS.map((group) => (
        <Box
          key={group}
          component="fieldset"
          disabled={disabled}
          sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
        >
          <Typography
            component="legend"
            variant="overline"
            color="text.secondary"
            sx={{ p: 0 }}
          >
            {group}
          </Typography>
          <Stack spacing={0.5}>
            {entriesIn(group).map((entry) => (
              <FormControlLabel
                key={entry.key}
                disabled={disabled}
                control={
                  <Checkbox
                    checked={value.includes(entry.key)}
                    onChange={(event) => toggle(entry.key, event.target.checked)}
                    slotProps={{
                      input: { "aria-describedby": `permission-${entry.key}-hint` },
                    }}
                  />
                }
                label={
                  <Box sx={{ py: 1 }}>
                    <Typography variant="body1">{entry.label}</Typography>
                    <Typography
                      id={`permission-${entry.key}-hint`}
                      variant="body2"
                      color="text.secondary"
                    >
                      {entry.description}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: "flex-start", minHeight: 44, mx: 0 }}
              />
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
