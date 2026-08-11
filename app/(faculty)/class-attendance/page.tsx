'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Users, User, UserCheck, CalendarOff, CheckCircle, Download, PieChart, FileSpreadsheet, X } from 'lucide-react';
import DivisionFilter from '@/components/DivisionFilter';
import * as XLSX from 'xlsx';

interface Profile {
  full_name: string;
  role: string;
}

interface StudentRow {
  id: number;
  full_name: string;
  roll_number: number;
  division_id: number;
}

const PERIODS = ['Morning Session', 'Afternoon Session'];

export default function ClassAttendancePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  
  const [divisionId, setDivisionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState(PERIODS[0]);
  
  const [roster, setRoster] = useState<StudentRow[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<number, 'Present' | 'Absent'>>({});
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);

  const [customHoliday, setCustomHoliday] = useState<any>(null);
  const [loadingHoliday, setLoadingHoliday] = useState(false);
  const [togglingHoliday, setTogglingHoliday] = useState(false);

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
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d && d.full_name) setProfile(d);
      else router.push('/login');
    }).catch(() => router.push('/login'));
  }, [router]);

  const loadSession = useCallback(async (divId: string, d: string, p: string) => {
    if (!divId || !d || !p) return;
    setLoadingStats(true);
    setErrorMsg('');
    try {
      const [rosterRes, sessionRes] = await Promise.all([
        fetch(`/api/attendance/roster?divisionId=${divId}`),
        fetch(`/api/attendance/session?divisionId=${divId}&date=${d}&period=${p}`)
      ]);
      const rosterData = await rosterRes.json();
      const sessionData = await sessionRes.json();

      if (rosterRes.ok && Array.isArray(rosterData)) {
        setRoster(rosterData);
        
        const newState: Record<number, 'Present' | 'Absent'> = {};
        // Initialize all to absent
        rosterData.forEach((s: StudentRow) => {
          newState[s.id] = 'Absent';
        });

        // Apply session records if they exist
        if (sessionData.session && sessionData.session.attendance_records) {
          sessionData.session.attendance_records.forEach((r: any) => {
            if (newState[r.student_id] !== undefined) {
              newState[r.student_id] = r.status;
            }
          });
        }
        
        setAttendanceState(newState);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load roster or session.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadHoliday = useCallback(async (d: string) => {
    setLoadingHoliday(true);
    try {
      const res = await fetch(`/api/holidays?date=${d}`);
      const data = await res.json();
      setCustomHoliday(data.isHoliday ? data.holiday : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHoliday(false);
    }
  }, []);

  useEffect(() => {
    if (date) loadHoliday(date);
    if (divisionId && date && period) {
      loadSession(divisionId, date, period);
    } else {
      setRoster([]);
      setAttendanceState({});
    }
  }, [divisionId, date, period, loadSession, loadHoliday]);

  const handleToggleHoliday = async () => {
    if (isDefaultHoliday) {
      setErrorMsg("Cannot modify default holidays (Sundays / 1st & 3rd Saturdays).");
      return;
    }
    setTogglingHoliday(true);
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, isHoliday: !customHoliday, description: !customHoliday ? 'Marked by HOD' : '' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg(customHoliday ? 'Holiday removed' : 'Holiday marked');
      loadHoliday(date);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle holiday');
    } finally {
      setTogglingHoliday(false);
    }
  };

  const toggleStudent = (studentId: number) => {
    if (isHoliday) return;
    setAttendanceState(prev => {
      const curr = prev[studentId] || 'Absent';
      return { ...prev, [studentId]: curr === 'Present' ? 'Absent' : 'Present' };
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (date > todayStr) {
      setErrorMsg('Cannot mark attendance for a future date.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const records = roster.map(s => ({
        studentId: s.id,
        status: attendanceState[s.id] || 'Absent'
      }));

      const res = await fetch('/api/attendance/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ divisionId, date, period, records })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save attendance');
      } else {
        setSuccessMsg('Attendance saved successfully');
        setHasUnsavedChanges(false);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = useMemo(() => {
    return Object.values(attendanceState).filter(status => status === 'Present').length;
  }, [attendanceState]);

  const totalCount = roster.length;
  const absentCount = totalCount - presentCount;
  const presentPerc = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);
  const absentPerc = totalCount === 0 ? 0 : Math.round((absentCount / totalCount) * 100);

  const handleExportExcel = () => {
    const presentStudents = roster.filter(s => attendanceState[s.id] === 'Present').map(s => ({
      'Roll Number': s.roll_number,
      'Name': s.full_name,
      'Status': 'Present'
    }));

    const absentStudents = roster.filter(s => attendanceState[s.id] !== 'Present').map(s => ({
      'Roll Number': s.roll_number,
      'Name': s.full_name,
      'Status': 'Absent'
    }));

    const allData = [...presentStudents, ...absentStudents];

    const wb = XLSX.utils.book_new();
    
    // Add All Students sheet
    const wsAll = XLSX.utils.json_to_sheet(allData);
    XLSX.utils.book_append_sheet(wb, wsAll, 'All Students');
    
    // Add Present sheet
    const wsPresent = XLSX.utils.json_to_sheet(presentStudents);
    XLSX.utils.book_append_sheet(wb, wsPresent, 'Present');
    
    // Add Absent sheet
    const wsAbsent = XLSX.utils.json_to_sheet(absentStudents);
    XLSX.utils.book_append_sheet(wb, wsAbsent, 'Absent');

    const filename = `Attendance_${date}_${period}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const activePath = '/class-attendance';
  const navTo = (p: string) => router.push(p);

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .att-filters { display: flex; gap: 16px; margin-bottom: 24px; }
        .att-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 80px; }
        .att-circle { 
          width: 56px; height: 56px; border-radius: 50%; 
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 600; cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }
        .att-circle-absent { border: 2px solid #E5E7EB; color: #111827; background: #FFFFFF; }
        .att-circle-absent:hover { border-color: #2563EB; }
        .att-circle-present { background: #16A34A; color: #FFFFFF; border: 2px solid #16A34A; }
        
        .save-bar {
          position: fixed; bottom: 0; left: 240px; right: 0;
          background: #FFFFFF; border-top: 1px solid #E5E7EB;
          padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;
          z-index: 20; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05);
        }

        @media (max-width: 767px) {
          .att-filters { flex-direction: column; gap: 12px; }
          .save-bar { left: 0; bottom: 64px; flex-direction: column; gap: 12px; padding: 12px 16px; }
          .save-btn { width: 100%; height: 44px; }
          .att-circle { width: 48px; height: 48px; font-size: 14px; }
        }
      `}</style>

      {/* Sidebar Desktop */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 240,
        background: '#1E1E2E', color: '#FFF', display: 'none',
      }} className="desktop-sidebar">
        <div style={{ padding: '24px', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          ClassFolio
        </div>
        <div style={{ padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { Icon: LayoutGrid,    label: 'Dashboard', path: profile?.role === 'hod' ? '/hod/dashboard' : '/dashboard' },
            { Icon: Users,         label: 'Students', path: '/students' },
            { Icon: UserCheck,     label: 'Attendance', path: '/class-attendance', active: true },
            { Icon: User,          label: 'Profile',  path: '/profile' },
          ].map(({ Icon, label, path, active }) => (
            <button
              key={path} onClick={() => navTo(path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8,
                background: active ? '#4F46E5' : 'transparent',
                color: active ? '#FFF' : '#A0A0B0',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
              }}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>
      </aside>
      <style>{`@media(min-width: 768px) { .desktop-sidebar { display: block !important; } .main-content { margin-left: 240px; } #cf-bottom-nav { display: none !important; } }`}</style>
      <style>{`@media(max-width: 767px) { #cf-bottom-nav { display: flex !important; } }`}</style>

      {/* Main content */}
      <main className="main-content" style={{ flex: 1, padding: '32px 24px', paddingBottom: 160 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 24px' }}>Class Attendance</h1>
        
        <div className="att-filters">
          <div style={{ flex: 1, minWidth: 200 }}>
            <DivisionFilter value={divisionId} onChange={setDivisionId} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB',
                borderRadius: 8, fontSize: 14, color: '#111827', background: '#FFF'
              }}
            >
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        
        <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 8 }}>
            Date:
            <input 
              type="date" 
              value={date}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: 16, fontWeight: 500, color: '#111827', outline: 'none', fontFamily: 'inherit' }}
            />
          </label>
          
          {profile?.role === 'hod' && (
            <button
              onClick={handleToggleHoliday}
              disabled={togglingHoliday || isDefaultHoliday || loadingHoliday}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8,
                background: isHoliday ? '#FEF2F2' : '#FFFFFF',
                color: isHoliday ? '#DC2626' : '#4B5563',
                border: `1px solid ${isHoliday ? '#FCA5A5' : '#E5E7EB'}`,
                fontSize: 14, fontWeight: 500, cursor: (togglingHoliday || isDefaultHoliday) ? 'not-allowed' : 'pointer',
                opacity: (togglingHoliday || loadingHoliday) ? 0.7 : 1
              }}
            >
              {isHoliday ? <CheckCircle size={16} /> : <CalendarOff size={16} />}
              {togglingHoliday ? 'Updating...' : isHoliday ? 'Marked as Holiday' : 'Mark as Holiday'}
            </button>
          )}
        </div>

        {isHoliday && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '16px', borderRadius: 8, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <CalendarOff size={20} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>This day is a Holiday</p>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.9, marginTop: 4 }}>
                {isDefaultHoliday ? "Sundays and 1st/3rd Saturdays are holidays by default." : customHoliday?.description || "Marked manually by HOD."} 
                {" "}Attendance cannot be marked.
              </p>
            </div>
          </div>
        )}

        {loadingStats ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading roster...</div>
        ) : !divisionId ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Select a division to start roll call</div>
        ) : roster.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>No active students found in this division.</div>
        ) : (
          <div className="att-grid">
            {roster.map(student => {
              const isPresent = attendanceState[student.id] === 'Present';
              return (
                <div 
                  key={student.id} 
                  className={`att-circle ${isPresent ? 'att-circle-present' : 'att-circle-absent'}`}
                  onClick={() => toggleStudent(student.id)}
                  title={student.full_name}
                  style={{ opacity: isHoliday ? 0.5 : 1, cursor: isHoliday ? 'not-allowed' : 'pointer' }}
                >
                  {student.roll_number}
                </div>
              );
            })}
          </div>
        )}
        {/* Floating Save & Export Bar */}
        {roster.length > 0 && (
          <div className="save-bar">
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Present</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#16A34A', lineHeight: 1 }}>{presentCount} <span style={{ fontSize: 16, color: '#9CA3AF', fontWeight: 500 }}>/ {totalCount}</span></span>
              </div>
              
              <button
                onClick={() => setIsExtractModalOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#F3F4F6', color: '#374151',
                  border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s'
                }}
              >
                <Download size={16} /> Extract Data
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {errorMsg && <span style={{ color: '#DC2626', fontSize: 14, fontWeight: 500 }}>{errorMsg}</span>}
              {successMsg && <span style={{ color: '#16A34A', fontSize: 14, fontWeight: 500 }}>{successMsg}</span>}
              
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={saving || isHoliday || date > new Date().toISOString().split('T')[0]}
                style={{
                  padding: '10px 24px', background: isHoliday ? '#9CA3AF' : '#2563EB', color: '#FFF',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: (saving || isHoliday) ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                  transition: 'background 0.2s', minWidth: 140
                }}
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav Mobile */}
      <nav
        id="cf-bottom-nav"
        aria-label="Mobile navigation"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
          background: '#1E1E2E', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'none', alignItems: 'center', justifyContent: 'center', gap: 32, zIndex: 30,
        }}
      >
        {profile === null ? null : (profile?.role === 'hod' ? [
          { Icon: LayoutGrid,    label: 'Home',     path: '/hod/dashboard' },
          { Icon: Users,         label: 'Students', path: '/students' },
          { Icon: UserCheck,     label: 'Attendance', path: '/class-attendance' },
          { Icon: User,          label: 'Profile',  path: '/profile' },
        ] : [
          { Icon: LayoutGrid, label: 'Home',     path: '/dashboard' },
          { Icon: Users,      label: 'Students', path: '/students' },
          { Icon: UserCheck,  label: 'Attendance', path: '/class-attendance' },
          { Icon: User,       label: 'Profile',  path: '/profile' },
        ]).map(({ Icon, label, path }) => {
          const isActive = activePath === path;
          return (
            <button
              key={path} onClick={() => navTo(path)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'transparent', border: 'none', color: isActive ? '#4F46E5' : '#A0A0B0',
                cursor: 'pointer', padding: '8px 12px'
              }}
            >
              <Icon size={24} />
            </button>
          );
        })}
      </nav>

      {/* Toasts */}
      {successMsg && (
        <div style={{ position: 'fixed', bottom: 100, right: 24, background: '#16A34A', color: '#FFF', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ position: 'fixed', bottom: 100, right: 24, background: '#DC2626', color: '#FFF', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {errorMsg}
        </div>
      )}
      {/* Extract Data Modal */}
      {isExtractModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{ background: '#FFF', borderRadius: 12, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>Extract Attendance Data</h3>
              <button onClick={() => setIsExtractModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
                <div style={{ 
                  width: 120, height: 120, borderRadius: '50%', 
                  background: `conic-gradient(#16A34A 0% ${presentPerc}%, #FCA5A5 ${presentPerc}% 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 0 0 20px #FFF'
                }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{presentPerc}%</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: '#16A34A' }}></div>
                    <span style={{ fontSize: 14, color: '#374151' }}><strong>{presentCount}</strong> Present</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: '#FCA5A5' }}></div>
                    <span style={{ fontSize: 14, color: '#374151' }}><strong>{absentCount}</strong> Absent</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
                    <span style={{ fontSize: 14, color: '#6B7280' }}>Total: <strong>{totalCount}</strong> Students</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleExportExcel}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '12px 16px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 8,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s'
                  }}
                >
                  <FileSpreadsheet size={18} /> Export Excel (.xlsx)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
