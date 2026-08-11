import fs from 'fs';
import path from 'path';
import { parseAndValidateExcel } from '../lib/excelParser';

const p = path.join(__dirname, '..', 'public', 'test_scrambled.xlsx');
const buffer = fs.readFileSync(p);

const activeDivisions = [
  { id: 1, name: 'Division A' },
  { id: 2, name: 'Division B' }
];

const res = parseAndValidateExcel(buffer, activeDivisions);

console.log(JSON.stringify(res, null, 2));
