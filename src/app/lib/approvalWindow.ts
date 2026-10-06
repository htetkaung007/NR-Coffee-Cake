/** How long the counter has to accept or reject a submitted Counter QR
 *  round before it cancels itself (EXPIRED). The ONE value — the service
 *  that sets approvalExpiresAt and the customer's countdown both read it.
 *  Table rounds have no window: they never time out. */
export const APPROVAL_WINDOW_MINUTES = 10;

export const APPROVAL_WINDOW_SECONDS = APPROVAL_WINDOW_MINUTES * 60;
