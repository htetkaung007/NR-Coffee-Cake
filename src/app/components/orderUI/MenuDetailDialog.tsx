"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Divider,
  Stack,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { getMenuDetailAction } from "@/app/customer/action";

interface Addon {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface AddonCategory {
  id: number;
  name: string;
  isRequired: boolean;
  addons: Addon[];
}

interface MenuDetail {
  id: number;
  name: string;
  price: number;
  description: string;
  imageUrl: string | null;
  addonCategories: AddonCategory[];
}

interface MenuDetailDialogProps {
  open: boolean;
  menuId: number | null;
  locationId: number;
  canOrder: boolean;
  onClose: () => void;
  onAddToCart: (menuId: number, addonIds: number[]) => Promise<string | null>;
}

/**
 * Fetches its own detail data (getMenuDetailAction) rather than taking
 * it as a prop — the parent's menu list only carries name/price/
 * description (see CounterOrderClient's MenuOption), not the nested
 * addon data, so this dialog is the one place that data is needed and
 * the one place it's fetched. Kept as a separate component (not
 * inlined into CounterOrderClient) for the same reason MenuStockService
 * got its own file: this is a clearly separate concern (addon
 * selection) from cart/order-status management.
 */
export default function MenuDetailDialog({
  open,
  menuId,
  locationId,
  canOrder,
  onClose,
  onAddToCart,
}: MenuDetailDialogProps) {
  const [fetchedForMenuId, setFetchedForMenuId] = useState<number | null>(null);
  const [detail, setDetail] = useState<MenuDetail | null>(null);
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Derived, not a separate state field set inside the effect below —
  // "loading" just means "open, with a menuId the last fetch hasn't
  // caught up to yet". Avoids calling setState synchronously at the
  // top of the effect body (react-hooks/set-state-in-effect), which
  // would otherwise trigger an extra render before the real one.
  const loading = open && menuId !== null && fetchedForMenuId !== menuId;

  useEffect(() => {
    if (!open || menuId === null) return;

    getMenuDetailAction(menuId, locationId).then((result) => {
      setDetail(result);
      setFetchedForMenuId(menuId);
      setSelected({});
    });
  }, [open, menuId, locationId]);

  function selectRequired(categoryId: number, addonId: number) {
    setSelected((current) => ({ ...current, [categoryId]: [addonId] }));
  }

  function toggleOptional(categoryId: number, addonId: number) {
    setSelected((current) => {
      const existing = current[categoryId] ?? [];
      const next = existing.includes(addonId)
        ? existing.filter((id) => id !== addonId)
        : [...existing, addonId];
      return { ...current, [categoryId]: next };
    });
  }

  // Every required category must have a selection before Add to Cart
  // is enabled — this is UX-only, the real enforcement is server-side
  // (see OrderSessionService.validateAddonSelection), same reasoning
  // as the hasSession button-hiding in CounterOrderClient.
  const missingRequired =
    detail?.addonCategories
      .filter((category) => category.isRequired)
      .some((category) => (selected[category.id] ?? []).length === 0) ?? false;

  async function handleAdd() {
    if (!detail) return;
    setSubmitting(true);
    setError(null);
    const addonIds = Object.values(selected).flat();
    const errorMessage = await onAddToCart(detail.id, addonIds);
    setSubmitting(false);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 6 }}>
        {detail?.name ?? ""}
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && !detail && (
          <Typography color="text.secondary">
            This item couldn&apos;t be loaded.
          </Typography>
        )}

        {!loading && detail && (
          <Stack spacing={2.5}>
            {detail.description && (
              <Typography variant="body2" color="text.secondary">
                {detail.description}
              </Typography>
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {detail.price.toLocaleString()} MMK
            </Typography>

            {detail.addonCategories.map((category) => (
              <Box key={category.id}>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {category.name}
                  {category.isRequired && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="error"
                      sx={{ ml: 0.75 }}
                    >
                      Required
                    </Typography>
                  )}
                </Typography>

                {category.isRequired ? (
                  <RadioGroup
                    value={selected[category.id]?.[0] ?? ""}
                    onChange={(event) =>
                      selectRequired(category.id, Number(event.target.value))
                    }
                  >
                    {category.addons.map((addon) => (
                      <FormControlLabel
                        key={addon.id}
                        value={addon.id}
                        disabled={!addon.isAvailable}
                        control={<Radio size="small" />}
                        label={addonLabel(addon)}
                      />
                    ))}
                  </RadioGroup>
                ) : (
                  <Stack>
                    {category.addons.map((addon) => (
                      <FormControlLabel
                        key={addon.id}
                        control={
                          <Checkbox
                            size="small"
                            checked={(selected[category.id] ?? []).includes(
                              addon.id,
                            )}
                            disabled={!addon.isAvailable}
                            onChange={() =>
                              toggleOptional(category.id, addon.id)
                            }
                          />
                        }
                        label={addonLabel(addon)}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            ))}

            {error && <Alert severity="error">{error}</Alert>}

            {canOrder && (
              <Button
                variant="contained"
                fullWidth
                disabled={missingRequired || submitting}
                onClick={handleAdd}
              >
                Add to Cart
              </Button>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

function addonLabel(addon: Addon) {
  const priceSuffix =
    addon.price > 0 ? ` (+${addon.price.toLocaleString()} MMK)` : "";
  return `${addon.name}${priceSuffix}`;
}
