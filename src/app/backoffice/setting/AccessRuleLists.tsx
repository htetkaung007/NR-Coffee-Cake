import { List, ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { ALWAYS_ALLOWED, OWNER_ONLY } from "@/app/lib/permissions";

/** A read-only list with a heading — the words come from the catalog;
 *  the icons are decorative (the heading says what the list means). */
function RuleList({
  title,
  items,
  icon,
}: {
  title: string;
  items: readonly string[];
  icon: React.ReactNode;
}) {
  return (
    <section>
      <Typography variant="overline" color="text.secondary" component="h3">
        {title}
      </Typography>
      <List dense disablePadding>
        {items.map((item) => (
          <ListItem key={item} disableGutters>
            <ListItemIcon aria-hidden sx={{ minWidth: 32, color: "text.secondary" }}>
              {icon}
            </ListItemIcon>
            <ListItemText primary={item} slotProps={{ primary: { variant: "body2" } }} />
          </ListItem>
        ))}
      </List>
    </section>
  );
}

/** What every manager can do, with no ticks needed (ALWAYS_ALLOWED). */
export function AlwaysAllowedList({ title = "Always allowed" }: { title?: string }) {
  return (
    <RuleList
      title={title}
      items={ALWAYS_ALLOWED}
      icon={<CheckCircleOutlinedIcon fontSize="small" />}
    />
  );
}

/** What no manager can ever do (OWNER_ONLY). */
export function OwnerOnlyList({ title = "Owner only" }: { title?: string }) {
  return (
    <RuleList
      title={title}
      items={OWNER_ONLY}
      icon={<LockOutlinedIcon fontSize="small" />}
    />
  );
}
