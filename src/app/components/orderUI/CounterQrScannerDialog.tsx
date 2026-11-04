"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import QrCode2Icon from "@mui/icons-material/QrCode2";
// Type only — erased at build time, so the library itself is still
// loaded on demand (see start() below).
import type { IScannerControls } from "@zxing/browser";

import {
  classifyCameraError,
  classifyScannedCode,
  type CameraFailure,
  type ScannedCode,
} from "@/app/lib/storefront/counterQrScan";
import { useCloseOnBack } from "@/app/lib/hooks/useCloseOnBack";

type WrongCode = Exclude<ScannedCode["kind"], "counter">;

type Phase =
  | { kind: "scanning" }
  | { kind: "failed"; reason: CameraFailure }
  /** Read a QR that isn't the counter's — the camera stays OFF until
   *  Try again (the same QR is usually still in front of it). */
  | { kind: "wrongCode"; reason: WrongCode };

/** Why a scanned QR was refused, in the customer's words
 *  (scanner.wrongQr<…> in messages/*.json). */
const WRONG_CODE_MESSAGE = {
  tableQr: "wrongQrTable",
  otherAddress: "wrongQrOtherAddress",
  otherCode: "wrongQrOtherCode",
} as const satisfies Record<WrongCode, string>;

/** Whether "Try again" can help for each failure (e.g. after allowing
 *  the camera in the browser's settings). What the customer is told is
 *  scanner.<failure>Title / <failure>Detail in messages/*.json. */
const CAN_RETRY: Record<CameraFailure, boolean> = {
  permissionDenied: true,
  noCamera: false,
  cameraBusy: true,
  insecureContext: false,
  loadFailed: true,
  unknown: true,
};

/** Checked before anything else: no secure context or no camera API
 *  means straight to the phone-camera fallback. */
function unsupportedReason(): CameraFailure | null {
  if (!window.isSecureContext) return "insecureContext";
  if (!navigator.mediaDevices?.getUserMedia) return "noCamera";
  return null;
}

/**
 * The cart's in-app counter-QR scanner. Mounted only while open (see
 * CartPageClient), so everything below starts fresh on each open and is
 * released on unmount.
 *
 * The camera is always released — reader stopped, every track stopped,
 * video detached — on a decode, on close (×, Escape, Back), on unmount,
 * and while the page is hidden (it restarts when the page is visible
 * again). @zxing/browser is imported only here, on open, so the cart page
 * never loads it up front; if it can't load, the fallback explains how to
 * scan with the phone's own camera instead.
 *
 * Scanned text is never trusted (classifyScannedCode): only this shop's
 * counter QR — from this page's origin or the one the QR codes are
 * printed with (`qrOrigin`) — is followed, always to /counter on THIS
 * origin, as a full navigation in this tab so the route handler can set
 * the scan cookie; the scan landing then brings the customer back to
 * their cart. Any other QR stops the camera and says why (a table's QR,
 * a counter link on another address, anything else); only Try again
 * starts it again — never on its own, or the same QR still in front of
 * the camera would make it flicker on and off.
 */
