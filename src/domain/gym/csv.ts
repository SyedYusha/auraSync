export type CsvCellValue = string | number | boolean | null | undefined;
export type CsvRow = readonly CsvCellValue[];

export function generateCsvContent(
  headers: readonly string[],
  rows: readonly CsvRow[],
): string {
  const escapeCell = (val: CsvCellValue): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}
