const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const data = [
  {
    "PRN Number": "2025CS999",
    "Full Name": "Example Student",
    "Gender": "Boy",
    "Branch": "Computer Science",
    "Division": "Division A",
    "Roll No": 1,
    "Category": "Open",
    "Student Mobile": "9876543210",
    "Father Mobile": "9876543211",
    "Mother Mobile": "9876543212",
    "Address": "123 Main St",
    "Fees Status": "Unpaid",
    "Scholarship Status": "Not Availed",
    "Hostel Status": "Day Scholar",
    "Hostel Fees": 0,
    "APAAR ID": "123456789012",
    "Sem1 Attendance": 85.5,
    "Sem2 Attendance": 90.0,
    "Sem1 SGPA": "8.5",
    "Sem2 SGPA": ""    // intentionally blank — demonstrates that SGPA fields are optional
  }
];

const ws = xlsx.utils.json_to_sheet(data, {
    header: [
        "PRN Number", "Full Name", "Gender", "Branch", "Division", "Roll No", "Category", 
        "Student Mobile", "Father Mobile", "Mother Mobile", "Address", "Fees Status", 
        "Scholarship Status", "Hostel Status", "Hostel Fees", "APAAR ID", 
        "Sem1 Attendance", "Sem2 Attendance", "Sem1 SGPA", "Sem2 SGPA"
    ]
});

const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Template");

const outPath = path.join(__dirname, '..', 'public', 'template.xlsx');
if (!fs.existsSync(path.dirname(outPath))) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
}

xlsx.writeFile(wb, outPath);
console.log("Created template at", outPath);
