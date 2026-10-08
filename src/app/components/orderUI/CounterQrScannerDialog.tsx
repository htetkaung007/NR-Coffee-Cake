"use client";

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
// Type only — erased at build time, so the library itself is still
// loaded on demand (see start() below).
import type { IScannerControls } from "@zxing/browser";

import {
  classifyCameraError,
  parseCounterQrUrl,
  type CameraFailure,
} from "@/app/lib/storefront/counterQrScan";

type Phase =
  | { kind: "scanning" }
  | { kind: "failed"; reason: CameraFailure };

/** What the customer is told for each failure, and whether "Try again"
 *  can help (e.g. after allowing the camera in the browser's settings). */
const FAILURE_TEXT: Record<
  CameraFailure,
  { title: string; detail: string; canRetry: boolean }
> = {
  permissionDenied: {
    title: "Camera permission was blocked",
    detail:
      "To scan here, allow camera access for this site in your browser's settings, then tap Try again.",
    canRetry: true,
  },
  noCamera: {
    title: "No camera available",
    detail: "This device doesn't have a camera the browser can use.",
    canRetry: false,
  },
  cameraBusy: {
    title: "The camera is in use",
    detail: "Another app is using the camera. Close it, then tap Try again.",
    canRetry: true,
  },
  insecureContext: {
    title: "The camera isn't available on this page",
    detail: "Your browser only allows the camera on secure (https) pages.",
    canRetry: false,
  },
  loadFailed: {
    title: "The scanner couldn't load",
    detail: "Check your connection, then tap Try again.",
    canRetry: true,
  },
  unknown: {
    title: "The camera couldn't start",
    detail: "Tap Try again, or close the scanner and open it again.",
    canRetry: true,
  },
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
 * Scanned text is never trusted: only this shop's counter QR (same
 * origin, the counter route, a key — see parseCounterQrUrl) is followed,
 * as a full navigation in this tab so the route handler can set the scan
 * cookie; the scan landing then brings the customer back to their cart.
 */
export default function CounterQrScannerDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<Phase>(() => {
    const reason = unsupportedReason();
    return reason ? { kind: "failed", reason } : { kind: "scanning" };
  });
  // Bumped to (re)start the camera: Try again, after a wrong code, and
  // when the page becomes visible again.
  const [attempt, setAttempt] = useState(0);
  const [wrongCode, setWrongCode] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Back closes the dialog (DESIGN.md Rule 17): opening adds one history
  // entry; Back pops it, and closing any other way removes it again.
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    let popped = false;
    function handlePopState() {
      popped = true;
      onCloseRef.current();
    }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (!popped) window.history.back();
    };
  }, []);

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
            const url = parseCounterQrUrl(
              result.getText(),
              window.location.origin,
            );
            if (!url) {
              setWrongCode(true);
              setAttempt((count) => count + 1);
              return;
            }
            window.location.assign(url.toString());
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
  }, [phase.kind, attempt]);

  function tryAgain() {
    const reason = unsupportedReason();
    setWrongCode(false);
    setPhase(reason ? { kind: "failed", reason } : { kind: "scanning" });
    setAttempt((count) => count + 1);
  }

  const failure = phase.kind === "failed" ? FAILURE_TEXT[phase.reason] : null;
  const status = failure
    ? failure.title
    : wrongCode
      ? "This isn't this shop's counter QR. Point your camera at the QR code on the counter."
      : cameraLive
        ? ""
        : "Starting the camera…";

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
          Scan counter QR
        </Typography>
        <IconButton
          aria-label="Close"
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
              Point your camera at the QR code on the counter
            </Typography>
          </>
        )}

        {/* Announced to screen readers; always present so each change is. */}
        <Typography
          role="status"
          aria-live="polite"
          variant={failure ? "h6" : "body2"}
          color={failure ? "text.primary" : "text.secondary"}
          sx={{ textAlign: failure ? "left" : "center", minHeight: "1.5em" }}
        >
          {status}
        </Typography>

        {failure && (
          <Stack spacing={2}>
            <Typography variant="body2">{failure.detail}</Typography>
            <Typography variant="body2" color="text.secondary">
              You can also scan the counter QR with your phone&apos;s camera
              app — your cart will still be here.
            </Typography>
            <Stack direction="row" spacing={1}>
              {failure.canRetry && (
                <Button
                  variant="contained"
                  onClick={tryAgain}
                  sx={{ minHeight: 44, flex: 1 }}
                >
                  Try again
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={() => onCloseRef.current()}
                sx={{ minHeight: 44, flex: 1 }}
              >
                Close
              </Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Dialog>
  );
}
