import { Platform, Share } from 'react-native';

import { generateCsvContent, type CsvCellValue, type CsvRow } from '@/domain/gym/csv';

export { generateCsvContent, type CsvCellValue, type CsvRow };

export async function exportCsvFile(
  filename: string,
  headers: readonly string[],
  rows: readonly CsvRow[],
): Promise<boolean> {
  try {
    const csv = generateCsvContent(headers, rows);
    const sanitizedFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', sanitizedFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    }

    await Share.share({
      title: sanitizedFilename,
      message: csv,
    });
    return true;
  } catch (error) {
    console.error('Failed to export CSV:', error);
    return false;
  }
}
