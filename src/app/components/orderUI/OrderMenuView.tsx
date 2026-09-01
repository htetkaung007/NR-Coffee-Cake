"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  Typography,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import OrderTopBar from "./OrderTopBar";

interface MenuItemData {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string | null;
  stockQuantity: number;
  isManuallyDisabled: boolean;
}

interface OrderMenuViewProps {
  menuItems: MenuItemData[];
  sessionId: number | null;
  sessionLabel: string | null;
  isReadOnly: boolean;

  isPendingApproval: boolean;

  canOrder: boolean;
}

export default function OrderMenuView({
  menuItems,
  sessionLabel,
  isReadOnly,
  isPendingApproval,
  canOrder,
}: OrderMenuViewProps) {
  const router = useRouter();
  const showOrderingControls = canOrder && !isReadOnly && !isPendingApproval;

  useEffect(() => {
    if (!isPendingApproval) return;

    const intervalId = setInterval(() => {
      router.refresh();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isPendingApproval, router]);

  const groupedByCategory = menuItems.reduce<Record<string, MenuItemData[]>>(
    (groups, item) => {
      (groups[item.category] ??= []).push(item);
      return groups;
    },
    {},
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <OrderTopBar shopName={sessionLabel} />

      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: "auto" }}>
        {!canOrder && !isPendingApproval && !isReadOnly && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You are browsing the menu. Scan the QR code at your table or the
            counter to place an order.
          </Alert>
        )}

        {isPendingApproval && (
          <Alert
            severity="info"
            icon={<CircularProgress size={20} />}
            sx={{ mb: 3 }}
          >
            Waiting for counter approval for order...
          </Alert>
        )}

        {isReadOnly && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your order has been placed. Thank you! To order again, please scan
            the QR code again.
          </Alert>
        )}

        {Object.entries(groupedByCategory).map(([category, items]) => (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              {category}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {items.map((item) => {
                const isSoldOut =
                  item.isManuallyDisabled || item.stockQuantity <= 0;

                return (
                  <Card
                    key={item.id}
                    elevation={0}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                      opacity: isSoldOut ? 0.5 : 1,
                    }}
                  >
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {item.name}
                      </Typography>
                      {item.description && (
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        sx={{ mt: 0.5, fontWeight: 600 }}
                      >
                        {item.price.toLocaleString()} Ks
                      </Typography>
                    </Box>

                    {isSoldOut ? (
                      <Chip label="Sold out" size="small" />
                    ) : (
                      showOrderingControls && (
                        <Chip
                          label="Add"
                          size="small"
                          color="primary"
                          clickable
                        />
                      )
                    )}
                  </Card>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
