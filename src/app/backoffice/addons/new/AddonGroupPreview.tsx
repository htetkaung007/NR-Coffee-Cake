"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Card,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddonCategorySection from "@/app/components/orderUI/menuDetail/AddonCategorySection";
import {
  OrderUiLabelsProvider,
  useOrderUiLabels,
  type OrderUiLabels,
} from "@/app/components/orderUI/OrderUiLabels";
import type { OptionRow } from "@/app/lib/hooks/useOptionRows";
import type { AppLocale } from "@/app/lib/i18n/locale";
import { customerWords } from "@/app/lib/i18n/customerWords";
import { myanmarTypographyStyles } from "@/app/lib/theme/myanmarTypography";
import { SurfaceThemeScope } from "@/app/lib/theme/ThemeModeProvider";

/** myanmarTypographyStyles' `:lang(my)` rules, nested under the preview
 *  box instead of the whole page. */
function scopedMyanmarTypography(typography: object) {
  return Object.fromEntries(
    Object.entries(
      myanmarTypographyStyles(typography as Record<string, unknown>),
    ).map(([selector, rule]) => [`& ${selector}`, rule]),
  );
}

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
    ((name !== "" && groupNameMy.trim() === "") ||
      addons.some((addon) => addon.nameMy === null));

  return (
    <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
      >
        <Typography variant="subtitle2" component="h2">
          Customer sees
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={previewLocale}
          onChange={(_, next: AppLocale | null) => {
            if (next) setPreviewLocale(next);
          }}
          aria-label="Preview language"
        >
          <ToggleButton value="en" sx={{ minWidth: 44, minHeight: 44 }}>
            EN
          </ToggleButton>
          <ToggleButton
            value="my"
            lang="my"
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            မြန်မာ
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {isEmpty ? (
        <Typography variant="caption" component="p" color="text.secondary">
          Type a group name and options to see the preview.
        </Typography>
      ) : (
        <>
          <Box role="region" aria-label="Customer preview">
            <SurfaceThemeScope surface="od">
              <OrderUiLabelsProvider value={labels}>
                <Box
                  inert
                  lang={previewLocale}
                  sx={(theme) => ({
                    // The customer theme's Myanmar text rules live in its
                    // CssBaseline, which a scope doesn't mount — apply the
                    // same rules inside the preview only.
                    ...scopedMyanmarTypography(theme.typography),
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
                  })}
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
              Dotted names have no Myanmar name yet, so customers see English
              there.
            </Typography>
          )}
        </>
      )}
    </Card>
  );
}
