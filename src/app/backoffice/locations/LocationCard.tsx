"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useTransition } from "react";
import { Card, Box, Typography, Chip, Button } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import TaskAltIcon from "@mui/icons-material/TaskAlt";

import { selectLocationAction } from "@/app/backoffice/locations/action";
import { menuAccess } from "@/app/lib/storefront/menuAccess";

interface LocationCardData {
  id: number;
  name: string;
  isArchived: boolean;
  /** The owner's switch (lib/location/onlineMenu). */
  onlineMenuEnabled: boolean;
}

interface LocationCardProps {
  location: LocationCardData;
  isSelected: boolean;
  /** Only Admins get the switcher — Managers have a fixed location and
   *  never see this control (enforced by the page that renders this card,
   *  not here, but the prop exists so the card doesn't assume). */
  canSwitch: boolean;
}

export default function LocationCard({
  location,
  isSelected,
  canSwitch,
}: LocationCardProps) {
  const t = useTranslations("bo.locations");
  const tCommon = useTranslations("bo.common");
  const [isPending, startTransition] = useTransition();

  function handleSwitch() {
    startTransition(async () => {
      await selectLocationAction(location.id);
    });
  }

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: { xs: 2, md: 2.5 },
        bgcolor: "background.paper",
        p: { xs: 1.5, sm: 2 },
        opacity: location.isArchived ? 0.6 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          // A narrow card puts the "Archived" chip under the name rather
          // than squeezing the name to a word per line.
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="body1" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
          {location.name}
        </Typography>
        {location.isArchived && (
          <Chip
            label={
              <Typography variant="caption" component="span">
                {tCommon("archived")}
              </Typography>
            }
            size="small"
            color="default"
          />
        )}
      </Box>

      {/* What a visitor who hasn't scanned gets: On only while it's
         switched on AND the location is open (lib/storefront/menuAccess). */}
      <Typography variant="caption" color="text.secondary">
        {t("onlineMenuStatus", {
          state:
            menuAccess({ ...location, locationExists: true, hasQrSession: false }) ===
            "menu"
              ? t("on")
              : t("off"),
        })}
      </Typography>

      {isSelected && !location.isArchived && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: "primary.main",
          }}
        >
          <TaskAltIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption">{t("currentlySelected")}</Typography>
        </Box>
      )}

      {canSwitch && !location.isArchived && !isSelected && (
        <Button
          size="small"
          variant="text"
          disabled={isPending}
          onClick={handleSwitch}
          sx={{ alignSelf: "flex-start", fontSize: "0.75rem", px: 0, minHeight: 44 }}
        >
          {isPending ? t("switching") : t("switchTo")}
        </Button>
      )}

      <Button
        component={Link}
        href={`/backoffice/locations/${location.id}`}
        size="small"
        variant="outlined"
        startIcon={<EditIcon sx={{ fontSize: 14 }} />}
        sx={{ alignSelf: "flex-start", fontSize: "0.75rem", minHeight: 44 }}
      >
        {t("edit")}
      </Button>
    </Card>
  );
}
