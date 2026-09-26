"use client";

import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import StatusChip, { StatusDot } from "./StatusChip";
import { countLabel, formatClockTime } from "@/app/lib/orderFormat";

export interface RoundLine {
  id: number;
  quantity: number;
  menuName: string;
  imageUrl: string | null;
  /** Required picks, e.g. "Large" — see describeLineAddons. */
  variantText: string;
  /** Optional add-ons, shown as chips. */
  addonNames: string[];
  note: string | null;
}

export interface Round {
  id: number;
  orderNumber: string;
  createdAt: string;
  status: string;
  approvalExpiresAt: string | null;
  /** Total quantity across the round's lines. */
  itemCount: number;
  lines: RoundLine[];
}

// Item / add-ons / qty. The qty column has a fixed width so the column
// headers (their own grid) line up with every row's qty chip.
const QTY_COLUMN = "48px";
const WIDE_COLUMNS = `minmax(0, 3fr) minmax(0, 2fr) ${QTY_COLUMN}`;
const THUMBNAIL_SIZE = 40;

/** The menu item's own photo, or one neutral icon when it has none. */
function Thumbnail({ imageUrl }: { imageUrl: string | null }) {
  const frame = {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    flexShrink: 0,
    borderRadius: 1,
    border: 1,
    borderColor: "divider",
  };
  if (imageUrl) {
    // Decorative: the item's name is right next to it.
    return (
      <Box
        component="img"
        src={imageUrl}
        alt=""
        loading="lazy"
        sx={{ ...frame, display: "block", objectFit: "cover" }}
      />
    );
  }
  return (
    <Box
      aria-hidden
      sx={{
        ...frame,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        color: "text.secondary",
      }}
    >
      <RestaurantMenuIcon fontSize="small" />
    </Box>
  );
}

/** One item. Wide: item | add-ons | qty in columns. Phone: add-ons wrap
 *  under the name (indented past the thumbnail), qty stays right. */
function LineRow({ line }: { line: RoundLine }) {
  return (
    <Box
      component="li"
      sx={{
        display: "grid",
        gridTemplateAreas: {
          xs: `"item qty" "addons qty" "note note"`,
          sm: `"item addons qty" "note note note"`,
        },
        gridTemplateColumns: {
          xs: `minmax(0, 1fr) ${QTY_COLUMN}`,
          sm: WIDE_COLUMNS,
        },
        columnGap: { xs: 1, sm: 2 },
        py: 1,
        "& + &": { borderTop: 1, borderColor: "divider" },
      }}
    >
      <Stack
        direction="row"
        spacing={{ xs: 1, sm: 2 }}
        sx={{ gridArea: "item", alignItems: "center", minWidth: 0 }}
      >
        <Thumbnail imageUrl={line.imageUrl} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1">{line.menuName}</Typography>
          {line.variantText && (
            <Typography variant="body2" color="text.secondary">
              {line.variantText}
            </Typography>
          )}
        </Box>
      </Stack>

      {line.addonNames.length > 0 ? (
        <Stack
          direction="row"
          useFlexGap
          sx={{
            gridArea: "addons",
            flexWrap: "wrap",
            gap: 0.5,
            alignSelf: "center",
            // Phone: indent under the name — the 40px thumbnail plus the
            // row's 8px gap = spacing(6).
            pl: { xs: 6, sm: 0 },
            mt: { xs: 1, sm: 0 },
          }}
        >
          {line.addonNames.map((name, index) => (
            <Chip
              key={`${name}-${index}`}
              size="small"
              variant="outlined"
              label={
                <Typography variant="caption" component="span">
                  {name}
                </Typography>
              }
            />
          ))}
        </Stack>
      ) : (
        <Typography
          aria-hidden
          color="text.secondary"
          sx={{
            gridArea: "addons",
            alignSelf: "center",
            display: { xs: "none", sm: "block" },
          }}
        >
          —
        </Typography>
      )}

      <Chip
        size="small"
        aria-label={`Quantity ${line.quantity}`}
        label={
          <Typography variant="caption" component="span">
            ×{line.quantity}
          </Typography>
        }
        sx={{
          gridArea: "qty",
          justifySelf: "end",
          alignSelf: "center",
          bgcolor: "text.primary",
          color: "background.paper",
        }}
      />

      {line.note && (
        <Stack
          direction="row"
          spacing={1}
          sx={(theme) => ({
            gridArea: "note",
            alignItems: "flex-start",
            mt: 1,
            p: 1,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.warning.main, 0.12),
          })}
        >
          <EditOutlinedIcon
            fontSize="small"
            titleAccess="Note"
            sx={{ color: "warning.main" }}
          />
          <Typography variant="body2">{line.note}</Typography>
        </Stack>
      )}
    </Box>
  );
}

