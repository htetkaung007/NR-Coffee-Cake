import { describe, it, expect } from "vitest";
import { managerAssignmentBlock } from "./managerAssignment";

const open = { id: 2, isArchived: false };
const closed = { id: 2, isArchived: true };

describe("managerAssignmentBlock", () => {
  it("allows moving a manager to another open location", () => {
    expect(managerAssignmentBlock({ target: open, currentLocationId: 1 })).toBeNull();
  });

  it("allows a new manager at an open location", () => {
    expect(managerAssignmentBlock({ target: open })).toBeNull();
  });

  it("allows a manager with no location to be given one", () => {
    expect(managerAssignmentBlock({ target: open, currentLocationId: null })).toBeNull();
  });

  it("refuses a closed (archived) location", () => {
    expect(managerAssignmentBlock({ target: closed, currentLocationId: 1 })).toBe(
      "closedLocation",
    );
  });

  it("refuses a closed location for a new manager too", () => {
    expect(managerAssignmentBlock({ target: closed })).toBe("closedLocation");
  });

  it("refuses moving a manager to the location they already work at", () => {
    expect(managerAssignmentBlock({ target: open, currentLocationId: 2 })).toBe(
      "alreadyThere",
    );
  });
});
