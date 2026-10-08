import { describe, it, expect } from "vitest";
import {
  contributorGroupHeading,
  contributorLabelsById,
  groupByContributor,
  labelContributors,
} from "./contributors";

const row = (id: number, contributorToken: string | null) => ({ id, contributorToken });

describe("labelContributors", () => {
  it("numbers each token by its first line (id ascending), from 1", () => {
    const labelled = labelContributors(
      [row(30, "b"), row(10, "a"), row(20, "c"), row(40, "a")],
      null,
    );
    expect(labelled.map((line) => [line.id, line.contributorNo])).toEqual([
      [30, 3],
      [10, 1],
      [20, 2],
      [40, 1],
    ]);
  });

  it("gives the same token the same number on every call", () => {
    const lines = [row(1, "a"), row(2, "b"), row(3, "a")];
    const first = labelContributors(lines, "a");
    const second = labelContributors([...lines].reverse(), "b");
    const numberOf = (labelled: typeof first, id: number) =>
      labelled.find((line) => line.id === id)?.contributorNo;
    for (const id of [1, 2, 3]) {
      expect(numberOf(second, id)).toBe(numberOf(first, id));
    }
  });

  it("marks the viewer's own lines as mine — and still numbers them", () => {
    const labelled = labelContributors([row(1, "a"), row(2, "me")], "me");
    expect(labelled).toEqual([
      { id: 1, isMine: false, contributorNo: 1 },
      { id: 2, isMine: true, contributorNo: 2 },
    ]);
  });

  it("leaves lines without a token (sent before tokens were kept) unnumbered", () => {
    expect(labelContributors([row(1, null), row(2, "a")], "a")).toEqual([
      { id: 1, isMine: false, contributorNo: null },
      { id: 2, isMine: true, contributorNo: 1 },
    ]);
  });

  it("marks nothing as mine when the viewer has no token", () => {
    const labelled = labelContributors([row(1, "a"), row(2, null)], null);
    expect(labelled.every((line) => !line.isMine)).toBe(true);
  });

  it("strips the token from every line it returns", () => {
    const labelled = labelContributors(
      [{ id: 1, contributorToken: "secret", menuName: "Latte" }],
      "secret",
    );
    expect(labelled[0]).toEqual({
      id: 1,
      menuName: "Latte",
      isMine: true,
      contributorNo: 1,
    });
    expect(Object.keys(labelled[0])).not.toContain("contributorToken");
  });
});

describe("contributorLabelsById", () => {
  it("maps each line id to its label, without the token", () => {
    const labels = contributorLabelsById([row(1, "a"), row(2, "me")], "me");
    expect(labels.get(1)).toEqual({ isMine: false, contributorNo: 1 });
    expect(labels.get(2)).toEqual({ isMine: true, contributorNo: 2 });
  });
});

/** A labelled cart-shaped line: price × quantity, add-ons per unit. */
const line = (
  id: number,
  isMine: boolean,
  contributorNo: number | null,
  price = 1000,
  quantity = 1,
) => ({ id, isMine, contributorNo, price, quantity, addons: [] });

describe("groupByContributor", () => {
  it("orders the groups You, then Customer 2, 3…, then Shared", () => {
    const groups = groupByContributor([
      line(1, false, null),
      line(2, false, 3),
      line(3, true, 2),
      line(4, false, 1),
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      "You",
      "Customer 1",
      "Customer 3",
      "Shared",
    ]);
  });

  it("keeps each person's lines together, in the order given", () => {
    const groups = groupByContributor([
      line(1, false, 2),
      line(2, true, 1),
      line(3, false, 2),
    ]);
    expect(groups.map((group) => group.lines.map((l) => l.id))).toEqual([
      [2],
      [1, 3],
    ]);
    expect(groups[0].isMine).toBe(true);
  });

  it("adds each group's lines up with the cart-line rule", () => {
    const groups = groupByContributor([
      { ...line(1, true, 1, 2000, 2), addons: [{ unitPrice: 500 }] },
      line(2, false, 2, 1500, 1),
      line(3, false, 2, 1000, 3),
    ]);
    expect(groups.map((group) => group.subtotal)).toEqual([5000, 4500]);
  });

  it("is empty for no lines", () => {
    expect(groupByContributor([])).toEqual([]);
  });
});

describe("contributorGroupHeading", () => {
  it.each([
    ["You", "Your order"],
    ["Customer 2", "Customer 2 order"],
    ["Shared", "Shared order"],
  ])("heads %s's card %j", (label, heading) => {
    expect(contributorGroupHeading(label)).toBe(heading);
  });
});
