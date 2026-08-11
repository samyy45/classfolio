'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { getCachedProfile, setCachedProfile, clearCachedProfile, UserProfile } from '@/lib/profileCache';
import { LayoutGrid, GraduationCap, Users, UserCheck, Upload, User, LogOut } from 'lucide-react';
import UploadModal from '@/components/UploadModal';

// ─── Types ────────────────────────────────────────────────────────────────────

// The UserProfile interface is now imported from '@/lib/profileCache'
interface Division { id: number; name: string; }
interface StudentRow {
  id: number;
  full_name: string;
  gender?: string;
  category?: string;
  branch?: string;
  prn_number: string;
  apaar_id?: string;
  roll_number: number;
  student_mobile?: string;
  father_mobile?: string;
  mother_mobile?: string;
  address?: string;
  division_id: number;
  fees_status: 'Paid' | 'Unpaid' | 'Partial';
  scholarship_status?: string;
  hostel_status?: string;
  hostel_fees?: number;
  sem1_attendance: number | null;
  sem2_attendance: number | null;
  sgpa_sem1?: string | null;
  sgpa_sem2?: string | null;
  status: string;
  division: { name: string };
}

// ─── Fees badge ───────────────────────────────────────────────────────────────

const FEES_STYLE: Record<string, { bg: string; color: string }> = {
  Paid: { bg: '#DCFCE7', color: '#16A34A' },
  Unpaid: { bg: '#FEE2E2', color: '#DC2626' },
  Partial: { bg: '#FEF3C7', color: '#D97706' },
};

