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
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
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
  quantity: number;
  isAvailable: boolean;
  addonCategories: AddonCategory[];
}

/** Pre-fills the dialog for editing an already-added line — see
 *  DraftList's Edit button. Presence of this prop (vs undefined) is
 *  what switches the dialog between "Add to Cart" and "Save Changes"
 *  mode, not a separate boolean, so there's only one source of truth
 *  for which mode it's in. */
export interface MenuDetailEditingSelection {
  quantity: number;
  addonIds: number[];
}

interface MenuDetailDialogProps {
  open: boolean;
  menuId: number | null;
  locationId: number;
  canOrder: boolean;
  onClose: () => void;
  onSubmit: (
    menuId: number,
    quantity: number,
    addonIds: number[],
  ) => Promise<string | null>;
  editing?: MenuDetailEditingSelection;
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
  onSubmit,
  editing,
}: MenuDetailDialogProps) {
  const [fetchedForMenuId, setFetchedForMenuId] = useState<number | null>(null);
  const [detail, setDetail] = useState<MenuDetail | null>(null);
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);
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
      if (editing) {
        // Pre-fill from the existing line's own selection — addonIds
        // is flat (not grouped by category), so it's re-grouped here
        // the same way the server re-derives grouping from
        // MenuAddonCategories (see validateAddonSelection's comment).
        const grouped: Record<number, number[]> = {};
        for (const category of result?.addonCategories ?? []) {
          const picked = category.addons
            .map((addon) => addon.id)
            .filter((id) => editing.addonIds.includes(id));
          if (picked.length > 0) grouped[category.id] = picked;
        }
        setSelected(grouped);
        setQuantity(editing.quantity);
      } else {
        setSelected({});
        setQuantity(1);
      }
    });
    // editing is a fresh object every render from most callers — only
    // its identity-independent contents matter for re-initializing,
    // so it's read inside the effect but deliberately left out of the
    // dependency array (open/menuId already re-run this per dialog
    // open, which is the only time re-initializing should happen).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Editing an existing line still shows the stock cap so the
  // customer knows how far they can raise the quantity, but a
  // shortage that appeared since they first added it shouldn't lock
  // them out of REDUCING or removing it — only raising further.
  const maxQuantity = Math.max(detail?.quantity ?? 0, editing?.quantity ?? 0);
  const isSoldOut = maxQuantity <= 0 || detail?.isAvailable === false;

  async function handleSubmit() {
    if (!detail) return;
    setSubmitting(true);
    setError(null);
    const addonIds = Object.values(selected).flat();
    const errorMessage = await onSubmit(detail.id, quantity, addonIds);
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

            {isSoldOut ? (
              <Alert severity="warning">This item just sold out.</Alert>
            ) : (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Quantity
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: "center" }}
                >
                  <IconButton
                    size="small"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ minWidth: 24, textAlign: "center" }}>
                    {quantity}
                  </Typography>
                  <IconButton
                    size="small"
                    disabled={quantity >= maxQuantity}
                    onClick={() =>
                      setQuantity((q) => Math.min(maxQuantity, q + 1))
                    }
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                  {maxQuantity <= 5 && (
                    <Typography variant="caption" color="warning.main">
                      Only {maxQuantity} left
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}

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
                disabled={missingRequired || submitting || isSoldOut}
                onClick={handleSubmit}
              >
                {editing ? "Save Changes" : "Add to Cart"}
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
