"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Box,
  Button,
  LinearProgress,
  Stack,
  Divider,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

export interface MenuItemData {
  id?: string;
  sku?: string;
  name?: string;
  category?: string;
  sellingPrice?: number; // Dine-In POS Price
  grabPrice?: number; // Delivery Price
  qrPrice?: number; // QR Menu Price
  bomCost?: number; // Bill of Materials / Recipe Cost
  inStock?: boolean;
  stockLeft?: number;
  maxStock?: number;
  kdsStation?: string;
  img?: string;
  imageUrl?: string;
}

interface MenuCardProps {
  item?: MenuItemData;
  name?: string;
  category?: string;
  sku?: string;
  sellingPrice?: number;
  grabPrice?: number;
  bomCost?: number;
  inStock?: boolean;
  stockLeft?: number;
  maxStock?: number;
  kdsStation?: string;
  imageUrl?: string;
  onStockToggle?: (id?: string) => void;
  onEdit?: (item: MenuItemData) => void;
}

// Helper to format currency safely

export default function MenuCard({
  item,
  name,
  category,
  sku,
  sellingPrice,
  grabPrice,
  bomCost,
  inStock,
  stockLeft,
  maxStock,
  kdsStation,
  imageUrl,
  onStockToggle,
  onEdit,
}: MenuCardProps) {
  // Merge individual props with item object props with sensible defaults
  const id = item?.id || "item-1";
  const displayName = name || item?.name || "Menu Item";
  const displayCategory = category || item?.category || "General";
  const displaySku = sku || item?.sku || "SKU-000";
  const posPrice = sellingPrice ?? item?.sellingPrice ?? 0;
  const deliveryPrice = grabPrice ?? item?.grabPrice ?? posPrice;
  const cost = bomCost ?? item?.bomCost ?? 0;
  const isAvailable = inStock ?? item?.inStock ?? true;
  const currentStock = stockLeft ?? item?.stockLeft ?? 0;
  const maxStockCapacity = maxStock ?? item?.maxStock ?? 30;
  const station = kdsStation || item?.kdsStation || "Main Kitchen";
  const image =
    imageUrl ||
    item?.img ||
    item?.imageUrl ||
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80";

  // Real-time Profit Margin % Calculation
  const profit = posPrice - cost;

  // Stock capacity percentage calculation
  const stockPercentage = Math.min(
    100,
    Math.max(0, (currentStock / (maxStockCapacity || 1)) * 100),
  );
  const isLowStock = currentStock < 5 && isAvailable;

  const currentItemData: MenuItemData = {
    id,
    sku: displaySku,
    name: displayName,
    category: displayCategory,
    sellingPrice: posPrice,
    grabPrice: deliveryPrice,
    bomCost: cost,
    inStock: isAvailable,
    stockLeft: currentStock,
    maxStock: maxStockCapacity,
    kdsStation: station,
    img: image,
  };

  return (
    <Card
      elevation={2}
      sx={{
        width: "100%",
        maxWidth: 340,
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        bgcolor: "background.paper",
        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: "0 12px 28px rgba(0, 0, 0, 0.12)",
        },
      }}
    >
      {/* 1. IMAGE CONTAINER WITH OVERLAY BADGES */}
      <Box sx={{ position: "relative", pt: "56.25%", bgcolor: "grey.100" }}>
        <CardMedia
          component="img"
          image={image}
          alt={displayName}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: !isAvailable ? "grayscale(70%)" : "none",
            transition: "filter 0.3s ease",
          }}
        />

        {/* Category Tag (Top-Left) */}
        <Chip
          label={displayCategory}
          size="small"
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            bgcolor: "rgba(15, 23, 42, 0.75)",
            color: "#ffffff",
            backdropFilter: "blur(6px)",
            fontWeight: 700,
            fontSize: "0.68rem",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            height: 24,
          }}
        />

        {/* Interactive Stock Switcher Chip (Top-Right) */}
        <Chip
          icon={
            isAvailable ? (
              <CheckCircleIcon style={{ color: "#fff", fontSize: 14 }} />
            ) : (
              <CancelIcon style={{ color: "#fff", fontSize: 12 }} />
            )
          }
          label={isAvailable ? "Available" : "Unavailable"}
          size="small"
          onClick={() => onStockToggle && onStockToggle(id)}
          clickable
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            bgcolor: isAvailable ? "#16a34a" : "#dc2626",
            minWidth: 90,
            color: "#ffffff",
            fontWeight: 400,
            fontSize: "0.68rem",
            height: 26,
            boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
            backdropFilter: "blur(4px)",
            "&:hover": {
              bgcolor: isAvailable ? "#15803d" : "#b91c1c",
            },
          }}
        />
      </Box>

      {/* 2. CARD BODY & METRICS */}
      <CardContent
        sx={{
          p: 2.5,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        {/* Menu Title and SKU Metadata */}
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: "1rem",
              lineHeight: 1.3,
              color: "text.primary",
              mb: 0.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {displayName}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              fontFamily: "monospace",
              fontSize: "0.72rem",
            }}
          >
            {displaySku} • {station}
          </Typography>
        </Box>

        {/* Real-time Inventory Progress Bar */}
        <Box sx={{ mt: 0.5 }}>
          {/*  <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={0.5}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "text.secondary",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <Inventory2Icon sx={{ fontSize: 13 }} /> Stock Level
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.7rem",
                fontWeight: 800,
                color: isLowStock ? "error.main" : "text.primary",
              }}
            >
              {currentStock} / {maxStockCapacity} pcs
            </Typography>
          </Stack> */}

          <LinearProgress
            variant="determinate"
            value={stockPercentage}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "grey.800" : "grey.200",
              "& .MuiLinearProgress-bar": {
                borderRadius: 3,
                bgcolor: isLowStock
                  ? "error.main"
                  : !isAvailable
                    ? "grey.400"
                    : "success.main",
              },
            }}
          />
        </Box>
      </CardContent>

      <Divider />

      {/* 3. CARD FOOTER ACTIONS */}
      <Box
        sx={{
          px: 2.5,
          py: 1.25,
          /*  bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.02)"
              : "#f8fafc", */
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<EditIcon sx={{ fontSize: 14 }} />}
          onClick={() => onEdit && onEdit(currentItemData)}
          sx={{
            borderRadius: "8px",
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.75rem",
            px: 1.5,
            py: 0.5,
            borderColor: "divider",
            color: "text.primary",
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: "primary.main",
              color: "#ffffff",
            },
          }}
        >
          Edit Channels
        </Button>
      </Box>
    </Card>
  );
}
