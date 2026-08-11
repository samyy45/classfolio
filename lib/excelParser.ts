import * as xlsx from 'xlsx';
import { ExcelStudentRow, RowError, DryRunResult, StudentFormData } from '@/types/index';
import { CATEGORY_OPTIONS, BRANCH_OPTIONS } from '@/lib/constants';

const HEADER_MAP: Record<string, keyof StudentFormData> = {
  'prn': 'prn_number',
  'prn number': 'prn_number',
  'prn_number': 'prn_number',
  'full name': 'full_name',
  'name': 'full_name',
  'full_name': 'full_name',
  'gender': 'gender',
  'branch': 'branch',
  'division': 'division_id',
  'roll no': 'roll_number',
  'roll number': 'roll_number',
  'roll_no': 'roll_number',
  'category': 'category',
  'student mobile': 'student_mobile',
  'student_mobile': 'student_mobile',
  'father mobile': 'father_mobile',
  "father's mobile": 'father_mobile',
  'mother mobile': 'mother_mobile',
  "mother's mobile": 'mother_mobile',
  'address': 'address',
  'fees status': 'fees_status',
  'fees_status': 'fees_status',
  'scholarship': 'scholarship_status',
  'scholarship status': 'scholarship_status',
  'hostel status': 'hostel_status',
  'hostel_status': 'hostel_status',
  'hostel fees': 'hostel_fees',
  'hostel_fees': 'hostel_fees',
  'apaar id': 'apaar_id',
  'apaar_id': 'apaar_id',
  'sem1 attendance': 'sem1_attendance',
  'sem1_attendance': 'sem1_attendance',
  'sem2 attendance': 'sem2_attendance',
  'sem2_attendance': 'sem2_attendance',
  'sem1 sgpa': 'sgpa_sem1',
  'sem1_sgpa': 'sgpa_sem1',
  'sem2 sgpa': 'sgpa_sem2',
  'sem2_sgpa': 'sgpa_sem2',
};

function cleanMobile(input: string): string {
    let cleaned = input.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
    if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2);
    return cleaned;
}

function normalizeDivisionKey(input: string): string {
  return input.toLowerCase().replace(/[\s\-_.]/g, '');
}

function matchDivision(
  input: string,
  activeDivisions: { id: number; name: string }[]
): { id: number; name: string } | null {
  const normalizedInput = normalizeDivisionKey(input);
  for (const div of activeDivisions) {
    const normalizedFull = normalizeDivisionKey(div.name);
    const normalizedShort = normalizeDivisionKey(div.name.replace(/^division/i, 'div'));
    if (normalizedInput === normalizedFull || normalizedInput === normalizedShort) {
      return div;
    }
  }
  return null;
}

