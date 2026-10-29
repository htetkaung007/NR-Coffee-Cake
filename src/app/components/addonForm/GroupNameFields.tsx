"use client";

import { Box, Stack, Switch, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useTranslations } from "next-intl";
import { ADDON_GROUP_NAME_MAX } from "@/app/lib/schemas/addonSchema";
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
  const t = useTranslations("bo.addonForm");
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="subtitle2" component="h2">
          {t("groupName")}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            {t("required")}
          </Typography>
          <Switch
            size="small"
            checked={isRequired}
            onChange={(event) => onRequiredChange(event.target.checked)}
            slotProps={{
              input: { "aria-label": t("makeRequired") },
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
        {t("groupHint")}
      </Typography>

      <Stack spacing={1}>
        <LanguageTaggedField
          tag="en"
          ariaLabel={t("groupNameEn")}
          endText={t("required")}
          required
          placeholder={t("groupPlaceholder")}
          maxLength={ADDON_GROUP_NAME_MAX}
          value={groupName}
          onChange={(event) => onGroupNameChange(event.target.value)}
        />
        <LanguageTaggedField
          tag="my"
          myanmar
          ariaLabel={t("groupNameMy")}
          endText={t("optional")}
          maxLength={ADDON_GROUP_NAME_MAX}
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
          {/* The Myanmar word is a <my> tag in the message (a function for
              a plain {placeholder} rendered nothing), so it carries its
              own lang. */}
          {t.rich("leaveEmpty", {
            my: (chunks) => <span lang="my">{chunks}</span>,
          })}
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        component="p"
        color="text.secondary"
        sx={{ mt: 0.5 }}
      >
        {isRequired
          ? t("requiredGroupHint")
          : t("optionalGroupHint")}
      </Typography>
    </Box>
  );
}
