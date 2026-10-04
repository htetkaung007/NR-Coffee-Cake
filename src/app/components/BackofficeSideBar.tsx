"use client";

import { useEffect, useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import type { SvgIconComponent } from "@mui/icons-material";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AddShoppingCartOutlinedIcon from "@mui/icons-material/AddShoppingCartOutlined";
import TableRestaurantOutlinedIcon from "@mui/icons-material/TableRestaurantOutlined";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import {
  findActiveHref,
  visibleNavSections,
  type NavRole,
} from "@/app/lib/backofficeNav";
import { markSeen, useSeenFlag } from "@/app/lib/hooks/useSeenFlag";
import { isPlainLeftClick } from "@/app/lib/isPlainLeftClick";

const SIDEBAR_WIDTH = 260;

const TOPBAR_HEIGHT_DESKTOP = 64;

type NavItem = {
  label: string;
  href: string;
  icon: SvgIconComponent;
  /** Only these roles see the item; omitted = everyone. */
  roles?: readonly NavRole[];
  /** A pill after the label, hidden for good once the item's page has
   *  been opened in this browser (remembered under `seenKey`). */
  badge?: { text: string; seenKey: string };
};

type NavSection = { title: string; items: readonly NavItem[] };

// The one list both the desktop sidebar and the phone drawer render.
const navSections: readonly NavSection[] = [
  {
    title: "Service",
    items: [
      { label: "Orders", href: "/backoffice/order", icon: ReceiptLongOutlinedIcon },
      {
        label: "New order",
        href: "/backoffice/order/new",
        icon: AddShoppingCartOutlinedIcon,
      },
      {
        label: "Tables",
        href: "/backoffice/tables",
        icon: TableRestaurantOutlinedIcon,
      },
    ],
  },
  {
    title: "Menu",
    items: [
      { label: "Menus", href: "/backoffice/menus", icon: RestaurantOutlinedIcon },
      {
        label: "Menu categories",
        href: "/backoffice/menu_categories",
        icon: GridViewOutlinedIcon,
      },
      {
        label: "Add-ons",
        href: "/backoffice/addons",
        icon: AddCircleOutlineOutlinedIcon,
      },
    ],
  },
  {
    title: "Business",
    items: [
      {
        label: "Reports",
        href: "/backoffice/reports",
        icon: BarChartOutlinedIcon,
        roles: ["ADMIN"],
        badge: { text: "New", seenKey: "backoffice:seen:reports" },
      },
      {
        label: "Locations",
        href: "/backoffice/locations",
        icon: LocationOnOutlinedIcon,
      },
      { label: "Settings", href: "/backoffice/setting", icon: TuneOutlinedIcon },
    ],
  },
];

const allHrefs = navSections.flatMap((section) =>
  section.items.map((item) => item.href),
);

const itemTransition = (theme: Theme) =>
  theme.transitions.create(["background-color", "color"], {
    duration: theme.transitions.duration.shortest,
    easing: "ease",
  });

function NavBadge({
  badge,
  isActive,
}: {
  badge: NonNullable<NavItem["badge"]>;
  isActive: boolean;
}) {
  const seen = useSeenFlag(badge.seenKey);

  // Opening the item's page is what retires its badge.
  useEffect(() => {
    if (isActive) markSeen(badge.seenKey);
  }, [isActive, badge.seenKey]);

  if (seen) return null;
  return (
    <Typography
      variant="caption"
      component="span"
      sx={(theme) => ({
        ml: 1,
        px: 1,
        borderRadius: 999,
        flexShrink: 0,
        ...(isActive
          ? {
              bgcolor: alpha(theme.palette.primary.contrastText, 0.2),
              color: "primary.contrastText",
            }
          : {
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: "primary.main",
            }),
      })}
    >
      {badge.text}
    </Typography>
  );
}

function NavSectionList({
  section,
  activeHref,
  onNavigate,
}: {
  section: NavSection;
  activeHref: string | null;
  onNavigate?: () => void;
}) {
  const captionId = useId();

  return (
    <Box>
      <Typography
        id={captionId}
        variant="caption"
        component="h2"
        sx={{
          display: "block",
          px: 2,
          pb: 1,
          color: "text.secondary",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {section.title}
      </Typography>
      <List
        disablePadding
        aria-labelledby={captionId}
        sx={{ display: "flex", flexDirection: "column", gap: 1 }}
      >
        {section.items.map(({ label, href, icon: Icon, badge }) => {
          const isActive = href === activeHref;
          return (
            <ListItem key={href} disablePadding>
              <ListItemButton
                component={Link}
                href={href}
                selected={isActive}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => {
                  // ⌘/Ctrl-click opens a new tab — keep the drawer open.
                  if (onNavigate && isPlainLeftClick(event)) onNavigate();
                }}
                sx={(theme) => ({
                  minHeight: 44,
                  borderRadius: 2,
                  color: "text.primary",
                  transition: itemTransition(theme),
                  "&.Mui-focusVisible": {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                  },
                  "&.Mui-selected, &.Mui-selected.Mui-focusVisible": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  },
                  [hoverCapableMedia]: {
                    "&:hover": { bgcolor: "action.hover" },
                    "&.Mui-selected:hover": { bgcolor: "primary.dark" },
                  },
                })}
              >
                <ListItemIcon
                  sx={(theme) => ({
                    minWidth: 40,
                    color: "inherit",
                    transition: itemTransition(theme),
                  })}
                >
                  <Icon />
                </ListItemIcon>
                <ListItemText primary={label} />
                {badge && <NavBadge badge={badge} isActive={isActive} />}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

function SidebarContent({
  role,
  onNavigate,
}: {
  role: NavRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const activeHref = findActiveHref(pathname, allHrefs);

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        px: 1,
        py: 2,
      }}
    >
      {visibleNavSections(navSections, role).map((section) => (
        <NavSectionList
          key={section.title}
          section={section}
          activeHref={activeHref}
          onNavigate={onNavigate}
        />
      ))}
    </Box>
  );
}

type BackofficeSideBarProps = {
  mobileOpen: boolean;
  onClose: () => void;
  role: NavRole;
};

export function BackofficeSideBar({
  mobileOpen,
  onClose,
  role,
}: BackofficeSideBarProps) {
  return (
    <Box
      component="nav"
      sx={{ width: { sm: SIDEBAR_WIDTH }, flexShrink: { sm: 0 } }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            borderRight: 1,
            borderColor: "divider",
            pt: "env(safe-area-inset-top, 0px)",
            pb: "env(safe-area-inset-bottom, 0px)",
          },
        }}
      >
        <SidebarContent role={role} onNavigate={onClose} />
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
            borderRight: 1,
            borderColor: "divider",
            top: TOPBAR_HEIGHT_DESKTOP,
            height: `calc(100% - ${TOPBAR_HEIGHT_DESKTOP}px)`,
          },
        }}
      >
        <SidebarContent role={role} />
      </Drawer>
    </Box>
  );
}
