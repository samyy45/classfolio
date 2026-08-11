import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedAttendance() {
  console.log('Fetching a student...');
  const { data: students, error: sErr } = await supabase.from('students').select('id, full_name').limit(1);
  
  if (sErr || !students || students.length === 0) {
    console.error('No students found', sErr);
    return;
  }

  const student = students[0];
  console.log(`Seeding attendance for student: ${student.full_name} (ID: ${student.id})`);

  // Create 30 days of attendance
  const records = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    
    // Skip Sundays
    if (d.getDay() === 0) continue;
    
    // Skip 2nd and 4th Saturdays
    if (d.getDay() === 6) {
      const dateNum = d.getDate();
      if ((dateNum >= 8 && dateNum <= 14) || (dateNum >= 22 && dateNum <= 28)) {
        continue;
      }
    }
    
    // 80% chance of being present
    const status = Math.random() < 0.8 ? 'Present' : 'Absent';
    
    records.push({
      student_id: student.id,
      date: d.toISOString().split('T')[0],
      status: status
    });
  }

  const { error } = await supabase.from('attendance_records').upsert(records, { onConflict: 'student_id, date' });

  if (error) {
    console.error('Error seeding attendance:', error);
  } else {
    console.log(`Successfully seeded ${records.length} attendance records for student ${student.full_name}.`);
    console.log(`You can now refresh the student profile (ID: ${student.id}) to see the pie chart!`);
  }
}

seedAttendance();
