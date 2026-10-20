import { describe, it, expect } from "vitest";
import { createTranslator } from "next-intl";
import en from "../../../../messages/en.json";
import my from "../../../../messages/my.json";
import { staffMoney } from "../i18n/staffMoney";
import { periodFor } from "./reportPeriod";
import { dateNamesFor, reportWords } from "./reportWords";

const wordsIn = (locale: "en" | "my") => {
  const messages = locale === "en" ? en : my;
  return reportWords(
    createTranslator({ locale, messages, namespace: "bo.reports" }),
    dateNamesFor(locale),
    staffMoney(createTranslator({ locale, messages, namespace: "bo.money" })).amount,
  );
};
const words = wordsIn("en");

describe("words.period", () => {
  it("writes a week that crosses a month as 'Sep 28 – Oct 4, 2026'", () => {
    expect(words.period(periodFor("week", "2026-09-30"))).toBe(
      "Sep 28 – Oct 4, 2026",
    );
  });

  it("writes a month as its name and year", () => {
    expect(words.period(periodFor("month", "2026-09-10"))).toBe("September 2026");
  });

  it("writes a week inside one month with both ends named", () => {
    expect(words.period(periodFor("week", "2026-09-23"))).toBe(
      "Sep 21 – Sep 27, 2026",
    );
  });

  it("gives each end its year when a week crosses a year", () => {
    expect(words.period(periodFor("week", "2027-01-01"))).toBe(
      "Dec 28, 2026 – Jan 3, 2027",
    );
  });

  it("names every month (English here)", () => {
    expect(words.period(periodFor("month", "2027-02-10"))).toBe("February 2027");
    expect(words.period(periodFor("month", "2026-12-10"))).toBe("December 2026");
  });
});

describe("Myanmar report words", () => {
  const myanmar = wordsIn("my");

  it("keeps the digits 0–9 and puts the year first", () => {
    const label = myanmar.period(periodFor("month", "2026-09-10"));
    expect(label.startsWith("2026 ")).toBe(true);
    expect(label).not.toMatch(/[၀-၉]/);
  });

  it("writes Myanmar month names, never the English ones", () => {
    expect(myanmar.period(periodFor("month", "2026-09-10"))).not.toContain("September");
    expect(myanmar.reportDay("2026-09-28")).not.toMatch(/Sep|Mon/);
  });

  it("uses the Myanmar money word in a bar's label", () => {
    expect(myanmar.barLabel("2026-09-28", 142000, 12, false)).toContain("142,000 ကျပ်");
  });
});
