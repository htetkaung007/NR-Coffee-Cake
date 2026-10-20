"use client";

import {
  Box,
  IconButton,
  Stack,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { useTranslations } from "next-intl";

interface StockQuantityStepperProps {
  quantity: number;
  onChange: (nextQuantity: number) => void;
  /** What the number is, e.g. "Stock at Yangon Branch". */
  label?: string;
}

const QUICK_ADD_AMOUNTS = [5, 10, 25];

export default function StockQuantityStepper({
  quantity,
  onChange,
  label,
}: StockQuantityStepperProps) {
  const t = useTranslations("bo.menuForm");
  const shownLabel = label ?? t("stockQuantity");
  function updateQuantity(change: number) {
    onChange(Math.max(0, quantity + change));
  }

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        px: 1.5,
        py: 1,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        <Inventory2OutlinedIcon
          sx={{ verticalAlign: "text-bottom", mr: 0.5 }}
        />
        {shownLabel}
      </Typography>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mt: 0.75 }}
      >
        <IconButton
          size="small"
          onClick={() => updateQuantity(-1)}
          disabled={quantity === 0}
          aria-label={t("stockFewer")}
        >
          <RemoveIcon />
        </IconButton>
        <TextField
          aria-label={shownLabel}
          type="number"
          value={quantity}
          onChange={(event) =>
            onChange(Math.max(0, Number(event.target.value) || 0))
          }
          slotProps={{
            htmlInput: { min: 0, style: { textAlign: "center" } },
          }}
          sx={{ width: 62 }}
        />
        <IconButton
          size="small"
          color="primary"
          onClick={() => updateQuantity(1)}
          aria-label={t("stockMore")}
        >
          <AddIcon />
        </IconButton>
      </Stack>
      <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
        {QUICK_ADD_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            size="small"
            onClick={() => updateQuantity(amount)}
          >
            +{amount}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
