"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { validateCartAction } from "@/app/(storefront)/cart/action";
import { toServerLines, type BrowserCart } from "@/app/lib/cart/browserCart";
import type {
  CartValidationResult,
  SendState,
} from "@/app/lib/cart/cartValidation";

const DEBOUNCE_MS = 300;

/** What a validation result is FOR: the customer's choices, line by
 *  line. Deliberately leaves out the shown prices — refreshing those
 *  from a result (applyValidation) must not count as a new cart, or the
 *  "price updated" notice would be re-checked away straight after. */
function choicesKey(cart: BrowserCart) {
  return JSON.stringify(
    cart.lines.map((line) => [line.menuId, line.addonIds, line.quantity, line.note]),
  );
}

/**
 * Keeps a browser cart checked against the server (validateCartAction):
 * on mount, after every change to the cart's lines, and whenever the
 * window regains focus or the tab becomes visible again — each debounced
 * ~300ms, one request in flight at a time (a trigger during a request
 * runs once more after it). A result only counts while the cart still
 * has the lines it was checked for; `onResult` gets each fresh result
 * for the current lines (the page refreshes the stored prices with it).
 *
 * Each check also brings back `sendState` (can this browser send now?)
 * — kept from the latest answer whatever the lines, starting from the
 * server render's. So a tab opened before the customer scanned the
 * counter QR elsewhere switches to "Send order" as soon as it's looked
 * at again (focus re-checks).
 */
export function useCartValidation(
  locationId: number,
  cart: BrowserCart,
  onResult: (result: CartValidationResult) => void,
  initialSendState: SendState,
) {
  const key = choicesKey(cart);
  const [sendState, setSendState] = useState(initialSendState);
  const [validated, setValidated] = useState<{
    forKey: string;
    result: CartValidationResult;
  } | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);

  const latest = useRef({ locationId, cart, key, onResult });
  useEffect(() => {
    latest.current = { locationId, cart, key, onResult };
  });
  const inFlight = useRef(false);
  const runAgain = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateNow = useCallback(async () => {
    if (inFlight.current) {
      runAgain.current = true;
      return;
    }
    inFlight.current = true;
    try {
      // A trigger that arrives mid-request is answered by one more pass.
      do {
        runAgain.current = false;
        const { locationId, cart, key } = latest.current;
        if (cart.lines.length === 0) break;
        try {
          const response = await validateCartAction({
            locationId,
            lines: toServerLines(cart),
          });
          if (!response.success) {
            setFailedFor(key);
          } else {
            setValidated({ forKey: key, result: response.data });
            setSendState(response.data.sendState);
            setFailedFor(null);
            if (key === latest.current.key) {
              latest.current.onResult(response.data);
            }
          }
        } catch {
          // Offline, or the request never completed.
          setFailedFor(key);
        }
      } while (runAgain.current);
    } finally {
      inFlight.current = false;
    }
  }, []);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void validateNow(), DEBOUNCE_MS);
  }, [validateNow]);

  // On mount and whenever the lines change.
  useEffect(() => {
    schedule();
  }, [key, schedule]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") schedule();
    }
    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [schedule]);

  /** Shows a result that arrived some other way (a submit that came back
   *  "needsAttention"/"pricesChanged" with a fresh check) as the current
   *  one. */
  const showResult = useCallback((result: CartValidationResult) => {
    setValidated({ forKey: latest.current.key, result });
    setFailedFor(null);
    latest.current.onResult(result);
  }, []);

  const result = validated?.forKey === key ? validated.result : null;
  const failed = failedFor === key;
  return {
    /** The server's check of the cart as it is now; null until it arrives. */
    result,
    /** A check for the current lines is on its way. */
    checking: cart.lines.length > 0 && result === null && !failed,
    /** The last check for the current lines didn't get an answer. */
    failed,
    retry: validateNow,
    showResult,
    sendState,
    /** A send attempt's own answer ("needsScan"/"awaitingApproval"),
     *  until the next check says otherwise. */
    reportSendState: setSendState,
  };
}
