/** CSV encoding for the Reports exports — the ONE place a cell is made
 *  safe. Every text cell goes through csvText (quoting + the formula-
 *  injection guard: staff- and customer-typed notes end up here), every
 *  number through csvNumber, and a whole file through toCsv. */

const BOM = "\uFEFF";
const CRLF = "\r\n";
/** What a spreadsheet would run as a formula: =, +, -, @, a tab or a CR
 *  at the start — after any leading spaces. */
const FORMULA_START = /^ *[=+\-@\t\r]/;
/** What can't sit in a bare cell. */
const NEEDS_QUOTES = /[",\r\n]/;

/** One CSV column: its header and how a row becomes that cell (already
 *  encoded — via csvText or csvNumber). */
export interface CsvColumn<Row> {
  header: string;
  get: (row: Row) => string;
}

/** A CSV-safe TEXT cell. null/undefined → empty. Text that (after any
 *  leading spaces) starts with "=", "+", "-", "@", a tab or a CR gets a
 *  leading apostrophe so a spreadsheet never runs it as a formula; then
 *  it's wrapped in double quotes (inner quotes doubled) when it contains
 *  a comma, a quote, a CR or an LF. */
export function csvText(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const guarded = FORMULA_START.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

/** A plain number cell — no thousands separators and no formula guard
 *  (-500 stays "-500"). null/undefined → empty. */
export function csvNumber(n: number | null | undefined): string {
  return n === null || n === undefined ? "" : String(n);
}

/** The whole file: a UTF-8 BOM first (so Excel reads Myanmar text), the
 *  header line, then one line per row — CRLF between lines and after the
 *  last one. Zero rows → the header line only. */
export function toCsv<Row>(
  columns: readonly CsvColumn<Row>[],
  rows: readonly Row[],
): string {
  const lines = [
    columns.map((column) => csvText(column.header)).join(","),
    ...rows.map((row) => columns.map((column) => column.get(row)).join(",")),
  ];
  return `${BOM}${lines.join(CRLF)}${CRLF}`;
}
