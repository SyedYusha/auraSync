import assert from 'node:assert/strict';
import test from 'node:test';

import { generateCsvContent } from './csv.ts';

test('generateCsvContent formats simple cells', () => {
  const headers = ['ID', 'Name', 'Score'];
  const rows = [
    ['1', 'Alice', 95],
    ['2', 'Bob', 88],
  ];

  const csv = generateCsvContent(headers, rows);
  assert.equal(csv, 'ID,Name,Score\r\n1,Alice,95\r\n2,Bob,88');
});

test('generateCsvContent escapes commas, quotes, and newlines', () => {
  const headers = ['Title', 'Description'];
  const rows = [
    ['Workout, Full Body', 'Quotes "here" and\nnewlines'],
    [null, undefined],
  ];

  const csv = generateCsvContent(headers, rows);
  assert.equal(csv, 'Title,Description\r\n"Workout, Full Body","Quotes ""here"" and\nnewlines"\r\n,');
});
