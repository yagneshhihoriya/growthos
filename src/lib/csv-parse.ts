/** Parse a CSV row with quoted fields that may contain commas.
 *  Follows RFC 4180: inside a quoted field, a doubled quote (`""`) is an
 *  escaped literal `"`; a single `"` ends the quoted field. */
export function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/** Parse header row (lowercase keys, strip quotes). */
export function parseCSVHeaders(headerLine: string): string[] {
  return parseCSVRow(headerLine).map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
}
