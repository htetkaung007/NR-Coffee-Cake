/** Who ordered which line at a Table QR tab — as labels, never tokens.
 *
 *  Order.contributorToken is BOTH "who picked this" and the key that lets
 *  a browser edit/remove its own drafts (TableDraftService checks it
 *  against the httpOnly cookie). So it never leaves the server: every
 *  line is turned into { isMine, contributorNo } here first, and the
 *  token itself is stripped from what's returned. Pure. */

import { cartLinesTotal } from "./orderTotals";

export interface ContributorLabel {
  /** The viewer's own line (their cookie's token). */
  isMine: boolean;
  /** 1, 2, 3… by the order each person's FIRST line appears (line id
   *  ascending) — the same number on every phone and every screen when
   *  given the whole tab. null for a line with no token (sent before
   *  tokens were kept on submitted lines) — shown as "Shared". */
  contributorNo: number | null;
}

/**
 * Labels lines with who ordered them and strips the token. Pass ALL the
 * table tab's lines (drafts + the open tab's rounds) so the numbering is
 * the same everywhere, then pick out the ones to show.
 */
export function labelContributors<
  T extends { id: number; contributorToken: string | null },
>(
  lines: readonly T[],
  myToken: string | null,
): (Omit<T, "contributorToken"> & ContributorLabel)[] {
  const numbers = new Map<string, number>();
  for (const line of [...lines].sort((a, b) => a.id - b.id)) {
    if (line.contributorToken !== null && !numbers.has(line.contributorToken)) {
      numbers.set(line.contributorToken, numbers.size + 1);
    }
  }
  return lines.map(({ contributorToken, ...rest }) => ({
    ...rest,
    isMine: myToken !== null && contributorToken === myToken,
    contributorNo:
      contributorToken === null ? null : (numbers.get(contributorToken) ?? null),
  }));
}

/** labelContributors as an id → label lookup, for labelling a subset of
 *  the tab's lines (e.g. one round) with the whole tab's numbering. */
export function contributorLabelsById(
  lines: readonly { id: number; contributorToken: string | null }[],
  myToken: string | null,
): Map<number, ContributorLabel> {
  return new Map(
    labelContributors(lines, myToken).map(({ id, isMine, contributorNo }) => [
      id,
      { isMine, contributorNo },
    ]),
  );
}

export interface ContributorGroup<Line> {
  key: string;
  /** "You", "Customer 2", or "Shared" (lines with no token). */
  label: string;
  isMine: boolean;
  lines: Line[];
  subtotal: number;
}

/** A labelled line in the cart shape (price × quantity, add-ons per
 *  unit) — what every customer screen renders. */
type GroupableLine = ContributorLabel & {
  price: number;
  quantity: number;
  addons: readonly { unitPrice: number }[];
};

/**
 * One group per person, in the order a customer reads them: You first,
 * then the others by number (Customer 2, 3…), then "Shared" last. Lines
 * keep the order they were given. Each group's subtotal is the cart-line
 * rule (cartLinesTotal) — the same money rule as everywhere else.
 */
export function groupByContributor<Line extends GroupableLine>(
  lines: readonly Line[],
): ContributorGroup<Line>[] {
  const groups = new Map<string, ContributorGroup<Line>>();
  for (const line of lines) {
    const key = line.isMine
      ? "mine"
      : line.contributorNo === null
        ? "shared"
        : `customer-${line.contributorNo}`;
    const group = groups.get(key);
    if (group) {
      group.lines.push(line);
      continue;
    }
    groups.set(key, {
      key,
      label: line.isMine
        ? "You"
        : line.contributorNo === null
          ? "Shared"
          : `Customer ${line.contributorNo}`,
      isMine: line.isMine,
      lines: [line],
      subtotal: 0,
    });
  }

  const rank = (group: ContributorGroup<Line>) =>
    group.isMine
      ? 0
      : group.key === "shared"
        ? Number.MAX_SAFE_INTEGER
        : (group.lines[0].contributorNo ?? 0);
  return [...groups.values()]
    .sort((a, b) => rank(a) - rank(b))
    .map((group) => ({ ...group, subtotal: cartLinesTotal(group.lines) }));
}

/** A person's card heading: "Your order", "Customer 2 order", or
 *  "Shared order" (lines with no recorded owner). */
export function contributorGroupHeading(label: string): string {
  return label === "You" ? "Your order" : `${label} order`;
}
