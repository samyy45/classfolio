'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCachedProfile, setCachedProfile, clearCachedProfile, UserProfile } from '@/lib/profileCache';
import { LayoutGrid, GraduationCap, Users, UserCheck, Upload, User, LogOut, CalendarCheck, Check, X, Save, Calendar, CalendarOff } from 'lucide-react';

interface Division { id: number; name: string; }
interface StudentRow { id: number; full_name: string; roll_number: number; prn_number: string; }
interface AttendanceRecord { student_id: number; status: 'Present' | 'Absent'; }

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ profile, onLogout, logoutLoading, onNav }: any) {
  const isHod = profile?.role === 'hod';
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', path: isHod ? '/hod/dashboard' : '/dashboard', Icon: LayoutGrid },
    { label: 'Students', path: '/students', Icon: Users },
    { label: 'Attendance', path: '/attendance', Icon: CalendarCheck },
    { label: 'Attendance', path: '/class-attendance', Icon: UserCheck },
            { label: 'Profile', path: '/profile', Icon: User },
  ];

  return (
    <aside id="cf-sidebar" style={{ width: 240, flexShrink: 0, background: '#1E1E2E', display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 20 }}>
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: '#FFF', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>ClassFolio</span>
      </div>
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(({ label, path, Icon }) => {
          const isActive = pathname === path;
          return (
            <button key={path} onClick={() => onNav(path)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? '#4F46E5' : 'transparent', color: isActive ? '#FFF' : '#A0A0B0',
              fontSize: 14, fontWeight: isActive ? 600 : 400, width: '100%', textAlign: 'left', minHeight: 44,
            }}>
              <Icon size={18} strokeWidth={1.75} /> {label}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onLogout} disabled={logoutLoading} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none',
          cursor: logoutLoading ? 'not-allowed' : 'pointer', background: 'transparent', color: '#A0A0B0',
          fontSize: 14, width: '100%', textAlign: 'left', minHeight: 44, opacity: logoutLoading ? 0.6 : 1,
        }}>
          <LogOut size={18} strokeWidth={1.75} /> {logoutLoading ? 'Signing out…' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}

