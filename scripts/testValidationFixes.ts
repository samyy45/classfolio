import fs from 'fs';
import path from 'path';
import { parseAndValidateExcel } from '../lib/excelParser';
import * as xlsx from 'xlsx';

const data = [
  {
    "Full Name": "Student 1",
    "Gender": "Boy",
    "Division": "Div A", // Alias
    "Roll No": 1,
    "Category": "NT",
    "Student Mobile": "9876543210",
    "Father Mobile": "9876543210",
    "Mother Mobile": "9876543210",
    "PRN Number": "2025CS001",
    "APAAR ID": "AP123"
  },
  {
    "Full Name": "Student 2",
    "Gender": "Girl",
    "Division": "DIVISION A", // Alias 2
    "Roll No": 2,
    "Category": "EWS",
    "Student Mobile": "9876543210",
    "Father Mobile": "9876543210",
    "Mother Mobile": "9876543210",
    "PRN Number": "2025CS001", // Duplicate PRN
    "APAAR ID": "AP124"
  },
  {
    "Full Name": "Student 3",
    "Gender": "Boy",
    "Division": "div-b", // Alias 3
    "Roll No": 1,
    "Category": "SBC",
    "Student Mobile": "9876543210",
    "Father Mobile": "9876543210",
    "Mother Mobile": "9876543210",
    "PRN Number": "2025CS003",
    "APAAR ID": "AP123" // Duplicate APAAR
  },
  {
    "Full Name": "Student 4",
    "Gender": "Girl",
    "Division": "Div B",
    "Roll No": 1, // Duplicate Roll No for Div B
    "Category": "ST",
    "Student Mobile": "9876543210",
    "Father Mobile": "9876543210",
    "Mother Mobile": "9876543210",
    "PRN Number": "2025CS004"
  },
  {
    "Full Name": "Student 5",
    "Gender": "Girl",
    "Division": "Division B",
    "Roll No": 5, // Valid
    "Category": "SC",
    "Student Mobile": "9876543210",
    "Father Mobile": "9876543210",
    "Mother Mobile": "9876543210",
    "PRN Number": "2025CS005"
  }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Test");

const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

const activeDivisions = [
  { id: 1, name: 'Division A' },
  { id: 2, name: 'Division B' }
];

const res = parseAndValidateExcel(buffer, activeDivisions);

console.log(JSON.stringify(res, null, 2));
