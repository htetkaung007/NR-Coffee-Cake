"use client";

import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { applyAddedLine } from "@/app/lib/orderTotals";
import MenuDetailDialog from "@/app/components/orderUI/MenuDetailDialog";
import {
  startStaffOrderAction,
  addStaffCartItemAction,
  removeStaffCartItemAction,
  submitStaffOrderAction,
} from "./action";

interface TableOption {
  id: number;
  name: string;
  isCounter: boolean;
}

interface MenuOption {
  id: number;
  name: string;
  price: number;
  description: string;
}

interface CartLine {
  id: number;
  menuName: string;
  quantity: number;
  price: number;
}

interface StaffOrderClientProps {
  locationId: number | null;
  tables: TableOption[];
  menus: MenuOption[];
}

/**
 * Reuses MenuDetailDialog as-is (same required-radio / optional-
 * checkbox addon UI a customer sees) — only the "what happens after
 * Add to Cart" wiring differs, via the onSubmit callback prop, so
 * the dialog itself needed zero changes for this second caller. Cart
 * state lives here (not in a cookie/OrderSession the way
 * CounterOrderClient's does at first) until a table is picked and
 * startStaffOrderAction creates the real session — a Manager
 * browsing the menu before choosing a table has nothing to attach a
 * session to yet.
 */
export default function StaffOrderClient({
  locationId,
  tables,
  menus,
}: StaffOrderClientProps) {
  const [tableId, setTableId] = useState<number | "">("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [detailMenuId, setDetailMenuId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<
    string | null
  >(null);

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart],
  );
  const menuListRef = useRef<HTMLDivElement>(null);

  async function handleTableChange(newTableId: number) {
    setError(null);
    setTableId(newTableId);
    setCart([]);
    setSubmittedOrderNumber(null);

    const result = await startStaffOrderAction(newTableId);
    if (!result.success) {
      setError(result.error.message);
      setSessionId(null);
      return;
    }
    setSessionId(result.data.id);
  }

  async function handleAddToCart(
    menuId: number,
    quantity: number,
    addonIds: number[],
  ): Promise<string | null> {
    if (!sessionId || tableId === "") {
      return "Choose a table first.";
    }
    const menu = menus.find((item) => item.id === menuId);
    if (!menu) return "This item is no longer available.";

    const result = await addStaffCartItemAction(
      sessionId,
      tableId,
      menuId,
      quantity,
      addonIds,
    );
    if (!result.success) {
      return result.error.message;
    }
    // An identical line may have been merged into (see addItemToCart).
    setCart((current) =>
      applyAddedLine(current, {
        id: result.data.id,
        menuName: menu.name,
        quantity: result.data.quantity,
        // The server's own snapshot, not this component's (possibly
        // stale) menu prop — see Order.unitPrice's own schema comment.
        price: result.data.unitPrice,
      }),
    );
    return null;
  }

  async function handleRemove(orderId: number) {
    if (!sessionId) return;
    setError(null);
    const result = await removeStaffCartItemAction(sessionId, orderId);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setCart((current) => current.filter((line) => line.id !== orderId));
  }

  async function handleSubmit() {
    if (!sessionId) return;
    setSubmitting(true);
    setError(null);
    const result = await submitStaffOrderAction(sessionId);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setSubmittedOrderNumber(result.data.orderNumber);
    setSessionId(null);
    setCart([]);
    setTableId("");
  }

  if (locationId === null) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          You aren&apos;t assigned to a location yet — contact an Admin.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: 560,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        New Order
      </Typography>

      <Select
        value={tableId}
        displayEmpty
        onChange={(event) => handleTableChange(Number(event.target.value))}
        sx={{ mb: 3, minWidth: 240 }}
      >
        <MenuItem value="" disabled>
          Choose a table
        </MenuItem>
        {tables.map((table) => (
          <MenuItem key={table.id} value={table.id}>
            {table.name}
            {table.isCounter ? " (Counter)" : ""}
          </MenuItem>
        ))}
      </Select>

      {submittedOrderNumber && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Order {submittedOrderNumber} sent to the kitchen.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {sessionId && (
        <Box
          sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <Box ref={menuListRef} sx={{ flex: 1, overflowY: "auto", minHeight: 0, mb: 1.5 }}>
            <Stack spacing={1.5}>
              {menus.map((menu) => (
                <Card key={menu.id} variant="outlined">
                  <CardActionArea
                    onClick={() => setDetailMenuId(menu.id)}
                    sx={{
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="body1">{menu.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {menu.price.toLocaleString()} MMK
                      </Typography>
                    </Box>
                    <Button size="small" variant="outlined" component="span">
                      Add
                    </Button>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          </Box>

          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              p: 1.5,
            }}
          >
            {cart.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
                  This order
                </Typography>
                <Stack spacing={0.5}>
                  {cart.map((line) => (
                    <Stack
                      key={line.id}
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2">
                        {line.quantity} × {line.menuName}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ alignItems: "center" }}
                      >
                        <Typography variant="body2">
                          {(line.price * line.quantity).toLocaleString()} MMK
                        </Typography>
                        <IconButton
                          size="small"
                          aria-label="Remove item"
                          onClick={() => handleRemove(line.id)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            <Box>
              <Divider sx={{ mb: 1.5 }} />
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", mb: 1.5 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Total Price ({cart.length}{" "}
                  {cart.length === 1 ? "item" : "items"})
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {cartTotal.toLocaleString()} MMK
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  sx={{
                    flex: 1,
                    whiteSpace: "nowrap",
                    transition:
                      "transform 0.15s ease, background-color 0.15s ease",
                    [hoverCapableMedia]: {
                      "&:hover": {
                        transform: "translateY(-1px)",
                        bgcolor: "action.hover",
                      },
                    },
                  }}
                  onClick={() =>
                    menuListRef.current?.scrollTo({ top: 0, behavior: "smooth" })
                  }
                >
                  Add More
                </Button>
                <Button
                  variant="contained"
                  sx={{
                    flex: 2,
                    whiteSpace: "nowrap",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    [hoverCapableMedia]: {
                      "&:hover": { transform: "translateY(-1px)", boxShadow: 4 },
                    },
                  }}
                  disabled={submitting || cart.length === 0}
                  onClick={handleSubmit}
                >
                  Send to Kitchen
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>
      )}

      <MenuDetailDialog
        open={detailMenuId !== null}
        menuId={detailMenuId}
        locationId={locationId}
        canOrder={sessionId !== null}
        onClose={() => setDetailMenuId(null)}
        onSubmit={handleAddToCart}
        // addStaffCartItemAction has no note parameter (yet) — hide the
        // field rather than let a typed note be silently dropped.
        allowNote={false}
      />
    </Box>
  );
}