export default function AttendancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divisionId, setDivisionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [presentMap, setPresentMap] = useState<Record<number, boolean>>({});

  const [customHoliday, setCustomHoliday] = useState<any>(null);
  const [loadingHoliday, setLoadingHoliday] = useState(false);

  const isDefaultHoliday = useMemo(() => {
    if (!date) return false;
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const dateNum = d.getDate();
    if (dayOfWeek === 0) return true; // Sunday
    if (dayOfWeek === 6) { // Saturday
      if (dateNum >= 1 && dateNum <= 7) return true; // 1st Saturday
      if (dateNum >= 15 && dateNum <= 21) return true; // 3rd Saturday
    }
    return false;
  }, [date]);

  const isHoliday = isDefaultHoliday || !!customHoliday;

  useEffect(() => {
    if (!date) return;
    setLoadingHoliday(true);
    fetch(`/api/holidays?date=${date}`)
      .then(r => r.json())
      .then(d => setCustomHoliday(d.isHoliday ? d.holiday : null))
      .catch(console.error)
      .finally(() => setLoadingHoliday(false));
  }, [date]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then((d: UserProfile) => {
      if (d && d.full_name) setProfile(d);
      else router.push('/login');
    }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    fetch('/api/divisions').then(r => r.json()).then((d: Division[]) => setDivisions(d || []));
  }, []);

  const fetchAttendance = useCallback(() => {
    if (!divisionId || !date) return;
    setLoading(true);
    
    // Fetch students in division
    fetch(`/api/students?division_id=${divisionId}&status=Active`)
      .then(r => r.json())
      .then((stData: StudentRow[]) => {
        setStudents(stData || []);
        
        // Fetch existing attendance
        return fetch(`/api/attendance?division_id=${divisionId}&date=${date}`);
      })
      .then(r => r.json())
      .then((attData: { data: AttendanceRecord[] }) => {
        const pMap: Record<number, boolean> = {};
        if (attData.data && attData.data.length > 0) {
          attData.data.forEach(a => {
            pMap[a.student_id] = a.status === 'Present';
          });
        }
        setPresentMap(pMap);
      })
      .finally(() => setLoading(false));
  }, [divisionId, date]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const toggleStudent = (id: number) => {
    setPresentMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const markAll = (present: boolean) => {
    const pMap: Record<number, boolean> = {};
    students.forEach(s => pMap[s.id] = present);
    setPresentMap(pMap);
  };

  const handleSave = async () => {
    setSaving(true);
    const present_student_ids = students.filter(s => presentMap[s.id]).map(s => s.id);
    const absent_student_ids = students.filter(s => !presentMap[s.id]).map(s => s.id);

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, present_student_ids, absent_student_ids })
      });
      if (!res.ok) throw new Error('Failed to save');
      setToast({ type: 'success', message: 'Attendance saved successfully' });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleLogout = () => { /* ... logout logic ... */ };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8F9FA' }}>
      <Sidebar profile={profile} onLogout={handleLogout} logoutLoading={logoutLoading} onNav={router.push} />
      
      <main style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'auto' }}>
        <header style={{ background: '#FFF', borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Daily Attendance</h1>
        </header>

        <div style={{ padding: 32, flex: 1 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <select value={divisionId} onChange={e => setDivisionId(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E5E7EB' }}>
              <option value="">Select Division</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E5E7EB' }} />
          </div>

          {divisionId && date && (
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
              
              {profile?.role === 'hod' && !isDefaultHoliday && (
                <div style={{ marginBottom: 24, padding: 16, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: 15, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={18} /> Holiday Management</h4>
                    <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Mark this date as a holiday to prevent attendance marking.</p>
                  </div>
                  <button
                    onClick={async () => {
                      const newIsHoliday = !customHoliday;
                      setLoadingHoliday(true);
                      try {
                        const res = await fetch('/api/holidays', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ date, isHoliday: newIsHoliday, description: newIsHoliday ? 'HOD Marked Holiday' : '' })
                        });
                        if (res.ok) {
                          setCustomHoliday(newIsHoliday ? { description: 'HOD Marked Holiday' } : null);
                          setToast({ type: 'success', message: `Holiday ${newIsHoliday ? 'marked' : 'removed'} successfully` });
                        }
                      } catch (e) {
                        setToast({ type: 'error', message: 'Failed to update holiday' });
                      } finally {
                        setLoadingHoliday(false);
                      }
                    }}
                    disabled={loadingHoliday}
                    style={{
                      padding: '8px 16px', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      background: customHoliday ? '#FEE2E2' : '#FFFFFF',
                      color: customHoliday ? '#991B1B' : '#4F46E5',
                      border: `1px solid ${customHoliday ? '#FCA5A5' : '#4F46E5'}`,
                    }}
                  >
                    {loadingHoliday ? 'Updating...' : customHoliday ? 'Unmark Holiday' : 'Mark as Holiday'}
                  </button>
                </div>
              )}

              {isHoliday ? (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '32px', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ background: '#FEE2E2', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CalendarOff size={24} color="#DC2626" />
                  </div>
                  <h3 style={{ color: '#991B1B', margin: '0 0 8px 0', fontSize: 20 }}>Attendance Disabled</h3>
                  <p style={{ color: '#B91C1C', margin: 0 }}>This date is marked as a holiday ({customHoliday ? customHoliday.description || 'Custom Holiday' : (new Date(date).getDay() === 0 ? 'Sunday' : 'Saturday')}).</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <button onClick={() => markAll(true)} style={{ marginRight: 8, padding: '8px 16px', borderRadius: 6, border: '1px solid #16A34A', color: '#16A34A', background: '#FFF', cursor: 'pointer' }}>Mark All Present</button>
                      <button onClick={() => markAll(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #DC2626', color: '#DC2626', background: '#FFF', cursor: 'pointer' }}>Mark All Absent</button>
                    </div>
                    <button onClick={handleSave} disabled={saving || students.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 24px', borderRadius: 6, border: 'none', background: '#4F46E5', color: '#FFF', cursor: 'pointer', fontWeight: 600 }}>
                      <Save size={18} /> {saving ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>

                  {loading ? (
                    <div>Loading students...</div>
                  ) : students.length === 0 ? (
                    <div>No active students found in this division.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                          <th style={{ padding: 12, textAlign: 'left', width: 80 }}>Roll No</th>
                          <th style={{ padding: 12, textAlign: 'left' }}>Student Name</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(s => {
                          const isPresent = presentMap[s.id] || false;
                          return (
                            <tr key={s.id} onClick={() => toggleStudent(s.id)} style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: isPresent ? '#F0FDF4' : '#FEF2F2' }}>
                              <td style={{ padding: 12 }}>{s.roll_number}</td>
                              <td style={{ padding: 12, fontWeight: 500 }}>{s.full_name}</td>
                              <td style={{ padding: 12, textAlign: 'right' }}>
                                {isPresent ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16A34A', fontWeight: 600 }}><Check size={16} /> Present</span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#DC2626', fontWeight: 600 }}><X size={16} /> Absent</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, background: toast.type === 'success' ? '#16A34A' : '#DC2626', color: '#FFFFFF', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
