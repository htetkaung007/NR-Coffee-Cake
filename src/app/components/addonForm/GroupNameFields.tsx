"use client";

import { Box, Stack, Switch, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LanguageTaggedField from "./LanguageTaggedField";

interface GroupNameFieldsProps {
  groupName: string;
  onGroupNameChange: (value: string) => void;
  groupNameMy: string;
  onGroupNameMyChange: (value: string) => void;
  isRequired: boolean;
  onRequiredChange: (value: boolean) => void;
}

/** The add-on group form's "Group name" section — the add-on group page
 *  and the menu form's "Connect Add-On Group" dialog both use it: title +
 *  the Required switch, the English and Myanmar names, the Myanmar
 *  fallback hint and the required / optional line. */
export default function GroupNameFields({
  groupName,
  onGroupNameChange,
  groupNameMy,
  onGroupNameMyChange,
  isRequired,
  onRequiredChange,
}: GroupNameFieldsProps) {
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="subtitle2" component="h2">
          Group name
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Required
          </Typography>
          <Switch
            size="small"
            checked={isRequired}
            onChange={(event) => onRequiredChange(event.target.checked)}
            slotProps={{
              input: { "aria-label": "Make this group required" },
            }}
          />
        </Stack>
      </Stack>
      <Typography
        variant="caption"
        component="p"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        The question customers answer, e.g. “Milk choice”. Write it once per
        language.
      </Typography>

      <Stack spacing={1}>
        <LanguageTaggedField
          tag="en"
          ariaLabel="Group name in English"
          endText="Required"
          required
          placeholder="e.g. Milk choice"
          value={groupName}
          onChange={(event) => onGroupNameChange(event.target.value)}
        />
        <LanguageTaggedField
          tag="my"
          myanmar
          ariaLabel="Group name in Myanmar"
          endText="Optional"
          maxLength={50}
          value={groupNameMy}
          onChange={(event) => onGroupNameMyChange(event.target.value)}
        />
      </Stack>

      <Stack
        direction="row"
        spacing={0.5}
        sx={{ alignItems: "flex-start", mt: 1 }}
      >
        <InfoOutlinedIcon
          aria-hidden
          fontSize="small"
          sx={{ color: "text.secondary" }}
        />
        <Typography variant="caption" color="text.secondary">
          Leave <span lang="my">မြန်မာ</span> empty and customers who chose
          Myanmar see the English name instead.
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        component="p"
        color="text.secondary"
        sx={{ mt: 0.5 }}
      >
        {isRequired
          ? "Customers must choose one option from this group before adding the item to cart."
          : "Optional — customers can skip this group."}
      </Typography>
    </Box>
  );
}
