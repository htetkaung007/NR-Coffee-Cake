import { describe, it, expect } from "vitest";
import { landingLocations } from "./landingLocations";

const location = (
  id: number,
  name: string,
  flags: { isArchived?: boolean; onlineMenuEnabled?: boolean } = {},
) => ({
  id,
  name,
  isArchived: flags.isArchived ?? false,
  onlineMenuEnabled: flags.onlineMenuEnabled ?? true,
});

describe("landingLocations", () => {
  it("lists an open location with its online menu on", () => {
    expect(landingLocations([location(1, "Downtown")])).toEqual([
      { id: 1, name: "Downtown" },
    ]);
  });

  it("leaves out a location whose online menu is off", () => {
    expect(
      landingLocations([location(1, "Downtown", { onlineMenuEnabled: false })]),
    ).toEqual([]);
  });

  it("leaves out an archived location even with its online menu on", () => {
    expect(
      landingLocations([location(1, "Old shop", { isArchived: true })]),
    ).toEqual([]);
  });

  it("returns only the id and the name", () => {
    const [listed] = landingLocations([location(1, "Downtown")]);
    expect(Object.keys(listed).sort()).toEqual(["id", "name"]);
  });

  it("orders the listed locations by name", () => {
    expect(
      landingLocations([
        location(3, "Riverside"),
        location(1, "Airport"),
        location(2, "Downtown", { onlineMenuEnabled: false }),
      ]).map((listed) => listed.name),
    ).toEqual(["Airport", "Riverside"]);
  });

  it("is empty when there are no locations", () => {
    expect(landingLocations([])).toEqual([]);
  });
});
