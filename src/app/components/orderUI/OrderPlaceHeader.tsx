"use client";

import { useEffect, useId, useState, type MouseEvent } from "react";
import {
  Box,
  ButtonBase,
  ClickAwayListener,
  Paper,
  Popper,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import TableRestaurantOutlinedIcon from "@mui/icons-material/TableRestaurantOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslations } from "next-intl";
import { orderPlaceTitle, type OrderPlace } from "@/app/lib/storefront/orderPlace";

const ICONS = {
  table: TableRestaurantOutlinedIcon,
  counter: StorefrontOutlinedIcon,
  online: LanguageOutlinedIcon,
} as const;

/** The order number without its "#" (the messages add it). */
const bareNumber = (orderNumber: string | null) =>
  orderNumber?.trim().replace(/^#/, "") ?? "";

/**
 * The "where am I" chip at the top of the customer menu — ONE compact row
 * (a button): an icon tile, the place (Table 5 / Order #A024 / Online)
 * and a short helper, with a chevron. Tapping it opens a details card
 * just below, OVER the content (a Popper — the search bar never moves);
 * it closes on the chevron, a tap outside, Escape or scrolling. Words +
 * icon, never colour alone: waiting for the counter shows a dot AND
 * "Waiting for the counter". Only subtitle2 / body2 / caption here.
 */
export default function OrderPlaceHeader({ place }: { place: OrderPlace }) {
  const t = useTranslations("placeHeader");
  // The row the card opens under (set on tap); null while closed.
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = anchor !== null;
  const detailsId = useId();

  // Closes on Escape and on any scroll (the card would drift off its row).
  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        anchor.focus();
      }
    };
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [anchor]);

  function toggle(event: MouseEvent<HTMLElement>) {
    const row = event.currentTarget;
    setAnchor((current) => (current ? null : row));
  }

  const Icon = ICONS[place.kind];
  const title = orderPlaceTitle(place);
  const titleText =
    "text" in title
      ? title.text
      : "values" in title
        ? t(title.key, title.values)
        : t(title.key);
  const isOnline = place.kind === "online";
  const isWaiting = place.kind === "counter" && place.awaitingApproval;
  const helper =
    place.kind === "table"
      ? t("tableHelper")
      : place.kind === "counter"
        ? t(isWaiting ? "counterWaiting" : "counterHelper")
        : t("onlineHelper");

  return (
    <Box sx={{ mb: 2 }}>
      <ButtonBase
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? detailsId : undefined}
        sx={(theme) => ({
          width: "100%",
          minHeight: 48,
          px: 1,
          py: 0.75,
          gap: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          textAlign: "left",
          borderRadius: 1.5,
          border: "1px solid",
          borderStyle: isOnline ? "dashed" : "solid",
          borderColor: isWaiting ? "warning.main" : "divider",
          bgcolor: isOnline
            ? "transparent"
            : isWaiting
              ? alpha(theme.palette.warning.main, 0.12)
              : "background.paper",
          "&.Mui-focusVisible": {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        })}
      >
        <Box
          component="span"
          aria-hidden
          sx={(theme) => ({
            width: 32,
            height: 32,
            flexShrink: 0,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: isOnline
              ? alpha(theme.palette.text.primary, 0.06)
              : "primary.main",
            color: isOnline ? "text.secondary" : "primary.contrastText",
          })}
        >
          <Icon fontSize="small" />
        </Box>
        <Typography
          component="span"
          variant="subtitle2"
          sx={{ fontWeight: 700, flexShrink: 0, maxWidth: "50%" }}
          noWrap
        >
          {titleText}
        </Typography>
        <Box
          component="span"
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {isWaiting && (
            <Box
              component="span"
              aria-hidden
              sx={{
                width: 8,
                height: 8,
                flexShrink: 0,
                borderRadius: "50%",
                bgcolor: "warning.main",
              }}
            />
          )}
          <Typography
            component="span"
            variant="caption"
            noWrap
            sx={{ minWidth: 0, color: isWaiting ? "warning.dark" : "text.secondary" }}
          >
            {helper}
          </Typography>
        </Box>
        <ExpandMoreIcon
          aria-hidden
          fontSize="small"
          sx={{
            flexShrink: 0,
            color: "text.secondary",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 160ms ease-out",
          }}
        />
      </ButtonBase>

      <Popper
        open={open}
        anchorEl={anchor}
        placement="bottom-start"
        modifiers={[{ name: "offset", options: { offset: [0, 8] } }]}
        sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
      >
        <ClickAwayListener
          onClickAway={(event) => {
            // A tap on the row itself is its own toggle.
            if (anchor?.contains(event.target as Node)) return;
            setAnchor(null);
          }}
        >
          <Paper
            id={detailsId}
            elevation={6}
            sx={{ width: anchor?.offsetWidth, maxWidth: "calc(100vw - 32px)", p: 2 }}
          >
            <PlaceDetails place={place} />
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}

/** The details card's words for each place. */
function PlaceDetails({ place }: { place: OrderPlace }) {
  const t = useTranslations("placeHeader");
  if (place.kind === "table") {
    return (
      <>
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
          {t("tableDetail")}
          {place.othersCount > 0 && t("tableOthers", { count: place.othersCount })}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ mt: 1, overflowWrap: "anywhere" }}
        >
          {t("tableNotYours")}
        </Typography>
      </>
    );
  }
  const text =
    place.kind === "counter"
      ? place.awaitingApproval
        ? t("counterDetailWaiting", { number: bareNumber(place.orderNumber) })
        : t("counterDetail")
      : t("onlineDetail");
  return (
    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
      {text}
    </Typography>
  );
}
