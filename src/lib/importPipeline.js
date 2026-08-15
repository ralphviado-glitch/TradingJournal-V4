import { parseTradesFromRows } from "./csv";

export function parseUploadedRows(rows, preferredAccount, options = {}) {
  return parseTradesFromRows(rows, { ...options, preferredAccount });
}
