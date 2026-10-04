"use client";

import type { ReactNode } from "react";
import { Skeleton, Stack, Typography } from "@mui/material";
import { addonPairingView, menuPairingView } from "@/app/lib/reportView";
import PairRows from "./PairRows";
import { ErrorRetry } from "./ReportStates";
import type { PairingState } from "./usePairing";

const EXCLUSION_NOTE = "Required choices (e.g. size) are excluded.";

interface PanelBaseProps {
  state: PairingState;
  onRetry: () => void;
  /** "September 2026" — the month these numbers are for. */
  monthLabel: string;
}

/** What goes in a panel while the pairing loads, fails, or is there. */
function PanelBody({
  state,
  onRetry,
  title,
  children,
}: Pick<PanelBaseProps, "state" | "onRetry"> & {
  title: string;
  children: (data: Extract<PairingState, { status: "ok" }>["data"]) => ReactNode;
}) {
  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      {state.status === "loading" && (
        <Stack spacing={1} aria-busy>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} variant="rounded" height={28} />
          ))}
        </Stack>
      )}
      {state.status === "error" && (
        <ErrorRetry message={state.message} onRetry={onRetry} dense />
      )}
      {state.status === "ok" && children(state.data)}
      <Typography variant="caption" color="text.secondary">
        {EXCLUSION_NOTE}
      </Typography>
    </Stack>
  );
}

/** "Most often chosen with" — a menu's top add-ons. A menu that hasn't
 *  sold enough yet shows how far along it is ("6 / 10 sold so far")
 *  instead of percentages that would mean little. */
export function MenuPairingPanel({
  state,
  onRetry,
  monthLabel,
  menuId,
}: PanelBaseProps & { menuId: number }) {
  return (
    <PanelBody
      state={state}
      onRetry={onRetry}
      title={`Most often chosen with · ${monthLabel}`}
    >
      {(data) => {
        const view = menuPairingView(data.menus, menuId);
        if (view.status === "notEnough") {
          return (
            <Typography variant="body1">
              {view.units} / {data.minUnits} sold so far — not enough data yet
            </Typography>
          );
        }
        if (view.rows.length === 0) {
          return (
            <Typography variant="body2" color="text.secondary">
              No add-ons were chosen with this menu
            </Typography>
          );
        }
        return <PairRows rows={view.rows} />;
      }}
    </PanelBody>
  );
}

/** "Most often with" — the menus an add-on goes with, each rated by the
 *  share of THAT menu's units that had it. */
export function AddonPairingPanel({
  state,
  onRetry,
  monthLabel,
  addonId,
}: PanelBaseProps & { addonId: number }) {
  return (
    <PanelBody
      state={state}
      onRetry={onRetry}
      title={`Most often with · ${monthLabel}`}
    >
      {(data) => {
        const rows = addonPairingView(data.addons, data.menus, addonId);
        if (rows.length === 0) {
          return (
            <Typography variant="body1">
              Not enough data yet — a menu needs {data.minUnits} units sold in
              the month
            </Typography>
          );
        }
        return <PairRows rows={rows} />;
      }}
    </PanelBody>
  );
}
