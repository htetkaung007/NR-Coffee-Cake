"use client";

import { useState } from "react";

/** One add-on option row in an add-on group form. */
export interface OptionRow {
  /** Present only for options that already exist (editing a group). */
  id?: number;
  name: string;
  /** Blank string = Free. */
  price: string;
}

/** A new, blank option row. */
export function emptyOptionRow(): OptionRow {
  return { name: "", price: "" };
}

/** The editable option rows of an add-on group form (the add-on group
 *  page and the "New add-on group" dialog): edit a row's name / price,
 *  add a blank row, remove one. */
export function useOptionRows(initialRows: OptionRow[] | (() => OptionRow[])) {
  const [options, setOptions] = useState<OptionRow[]>(initialRows);

  function updateOption(index: number, field: "name" | "price", value: string) {
    setOptions((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function addOption() {
    setOptions((rows) => [...rows, emptyOptionRow()]);
  }

  function removeOption(index: number) {
    setOptions((rows) => rows.filter((_, i) => i !== index));
  }

  return { options, setOptions, updateOption, addOption, removeOption };
}
