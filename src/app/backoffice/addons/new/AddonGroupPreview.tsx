"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import AddonCategorySection from "@/app/components/orderUI/menuDetail/AddonCategorySection";
import {
  OrderUiLabelsProvider,
  useOrderUiLabels,
  type OrderUiLabels,
} from "@/app/components/orderUI/OrderUiLabels";
import type { OptionRow } from "@/app/lib/hooks/useOptionRows";
import type { AppLocale } from "@/app/lib/i18n/locale";
import NameLanguageToggle from "@/app/components/NameLanguageToggle";
import { customerWords } from "@/app/lib/i18n/customerWords";
import { hasMissingMyanmarName } from "@/app/lib/i18n/myanmarNames";
import { SurfaceThemeScope } from "@/app/lib/theme/ThemeModeProvider";

/** The customer's own words for this group in `locale` — from
 *  messages/*.json, the same keys (menuDetail.required / .free,
 *  common.priceDelta) and price formatter (useCustomerPrice) the
 *  customer menu uses. */
function usePreviewLabels(locale: AppLocale): OrderUiLabels {
  const english = useOrderUiLabels();
  return useMemo(() => {
    const words = customerWords(locale);
    return {
      ...english,
      locale,
      price: words.price,
      priceDelta: words.priceDelta,
      menuDetail: {
        ...english.menuDetail,
        required: words.required,
        free: words.free,
      },
    };
  }, [english, locale]);
}

interface AddonGroupPreviewProps {
  groupName: string;
  groupNameMy: string;
  isRequired: boolean;
  options: OptionRow[];
}

/**
 * "Customer sees" — the group as it shows in the customer's item detail,
 * drawn by the customer's own AddonCategorySection under the customer
 * theme, live as the owner types. Display only (inert). In the Myanmar
 * view, names with no Myanmar name yet get a dotted underline.
 */
export default function AddonGroupPreview({
  groupName,
  groupNameMy,
  isRequired,
  options,
}: AddonGroupPreviewProps) {
  const t = useTranslations("bo.addonForm");
  const [previewLocale, setPreviewLocale] = useState<AppLocale>("my");
  const labels = usePreviewLabels(previewLocale);

  // Only rows that will be saved (an English name), as the customer gets
  // them: blank price = free.
  const addons = options
    .filter((row) => row.name.trim() !== "")
    .map((row, index) => ({
      id: index,
      name: row.name.trim(),
      nameMy: row.nameMy.trim() || null,
      price: Number(row.price) || 0,
      isAvailable: true,
    }));
  const name = groupName.trim();
  const isEmpty = name === "" && addons.length === 0;
  const hasUntranslated =
    previewLocale === "my" &&
    hasMissingMyanmarName({ name, nameMy: groupNameMy }, addons);

  return (
    <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
      >
        <Typography variant="subtitle2" component="h2">
          {t("customerSees")}
        </Typography>
        <NameLanguageToggle
          value={previewLocale}
          onChange={setPreviewLocale}
          ariaLabel={t("previewLanguage")}
        />
      </Stack>

      {isEmpty ? (
        <Typography variant="caption" component="p" color="text.secondary">
          {t("previewEmpty")}
        </Typography>
      ) : (
        <>
          <Box role="region" aria-label={t("customerPreview")}>
            <SurfaceThemeScope surface="od">
              <OrderUiLabelsProvider value={labels}>
                <Box
                  inert
                  lang={previewLocale}
                  // Myanmar text sizes: the `:lang(my)` rules in the
                  // Backoffice theme's CssBaseline, as everywhere.
                  sx={{
                    bgcolor: "background.paper",
                    color: "text.primary",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    px: 2,
                    pb: 1,
                    // The section opens with its own divider — keep it
                    // off the card's top edge.
                    "& > div > hr:first-of-type": { display: "none" },
                    pt: 1.5,
                  }}
                >
                  <AddonCategorySection
                    category={{
                      id: 0,
                      name,
                      nameMy: groupNameMy.trim() || null,
                      isRequired,
                      addons,
                    }}
                    selectedIds={[]}
                    variant="sheet"
                    onSelectRequired={() => {}}
                    onToggleOptional={() => {}}
                    markUntranslated
                  />
                </Box>
              </OrderUiLabelsProvider>
            </SurfaceThemeScope>
          </Box>
          {hasUntranslated && (
            <Typography
              variant="caption"
              component="p"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              {t("previewDotted")}
            </Typography>
          )}
        </>
      )}
    </Card>
  );
}
