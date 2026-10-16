"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Box, ButtonBase, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { isPlainLeftClick } from "@/app/lib/isPlainLeftClick";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import {
  bottomBarHref,
  bottomBarTab,
  idFromParam,
  isBottomBarVisible,
  type BottomBarTab,
} from "@/app/lib/storefront/bottomBarVisibility";
import { BOTTOM_BAR_OFFSET_PX } from "@/app/lib/storefront/bottomBarLayout";
import { useOnScreenKeyboardOpen } from "@/app/lib/hooks/useOnScreenKeyboardOpen";

/** What the page on screen tells the bar. */
interface BottomBarPage {
  /** The cart badge — from the page's own cart (browser cart / table
   *  draft), the same count the top bar shows; null = not known here
   *  (no badge). */
  cartCount: number | null;
  /** The page's own ids, when it has them (a Counter page trusts its
   *  session's location over the URL's) — otherwise the URL's are used. */
  locationId: number | null;
  tableId: number | null;
}

interface BottomBarContextValue {
  page: BottomBarPage | null;
  setPage: (page: BottomBarPage | null) => void;
  hiddenCount: number;
  setHiddenCount: (update: (count: number) => number) => void;
}

const BottomBarContext = createContext<BottomBarContextValue | null>(null);

function useBottomBarContext() {
  const context = useContext(BottomBarContext);
  if (!context) {
    throw new Error(
      "The bottom bar needs BottomBarProvider (storefront layout)",
    );
  }
  return context;
}

/** Holds what the current page told the bar — mounted once, around the
 *  storefront's pages and the bar. */
export function BottomBarProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<BottomBarPage | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const value = useMemo(
    () => ({ page, setPage, hiddenCount, setHiddenCount }),
    [page, hiddenCount],
  );
  return (
    <BottomBarContext.Provider value={value}>
      {children}
    </BottomBarContext.Provider>
  );
}

/** A tab page tells the bar its cart count (and its ids) while it's on
 *  screen. */
export function useBottomBarPage({
  cartCount = null,
  locationId = null,
  tableId = null,
}: Partial<BottomBarPage>) {
  const { setPage } = useBottomBarContext();
  useEffect(() => {
    setPage({ cartCount, locationId, tableId });
    return () => setPage(null);
  }, [setPage, cartCount, locationId, tableId]);
}

/** Rendered by a full-screen state with its own way on (ShopUnavailable,
 *  the outcome screens): no bar while it's on screen. */
export function HideBottomBar() {
  const { setHiddenCount } = useBottomBarContext();
  useLayoutEffect(() => {
    setHiddenCount((count) => count + 1);
    return () => setHiddenCount((count) => count - 1);
  }, [setHiddenCount]);
  return null;
}

