const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const data = [
  {
    "Full Name": "Test Scrambled",
    "Sem2 Attendance": 90.0,
    "Sem1 Attendance": 85.5,
    "Father Mobile": "9876543211",
    "Student Mobile": "9876543210",
    "Category": "Open",
    "Mother Mobile": "9876543212",
    "Address": "123 Main St",
    "PRN Number": "2025CS999",
    "Fees Status": "Unpaid",
    "Gender": "Boy",
    "Division": "Division A",
    "Hostel Fees": 0,
    "Roll No": 1,
    "Scholarship Status": "Not Availed",
    "Hostel Status": "Day Scholar",
    "APAAR ID": "123456789012",
    "SGPA": "8.5"
  }
];

const ws = xlsx.utils.json_to_sheet(data, {
    header: [
        "Full Name", "Sem2 Attendance", "Sem1 Attendance", "Father Mobile", "Student Mobile", "Category", 
        "Mother Mobile", "Address", "PRN Number", "Fees Status", "Gender", "Division", 
        "Hostel Fees", "Roll No", "Scholarship Status", "Hostel Status", "APAAR ID", "SGPA"
    ]
});

const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Test");

const outPath = path.join(__dirname, '..', 'public', 'test_scrambled.xlsx');
xlsx.writeFile(wb, outPath);
console.log("Created scrambled test at", outPath);
