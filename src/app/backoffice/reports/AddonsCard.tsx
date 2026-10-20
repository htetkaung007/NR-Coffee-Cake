"use client";

import { Box, ButtonBase, Card, Stack, Typography } from "@mui/material";
import { useLocale, useTranslations } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import type { ReportItems } from "./action";
import ExpandedPanel, { RowChevron } from "./ExpandedPanel";
import { AddonPairingPanel } from "./PairingPanels";
import type { PairingState } from "./usePairing";
import {
  entryTitleSx,
  moneyToneSx,
  sectionHeadingSx,
} from "../order/orderTypography";

interface AddonsCardProps {
  addons: ReportItems["addons"];
  pairing: PairingState;
  onRetryPairing: () => void;
  /** "September 2026" — the month the pairing panels are for. */
  pairingMonthLabel: string;
  expandedIds: number[];
  onToggle: (addonId: number) => void;
}

/** Add-ons by how often they were chosen, with what they brought in.
 *  An optional add-on opens to the menus it goes with most (the month's
 *  pairing). A pick from a required group (a size, say) is labelled and
 *  doesn't open: every unit has one, so there's nothing to pair — but its
 *  money is part of the sales. */
export default function AddonsCard({
  addons,
  pairing,
  onRetryPairing,
  pairingMonthLabel,
  expandedIds,
  onToggle,
}: AddonsCardProps) {
  const t = useTranslations("bo.reports");
  const locale = useLocale();
  const money = useStaffMoney();
  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Typography
        variant="body1"
        component="h2"
        sx={{ ...sectionHeadingSx, mb: 1 }}
      >
        {t("addons")}
      </Typography>

      {addons.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("noAddons")}
        </Typography>
      ) : (
        <Stack component="ul" spacing={0} sx={{ m: 0, p: 0, listStyle: "none" }}>
          {addons.map((addon, index) => {
            const canExpand = !addon.isRequiredGroup;
            const expanded = canExpand && expandedIds.includes(addon.addonId);
            const panelId = `pairing-addon-${addon.addonId}`;
            const name = localizedText(locale, addon.name, addon.nameMy);
            const summary = (
              <>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body1" noWrap sx={entryTitleSx}>
                    {name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("chosenTimes", { count: addon.timesChosen })}
                    {addon.isRequiredGroup ? t("requiredChoice") : ""}
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  sx={{ ...moneyToneSx("income"), flexShrink: 0 }}
                >
                  {money.amount(addon.addonSales)}
                </Typography>
                {canExpand && <RowChevron expanded={expanded} />}
              </>
            );
            const rowSx = {
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              minHeight: 44,
              py: 0.5,
              width: "100%",
              textAlign: "left",
            } as const;

            return (
              <Box
                key={addon.addonId}
                component="li"
                sx={{
                  borderTop: index === 0 ? 0 : 1,
                  borderColor: "divider",
                }}
              >
                {canExpand ? (
                  <ButtonBase
                    component="div"
                    onClick={() => onToggle(addon.addonId)}
                    aria-expanded={expanded}
                    aria-controls={expanded ? panelId : undefined}
                    sx={(theme) => ({
                      ...rowSx,
                      borderRadius: 1,
                      [hoverCapableMedia]: {
                        "&:hover": { backgroundColor: theme.palette.action.hover },
                      },
                      "&.Mui-focusVisible": {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: -2,
                      },
                    })}
                  >
                    {summary}
                  </ButtonBase>
                ) : (
                  <Box sx={rowSx}>{summary}</Box>
                )}
                {expanded && (
                  <ExpandedPanel
                    id={panelId}
                    label={t("mostOftenWithLabel", { name })}
                  >
                    <AddonPairingPanel
                      state={pairing}
                      onRetry={onRetryPairing}
                      monthLabel={pairingMonthLabel}
                      addonId={addon.addonId}
                    />
                  </ExpandedPanel>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}