export default function CounterQrScannerDialog({
  onClose,
  qrOrigin,
}: {
  onClose: () => void;
  /** The origin the shop's QR codes are printed with (lib/qr/qrOrigin). */
  qrOrigin: string | null;
}) {
  const t = useTranslations("scanner");
  const tCommon = useTranslations("common");
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<Phase>(() => {
    const reason = unsupportedReason();
    return reason ? { kind: "failed", reason } : { kind: "scanning" };
  });
  // Bumped to (re)start the camera: Try again, and when the page becomes
  // visible again. Never after a wrong code (see the Phase type).
  const [attempt, setAttempt] = useState(0);
  const [cameraLive, setCameraLive] = useState(false);
  const tryAgainRef = useRef<HTMLButtonElement | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Back closes the dialog (DESIGN.md Rule 17) — lib/hooks/useCloseOnBack.
  useCloseOnBack(() => onCloseRef.current());

  useEffect(() => {
    if (phase.kind !== "scanning") return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let controls: IScannerControls | null = null;

    function release() {
      controls?.stop();
      controls = null;
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraLive(false);
    }

    function fail(reason: CameraFailure) {
      release();
      if (!stopped) setPhase({ kind: "failed", reason });
    }

    async function start() {
      let zxing: typeof import("@zxing/browser");
      try {
        zxing = await import("@zxing/browser");
      } catch {
        return fail("loadFailed");
      }
      if (stopped) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // `ideal`, so a laptop's front camera still works.
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (error) {
        return fail(classifyCameraError(error));
      }
      const video = videoRef.current;
      if (stopped || !video) return release();

      try {
        controls = await new zxing.BrowserQRCodeReader().decodeFromStream(
          stream,
          video,
          (result) => {
            if (!result || stopped) return;
            // First decode: the camera goes off right away, whatever it read.
            stopped = true;
            release();
            const scanned = classifyScannedCode(result.getText(), {
              currentOrigin: window.location.origin,
              qrOrigin,
            });
            if (scanned.kind !== "counter") {
              setPhase({ kind: "wrongCode", reason: scanned.kind });
              return;
            }
            window.location.assign(scanned.url.toString());
          },
        );
        if (stopped) release();
        else setCameraLive(true);
      } catch (error) {
        fail(classifyCameraError(error));
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        stopped = true;
        release();
      } else if (stopped && stream === null) {
        setAttempt((count) => count + 1);
      }
    }

    void start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      release();
    };
  }, [phase.kind, attempt, qrOrigin]);

  // A refused QR: the camera is off and Try again is the next step.
  useEffect(() => {
    if (phase.kind === "wrongCode") tryAgainRef.current?.focus();
  }, [phase.kind]);

  function tryAgain() {
    const reason = unsupportedReason();
    setPhase(reason ? { kind: "failed", reason } : { kind: "scanning" });
    setAttempt((count) => count + 1);
  }

  const failure =
    phase.kind === "failed"
      ? {
          title: t(`${phase.reason}Title`),
          detail: t(`${phase.reason}Detail`),
          canRetry: CAN_RETRY[phase.reason],
        }
      : null;
  const wrongCode =
    phase.kind === "wrongCode"
      ? { title: t("wrongQrTitle"), detail: t(WRONG_CODE_MESSAGE[phase.reason]) }
      : null;
  const status = failure
    ? failure.title
    : wrongCode || cameraLive
      ? ""
      : t("starting");

  return (
    <Dialog
      open
      onClose={() => onCloseRef.current()}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      aria-labelledby={titleId}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}
      >
        <Typography id={titleId} variant="h6" component="h2">
          {t("title")}
        </Typography>
        <IconButton
          aria-label={tCommon("close")}
          onClick={() => onCloseRef.current()}
          sx={{ width: 44, height: 44 }}
        >
          <CloseIcon />
        </IconButton>
      </Stack>

      <Stack spacing={2} sx={{ px: 2, pb: 3, flex: 1 }}>
        {phase.kind === "scanning" && (
          <>
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: fullScreen ? 0 : 2,
                bgcolor: "common.black",
                aspectRatio: "3 / 4",
                maxHeight: "65dvh",
                width: "100%",
                mx: "auto",
              }}
            >
              <Box
                component="video"
                ref={videoRef}
                playsInline
                muted
                autoPlay
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {/* Static viewfinder — decorative, never animated. */}
              <Box
                aria-hidden
                sx={(t) => ({
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "62%",
                  aspectRatio: "1 / 1",
                  transform: "translate(-50%, -50%)",
                  border: "3px solid",
                  borderColor: "common.white",
                  borderRadius: 2,
                  boxShadow: `0 0 0 100vmax ${alpha(t.palette.common.black, 0.45)}`,
                })}
              />
            </Box>
            <Typography variant="body1" sx={{ textAlign: "center" }}>
              {t("pointCamera")}
            </Typography>
          </>
        )}

        {wrongCode && (
          <QrCode2Icon
            aria-hidden
            fontSize="large"
            sx={{ color: "text.secondary", alignSelf: "center" }}
          />
        )}

        {/* Announced to screen readers; always present so each change is
            (a refused QR's title and reason included). */}
        <Box role="status" aria-live="polite" sx={{ minHeight: "1.5em" }}>
          {wrongCode ? (
            <Stack spacing={1} sx={{ textAlign: "center" }}>
              <Typography variant="h6" component="p">
                {wrongCode.title}
              </Typography>
              <Typography variant="body2">{wrongCode.detail}</Typography>
            </Stack>
          ) : (
            <Typography
              variant={failure ? "h6" : "body2"}
              color={failure ? "text.primary" : "text.secondary"}
              sx={{ textAlign: failure ? "left" : "center" }}
            >
              {status}
            </Typography>
          )}
        </Box>

        {wrongCode && (
          <Button
            ref={tryAgainRef}
            variant="contained"
            onClick={tryAgain}
            sx={{ minHeight: 44 }}
          >
            {tCommon("tryAgain")}
          </Button>
        )}

        {failure && (
          <Stack spacing={2}>
            <Typography variant="body2">{failure.detail}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t("phoneCameraHint")}
            </Typography>
            <Stack direction="row" spacing={1}>
              {failure.canRetry && (
                <Button
                  variant="contained"
                  onClick={tryAgain}
                  sx={{ minHeight: 44, flex: 1 }}
                >
                  {tCommon("tryAgain")}
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={() => onCloseRef.current()}
                sx={{ minHeight: 44, flex: 1 }}
              >
                {tCommon("close")}
              </Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Dialog>
  );
}
