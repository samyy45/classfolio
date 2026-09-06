'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Users, User, UserCheck, CalendarOff, CheckCircle, Download, FileSpreadsheet, X, SkipForward, Trash2 } from 'lucide-react';
import DivisionFilter from '@/components/DivisionFilter';
import { LECTURE_SLOTS } from '@/lib/lectureSlots';
import { isDefaultHoliday, parseDateString } from '@/lib/holidayUtils';
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

export default function ClassAttendancePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  const [divisionId, setDivisionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodId, setPeriodId] = useState(LECTURE_SLOTS[0].id);

  const [roster, setRoster] = useState<StudentRow[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<number, 'Present' | 'Absent'>>({});

  const [loadingStats, setLoadingStats] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Holiday state
  const [customHoliday, setCustomHoliday] = useState<any>(null);
  const [togglingHoliday, setTogglingHoliday] = useState(false);

  // Skip state
  const [skipInfo, setSkipInfo] = useState<{ id: string; reason: string | null } | null>(null);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [skipForm, setSkipForm] = useState<{ periodId: 'L1'|'L2'|'L3'|'L4'|'L5'|'L6'; startDate: string; endDate: string; reason: string; allPeriods: boolean }>({ periodId: periodId as 'L1'|'L2'|'L3'|'L4'|'L5'|'L6', startDate: date, endDate: date, reason: '', allPeriods: false });
  const [submittingSkip, setSubmittingSkip] = useState(false);
  const [undoingSkip, setUndoingSkip] = useState(false);

  // Extract modal
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);

  // ── Derived state ──────────────────────────────────────────────────────────
  const isCalendarHoliday = useMemo(() => {
    if (!date) return false;
    return isDefaultHoliday(parseDateString(date));
  }, [date]);

  const isHoliday = isCalendarHoliday || !!customHoliday;
  const isSkipped = !!skipInfo;
  const isLocked = isHoliday || isSkipped;

  const today = new Date().toISOString().split('T')[0];
  const isFuture = date > today;

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d && d.full_name) setProfile(d);
      else router.push('/login');
    }).catch(() => router.push('/login'));
  }, [router]);

  // ── Load session (includes holiday + skip flags from API) ─────────────────
  const loadSession = useCallback(async (divId: string, d: string, pid: string) => {
    if (!divId || !d || !pid) return;
    setLoadingStats(true);
    setErrorMsg('');
    try {
      const [rosterRes, sessionRes] = await Promise.all([
        fetch(`/api/attendance/roster?divisionId=${divId}`),
        fetch(`/api/attendance/session?divisionId=${divId}&date=${d}&periodId=${pid}`)
      ]);
      const rosterData = await rosterRes.json();
      const sessionData = await sessionRes.json();

      if (rosterRes.ok && Array.isArray(rosterData)) {
        setRoster(rosterData);
        const newState: Record<number, 'Present' | 'Absent'> = {};
        rosterData.forEach((s: StudentRow) => { newState[s.id] = 'Absent'; });
        if (sessionData.session?.attendance_records) {
          sessionData.session.attendance_records.forEach((r: any) => {
            if (newState[r.student_id] !== undefined) newState[r.student_id] = r.status;
          });
        }
        setAttendanceState(newState);
        setHasUnsavedChanges(false);
      }

      // Holiday from API
      setCustomHoliday(sessionData.holiday && !isCalendarHoliday ? { description: 'Manually marked by HOD' } : null);

      // Skip info from API
      if (sessionData.skipped) {
        setSkipInfo({ id: sessionData.skipId, reason: sessionData.skipReason });
      } else {
        setSkipInfo(null);
      }

    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load roster or session.');
    } finally {
      setLoadingStats(false);
    }
  }, [isCalendarHoliday]);

  useEffect(() => {
    if (divisionId && date && periodId) {
      loadSession(divisionId, date, periodId);
    } else {
      setRoster([]);
      setAttendanceState({});
      setSkipInfo(null);
    }
  }, [divisionId, date, periodId, loadSession]);

  // ── Toggle student ────────────────────────────────────────────────────────
  const toggleStudent = (studentId: number) => {
    if (isLocked || isFuture) return;
    setAttendanceState(prev => {
      const curr = prev[studentId] || 'Absent';
      return { ...prev, [studentId]: curr === 'Present' ? 'Absent' : 'Present' };
    });
    setHasUnsavedChanges(true);
  };

  // ── Holiday toggle (HOD only) ─────────────────────────────────────────────
  const handleToggleHoliday = async () => {
    if (isCalendarHoliday) {
      setErrorMsg('Cannot modify automatic holidays (Sundays and 1st/3rd Saturdays).');
      setTimeout(() => setErrorMsg(''), 4000);
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
      setCustomHoliday(!customHoliday ? { description: 'Marked by HOD' } : null);
      setSuccessMsg(customHoliday ? 'Holiday removed' : 'Day marked as holiday');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle holiday');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setTogglingHoliday(false);
    }
  };

  // ── Skip session ──────────────────────────────────────────────────────────
  const handleCreateSkip = async () => {
    setSubmittingSkip(true);
    try {
      const res = await fetch('/api/attendance/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          divisionId,
          periodId: skipForm.allPeriods ? null : skipForm.periodId,
          startDate: skipForm.startDate,
          endDate: skipForm.endDate,
          reason: skipForm.reason || null,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsSkipModalOpen(false);
      setSuccessMsg('Session skipped successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadSession(divisionId, date, periodId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to skip session');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSubmittingSkip(false);
    }
  };

  const handleUndoSkip = async () => {
    if (!skipInfo) return;
    setUndoingSkip(true);
    try {
      const res = await fetch(`/api/attendance/skip?skipId=${skipInfo.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to undo skip');
      setSkipInfo(null);
      setSuccessMsg('Skip removed — session restored');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to undo skip');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setUndoingSkip(false);
    }
  };

  // ── Save attendance ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (isFuture) { setErrorMsg('Cannot mark attendance for a future date.'); return; }
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const records = roster.map(s => ({ studentId: s.id, status: attendanceState[s.id] || 'Absent' }));
      const res = await fetch('/api/attendance/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ divisionId, date, periodId, records })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save attendance');
      } else {
        setSuccessMsg('Attendance saved successfully');
        setHasUnsavedChanges(false);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch {
      setErrorMsg('Network error. Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const presentCount = useMemo(() => Object.values(attendanceState).filter(s => s === 'Present').length, [attendanceState]);
  const totalCount = roster.length;
  const absentCount = totalCount - presentCount;
  const presentPerc = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);

  // ── Excel export ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const slot = LECTURE_SLOTS.find(s => s.id === periodId);
    const presentStudents = roster.filter(s => attendanceState[s.id] === 'Present').map(s => ({ 'Roll Number': s.roll_number, 'Name': s.full_name, 'Status': 'Present' }));
    const absentStudents = roster.filter(s => attendanceState[s.id] !== 'Present').map(s => ({ 'Roll Number': s.roll_number, 'Name': s.full_name, 'Status': 'Absent' }));
    const allData = [...presentStudents, ...absentStudents];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allData), 'All Students');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(presentStudents), 'Present');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(absentStudents), 'Absent');
    XLSX.writeFile(wb, `Attendance_${date}_${slot?.label || periodId}.xlsx`);
  };

  const navTo = (p: string) => router.push(p);

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .att-filters { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .att-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 80px; }
        .att-circle {
          width: 56px; height: 56px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 600; cursor: pointer;
          transition: all 0.15s ease; user-select: none;
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
      <aside style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 240, background: '#1E1E2E', color: '#FFF', display: 'none' }} className="desktop-sidebar">
        <div style={{ padding: '24px', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>ClassFolio</div>
        <div style={{ padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { Icon: LayoutGrid, label: 'Dashboard', path: profile?.role === 'hod' ? '/hod/dashboard' : '/dashboard' },
            { Icon: Users, label: 'Students', path: '/students' },
            { Icon: UserCheck, label: 'Attendance', path: '/class-attendance', active: true },
            { Icon: User, label: 'Profile', path: '/profile' },
          ].map(({ Icon, label, path, active }) => (
            <button key={path} onClick={() => navTo(path)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, background: active ? '#4F46E5' : 'transparent', color: active ? '#FFF' : '#A0A0B0', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 500, transition: 'all 0.2s' }}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>
      </aside>
      <style>{`@media(min-width: 768px) { .desktop-sidebar { display: block !important; } .main-content { margin-left: 240px; } #cf-bottom-nav { display: none !important; } }`}</style>
      <style>{`@media(max-width: 767px) { #cf-bottom-nav { display: flex !important; } }`}</style>

      {/* Main content */}
      <main className="main-content" style={{ flex: 1, padding: '32px 24px', paddingBottom: 160 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Class Attendance</h1>
          {divisionId && !isHoliday && !isFuture && (
            <button
              onClick={() => { setSkipForm({ periodId, startDate: date, endDate: date, reason: '', allPeriods: false }); setIsSkipModalOpen(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#FFF', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              <SkipForward size={15} /> Skip Session
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="att-filters">
          <div style={{ flex: 1, minWidth: 200 }}>
            <DivisionFilter value={divisionId} onChange={setDivisionId} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <select value={periodId} onChange={e => setPeriodId(e.target.value as 'L1'|'L2'|'L3'|'L4'|'L5'|'L6')} style={{ width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, color: '#111827', background: '#FFF' }}>
              {LECTURE_SLOTS.map(s => (
                <option key={s.id} value={s.id}>{s.label} — {s.time}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date + HOD holiday toggle */}
        <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 8 }}>
            Date:
            <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 16, fontWeight: 500, color: '#111827', outline: 'none', fontFamily: 'inherit' }} />
          </label>

          {profile?.role === 'hod' && (
            <button
              onClick={handleToggleHoliday}
              disabled={togglingHoliday || isCalendarHoliday}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: isHoliday ? '#FEF2F2' : '#FFFFFF', color: isHoliday ? '#DC2626' : '#4B5563', border: `1px solid ${isHoliday ? '#FCA5A5' : '#E5E7EB'}`, fontSize: 14, fontWeight: 500, cursor: (togglingHoliday || isCalendarHoliday) ? 'not-allowed' : 'pointer', opacity: togglingHoliday ? 0.7 : 1 }}
            >
              {isHoliday ? <CheckCircle size={16} /> : <CalendarOff size={16} />}
              {togglingHoliday ? 'Updating...' : isHoliday ? 'Marked as Holiday' : 'Mark as Holiday'}
            </button>
          )}
        </div>

        {/* Holiday banner */}
        {isHoliday && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: 16, borderRadius: 8, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <CalendarOff size={20} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>This day is a Holiday</p>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.9, marginTop: 4 }}>
                {isCalendarHoliday ? 'Sundays and 1st/3rd Saturdays are automatic holidays.' : customHoliday?.description || 'Marked manually by HOD.'}{' '}Attendance cannot be marked.
              </p>
            </div>
          </div>
        )}

        {/* Skip banner */}
        {isSkipped && !isHoliday && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E', padding: 16, borderRadius: 8, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <SkipForward size={20} />
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Session Skipped</p>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.9, marginTop: 4 }}>{skipInfo?.reason || 'No class held for this period.'} Attendance is not required.</p>
              </div>
            </div>
            <button onClick={handleUndoSkip} disabled={undoingSkip} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#FFF', color: '#92400E', border: '1px solid #FCD34D', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <Trash2 size={14} /> {undoingSkip ? 'Removing...' : 'Undo Skip'}
            </button>
          </div>
        )}

        {/* Future date warning */}
        {isFuture && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: 16, borderRadius: 8, marginBottom: 24 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Future Date Selected</p>
            <p style={{ margin: 0, fontSize: 13, marginTop: 4 }}>Attendance cannot be marked for future dates.</p>
          </div>
        )}

        {/* Roster grid */}
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
                <div key={student.id} className={`att-circle ${isPresent ? 'att-circle-present' : 'att-circle-absent'}`} onClick={() => toggleStudent(student.id)} title={student.full_name} style={{ opacity: isLocked || isFuture ? 0.5 : 1, cursor: isLocked || isFuture ? 'not-allowed' : 'pointer' }}>
                  {student.roll_number}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Save & Export Bar */}
      {roster.length > 0 && (
        <div className="save-bar">
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Present</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#16A34A', lineHeight: 1 }}>{presentCount} <span style={{ fontSize: 16, color: '#9CA3AF', fontWeight: 500 }}>/ {totalCount}</span></span>
            </div>
            <button onClick={() => setIsExtractModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <Download size={16} /> Extract Data
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {errorMsg && <span style={{ color: '#DC2626', fontSize: 14, fontWeight: 500 }}>{errorMsg}</span>}
            {successMsg && <span style={{ color: '#16A34A', fontSize: 14, fontWeight: 500 }}>{successMsg}</span>}
            <button className="save-btn" onClick={handleSave} disabled={saving || isLocked || isFuture} style={{ padding: '10px 24px', background: isLocked || isFuture ? '#9CA3AF' : '#2563EB', color: '#FFF', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (saving || isLocked || isFuture) ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'background 0.2s', minWidth: 140 }}>
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav Mobile */}
      <nav id="cf-bottom-nav" aria-label="Mobile navigation" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, background: '#1E1E2E', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'none', alignItems: 'center', justifyContent: 'center', gap: 32, zIndex: 30 }}>
        {profile === null ? null : (profile?.role === 'hod' ? [
          { Icon: LayoutGrid, label: 'Home', path: '/hod/dashboard' },
          { Icon: Users, label: 'Students', path: '/students' },
          { Icon: UserCheck, label: 'Attendance', path: '/class-attendance' },
          { Icon: User, label: 'Profile', path: '/profile' },
        ] : [
          { Icon: LayoutGrid, label: 'Home', path: '/dashboard' },
          { Icon: Users, label: 'Students', path: '/students' },
          { Icon: UserCheck, label: 'Attendance', path: '/class-attendance' },
          { Icon: User, label: 'Profile', path: '/profile' },
        ]).map(({ Icon, label, path }) => (
          <button key={path} onClick={() => navTo(path)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: path === '/class-attendance' ? '#4F46E5' : '#A0A0B0', cursor: 'pointer', padding: '8px 12px' }}>
            <Icon size={24} />
          </button>
        ))}
      </nav>

      {/* Toast notifications */}
      {successMsg && (
        <div style={{ position: 'fixed', bottom: 100, right: 24, background: '#16A34A', color: '#FFF', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 50 }}>{successMsg}</div>
      )}
      {errorMsg && (
        <div style={{ position: 'fixed', bottom: 100, right: 24, background: '#DC2626', color: '#FFF', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 50 }}>{errorMsg}</div>
      )}

      {/* Skip Session Modal */}
      {isSkipModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#FFF', borderRadius: 12, width: '100%', maxWidth: 440, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>Skip Session</h3>
              <button onClick={() => setIsSkipModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                <input type="checkbox" checked={skipForm.allPeriods} onChange={e => setSkipForm(f => ({ ...f, allPeriods: e.target.checked }))} style={{ marginRight: 8 }} />
                Skip all periods (not just this lecture)
              </label>
              {!skipForm.allPeriods && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Period</label>
                  <select value={skipForm.periodId} onChange={e => setSkipForm(f => ({ ...f, periodId: e.target.value as 'L1'|'L2'|'L3'|'L4'|'L5'|'L6' }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }}>
                    {LECTURE_SLOTS.map(s => <option key={s.id} value={s.id}>{s.label} — {s.time}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>From Date</label>
                  <input type="date" value={skipForm.startDate} onChange={e => setSkipForm(f => ({ ...f, startDate: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>To Date</label>
                  <input type="date" value={skipForm.endDate} min={skipForm.startDate} onChange={e => setSkipForm(f => ({ ...f, endDate: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Reason (optional)</label>
                <input type="text" value={skipForm.reason} onChange={e => setSkipForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Workshop, Exam block, Faculty leave" style={{ width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleCreateSkip} disabled={submittingSkip} style={{ padding: '11px 24px', background: '#4F46E5', color: '#FFF', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submittingSkip ? 'not-allowed' : 'pointer', opacity: submittingSkip ? 0.7 : 1 }}>
                {submittingSkip ? 'Saving...' : 'Confirm Skip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extract Data Modal */}
      {isExtractModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#FFF', borderRadius: 12, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>Extract Attendance Data</h3>
              <button onClick={() => setIsExtractModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
                <div style={{ width: 120, height: 120, borderRadius: '50%', background: `conic-gradient(#16A34A 0% ${presentPerc}%, #FCA5A5 ${presentPerc}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 20px #FFF', flexShrink: 0 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{presentPerc}%</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 12, height: 12, borderRadius: 2, background: '#16A34A' }}></div><span style={{ fontSize: 14, color: '#374151' }}><strong>{presentCount}</strong> Present</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 12, height: 12, borderRadius: 2, background: '#FCA5A5' }}></div><span style={{ fontSize: 14, color: '#374151' }}><strong>{absentCount}</strong> Absent</span></div>
                  <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>Total: <strong>{totalCount}</strong> Students</div>
                </div>
              </div>
              <button onClick={handleExportExcel} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                <FileSpreadsheet size={18} /> Export Excel (.xlsx)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