function FeesBadge({ status }: { status: string }) {
  const s = FEES_STYLE[status] ?? { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 12, fontWeight: 600,
      padding: '3px 10px', borderRadius: 9999,
      whiteSpace: 'nowrap' as const,
    }}>
      {status}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Shimmer({ w, h = 14 }: { w: number; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 4,
      background: 'linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[40, 140, 90, 110, 70, 50, 50, 40].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}><Shimmer w={w} /></td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
          <Shimmer w={140} h={14} />
          <Shimmer w={90} h={11} />
        </div>
        <Shimmer w={52} h={20} />
      </div>
      <Shimmer w={110} h={11} />
      <div style={{ marginTop: 14 }}><Shimmer w={200} h={40} /></div>
    </div>
  );
}

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
      {/* App name */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: '#FFF', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>
          ClassFolio
        </span>
      </div>

      {/* Nav links */}
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

      {/* User info + Logout */}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Withdrawn'>('Active');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('upload') === 'true') {
      setIsUploadOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.type === 'success' ? 3000 : 5000;
    const timer = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(timer);
  }, [toast]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    const cached = getCachedProfile();
    if (cached) setProfile(cached);

    fetch('/api/auth/me')
      .then(r => {
        if (r.status === 401) { clearCachedProfile(); router.push('/login'); return null; }
        return r.json();
      })
      .then((d: UserProfile | null) => {
        if (d) {
          setProfile(d);
          setCachedProfile(d);
        }
      })
      .catch(() => { });
  }, [router]);

  // ── Fetch divisions (once) ────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/divisions')
      .then(r => r.json())
      .then((d: Division[]) => setDivisions(Array.isArray(d) ? d : []))
      .catch(() => { });
  }, []);

  // ── Fetch students ────────────────────────────────────────────────────────
  const fetchStudents = useCallback((q: string, div: string, st: string) => {
    setLoading(true);
    const params = new URLSearchParams({ status: st });
    if (div) params.set('division_id', div);
    if (q) params.set('search', q);

    fetch(`/api/students?${params.toString()}`)
      .then(r => r.json())
      .then((d: StudentRow[]) => setStudents(Array.isArray(d) ? d : []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch when division or status changes
  useEffect(() => {
    fetchStudents(search, divisionId, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId, statusFilter]);

  // Debounced search
  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchStudents(val, divisionId, statusFilter);
    }, 300);
  };

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

  const handleExport = () => {
    if (students.length === 0) {
      setToast({ type: 'error', message: 'No students to export' });
      return;
    }

    const exportData = students.map((s) => {
      let yearly = '';
      if (s.sem1_attendance != null && s.sem2_attendance != null) {
        yearly = ((Number(s.sem1_attendance) + Number(s.sem2_attendance)) / 2).toFixed(1);
      } else if (s.sem1_attendance != null) {
        yearly = Number(s.sem1_attendance).toFixed(1);
      } else if (s.sem2_attendance != null) {
        yearly = Number(s.sem2_attendance).toFixed(1);
      }

      return {
        'PRN Number': s.prn_number || '',
        'Full Name': s.full_name || '',
        'Gender': s.gender || '',
        'Branch': s.branch || '',
        'Division': s.division?.name || '',
        'Roll No': s.roll_number != null ? s.roll_number : '',
        'Category': s.category || '',
        'Student Mobile': s.student_mobile || '',
        'Father Mobile': s.father_mobile || '',
        'Mother Mobile': s.mother_mobile || '',
        'Address': s.address || '',
        'Fees Status': s.fees_status || '',
        'Scholarship Status': s.scholarship_status || '',
        'Hostel Status': s.hostel_status || '',
        'Hostel Fees': s.hostel_fees != null ? s.hostel_fees : '',
        'APAAR ID': s.apaar_id || '',
        'Sem1 Attendance': s.sem1_attendance != null ? Number(s.sem1_attendance).toFixed(1) : '',
        'Sem2 Attendance': s.sem2_attendance != null ? Number(s.sem2_attendance).toFixed(1) : '',
        'Yearly Attendance': yearly,
        'Sem1 SGPA': s.sgpa_sem1 || '',
        'Sem2 SGPA': s.sgpa_sem2 || '',
        'Status': s.status || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    const date = new Date().toISOString().split('T')[0];
    const divFilter = divisionId ? divisions.find(d => String(d.id) === divisionId)?.name : null;
    const filterStr = divFilter ? divFilter.replace(/\s+/g, '-') : 'All-Divisions';

    const filename = `students_${filterStr}_export_${date}.xlsx`;

    XLSX.writeFile(workbook, filename);
    setToast({ type: 'success', message: `${students.length} student${students.length !== 1 ? 's' : ''} exported` });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8F9FA',
    }}>
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        * { box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; }
        th    { text-align: left; }
        button:focus-visible, select:focus, input:focus {
          outline: 2px solid #4F46E5; outline-offset: 2px;
        }
        #sl-student-table tbody tr:hover td { background: #F9FAFB; }

        /* Responsive: sidebar + bottom nav */
        @media (max-width: 767px) {
          #cf-sidebar        { display: none !important; }
          #cf-bottom-nav     { display: flex !important; }
          #sl-main           { margin-left: 0 !important; }
          #sl-table-section  { display: none !important; }
          #sl-cards-section  { display: block !important; }
          #sl-search         { width: 100% !important; }
          #sl-filter-bar     { flex-wrap: wrap; }
        }
        @media (min-width: 768px) {
          #cf-bottom-nav    { display: none !important; }
          #sl-table-section { display: block !important; }
          #sl-cards-section { display: none !important; }
        }
      `}</style>

      {/* ── Sidebar (desktop) ── */}
      <Sidebar
        profile={profile}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
        onNav={navTo}
      />

      {/* ── Main ── */}
      <main
        id="sl-main"
        style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'auto' }}
      >
        {/* Top bar */}
        <header style={{
          background: '#FFF', borderBottom: '1px solid #E5E7EB',
          padding: '0 32px', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Students</h1>
          <span style={{
            background: '#DBEAFE', color: '#2563EB',
            fontSize: 12, fontWeight: 600,
            padding: '4px 12px', borderRadius: 9999, textTransform: 'capitalize',
          }}>
            {profile?.role ?? 'Faculty'}
          </span>
        </header>

        {/* Content */}
        <div style={{ padding: 32, flex: 1, overflow: 'auto' }}>

          {/* Search bar & Add button */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              id="sl-search"
              type="search"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name, PRN, CPRN or roll number..."
              aria-label="Search students"
              style={{
                width: 400, maxWidth: '100%',
                padding: '10px 14px', fontSize: 14,
                border: '1px solid #E5E7EB', borderRadius: 8,
                background: '#FFF', color: '#111827',
              }}
            />
            <style>{`
              .sl-action-buttons { display: flex; gap: 8px; align-items: center; }
              .sl-btn-export { order: 1; }
              .sl-btn-add { order: 2; }
              .sl-btn-upload { order: 3; }
              @media (max-width: 768px) {
                .sl-action-buttons { flex-wrap: wrap; }
                .sl-btn-export { flex: 1; min-width: 120px; }
                .sl-btn-add { flex: 1; min-width: 120px; }
                .sl-btn-upload { width: 100%; min-width: 100%; }
              }
            `}</style>
            <div className="sl-action-buttons">
              <button
                className="sl-btn-export"
                onClick={handleExport}
                style={{
                  background: '#FFFFFF', color: '#4F46E5',
                  border: '1px solid #4F46E5', borderRadius: 8,
                  padding: '10px 20px', fontSize: 14,
                  fontWeight: 600, cursor: 'pointer', minHeight: 40,
                  transition: 'background 0.15s, color 0.15s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#EEF2FF'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'}
              >
                Export to Excel
              </button>
              <button
                className="sl-btn-add"
                onClick={() => router.push('/students/new')}
                style={{
                  background: '#4F46E5', color: '#FFFFFF',
                  border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontSize: 14,
                  fontWeight: 600, cursor: 'pointer', minHeight: 40,
                  transition: 'background 0.15s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#4338CA'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5'}
              >
                + Add Student
              </button>
              <button
                className="sl-btn-upload"
                onClick={() => setIsUploadOpen(true)}
                style={{
                  background: '#FFFFFF', color: '#4F46E5',
                  border: '1px solid #4F46E5', borderRadius: 8,
                  padding: '10px 20px', fontSize: 14,
                  fontWeight: 600, cursor: 'pointer', minHeight: 40,
                  transition: 'background 0.15s, color 0.15s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#EEF2FF'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'}
              >
                Upload Students
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div
            id="sl-filter-bar"
            style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}
          >
            {/* Division dropdown */}
            <select
              value={divisionId}
              onChange={e => setDivisionId(e.target.value)}
              aria-label="Filter by division"
              style={{
                padding: '8px 12px', fontSize: 14,
                border: '1px solid #E5E7EB', borderRadius: 8,
                background: '#FFF', color: '#111827', cursor: 'pointer',
              }}
            >
              <option value="">All Divisions</option>
              {divisions.map(d => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>

            {/* Status toggle */}
            <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
              {(['Active', 'Withdrawn'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  aria-pressed={statusFilter === s}
                  style={{
                    padding: '8px 18px', fontSize: 14,
                    fontWeight: statusFilter === s ? 600 : 400,
                    border: 'none', cursor: 'pointer',
                    background: statusFilter === s ? '#4F46E5' : '#FFF',
                    color: statusFilter === s ? '#FFF' : '#6B7280',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Result count */}
            <span style={{ fontSize: 13, color: '#6B7280', marginLeft: 'auto' }}>
              {loading ? 'Loading…' : `${students.length} student${students.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* ─── Desktop Table ─── */}
          <div
            id="sl-table-section"
            style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}
          >
            <table id="sl-student-table">
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Roll No', 'Name', 'Division', 'PRN', 'Fees Status', 'Sem 1 %', 'Sem 2 %', 'Actions'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px', fontSize: 12, fontWeight: 600,
                        color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em',
                        borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '56px 16px', textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
                      No students found. Try changing your filters.
                    </td>
                  </tr>
                ) : (
                  students.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '13px 16px', fontSize: 14, color: '#111827', fontWeight: 500 }}>
                        {s.roll_number}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 14, color: '#111827' }}>
                        {s.full_name}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 14, color: '#6B7280' }}>
                        {s.division?.name ?? '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: '#9CA3AF', fontFamily: 'monospace' }}>
                        {s.prn_number}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <FeesBadge status={s.fees_status} />
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 14, color: '#6B7280' }}>
                        {s.sem1_attendance != null ? `${Number(s.sem1_attendance).toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 14, color: '#6B7280' }}>
                        {s.sem2_attendance != null ? `${Number(s.sem2_attendance).toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <button
                          onClick={() => router.push(`/students/${s.id}`)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#4F46E5', fontSize: 14, fontWeight: 600, padding: 0,
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#4338CA'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#4F46E5'}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Mobile Cards ─── */}
          <div id="sl-cards-section">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 0', color: '#6B7280', fontSize: 14 }}>
                No students found. Try changing your filters.
              </div>
            ) : (
              students.map(s => (
                <div
                  key={s.id}
                  style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, marginBottom: 12 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>{s.full_name}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6B7280' }}>
                        Roll {s.roll_number} · {s.division?.name ?? '—'}
                      </p>
                    </div>
                    <FeesBadge status={s.fees_status} />
                  </div>
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>
                    PRN: {s.prn_number}
                  </p>
                  <button
                    onClick={() => router.push(`/students/${s.id}`)}
                    style={{
                      width: '100%', padding: 10,
                      background: '#4F46E5', color: '#FFF',
                      border: 'none', borderRadius: 8,
                      fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44,
                    }}
                  >
                    View Student
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ── Bottom Nav (mobile only) ── */}
      <nav
        id="cf-bottom-nav"
        aria-label="Mobile navigation"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: 64, background: '#1E1E2E',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'none', alignItems: 'center', justifyContent: 'center', gap: 32, zIndex: 30,
        }}
      >
        {profile === null ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`mob-skeleton-${i}`}
              style={{
                width: 44, height: 44, borderRadius: 8,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
                backgroundSize: '200% 100%',
                animation: 'navShimmer 1.4s infinite',
              }}
            />
          ))
        ) : (profile?.role === 'hod' ? [
          { Icon: LayoutGrid,    label: 'Home',     path: '/hod/dashboard', active: false },
          { Icon: Users,         label: 'Students', path: '/students',      active: true  },
          { Icon: UserCheck, label: 'Attendance', path: '/class-attendance' },
          { Icon: User,          label: 'Profile',  path: '/profile',       active: false },
        ] : [
          { Icon: LayoutGrid, label: 'Home',     path: '/dashboard', active: false },
          { Icon: Users,      label: 'Students', path: '/students',  active: true  },
          { Icon: UserCheck, label: 'Attendance', path: '/class-attendance' },
          { Icon: User,       label: 'Profile',  path: '/profile',   active: false },
        ]).map(({ Icon, label, path, active }) => {
          const isHodNav = profile?.role === 'hod';
          return (
            <button
              key={path}
              onClick={() => navTo(path)}
              aria-label={label}
              aria-current={active ? ('page' as const) : undefined}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isHodNav ? 2 : 3,
                background: 'transparent', border: 'none', cursor: 'pointer',
                minWidth: isHodNav ? 44 : 60, minHeight: 44, padding: isHodNav ? '4px 0' : '6px 0',
              }}
            >
              <Icon size={isHodNav ? 18 : 20} strokeWidth={1.75} />
              <span style={{ fontSize: isHodNav ? 9 : 10, fontWeight: active ? 600 : 400, color: active ? '#818CF8' : '#A0A0B0' }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Toast */}
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

      {/* Upload Modal Overlay */}
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onSuccess={() => {
          setIsUploadOpen(false);
          fetchStudents(search, divisionId, statusFilter);
        }} 
      />
    </div>
  );
}