/** One round (one OrderSession). A round awaiting approval gets a
 *  warning border, a warning-tinted header and Reject/Accept at the
 *  bottom, so the cashier acts on exactly the round they're reading. */
export default function RoundCard({
  round,
  isPending,
  onAccept,
  onReject,
}: {
  round: Round;
  /** An action is in flight — disables Accept/Reject. */
  isPending: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isAwaitingApproval = round.status === "PENDING_APPROVAL";

  return (
    <Card
      variant="outlined"
      sx={{ borderColor: isAwaitingApproval ? "warning.main" : "divider" }}
    >
      <Stack
        direction="row"
        useFlexGap
        sx={(theme) => ({
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1,
          px: { xs: 1, sm: 2 },
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: isAwaitingApproval
            ? alpha(theme.palette.warning.main, 0.12)
            : "transparent",
        })}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography component="h2" variant="body1">
            Order {round.orderNumber}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            suppressHydrationWarning
          >
            {formatClockTime(round.createdAt)} ·{" "}
            {countLabel(round.itemCount, "item", "items")}
          </Typography>
        </Box>
        {isAwaitingApproval ? (
          <StatusChip
            tone="warning"
            icon={<StatusDot />}
            label="Needs approval"
          />
        ) : (
          <StatusChip tone="success" icon={<CheckIcon />} label="Accepted" />
        )}
      </Stack>

      {/* Column headers — wide screens only; purely visual (each row's
          cells say what they are). */}
      <Box
        aria-hidden
        sx={{
          display: { xs: "none", sm: "grid" },
          gridTemplateColumns: WIDE_COLUMNS,
          columnGap: 2,
          px: 2,
          pt: 1,
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Item
        </Typography>
        <Typography variant="overline" color="text.secondary">
          Add-ons
        </Typography>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ textAlign: "right" }}
        >
          Qty
        </Typography>
      </Box>

      <Box
        component="ul"
        sx={{ listStyle: "none", m: 0, px: { xs: 1, sm: 2 }, py: 1 }}
      >
        {round.lines.map((line) => (
          <LineRow key={line.id} line={line} />
        ))}
      </Box>

      {isAwaitingApproval && (
        <>
          <Divider />
          <Stack
            direction="row"
            useFlexGap
            sx={{
              flexWrap: "wrap",
              alignItems: "center",
              gap: 1,
              px: { xs: 1, sm: 2 },
              py: 1,
            }}
          >
            <Typography
              variant="body2"
              color="warning.main"
              suppressHydrationWarning
              sx={{ flexGrow: 1, width: { xs: "100%", sm: "auto" } }}
            >
              {round.approvalExpiresAt &&
                `Expires ${formatClockTime(round.approvalExpiresAt)}`}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              disabled={isPending}
              onClick={onReject}
              sx={{ minHeight: 44, flexGrow: { xs: 1, sm: 0 } }}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CheckIcon />}
              disabled={isPending}
              onClick={onAccept}
              sx={{ minHeight: 44, flexGrow: { xs: 1, sm: 0 } }}
            >
              Accept
            </Button>
          </Stack>
        </>
      )}
    </Card>
  );
}
