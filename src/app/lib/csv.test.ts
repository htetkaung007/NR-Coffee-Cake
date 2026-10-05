import { describe, it, expect } from "vitest";
import { csvNumber, csvText, toCsv } from "./csv";

const BOM = "﻿";

describe("csvText", () => {
  it("leaves plain text as it is", () => {
    expect(csvText("Latte")).toBe("Latte");
  });

  it("quotes text that contains a comma", () => {
    expect(csvText("hot, no sugar")).toBe('"hot, no sugar"');
  });

  it("doubles inner quotes and quotes the cell", () => {
    expect(csvText('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes a note with a newline inside, keeping the newline", () => {
    expect(csvText("line one\nline two")).toBe('"line one\nline two"');
  });

  it("quotes a note with a CR LF inside", () => {
    expect(csvText("a\r\nb")).toBe('"a\r\nb"');
  });

  it("leaves Myanmar text unchanged", () => {
    expect(csvText("ကော်ဖီ ဆိုင်")).toBe("ကော်ဖီ ဆိုင်");
  });

  it.each([
    ["=SUM(A1:A2)", "'=SUM(A1:A2)"],
    ["+1", "'+1"],
    ["-5", "'-5"],
    ["@cmd", "'@cmd"],
    ["\tTAB", "'\tTAB"],
  ])("guards %j against formula injection as %j", (value, expected) => {
    expect(csvText(value)).toBe(expected);
  });

  it("guards a leading CR, then quotes it (it contains a CR)", () => {
    expect(csvText("\rx")).toBe("\"'\rx\"");
  });

  it("guards a formula character that comes after leading spaces", () => {
    expect(csvText("  =1+1")).toBe("'  =1+1");
  });

  it("guards first, then quotes, when a guarded value also has a comma", () => {
    expect(csvText("=a,b")).toBe("\"'=a,b\"");
  });

  it("doesn't guard a normal word", () => {
    expect(csvText("Espresso")).toBe("Espresso");
  });

  it("doesn't guard a word with a dash in the middle", () => {
    expect(csvText("Mid-size")).toBe("Mid-size");
  });

  it.each([[null], [undefined]])("writes %s as an empty cell", (value) => {
    expect(csvText(value)).toBe("");
  });

  it("writes an empty string as an empty cell", () => {
    expect(csvText("")).toBe("");
  });
});

describe("csvNumber", () => {
  it("writes a number without thousands separators", () => {
    expect(csvNumber(24370)).toBe("24370");
  });

  it("leaves a negative number untouched (no guard)", () => {
    expect(csvNumber(-500)).toBe("-500");
  });

  it("writes zero as 0", () => {
    expect(csvNumber(0)).toBe("0");
  });

  it.each([[null], [undefined]])("writes %s as an empty cell", (value) => {
    expect(csvNumber(value)).toBe("");
  });
});

describe("toCsv", () => {
  const columns = [
    { header: "name", get: (row: { name: string; qty: number }) => csvText(row.name) },
    { header: "qty", get: (row: { name: string; qty: number }) => csvNumber(row.qty) },
  ];

  it("starts with a UTF-8 BOM at position 0", () => {
    const csv = toCsv(columns, [{ name: "Latte", qty: 2 }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("writes the header line, then one line per row, CRLF-separated with a final CRLF", () => {
    expect(
      toCsv(columns, [
        { name: "Latte", qty: 2 },
        { name: "Mocha", qty: 1 },
      ]),
    ).toBe(`${BOM}name,qty\r\nLatte,2\r\nMocha,1\r\n`);
  });

  it("keeps the columns in the order given", () => {
    const reversed = [columns[1], columns[0]];
    expect(toCsv(reversed, [{ name: "Latte", qty: 2 }])).toBe(
      `${BOM}qty,name\r\n2,Latte\r\n`,
    );
  });

  it("writes only the header line when there are no rows", () => {
    expect(toCsv(columns, [])).toBe(`${BOM}name,qty\r\n`);
  });

  it("keeps a quoted cell with a newline inside as ONE row", () => {
    expect(toCsv(columns, [{ name: "a\nb", qty: 1 }])).toBe(
      `${BOM}name,qty\r\n"a\nb",1\r\n`,
    );
  });
});