/** Each tab's label is nav.<value> in the customer's language. */
const TABS: { value: BottomBarTab; icon: ReactNode }[] = [
  { value: "menu", icon: <GridViewOutlinedIcon fontSize="small" /> },
  { value: "cart", icon: <ShoppingCartOutlinedIcon fontSize="small" /> },
  { value: "history", icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
];

const noSubscribe = () => () => {};

/**
 * The customer bottom bar — a floating pill (12px from the edges, 16px
 * from sm, above the safe area, max 480px) with Menu / Cart / History,
 * mounted ONCE in the storefront layout. Where it shows is
 * isBottomBarVisible; its links keep locationId (+ tableId) as the pages
 * read them. Navigates with router.push + refresh (not a soft Link
 * navigation) for the same reason the cart pages do: a soft navigation
 * was seen to occasionally leave the old page's tree mounted (Router
 * Cache quirk) — the anchors stay real links for middle-click etc.
 * Hidden while the on-screen keyboard is open (useOnScreenKeyboardOpen).
 */
export default function OrderBotBar() {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { page, hiddenCount } = useBottomBarContext();
  // Not in the server HTML: a page that hides the bar (ShopUnavailable,
  // an outcome screen) says so only once it runs, and the bar must not
  // flash there first. It's fixed, so appearing moves nothing.
  const isClient = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  // While the phone's keyboard is up, the bar steps aside (it would sit
  // on top of the keyboard otherwise) and comes back when it closes.
  const keyboardOpen = useOnScreenKeyboardOpen();

  if (
    !isClient ||
    !isBottomBarVisible(pathname, { hiddenByScreen: hiddenCount > 0 })
  ) {
    return null;
  }

  const active = bottomBarTab(pathname);
  const ids = {
    locationId: page?.locationId ?? idFromParam(searchParams.get("locationId")),
    tableId: page?.tableId ?? idFromParam(searchParams.get("tableId")),
  };
  const cartCount = page?.cartCount ?? 0;

  return (
    <Box
      component="nav"
      aria-label={t("label")}
      sx={(theme) => ({
        position: "fixed",
        // Clear of a landscape notch too (safe-area insets are real: the
        // storefront uses viewport-fit=cover).
        left: {
          xs: "calc(12px + env(safe-area-inset-left, 0px))",
          sm: "calc(16px + env(safe-area-inset-left, 0px))",
        },
        right: {
          xs: "calc(12px + env(safe-area-inset-right, 0px))",
          sm: "calc(16px + env(safe-area-inset-right, 0px))",
        },
        bottom: `calc(${BOTTOM_BAR_OFFSET_PX}px + env(safe-area-inset-bottom, 0px))`,
        maxWidth: 480,
        mx: "auto",
        // Above the page (its sticky bars), below drawers and dialogs.
        zIndex: theme.zIndex.appBar,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 999,
        boxShadow: theme.shadows[3],
        // Keyboard open: fade out (opacity only, ≤ 150ms, ease-out), no
        // taps, and — once faded — out of the tab order and the
        // accessibility tree (visibility). Comes straight back on close.
        // The pages keep BOTTOM_BAR_CLEARANCE either way: no layout jump.
        // Reduced motion: the global rule makes it instant.
        opacity: keyboardOpen ? 0 : 1,
        pointerEvents: keyboardOpen ? "none" : undefined,
        visibility: keyboardOpen ? "hidden" : "visible",
        transition: keyboardOpen
          ? "opacity 150ms ease-out, visibility 0s linear 150ms"
          : "opacity 150ms ease-out, visibility 0s linear 0s",
      })}
    >
      <Box
        component="ul"
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 0.5,
          listStyle: "none",
          m: 0,
          p: 0.5,
        }}
      >
        {TABS.map((tab) => {
          const href = bottomBarHref(tab.value, ids);
          const selected = tab.value === active;
          const label = t(tab.value);
          const accessibleName =
            tab.value === "cart" && cartCount > 0
              ? t("cartWithCount", { count: cartCount })
              : undefined;
          return (
            <li key={tab.value}>
              <ButtonBase
                component={Link}
                href={href}
                aria-current={selected ? "page" : undefined}
                aria-label={accessibleName}
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
                  if (!isPlainLeftClick(event)) return;
                  event.preventDefault();
                  // Already here (not a receipt under History).
                  if (pathname === `/${tab.value}`) return;
                  router.push(href);
                  router.refresh();
                }}
                sx={(theme) => ({
                  width: "100%",
                  // The 44px touch minimum — no taller.
                  minHeight: 44,
                  flexDirection: "column",
                  borderRadius: 999,
                  color: selected ? "primary.main" : "text.secondary",
                  bgcolor: selected
                    ? alpha(theme.palette.primary.main, 0.12)
                    : "transparent",
                  transition:
                    "background-color 150ms ease, color 150ms ease, transform 120ms ease-out",
                  "&:active": { transform: "scale(0.98)" },
                  "&.Mui-focusVisible": {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: -2,
                  },
                  [hoverCapableMedia]: {
                    "&:hover": selected
                      ? undefined
                      : { bgcolor: theme.palette.action.hover },
                  },
                })}
              >
                <Box aria-hidden sx={{ display: "flex" }}>
                  {tab.value === "cart" ? (
                    <Badge
                      badgeContent={cartCount}
                      color="primary"
                      invisible={cartCount === 0}
                      max={99}
                    >
                      {tab.icon}
                    </Badge>
                  ) : (
                    tab.icon
                  )}
                </Box>
                <Typography
                  variant="caption"
                  component="span"
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {label}
                </Typography>
              </ButtonBase>
            </li>
          );
        })}
      </Box>
    </Box>
  );
}
