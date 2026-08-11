import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { HODDashboardStats, DivisionStats, TeacherInfo } from '@/types/index';

export async function GET() {
  try {
    const supabase = await createClient();

    // Step 1: Auth check
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 2: Role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'hod') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Step 3: Compute stats
    const [studentsRes, divisionsRes, teachersRes] = await Promise.all([
      supabase.from('students')
        .select('division_id, fees_status, scholarship_status, hostel_status, sem1_attendance, sem2_attendance')
        .eq('status', 'Active'),
      supabase.from('divisions')
        .select('id, name')
        .eq('is_active', true),
      supabase.from('profiles')
        .select('id, full_name, email, created_at')
        .eq('role', 'faculty')
        .order('created_at', { ascending: true })
    ]);

    if (studentsRes.error) throw studentsRes.error;
    if (divisionsRes.error) throw divisionsRes.error;
    if (teachersRes.error) throw teachersRes.error;

    const students = studentsRes.data;
    const activeDivisions = divisionsRes.data;
    const teachers: TeacherInfo[] = teachersRes.data;

    let fees_paid = 0;
    let fees_unpaid = 0;
    let fees_partial = 0;
    let scholarship_availed = 0;
    let hostellers = 0;

    // Initialize tracking map for division stats
    const divStatsMap: Record<number, { student_count: number; total_yearly_attendance: number; attendance_count: number }> = {};
    for (const div of activeDivisions) {
      divStatsMap[div.id] = { student_count: 0, total_yearly_attendance: 0, attendance_count: 0 };
    }

    for (const student of students) {
      // Global counts
      if (student.fees_status === 'Paid') fees_paid++;
      else if (student.fees_status === 'Unpaid') fees_unpaid++;
      else if (student.fees_status === 'Partial') fees_partial++;

      if (student.scholarship_status === 'Availed') scholarship_availed++;
      if (student.hostel_status === 'Hosteller') hostellers++;

      // Division stats
      const divStat = divStatsMap[student.division_id];
      if (divStat) {
        divStat.student_count++;

        const sem1 = student.sem1_attendance;
        const sem2 = student.sem2_attendance;

        let yearly = null;
        if (sem1 !== null && sem2 !== null) {
          yearly = (Number(sem1) + Number(sem2)) / 2;
        } else if (sem1 !== null) {
          yearly = Number(sem1);
        } else if (sem2 !== null) {
          yearly = Number(sem2);
        }

        if (yearly !== null) {
          divStat.total_yearly_attendance += yearly;
          divStat.attendance_count++;
        }
      }
    }

    // Format division stats for output
    const divisionsStats: DivisionStats[] = activeDivisions.map(div => {
      const stat = divStatsMap[div.id];
      const avg = stat.attendance_count > 0 ? stat.total_yearly_attendance / stat.attendance_count : null;
      return {
        division_id: div.id,
        division_name: div.name,
        student_count: stat.student_count,
        avg_attendance: avg !== null ? Number(avg.toFixed(2)) : null
      };
    });

    const responseData: HODDashboardStats = {
      total_students: students.length,
      fees_paid,
      fees_unpaid,
      fees_partial,
      scholarship_availed,
      hostellers,
      divisions: divisionsStats,
      teachers
    };

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error('Error generating HOD stats:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
