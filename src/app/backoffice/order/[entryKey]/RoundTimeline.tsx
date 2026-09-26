"use client";

import { Box, Typography } from "@mui/material";
import RoundCard, { type Round } from "./RoundCard";
import { formatClockTime } from "@/app/lib/orderFormat";

// Geometry of the decorative rail: a 2px line centred 11px from the
// left, 12px dots centred on it, cards starting at spacing(4) = 32px.
const LINE_CENTER = 11;
const LINE_WIDTH = 2;
const DOT_SIZE = 12;
// Dot beside a card's first header line.
const CARD_DOT_TOP = 20;
// The closing "Seated/Started" row's height; its dot sits centred in it.
const MARKER_ROW_HEIGHT = 24;

function RailDot({
  top,
  color,
  hollow = false,
}: {
  top: number | string;
  color: string;
  hollow?: boolean;
}) {
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        left: LINE_CENTER - DOT_SIZE / 2 + LINE_WIDTH / 2,
        top,
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: "50%",
        border: 2,
        borderColor: color,
        bgcolor: hollow ? "background.paper" : color,
      }}
    />
  );
}

/**
 * The entry's rounds in the order they're given (page.tsx puts rounds
 * awaiting approval first, then newest first), down a vertical rail —
 * warning dot for a round awaiting approval, success for an accepted
 * one — ending at when the table was seated / the Counter bill started.
 * The rail and dots are decoration only; each card's status chip says
 * the same thing in words.
 */
export default function RoundTimeline({
  rounds,
  isTableGroup,
  startedAt,
  isPending,
  onAccept,
  onReject,
}: {
  rounds: Round[];
  isTableGroup: boolean;
  /** ISO time of the entry's first round. */
  startedAt: string;
  isPending: boolean;
  onAccept: (sessionId: number) => void;
  onReject: (sessionId: number) => void;
}) {
  return (
    <Box
      component="ol"
      aria-label="Orders"
      sx={{ position: "relative", listStyle: "none", m: 0, p: 0 }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          left: LINE_CENTER,
          width: LINE_WIDTH,
          // From the first dot's centre to the closing marker's centre.
          top: CARD_DOT_TOP + DOT_SIZE / 2,
          bottom: MARKER_ROW_HEIGHT / 2,
          bgcolor: "divider",
        }}
      />

      {rounds.map((round) => (
        <Box
          component="li"
          key={round.id}
          sx={{ position: "relative", pl: 4, pb: 2 }}
        >
          <RailDot
            top={CARD_DOT_TOP}
            color={
              round.status === "PENDING_APPROVAL"
                ? "warning.main"
                : "success.main"
            }
          />
          <RoundCard
            round={round}
            isPending={isPending}
            onAccept={() => onAccept(round.id)}
            onReject={() => onReject(round.id)}
          />
        </Box>
      ))}

      <Box
        component="li"
        sx={{
          position: "relative",
          pl: 4,
          minHeight: MARKER_ROW_HEIGHT,
          display: "flex",
          alignItems: "center",
        }}
      >
        <RailDot
          top={(MARKER_ROW_HEIGHT - DOT_SIZE) / 2}
          color="text.secondary"
          hollow
        />
        <Typography
          variant="body2"
          color="text.secondary"
          suppressHydrationWarning
        >
          {isTableGroup ? "Seated" : "Started"} · {formatClockTime(startedAt)}
        </Typography>
      </Box>
    </Box>
  );
}
