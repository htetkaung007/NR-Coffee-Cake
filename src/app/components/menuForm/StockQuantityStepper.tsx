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

interface StockQuantityStepperProps {
  quantity: number;
  onChange: (nextQuantity: number) => void;
}

const QUICK_ADD_AMOUNTS = [5, 10, 25];

export default function StockQuantityStepper({
  quantity,
  onChange,
}: StockQuantityStepperProps) {
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
      <Typography variant="body2" sx={{ fontSize: "0.8rem", fontWeight: 700 }}>
        <Inventory2OutlinedIcon
          sx={{ verticalAlign: "text-bottom", mr: 0.5 }}
        />
        Stock quantity
      </Typography>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mt: 0.75 }}
      >
        <IconButton
          size="small"
          onClick={() => updateQuantity(-1)}
          disabled={quantity === 0}
        >
          <RemoveIcon />
        </IconButton>
        <TextField
          aria-label="Stock quantity"
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