export function parseAndValidateExcel(
  buffer: Buffer,
  activeDivisions: { id: number; name: string }[]
): DryRunResult {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Use header: 1 to get raw array of arrays
  const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false, defval: '' });
  
  const valid: ExcelStudentRow[] = [];
  const errors: RowError[] = [];
  
  if (rows.length < 1) {
    return { valid, errors, total_rows: 0 };
  }

  const headerRow = rows[0].map(h => String(h).trim().toLowerCase());
  const columnMapping: Record<number, keyof StudentFormData> = {};
  
  headerRow.forEach((colName, index) => {
    const mapped = HEADER_MAP[colName];
    if (mapped) columnMapping[index] = mapped;
  });
  
  const dataRows = rows.slice(1);
  let total_rows = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    // Skip entirely blank rows
    if (row.every(cell => !String(cell).trim())) continue;
    
    total_rows++;
    const rowNumber = i + 2; // +1 for header, +1 for 1-index
    
    const rowData: Record<string, string> = {};
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const field = columnMapping[colIndex];
      if (field) {
        rowData[field] = String(row[colIndex]).trim();
      }
    }

    const rowErrors: RowError[] = [];
    const formData: Partial<StudentFormData> = {};

    // PRN Number
    if (!rowData.prn_number) rowErrors.push({ row_number: rowNumber, field: 'PRN Number', message: 'Required field is empty' });
    else formData.prn_number = rowData.prn_number;

    // Full Name
    if (!rowData.full_name) rowErrors.push({ row_number: rowNumber, field: 'Full Name', message: 'Required field is empty' });
    else formData.full_name = rowData.full_name;

    // Gender
    if (!rowData.gender) rowErrors.push({ row_number: rowNumber, field: 'Gender', message: 'Required field is empty' });
    else {
      const g = rowData.gender.toLowerCase();
      if (g === 'boy') formData.gender = 'Boy';
      else if (g === 'girl') formData.gender = 'Girl';
      else rowErrors.push({ row_number: rowNumber, field: 'Gender', message: `Must be 'Boy' or 'Girl' - received '${rowData.gender}'` });
    }

    // Division
    if (!rowData.division_id) rowErrors.push({ row_number: rowNumber, field: 'Division', message: 'Required field is empty' });
    else {
      const match = matchDivision(rowData.division_id, activeDivisions);
      if (match) formData.division_id = match.id;
      else rowErrors.push({ row_number: rowNumber, field: 'Division', message: `Invalid division - received '${rowData.division_id}'` });
    }

    // Branch
    if (!rowData.branch) rowErrors.push({ row_number: rowNumber, field: 'Branch', message: 'Required field is empty' });
    else {
      const br = rowData.branch.toLowerCase();
      const matched = BRANCH_OPTIONS.find(b => b.toLowerCase() === br);
      if (matched) formData.branch = matched;
      else rowErrors.push({ row_number: rowNumber, field: 'Branch', message: `Must be one of: ${BRANCH_OPTIONS.join(', ')} - received '${rowData.branch}'` });
    }

    // Roll Number
    if (!rowData.roll_number) rowErrors.push({ row_number: rowNumber, field: 'Roll Number', message: 'Required field is empty' });
    else {
      const rn = Number(rowData.roll_number);
      if (!Number.isInteger(rn) || rn <= 0) rowErrors.push({ row_number: rowNumber, field: 'Roll Number', message: `Must be a positive integer - received '${rowData.roll_number}'` });
      else formData.roll_number = rn;
    }

    // Category
    if (!rowData.category) rowErrors.push({ row_number: rowNumber, field: 'Category', message: 'Required field is empty' });
    else {
      const cat = rowData.category.toLowerCase();
      const matched = CATEGORY_OPTIONS.find(c => c.toLowerCase() === cat);
      if (matched) formData.category = matched;
      else rowErrors.push({ row_number: rowNumber, field: 'Category', message: `Must be one of: ${CATEGORY_OPTIONS.join(', ')} - received '${rowData.category}'` });
    }

    // Phones
    ['student_mobile', 'father_mobile', 'mother_mobile'].forEach(fieldKey => {
      const val = rowData[fieldKey];
      const friendlyName = fieldKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (!val) {
        rowErrors.push({ row_number: rowNumber, field: friendlyName, message: 'Required field is empty' });
      } else {
        const cleaned = cleanMobile(val);
        if (/^\d{10}$/.test(cleaned)) {
          (formData as any)[fieldKey] = cleaned;
        } else {
          rowErrors.push({ row_number: rowNumber, field: friendlyName, message: `Must be 10 digits - received '${val}'` });
        }
      }
    });

    // Optional text fields — blank cell ⇒ null (never a default, never an error)
    formData.apaar_id = rowData.apaar_id || '';
    formData.address = rowData.address || '';
    // sgpa_sem1 and sgpa_sem2 — both optional; blank is explicitly allowed and stored as null downstream
    // (undefined here so the API receives null, not an empty string placeholder)
    if (rowData.sgpa_sem1 && rowData.sgpa_sem1.trim()) formData.sgpa_sem1 = rowData.sgpa_sem1.trim();
    if (rowData.sgpa_sem2 && rowData.sgpa_sem2.trim()) formData.sgpa_sem2 = rowData.sgpa_sem2.trim();

    // Fees Status
    if (rowData.fees_status) {
      const fs = rowData.fees_status.toLowerCase();
      if (fs === 'paid') formData.fees_status = 'Paid';
      else if (fs === 'unpaid') formData.fees_status = 'Unpaid';
      else if (fs === 'partial') formData.fees_status = 'Partial';
      else rowErrors.push({ row_number: rowNumber, field: 'Fees Status', message: `Must be 'Paid', 'Unpaid', or 'Partial' - received '${rowData.fees_status}'` });
    } else formData.fees_status = 'Unpaid';

    // Scholarship Status
    if (rowData.scholarship_status) {
      const ss = rowData.scholarship_status.toLowerCase();
      if (ss === 'availed') formData.scholarship_status = 'Availed';
      else if (ss === 'not availed') formData.scholarship_status = 'Not Availed';
      else rowErrors.push({ row_number: rowNumber, field: 'Scholarship Status', message: `Must be 'Availed' or 'Not Availed' - received '${rowData.scholarship_status}'` });
    } else formData.scholarship_status = 'Not Availed';

    // Hostel Status
    if (rowData.hostel_status) {
      const hs = rowData.hostel_status.toLowerCase();
      if (hs === 'hosteller') formData.hostel_status = 'Hosteller';
      else if (hs === 'day scholar') formData.hostel_status = 'Day Scholar';
      else rowErrors.push({ row_number: rowNumber, field: 'Hostel Status', message: `Must be 'Hosteller' or 'Day Scholar' - received '${rowData.hostel_status}'` });
    } else formData.hostel_status = 'Day Scholar';

    // Hostel Fees
    if (rowData.hostel_fees) {
      const hf = Number(rowData.hostel_fees);
      if (isNaN(hf) || hf < 0) rowErrors.push({ row_number: rowNumber, field: 'Hostel Fees', message: `Must be a non-negative number - received '${rowData.hostel_fees}'` });
      else formData.hostel_fees = hf;
    } else formData.hostel_fees = 0;

    // Sem 1 Attendance
    if (rowData.sem1_attendance) {
      const sa = Number(rowData.sem1_attendance);
      if (isNaN(sa) || sa < 0 || sa > 100) rowErrors.push({ row_number: rowNumber, field: 'Sem 1 Attendance', message: `Must be 0-100 - received '${rowData.sem1_attendance}'` });
      else formData.sem1_attendance = sa;
    }

    // Sem 2 Attendance
    if (rowData.sem2_attendance) {
      const sa2 = Number(rowData.sem2_attendance);
      if (isNaN(sa2) || sa2 < 0 || sa2 > 100) rowErrors.push({ row_number: rowNumber, field: 'Sem 2 Attendance', message: `Must be 0-100 - received '${rowData.sem2_attendance}'` });
      else formData.sem2_attendance = sa2;
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      valid.push({ row_number: rowNumber, data: formData as StudentFormData });
    }
  }

  // --- Intra-file Duplicate Checks ---
  const prnGroups: Record<string, number[]> = {};
  const apaarGroups: Record<string, number[]> = {};
  const divRollGroups: Record<string, number[]> = {};

  valid.forEach(row => {
    const data = row.data;
    
    // PRN Grouping
    const prn = data.prn_number.trim();
    if (!prnGroups[prn]) prnGroups[prn] = [];
    prnGroups[prn].push(row.row_number);

    // APAAR Grouping
    if (data.apaar_id && data.apaar_id.trim()) {
      const apaar = data.apaar_id.trim();
      if (!apaarGroups[apaar]) apaarGroups[apaar] = [];
      apaarGroups[apaar].push(row.row_number);
    }

    // Division + Roll Number Grouping
    const divRollKey = `${data.division_id}-${data.roll_number}`;
    if (!divRollGroups[divRollKey]) divRollGroups[divRollKey] = [];
    divRollGroups[divRollKey].push(row.row_number);
  });

  const duplicateRowNumbers = new Set<number>();

  const processGroup = (groups: Record<string, number[]>, fieldLabel: string) => {
    Object.values(groups).forEach(rowNums => {
      if (rowNums.length > 1) {
        rowNums.forEach(num => {
          duplicateRowNumbers.add(num);
          const otherRows = rowNums.filter(n => n !== num);
          let msg = `Duplicate ${fieldLabel} within this file`;
          if (fieldLabel === 'Roll Number') msg = `Duplicate Roll Number within this file for this Division`;
          errors.push({
            row_number: num,
            field: fieldLabel,
            message: `${msg} - also appears in row(s) ${otherRows.join(', ')}`
          });
        });
      }
    });
  };

  processGroup(prnGroups, 'PRN Number');
  processGroup(apaarGroups, 'APAAR ID');
  processGroup(divRollGroups, 'Roll Number');

  // Filter out the duplicated rows from the valid list
  const finalValid = valid.filter(row => !duplicateRowNumbers.has(row.row_number));

  return { valid: finalValid, errors, total_rows };
}
