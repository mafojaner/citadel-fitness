/**
 * Minimal RFC 4180 CSV writer.
 *
 * Hand-rolled rather than pulled from a package: the whole surface is
 * quoting one cell correctly, and that is worth owning outright when the
 * output is someone's exported training history. Getting it wrong doesn't
 * error — it silently shifts every column after the offending cell.
 */

/**
 * A cell needs quoting if it contains a comma, a quote, or a line break.
 * Quotes inside are escaped by doubling them, which is what spreadsheets
 * expect; backslash escaping is a common mistake that Excel reads literally.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }
  // CRLF per the spec — Excel on Windows treats a bare LF as one long line
  // in some locales, and other readers accept CRLF regardless.
  return lines.join('\r\n');
}
