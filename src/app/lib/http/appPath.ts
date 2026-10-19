/** An in-app path ("/menu?x=1") — one leading "/", never "//host" or a
 *  full URL — so a redirect built from it can't leave the site. Pure and
 *  client-safe (the sign-in form checks its callbackUrl with it). */
export function isAppPath(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  );
}
