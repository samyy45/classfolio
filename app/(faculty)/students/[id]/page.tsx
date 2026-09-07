'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import ConfirmDialog from '@/components/ConfirmDialog';
import { CATEGORY_OPTIONS, BRANCH_OPTIONS } from '@/lib/constants';
import { getCachedProfile, setCachedProfile, clearCachedProfile, UserProfile } from '@/lib/profileCache';
import { LayoutGrid, GraduationCap, Users, UserCheck, Upload, User, LogOut, Award, Receipt, CalendarCheck, X, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

// The UserProfile interface is now imported from '@/lib/profileCache'

interface Student {
  id: number;
  full_name: string;
  gender: string;
  category: string;
  branch: string;
  prn_number: string;
  cprn_number: string | null;
  apaar_id: string | null;
  division_id: number;
  roll_number: number;
  student_mobile: string;
  father_mobile: string;
  mother_mobile: string;
  address: string | null;
  fees_status: 'Paid' | 'Unpaid' | 'Partial';
  scholarship_status: string;
  hostel_status: string;
  hostel_fees: number;
  sem1_attendance: number | null;
  sem2_attendance: number | null;
  sgpa_sem1: string | null;
  sgpa_sem2: string | null;
  status: 'Active' | 'Withdrawn';
  division: { name: string };
  entrance_score?: any;
  student_fees?: any[];
  attendance_records?: any[];
}

type Tab = 'academic' | 'attendance' | 'financials';

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  profile, onLogout, logoutLoading, onNav,
}: {
  profile: UserProfile | null;
  onLogout: () => void;
  logoutLoading: boolean;
  onNav: (p: string) => void;
}) {
  const isHod = profile?.role === 'hod';
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', path: isHod ? '/hod/dashboard' : '/dashboard', Icon: LayoutGrid },
    { label: 'Students', path: '/students', Icon: Users },
    { label: 'Attendance', path: '/class-attendance', Icon: UserCheck },
            { label: 'Profile', path: '/profile', Icon: User },
  ];

  return (
    <aside
      id="cf-sidebar"
      style={{
        width: 240, flexShrink: 0, background: '#1E1E2E',
        display: 'flex', flexDirection: 'column' as const,
        height: '100vh', position: 'fixed' as const, top: 0, left: 0, zIndex: 20,
      }}
    >
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: '#FFF', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>
          ClassFolio
        </span>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
        <style>{`
          @keyframes navShimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
        {profile === null ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`nav-skeleton-${i}`}
              style={{
                height: 44, borderRadius: 8,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
                backgroundSize: '200% 100%',
                animation: 'navShimmer 1.4s infinite',
              }}
            />
          ))
        ) : navItems.map(({ label, path, Icon }) => {
          const isActive = pathname === path;
          return (
            <button
              key={path}
              onClick={() => onNav(path)}
              aria-current={isActive ? ('page' as const) : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, border: 'none',
                cursor: 'pointer',
                background: isActive ? '#4F46E5' : 'transparent',
                color: isActive ? '#FFF' : '#A0A0B0',
                fontSize: 14, fontWeight: isActive ? 600 : 400,
                width: '100%', textAlign: 'left' as const, minHeight: 44,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#FFF';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#A0A0B0';
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}><Icon size={18} strokeWidth={1.75} /></span>
               {label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ padding: '8px 12px', marginBottom: 8 }}>
          <p style={{ color: '#FFF', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {profile?.full_name ?? '…'}
          </p>
          <p style={{ color: '#A0A0B0', fontSize: 12, margin: '2px 0 0', textTransform: 'capitalize' as const }}>
            {profile?.role ?? 'Faculty'}
          </p>
        </div>
        <button
          onClick={onLogout}
          disabled={logoutLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8, border: 'none',
            cursor: logoutLoading ? 'not-allowed' : 'pointer',
            background: 'transparent', color: '#A0A0B0',
            fontSize: 14, width: '100%', textAlign: 'left' as const,
            minHeight: 44, opacity: logoutLoading ? 0.6 : 1,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.12)';
            (e.currentTarget as HTMLButtonElement).style.color = '#FCA5A5';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#A0A0B0';
          }}
        >
          <LogOut size={18} strokeWidth={1.75} />
           {logoutLoading ? 'Signing out…' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ w, h = 16 }: { w: number | string; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: 'linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: 32 }}>
      <SkeletonBox w={160} h={14} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 8px' }}>
        <SkeletonBox w={240} h={30} />
        <SkeletonBox w={70} h={22} />
      </div>
      <SkeletonBox w={200} h={14} />
      <div style={{ display: 'flex', gap: 24, margin: '28px 0 24px', borderBottom: '1px solid #E5E7EB', paddingBottom: 14 }}>
        {[150, 100, 190].map((w, i) => <SkeletonBox key={i} w={w} h={14} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonBox key={i} w="100%" h={64} />)}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('academic');

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Student>>({});
  const [divisions, setDivisions] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Attendance History modal state ─────────────────────────────────────────
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<number | null>(null);
  const [historyStudentName, setHistoryStudentName] = useState('');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMonthFilter, setHistoryMonthFilter] = useState('all');

  // Pre-fetch attendance history as soon as we know the student — so calendar opens instantly
  useEffect(() => {
    if (!studentId) return;
    setHistoryLoading(true);
    fetch(`/api/attendance/student-history?studentId=${studentId}`)
      .then(r => r.json())
      .then(d => setHistoryData(d.history || []))
      .catch(() => setHistoryData([]))
      .finally(() => setHistoryLoading(false));
  }, [studentId]);

  useEffect(() => {
    fetch('/api/divisions')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDivisions(data);
        else if (data.data && Array.isArray(data.data)) setDivisions(data.data);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.type === 'success' ? 3000 : 5000;
    const timer = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSave = async () => {
    if (!student) return;
    setSaveError(null);

    const changes: Partial<Student> = {};
    (Object.keys(editData) as Array<keyof Student>).forEach((key) => {
      if (editData[key] !== student[key]) {
        // @ts-ignore
        changes[key] = editData[key];
      }
    });

    if (Object.keys(changes).length === 0) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSaveError(data.error || 'Failed to save student');
      } else {
        setToast({ type: 'success', message: 'Student updated successfully' });
        setStudent(data);
        setIsEditing(false);
      }
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (!student) return;
    if (withdrawing) return;
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Withdrawn' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setToast({ type: 'error', message: data.error || 'Failed to withdraw student' });
        setShowWithdrawConfirm(false);
      } else {
        router.push('/students');
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'An error occurred' });
      setShowWithdrawConfirm(false);
    } finally {
      setWithdrawing(false);
    }
  };

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    const cached = getCachedProfile();
    if (cached) setProfile(cached);

    fetch('/api/auth/me')
      .then(r => { if (r.status === 401) { clearCachedProfile(); router.push('/login'); return null; } return r.json(); })
      .then((d: UserProfile | null) => {
        if (d) {
          setProfile(d);
          setCachedProfile(d);
        }
      })
      .catch(() => { });
  }, [router]);

  // ── Fetch student ──────────────────────────────────────────────────────────
  const fetchStudent = useCallback(() => {
    if (!studentId) return;
    setLoading(true);
    fetch(`/api/students/${studentId}`)
      .then(r => {
        if (r.status === 401) { router.push('/login'); return null; }
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d: Student | null) => { if (d) setStudent(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [studentId, router]);

  useEffect(() => { fetchStudent(); }, [fetchStudent]);

  const handleLogout = useCallback(async () => {
    setLogoutLoading(true);
    try { clearCachedProfile(); await fetch('/api/auth/logout', { method: 'POST' }); } finally { router.push('/login'); }
  }, [router]);

  const navTo = (path: string) => router.push(path);

  // ── Prefetch nav routes on mount ──────────────────────────────────────────

  useEffect(() => {
    const role = profile?.role;
    const routes = role === 'hod'
      ? ['/hod/dashboard', '/students', '/upload', '/hod/teachers', '/profile']
      : ['/dashboard', '/students', '/upload', '/profile'];
    routes.forEach((path) => router.prefetch(path));
  }, [profile?.role, router]);

  // ─── Tab definitions ──────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string }[] = [
    { key: 'academic', label: 'Academic & Identity' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'financials', label: 'Financials & Contact' },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8F9FA',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid #4F46E5; outline-offset: 2px; }
        @media (max-width: 767px) {
          #cf-sidebar    { display: none !important; }
          #cf-bottom-nav { display: flex !important; }
          #sd-main       { margin-left: 0 !important; min-width: 0 !important; }
          #sd-content    { padding: 16px !important; width: 100% !important; max-width: 100vw !important; overflow-x: hidden !important; box-sizing: border-box !important; }
          #sd-header     { padding: 16px !important; flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          #sd-header-actions { align-items: stretch !important; width: 100% !important; margin-top: 8px; }
          #sd-edit-actions { width: 100% !important; }
          #sd-edit-actions button { flex: 1 !important; width: auto !important; }
          #sd-edit-btn   { width: 100% !important; }
          #sd-tablist    { overflow-x: auto !important; -webkit-overflow-scrolling: touch; padding: 0 16px !important; }
          #sd-tablist::-webkit-scrollbar { display: none; }
          #sd-panel-wrap { padding: 16px !important; }
        }
        @media (min-width: 768px) {
          #cf-bottom-nav { display: none !important; }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <Sidebar
        profile={profile}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
        onNav={navTo}
      />

      {/* ── Main area ── */}
      <main
        id="sd-main"
        style={{ marginLeft: 240, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'auto' }}
      >
        {loading && <LoadingSkeleton />}

        {!loading && notFound && (
          <div style={{ padding: 48, textAlign: 'center' as const }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Student not found
            </p>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px' }}>
              This student record does not exist or you do not have access.
            </p>
            <button
              onClick={() => router.push('/students')}
              style={{
                background: '#4F46E5', color: '#FFF', border: 'none',
                borderRadius: 8, padding: '10px 24px', fontSize: 14,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              ← Back to Students
            </button>
          </div>
        )}

        {!loading && !notFound && student && (
          <div id="sd-content" style={{ padding: 32 }}>

            {/* Back link */}
            <button
              id="sd-back-btn"
              onClick={() => router.push('/students')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#4F46E5', fontSize: 14, fontWeight: 500,
                padding: 0, marginBottom: 20,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#4338CA'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#4F46E5'}
            >
              ← Back to Students
            </button>

            {/* Header card */}
            <div id="sd-header" style={{
              background: '#FFFFFF',
              borderRadius: '12px 12px 0 0',
              border: '1px solid #E5E7EB',
              borderBottom: 'none',
              padding: 24,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap' as const,
              gap: 16,
            }}>
              <div>
                {/* Name + status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, wordBreak: 'break-word' }}>
                    {student.full_name}
                  </h1>
                  {student.status === 'Active' ? (
                    <span style={{
                      background: '#DCFCE7', color: '#16A34A',
                      fontSize: 12, fontWeight: 600,
                      padding: '3px 10px', borderRadius: 9999,
                    }}>Active</span>
                  ) : (
                    <span style={{
                      background: '#FEE2E2', color: '#DC2626',
                      fontSize: 12, fontWeight: 600,
                      padding: '3px 10px', borderRadius: 9999,
                    }}>Withdrawn</span>
                  )}
                </div>
                {/* Subtitle */}
                <p style={{ fontSize: 14, color: '#6B7280', margin: '6px 0 0' }}>
                  {student.division?.name ?? '—'}&nbsp;·&nbsp;Roll No.&nbsp;{student.roll_number}
                </p>
              </div>

              {/* Edit/Save actions */}
              <div id="sd-header-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                {!isEditing ? (
                  <button
                    id="sd-edit-btn"
                    onClick={() => { setEditData({ ...student }); setIsEditing(true); setSaveError(null); }}
                    style={{
                      background: '#4F46E5', color: '#FFFFFF',
                      border: 'none', borderRadius: 8,
                      padding: '10px 20px', fontSize: 14,
                      fontWeight: 600, cursor: 'pointer', minHeight: 40,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#4338CA'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5'}
                  >
                    Edit
                  </button>
                ) : (
                  <div id="sd-edit-actions" style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      style={{
                        background: 'transparent', color: '#374151',
                        border: '1px solid #D1D5DB', borderRadius: 8,
                        padding: '10px 20px', fontSize: 14,
                        fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', minHeight: 40,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        background: '#4F46E5', color: '#FFFFFF',
                        border: 'none', borderRadius: 8,
                        padding: '10px 20px', fontSize: 14,
                        fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', minHeight: 40,
                        opacity: saving ? 0.7 : 1, width: 140,
                      }}
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                )}
                {isEditing && saveError && (
                  <p style={{ color: '#DC2626', fontSize: 12, margin: 0, maxWidth: 220, textAlign: 'right' as const }}>
                    {saveError}
                  </p>
                )}
              </div>
            </div>

            {/* White card continued: tabs + content */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '0 0 12px 12px',
            }}>
              {/* Tab strip */}
              <div
                id="sd-tablist"
                role="tablist"
                style={{
                  display: 'flex',
                  borderBottom: '1px solid #E5E7EB',
                  padding: '0 24px',
                }}
              >
                {tabs.map(({ key, label }) => {
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      id={`sd-tab-${key}`}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(key)}
                      style={{
                        background: 'none', border: 'none',
                        borderBottom: isActive ? '2px solid #4F46E5' : '2px solid transparent',
                        padding: '14px 4px', marginRight: 24,
                        fontSize: 14, fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#4F46E5' : '#6B7280',
                        cursor: 'pointer',
                        transition: 'color 0.15s',
                        whiteSpace: 'nowrap' as const,
                      }}
                      onMouseEnter={e => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#111827';
                      }}
                      onMouseLeave={e => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#6B7280';
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* ── Tab panels ─────────────────────────────────────────────────── */}
              <div id="sd-panel-wrap" style={{ padding: 24 }}>

                {/* ═══ TAB 1: Academic & Identity ═══════════════════════════════ */}
                {activeTab === 'academic' && (
                  <div id="sd-panel-academic">
                    <style>{`
                      @media (max-width: 767px) { #sd-academic-grid { grid-template-columns: 1fr !important; } }
                      .sd-input { width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px; font-family: inherit; color: #111827; }
                      .sd-input:focus { outline: 2px solid #4F46E5; border-color: transparent; }
                    `}</style>
                    <div
                      id="sd-academic-grid"
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
                    >
                      {/* Full Name */}
                      {isEditing && (
                        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, gridColumn: '1 / -1' }}>
                          <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Full Name</p>
                          <input className="sd-input" value={editData.full_name || ''} onChange={e => setEditData({ ...editData, full_name: e.target.value })} />
                        </div>
                      )}
                      {/* PRN */}
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>PRN Number</p>
                        {isEditing ? (
                          <input className="sd-input" value={editData.prn_number || ''} onChange={e => setEditData({ ...editData, prn_number: e.target.value })} />
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: student.prn_number ? '#111827' : '#9CA3AF' }}>{student.prn_number || 'Not provided'}</p>
                        )}
                      </div>
                      {/* CPRN */}
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>CPRN Number</p>
                        {isEditing ? (
                          <input className="sd-input" value={editData.cprn_number || ''} onChange={e => setEditData({ ...editData, cprn_number: e.target.value })} />
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: student.cprn_number ? '#111827' : '#9CA3AF' }}>{student.cprn_number || 'Not provided'}</p>
                        )}
                      </div>
                      {/* APAAR */}
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>APAAR ID</p>
                        {isEditing ? (
                          <input className="sd-input" value={editData.apaar_id || ''} onChange={e => setEditData({ ...editData, apaar_id: e.target.value })} />
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: student.apaar_id ? '#111827' : '#9CA3AF' }}>{student.apaar_id || 'Not provided'}</p>
                        )}
                      </div>
                      {/* Branch */}
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Branch</p>
                        {isEditing ? (
                          <select className="sd-input" value={editData.branch || ''} onChange={e => setEditData({ ...editData, branch: e.target.value })}>
                            <option value="">Select</option>
                            {BRANCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: student.branch ? '#111827' : '#9CA3AF' }}>{student.branch || 'Not provided'}</p>
                        )}
                      </div>
                      {/* Division */}
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Division</p>
                        {isEditing ? (
                          <select className="sd-input" value={editData.division_id || ''} onChange={e => setEditData({ ...editData, division_id: Number(e.target.value) })}>
                            <option value="">Select Division</option>
                            {divisions.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: student.division?.name ? '#111827' : '#9CA3AF' }}>{student.division?.name || 'Not provided'}</p>
                        )}
                      </div>
                      {/* Roll Number */}
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Roll Number</p>
                        {isEditing ? (
                          <input type="number" className="sd-input" value={editData.roll_number ?? ''} onChange={e => setEditData({ ...editData, roll_number: e.target.value ? Number(e.target.value) : undefined })} />
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: student.roll_number != null ? '#111827' : '#9CA3AF' }}>{student.roll_number != null ? String(student.roll_number) : 'Not provided'}</p>
                        )}
                      </div>
                      {/* Category */}
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Category</p>
                        {isEditing ? (
                          <select className="sd-input" value={editData.category || ''} onChange={e => setEditData({ ...editData, category: e.target.value })}>
                            <option value="">Select</option>
                            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: student.category ? '#111827' : '#9CA3AF' }}>{student.category || 'Not provided'}</p>
                        )}
                      </div>
                      {/* Gender */}
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Gender</p>
                        {isEditing ? (
                          <select className="sd-input" value={editData.gender || ''} onChange={e => setEditData({ ...editData, gender: e.target.value })}>
                            <option value="">Select</option>
                            <option value="Boy">Boy</option>
                            <option value="Girl">Girl</option>
                          </select>
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: student.gender ? '#111827' : '#9CA3AF' }}>{student.gender || 'Not provided'}</p>
                        )}
                      </div>
                      {/* SGPA Sem 1 */}
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>SGPA Sem 1</p>
                        {isEditing ? (
                          <input className="sd-input" value={editData.sgpa_sem1 || ''} onChange={e => setEditData({ ...editData, sgpa_sem1: e.target.value })} placeholder="Optional" />
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: student.sgpa_sem1 ? '#111827' : '#9CA3AF' }}>{student.sgpa_sem1 || 'Not provided'}</p>
                        )}
                      </div>
                      {/* SGPA Sem 2 */}
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>SGPA Sem 2</p>
                        {isEditing ? (
                          <input className="sd-input" value={editData.sgpa_sem2 || ''} onChange={e => setEditData({ ...editData, sgpa_sem2: e.target.value })} placeholder="Optional" />
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: student.sgpa_sem2 ? '#111827' : '#9CA3AF' }}>{student.sgpa_sem2 || 'Not provided'}</p>
                        )}
                      </div>
                    </div>

                    {/* Entrance Scores Section */}
                    <div style={{ marginTop: 32 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Award size={18} strokeWidth={2} color="#4F46E5" />
                        Entrance Scores
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        {['jee_score', 'cet_score', 'pcm_score'].map(scoreField => {
                          const val = student.entrance_score?.[scoreField];
                          const label = scoreField.split('_')[0].toUpperCase();
                          return (
                            <div key={scoreField} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                              <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{label} Score</p>
                              <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: val != null ? '#111827' : '#9CA3AF' }}>{val != null ? val : 'N/A'}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ TAB 2: Attendance ════════════════════════════════════════ */}
                {activeTab === 'attendance' && (() => {
                  const s1 = isEditing ? editData.sem1_attendance : student.sem1_attendance;
                  const s2 = isEditing ? editData.sem2_attendance : student.sem2_attendance;
                  const yearly = (s1 != null && String(s1) !== '' && s2 != null && String(s2) !== '')
                    ? (Number(s1) + Number(s2)) / 2
                    : (s1 != null && String(s1) !== '' ? Number(s1) : s2 != null && String(s2) !== '' ? Number(s2) : null);
                  const attColor = (pct: number | null) => {
                    if (pct == null) return '#6B7280';
                    if (pct >= 75) return '#16A34A';
                    if (pct >= 60) return '#D97706';
                    return '#DC2626';
                  };
                  const fmtPct = (v: number | null) =>
                    v != null ? `${Number(v).toFixed(1)}%` : 'Not recorded';

                  return (
                    <div id="sd-panel-attendance">
                      <style>{`
                        @media (max-width: 767px) {
                          .att-summary-card { flex-direction: column !important; justify-content: center !important; text-align: center !important; }
                          .att-summary-header { justify-content: center !important; }
                          .att-summary-stats { justify-content: center !important; }
                          .att-summary-chart { margin: 0 auto !important; }
                        }
                      `}</style>
                      {/* Semester table */}
                      <div style={{
                        border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', marginBottom: 20,
                      }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#F9FAFB' }}>
                              <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid #E5E7EB' }}>Semester</th>
                              <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid #E5E7EB' }}>Attendance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {([
                              { sem: 'Semester 1', val: s1, key: 'sem1_attendance' as const },
                              { sem: 'Semester 2', val: s2, key: 'sem2_attendance' as const },
                            ]).map(({ sem, val, key }) => (
                              <tr key={sem} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '13px 16px', fontSize: 14, color: '#111827' }}>{sem}</td>
                                <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 600, color: attColor(val != null && String(val) !== '' ? Number(val) : null) }}>
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min="0" max="100" step="0.1"
                                      value={val ?? ''}
                                      onChange={e => setEditData({ ...editData, [key]: e.target.value ? Number(e.target.value) : null })}
                                      style={{ width: 100, padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', color: '#111827' }}
                                    />
                                  ) : (
                                    fmtPct(val != null ? Number(val) : null)
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Yearly Attendance card */}
                      <div style={{
                        background: '#F9FAFB', border: '1px solid #E5E7EB',
                        borderRadius: 8, padding: '20px 24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap' as const, gap: 12,
                      }}>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                            Yearly Attendance
                          </p>
                          <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                            {s1 != null && s2 != null ? 'Average of Sem 1 & Sem 2' : 'Based on available semesters'}
                          </p>
                        </div>
                        <p style={{
                          fontSize: 32, fontWeight: 700, margin: 0,
                          color: attColor(yearly),
                        }}>
                          {yearly != null ? `${yearly.toFixed(1)}%` : 'Not recorded'}
                        </p>
                      </div>

                      {/* Daily Attendance Summary */}
                      {(() => {
                        const records = student.attendance_records || [];
                        
                        // Group records by unique date (YYYY-MM-DD)
                        const daysMap: Record<string, { present: number; absent: number }> = {};
                        records.forEach(r => {
                          if (!r.date) return;
                          const d = String(r.date).slice(0, 10);
                          if (!daysMap[d]) daysMap[d] = { present: 0, absent: 0 };
                          if (r.status === 'Present') daysMap[d].present++;
                          else daysMap[d].absent++;
                        });

                        const total = Object.keys(daysMap).length;
                        let present = 0;
                        let absent = 0;
                        
                        Object.values(daysMap).forEach(day => {
                          // If present for at least one period, mark the whole day as Present
                          if (day.present > 0) present++;
                          else absent++;
                        });
                        
                        const pct = total > 0 ? (present / total) * 100 : 0;
                        
                        const data = [
                          { name: 'Present', value: present },
                          { name: 'Absent', value: absent },
                        ];
                        // If no records, show an empty grey pie piece
                        const renderData = total > 0 ? data : [{ name: 'No Data', value: 1 }];
                        const COLORS = total > 0 ? ['#16A34A', '#DC2626'] : ['#E5E7EB'];

                        return (
                          <div className="att-summary-card" style={{
                            background: '#F9FAFB', border: '1px solid #E5E7EB',
                            borderRadius: 8, padding: '24px', marginTop: 20,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexWrap: 'wrap', gap: 24,
                          }}>
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <p className="att-summary-header" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                                <CalendarCheck size={14} color="#6B7280" />
                                Daily Attendance Summary
                              </p>
                              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 16px 0' }}>
                                Based on {total} recorded days
                              </p>
                              <div className="att-summary-stats" style={{ display: 'flex', gap: 20 }}>
                                <div>
                                  <span style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{present}</span>
                                  <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 4 }}>Present</span>
                                </div>
                                <div>
                                  <span style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{absent}</span>
                                  <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 4 }}>Absent</span>
                                </div>
                              </div>
                            </div>
                            <div className="att-summary-chart" style={{ width: 140, height: 140, position: 'relative', flexShrink: 0, cursor: 'pointer' }} onClick={() => { setHistoryStudentId(student.id); setHistoryStudentName(student.full_name); setHistoryMonthFilter('all'); setIsHistoryOpen(true); }} title="Click to view attendance calendar">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={renderData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={65}
                                    dataKey="value"
                                    stroke="none"
                                  >
                                    {renderData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#111827', fontWeight: 600, fontSize: 12 }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              <div style={{
                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, fontWeight: 700, color: total > 0 ? attColor(pct) : '#9CA3AF', pointerEvents: 'none'
                              }}>
                                {total > 0 ? `${pct.toFixed(0)}%` : 'N/A'}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* View History link */}
                      <button
                        onClick={() => { setHistoryStudentId(student.id); setHistoryStudentName(student.full_name); setIsHistoryOpen(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '9px 16px', background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
                      >
                        <CalendarCheck size={15} /> View Attendance History <ChevronRight size={14} />
                      </button>
                    </div>
                  );
                })()}

                {/* ═══ TAB 3: Financials & Contact ══════════════════════════════ */}
                {activeTab === 'financials' && (() => {
                  const currStudent = isEditing ? (editData as Student) : student;
                  const feesStyle: Record<string, { bg: string; color: string }> = {
                    Paid: { bg: '#DCFCE7', color: '#16A34A' },
                    Unpaid: { bg: '#FEE2E2', color: '#DC2626' },
                    Partial: { bg: '#FEF3C7', color: '#D97706' },
                  };
                  const scholarshipStyle: Record<string, { bg: string; color: string }> = {
                    Availed: { bg: '#DBEAFE', color: '#2563EB' },
                    'Not Availed': { bg: '#F3F4F6', color: '#6B7280' },
                  };
                  const hostelStyle: Record<string, { bg: string; color: string }> = {
                    Hosteller: { bg: '#F3E8FF', color: '#7C3AED' },
                    'Day Scholar': { bg: '#F3F4F6', color: '#6B7280' },
                  };

                  const fs = feesStyle[currStudent.fees_status] ?? { bg: '#F3F4F6', color: '#6B7280' };
                  const ss = scholarshipStyle[currStudent.scholarship_status] ?? { bg: '#F3F4F6', color: '#6B7280' };
                  const hs = hostelStyle[currStudent.hostel_status] ?? { bg: '#F3F4F6', color: '#6B7280' };

                  return (
                    <div id="sd-panel-financials">
                      <style>{`
                        @media (max-width: 767px) { #sd-fin-boxes { flex-direction: column !important; } }
                        .sd-input { width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px; font-family: inherit; color: #111827; }
                        .sd-input:focus { outline: 2px solid #4F46E5; border-color: transparent; }
                      `}</style>

                      {/* Financial Summary */}
                      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
                        Financial Summary
                      </h2>

                      <div id="sd-fin-boxes" style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        {/* Fees Status */}
                        <div style={{ flex: 1, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Fees Status</p>
                          {isEditing ? (
                            <select className="sd-input" value={currStudent.fees_status || ''} onChange={e => setEditData({ ...editData, fees_status: e.target.value as any })}>
                              <option value="Paid">Paid</option>
                              <option value="Unpaid">Unpaid</option>
                              <option value="Partial">Partial</option>
                            </select>
                          ) : (
                            <span style={{ background: fs.bg, color: fs.color, fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 9999 }}>
                              {currStudent.fees_status}
                            </span>
                          )}
                        </div>
                        {/* Scholarship Status */}
                        <div style={{ flex: 1, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Scholarship Status</p>
                          {isEditing ? (
                            <select className="sd-input" value={currStudent.scholarship_status || ''} onChange={e => setEditData({ ...editData, scholarship_status: e.target.value })}>
                              <option value="Availed">Availed</option>
                              <option value="Not Availed">Not Availed</option>
                            </select>
                          ) : (
                            <span style={{ background: ss.bg, color: ss.color, fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 9999 }}>
                              {currStudent.scholarship_status}
                            </span>
                          )}
                        </div>
                        {/* Hostel Status */}
                        <div style={{ flex: 1, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Hostel Status</p>
                          {isEditing ? (
                            <select className="sd-input" value={currStudent.hostel_status || ''} onChange={e => setEditData({ ...editData, hostel_status: e.target.value })}>
                              <option value="Hosteller">Hosteller</option>
                              <option value="Day Scholar">Day Scholar</option>
                            </select>
                          ) : (
                            <span style={{ background: hs.bg, color: hs.color, fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 9999 }}>
                              {currStudent.hostel_status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Hostel Fees — only when Hosteller */}
                      {currStudent.hostel_status === 'Hosteller' && (
                        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Hostel Fees</p>
                          {isEditing ? (
                            <input type="number" className="sd-input" value={currStudent.hostel_fees ?? ''} onChange={e => setEditData({ ...editData, hostel_fees: e.target.value ? Number(e.target.value) : undefined })} />
                          ) : (
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
                              ₹{Number(currStudent.hostel_fees ?? 0).toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Dynamic Fees Management */}
                      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '20px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Receipt size={18} strokeWidth={2} color="#4F46E5" />
                        Dynamic Fees Management
                      </h2>
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                        {student.student_fees && student.student_fees.length > 0 ? (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>
                                <th style={{ textAlign: 'left', padding: '8px 0' }}>Term</th>
                                <th style={{ textAlign: 'left', padding: '8px 0' }}>Total Amount</th>
                                <th style={{ textAlign: 'left', padding: '8px 0' }}>Paid Amount</th>
                                <th style={{ textAlign: 'left', padding: '8px 0' }}>Due Date</th>
                                <th style={{ textAlign: 'left', padding: '8px 0' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {student.student_fees.map((fee: any) => (
                                <tr key={fee.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                  <td style={{ padding: '8px 0', fontWeight: 500, color: '#111827' }}>{fee.fee_term}</td>
                                  <td style={{ padding: '8px 0' }}>₹{fee.total_amount?.toLocaleString('en-IN') ?? '0'}</td>
                                  <td style={{ padding: '8px 0' }}>₹{fee.paid_amount?.toLocaleString('en-IN') ?? '0'}</td>
                                  <td style={{ padding: '8px 0' }}>{fee.due_date ? new Date(fee.due_date).toLocaleDateString() : 'N/A'}</td>
                                  <td style={{ padding: '8px 0' }}>
                                    <span style={{ 
                                      background: fee.status === 'Paid' ? '#DCFCE7' : fee.status === 'Overdue' ? '#FEE2E2' : '#FEF3C7',
                                      color: fee.status === 'Paid' ? '#16A34A' : fee.status === 'Overdue' ? '#DC2626' : '#D97706',
                                      padding: '2px 8px', borderRadius: 9999, fontWeight: 600, fontSize: 11
                                    }}>
                                      {fee.status || 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>No fee records available.</p>
                        )}
                      </div>

                      {/* Contact Details */}
                      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '20px 0 12px' }}>
                        Contact Details
                      </h2>

                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                        {([
                          { label: "Student's Mobile", value: currStudent.student_mobile, isTel: true, key: 'student_mobile' },
                          { label: "Father's Mobile", value: currStudent.father_mobile, isTel: true, key: 'father_mobile' },
                          { label: "Mother's Mobile", value: currStudent.mother_mobile, isTel: true, key: 'mother_mobile' },
                          { label: 'Address', value: currStudent.address, isTel: false, key: 'address' },
                        ] as { label: string; value: string | null; isTel: boolean; key: keyof Student }[]).map(({ label, value, isTel, key }) => (
                          <div
                            key={label}
                            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12 }}
                          >
                            <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                              {label}
                            </p>
                            {isEditing ? (
                              isTel ? (
                                <input type="tel" className="sd-input" value={value || ''} onChange={e => setEditData({ ...editData, [key]: e.target.value })} />
                              ) : (
                                <textarea className="sd-input" value={value || ''} onChange={e => setEditData({ ...editData, [key]: e.target.value })} rows={3} />
                              )
                            ) : (
                              (value != null && value !== '') ? (
                                isTel ? (
                                  <a
                                    href={`tel:${value}`}
                                    style={{ fontSize: 14, fontWeight: 700, color: '#4F46E5', textDecoration: 'none' }}
                                  >
                                    {value}
                                  </a>
                                ) : (
                                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{value}</p>
                                )
                              ) : (
                                <p style={{ fontSize: 14, fontWeight: 700, color: '#9CA3AF', margin: 0 }}>Not provided</p>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* Withdraw Button */}
            {student.status === 'Active' && !isEditing && (
              <div style={{ marginTop: 32, textAlign: 'right' as const }}>
                <button
                  onClick={() => setShowWithdrawConfirm(true)}
                  style={{
                    background: 'transparent', color: '#DC2626',
                    border: '1px solid #DC2626', borderRadius: 8,
                    padding: '10px 20px', fontSize: 14,
                    fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  Mark as Withdrawn
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Bottom Nav (mobile only) ─────────────────────────────────────────── */}
      <nav
        id="cf-bottom-nav"
        aria-label="Mobile navigation"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: 64, background: '#1E1E2E',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'none', alignItems: 'center',
          justifyContent: 'center', gap: 32, zIndex: 30,
        }}
      >
        {(profile?.role === 'hod' ? [
          { Icon: LayoutGrid,    label: 'Home',     path: '/hod/dashboard' },
          { Icon: Users,         label: 'Students', path: '/students' },
          { Icon: UserCheck, label: 'Attendance', path: '/class-attendance' },
          { Icon: User,          label: 'Profile',  path: '/profile' },
        ] : [
          { Icon: LayoutGrid, label: 'Home',     path: '/dashboard' },
          { Icon: Users,      label: 'Students', path: '/students' },
          { Icon: UserCheck, label: 'Attendance', path: '/class-attendance' },
          { Icon: User,       label: 'Profile',  path: '/profile' },
        ]).map(({ Icon, label, path }) => {
          const isHodNav = profile?.role === 'hod';
          return (
            <button
              key={path}
              onClick={() => navTo(path)}
              aria-label={label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isHodNav ? 2 : 3,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#A0A0B0', minWidth: isHodNav ? 44 : 60, minHeight: 44, padding: isHodNav ? '4px 0' : '6px 0',
              }}
            >
              <Icon size={isHodNav ? 18 : 20} strokeWidth={1.75} />
              <span style={{ fontSize: isHodNav ? 9 : 10 }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Global Elements ─────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          background: toast.type === 'success' ? '#16A34A' : '#DC2626',
          color: '#FFFFFF', padding: '12px 24px', borderRadius: 8,
          fontSize: 14, fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          {toast.message}
        </div>
      )}

      {showWithdrawConfirm && (
        <ConfirmDialog
          isOpen={showWithdrawConfirm}
          title="Withdraw Student?"
          message="This student will be hidden from the active list. This action can be reversed by editing their status."
          onConfirm={handleWithdraw}
          onCancel={() => setShowWithdrawConfirm(false)}
        />
      )}
      {/* ── Attendance Calendar Modal ──────────────────────────────────────── */}
      {isHistoryOpen && (() => {
        type DayInfo = { present: number; absent: number; periods: { label: string; status: string }[] };
        const dayMap: Record<string, DayInfo> = {};
        historyData.forEach((r: any) => {
          const dateStr = String(r.date).slice(0, 10);
          if (!dayMap[dateStr]) dayMap[dateStr] = { present: 0, absent: 0, periods: [] };
          if (r.status === 'Present') dayMap[dateStr].present++;
          else dayMap[dateStr].absent++;
          dayMap[dateStr].periods.push({ label: r.periodLabel || r.period_id || '', status: r.status });
        });

        const allDates = Object.keys(dayMap).sort();
        const availableMonths = Array.from(new Set(allDates.map(d => d.slice(0, 7)))).sort();
        const defaultMonth = availableMonths[availableMonths.length - 1] || new Date().toISOString().slice(0, 7);
        const shownMonth = (historyMonthFilter === 'all' || !historyMonthFilter) ? defaultMonth : historyMonthFilter;
        const [shownYear, shownMonthNum] = shownMonth.split('-').map(Number);

        const prevMonth = () => {
          const d = new Date(shownYear, shownMonthNum - 2, 1);
          setHistoryMonthFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        };
        const nextMonth = () => {
          const d = new Date(shownYear, shownMonthNum, 1);
          setHistoryMonthFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        };

        const monthLabel = new Date(shownYear, shownMonthNum - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        const firstDay = new Date(shownYear, shownMonthNum - 1, 1).getDay();
        const daysInMonth = new Date(shownYear, shownMonthNum, 0).getDate();

        const monthDays = Object.entries(dayMap).filter(([d]) => d.startsWith(shownMonth));
        const monthPresent = monthDays.reduce((s, [, v]) => s + v.present, 0);
        const monthAbsent = monthDays.reduce((s, [, v]) => s + v.absent, 0);
        const monthTotal = monthPresent + monthAbsent;
        const monthPct = monthTotal > 0 ? Math.round((monthPresent / monthTotal) * 100) : null;

        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => { setIsHistoryOpen(false); setHistoryMonthFilter('all'); }}
          >
            <div
              style={{ background: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 40px -8px rgba(0,0,0,0.18)', overflow: 'hidden', fontFamily: 'inherit' }}
              onClick={e => e.stopPropagation()}
            >
              {/* ── Header ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4F46E5', marginBottom: 2 }}>Attendance Calendar</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{historyStudentName}</div>
                </div>
                <button
                  onClick={() => { setIsHistoryOpen(false); setHistoryMonthFilter('all'); }}
                  style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#374151', borderRadius: 8, padding: '7px 9px', display: 'flex', alignItems: 'center' }}
                >
                  <X size={17} />
                </button>
              </div>

              {/* ── Month navigator + summary ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px 0' }}>
                <button onClick={prevMonth} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#111827', borderRadius: 8, padding: '6px 13px', fontSize: 16, fontWeight: 700, lineHeight: 1 }}>‹</button>
                <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#111827' }}>{monthLabel}</div>
                <button onClick={nextMonth} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#111827', borderRadius: 8, padding: '6px 13px', fontSize: 16, fontWeight: 700, lineHeight: 1 }}>›</button>
              </div>

              {/* ── Calendar grid ── */}
              <div style={{ padding: '16px 20px 20px' }}>
                {historyLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>Loading...</div>
                ) : (
                  <>
                    {/* Day-of-week headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
                      {dayNames.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9CA3AF', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
                      ))}
                    </div>
                    {/* Day cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {Array.from({ length: firstDay }).map((_, i) => <div key={`blank-${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${shownYear}-${String(shownMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const info = dayMap[dateStr];
                        const isPresent = info && info.present > 0 && info.absent === 0;
                        const isAbsent = info && info.absent > 0 && info.present === 0;
                        const isMixed = info && info.present > 0 && info.absent > 0;
                        const isToday = dateStr === new Date().toISOString().slice(0, 10);

                        let bg = '#F9FAFB';
                        let textColor = '#374151';
                        let border = '1px solid #E5E7EB';
                        if (isPresent) { bg = '#DCFCE7'; textColor = '#15803D'; border = '1px solid #86EFAC'; }
                        if (isAbsent) { bg = '#FEE2E2'; textColor = '#B91C1C'; border = '1px solid #FCA5A5'; }
                        if (isMixed) { bg = '#FEF3C7'; textColor = '#92400E'; border = '1px solid #FCD34D'; }
                        if (isToday && !info) { border = '2px solid #4F46E5'; textColor = '#4F46E5'; }
                        if (isToday && info) { border = '2px solid #4F46E5'; }

                        return (
                          <div
                            key={day}
                            title={info ? info.periods.map(p => `${p.label}: ${p.status}`).join('\n') : ''}
                            style={{
                              background: bg,
                              color: textColor,
                              border,
                              borderRadius: 8,
                              padding: '7px 2px 6px',
                              textAlign: 'center',
                              cursor: info ? 'default' : 'default',
                              minHeight: 46,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              gap: 3,
                            }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{day}</span>
                            {info && (
                              <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1 }}>
                                {isPresent ? 'P' : isAbsent ? 'A' : `${info.present}P/${info.absent}A`}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#374151' }}>
                        <div style={{ width: 13, height: 13, borderRadius: 3, background: '#DCFCE7', border: '1px solid #86EFAC' }} />
                        Present
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#374151' }}>
                        <div style={{ width: 13, height: 13, borderRadius: 3, background: '#FEE2E2', border: '1px solid #FCA5A5' }} />
                        Absent
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#374151' }}>
                        <div style={{ width: 13, height: 13, borderRadius: 3, background: '#FEF3C7', border: '1px solid #FCD34D' }} />
                        Partial
                      </div>
                    </div>

                    {monthTotal === 0 && !historyLoading && (
                      <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 16 }}>No attendance records for this month.</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
