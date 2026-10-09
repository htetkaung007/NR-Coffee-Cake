/** Single-shop mode: sign-up (the form and a new Google email) is open
 *  only while no company exists — AppService.isSignUpOpen / the check
 *  inside createDefaultSetup. Client-safe constants shared by the Service,
 *  the NextAuth signIn callback and the auth pages. */

export const SIGNUP_CLOSED_MESSAGE =
  "Sign-up is closed. Ask the shop owner for an account.";

/** The `error` query value the sign-in page shows SIGNUP_CLOSED_MESSAGE for. */
export const SIGNUP_CLOSED_ERROR = "SignupClosed";

/** Where the signIn callback sends a new Google email while sign-up is closed. */
export const SIGNUP_CLOSED_URL = `/auth/signIn?error=${SIGNUP_CLOSED_ERROR}`;
