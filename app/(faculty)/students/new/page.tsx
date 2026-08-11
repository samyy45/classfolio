'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CATEGORY_OPTIONS, BRANCH_OPTIONS } from '@/lib/constants';
import { getCachedProfile, setCachedProfile, clearCachedProfile, UserProfile } from '@/lib/profileCache';
import { LayoutGrid, GraduationCap, Users, UserCheck, Upload, User, LogOut } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

// The UserProfile interface is now imported from '@/lib/profileCache'

interface Division { id: number; name: string; }

interface StudentFormData {
  full_name: string;
  gender: string;
  category: string;
  branch: string;
  prn_number: string;
  apaar_id: string;
  division_id: string;
  roll_number: string;
  student_mobile: string;
  father_mobile: string;
  mother_mobile: string;
  address: string;
  fees_status: string;
  scholarship_status: string;
  hostel_status: string;
  hostel_fees: string;
  sem1_attendance: string;
  sem2_attendance: string;
  sgpa_sem1: string;
  sgpa_sem2: string;
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
          const isActive = pathname.startsWith(path);
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AddStudentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divLoading, setDivLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState<StudentFormData>({
    full_name: '', gender: '', category: '', branch: '', prn_number: '', apaar_id: '',
    division_id: '', roll_number: '', student_mobile: '', father_mobile: '', mother_mobile: '',
    address: '', fees_status: 'Unpaid', scholarship_status: 'Not Availed',
    hostel_status: 'Day Scholar', hostel_fees: '0',
    sem1_attendance: '', sem2_attendance: '', sgpa_sem1: '', sgpa_sem2: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof StudentFormData, string>>>({});

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

  // ── Fetch divisions ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/divisions')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDivisions(data);
        else if (data.data && Array.isArray(data.data)) setDivisions(data.data);
      })
      .catch(() => { })
      .finally(() => setDivLoading(false));
  }, []);

  // ── Toast timeout ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const ms = toast.type === 'success' ? 3000 : 5000;
    const timer = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(timer);
  }, [toast]);

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

  const handleChange = (field: keyof StudentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleAdd = async () => {
    if (divLoading) return;

    // Client-side validation
    const newErrors: Partial<Record<keyof StudentFormData, string>> = {};
    if (!formData.full_name.trim()) newErrors.full_name = 'Required';
    if (!formData.gender) newErrors.gender = 'Required';
    if (!formData.category) newErrors.category = 'Required';
    if (!formData.branch) newErrors.branch = 'Required';
    if (!formData.prn_number.trim()) newErrors.prn_number = 'Required';
    if (!formData.division_id) newErrors.division_id = 'Required';

    if (!formData.roll_number) {
      newErrors.roll_number = 'Required';
    } else {
      const rn = Number(formData.roll_number);
      if (!Number.isInteger(rn) || rn <= 0) newErrors.roll_number = 'Must be positive integer';
    }

    const cleanPhone = (p: string) => p.replace(/\\D/g, '').slice(-10);

    if (!formData.student_mobile) {
      newErrors.student_mobile = 'Required';
    } else if (cleanPhone(formData.student_mobile).length < 10) {
      newErrors.student_mobile = 'Invalid 10-digit number';
    }
    if (!formData.father_mobile) {
      newErrors.father_mobile = 'Required';
    } else if (cleanPhone(formData.father_mobile).length < 10) {
      newErrors.father_mobile = 'Invalid 10-digit number';
    }
    if (!formData.mother_mobile) {
      newErrors.mother_mobile = 'Required';
    } else if (cleanPhone(formData.mother_mobile).length < 10) {
      newErrors.mother_mobile = 'Invalid 10-digit number';
    }

    if (formData.sem1_attendance) {
      const s1 = Number(formData.sem1_attendance);
      if (s1 < 0 || s1 > 100) newErrors.sem1_attendance = 'Must be 0-100';
    }
    if (formData.sem2_attendance) {
      const s2 = Number(formData.sem2_attendance);
      if (s2 < 0 || s2 > 100) newErrors.sem2_attendance = 'Must be 0-100';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    setServerError(null);

    const payload = {
      ...formData,
      division_id: Number(formData.division_id),
      roll_number: Number(formData.roll_number),
      hostel_fees: formData.hostel_status === 'Hosteller' ? Number(formData.hostel_fees || 0) : 0,
      sem1_attendance: formData.sem1_attendance ? Number(formData.sem1_attendance) : null,
      sem2_attendance: formData.sem2_attendance ? Number(formData.sem2_attendance) : null,
      sgpa_sem1: formData.sgpa_sem1.trim() || null,
      sgpa_sem2: formData.sgpa_sem2.trim() || null,
      status: 'Active',
    };

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setServerError(data.error || 'Failed to add student');
      } else {
        setToast({ type: 'success', message: 'Student added successfully' });
        setTimeout(() => router.push('/students'), 700); // slight delay to show toast
      }
    } catch (err: any) {
      setServerError(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const noDivisions = !divLoading && divisions.length === 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8F9FA',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid #4F46E5; outline-offset: 2px; border-color: transparent; }
        .sd-input { width: 100%; padding: 8px 12px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px; font-family: inherit; }
        .sd-input:focus { border-color: #4F46E5; box-shadow: 0 0 0 1px #4F46E5; outline: none; }
        @media (max-width: 767px) {
          #cf-sidebar    { display: none !important; }
          #cf-bottom-nav { display: flex !important; }
          #sd-main       { margin-left: 0 !important; padding-bottom: 70px !important; }
          #sd-content    { padding: 16px !important; }
          .form-grid     { grid-template-columns: 1fr !important; }
          .header-actions { width: 100%; margin-top: 16px; }
          .header-actions button { width: 100%; }
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
        style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'auto' }}
      >
        <div id="sd-content" style={{ padding: 32, maxWidth: 1000, margin: '0 auto', width: '100%' }}>

          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Add Student</h1>
              <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>Enter details to create a new student record.</p>
            </div>

            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => router.push('/students')}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#4F46E5', fontSize: 14, fontWeight: 600, padding: '10px 16px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || noDivisions}
                style={{
                  background: '#4F46E5', color: '#FFFFFF',
                  border: 'none', borderRadius: 8,
                  padding: '10px 24px', fontSize: 14,
                  fontWeight: 600, cursor: (saving || noDivisions) ? 'not-allowed' : 'pointer', minHeight: 40,
                  opacity: (saving || noDivisions) ? 0.7 : 1, transition: 'background 0.15s',
                }}
              >
                {saving ? 'Adding…' : 'Add Student'}
              </button>
            </div>
          </div>

          {serverError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #F87171', color: '#B91C1C', padding: '12px 16px', borderRadius: 8, marginBottom: 24, fontSize: 14, fontWeight: 500 }}>
              {serverError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ═══ SECTION 1: Academic & Identity ═══════════════════════════════ */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 16px', borderBottom: '1px solid #F3F4F6', paddingBottom: 12 }}>Academic & Identity</h2>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Full Name */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Full Name *</label>
                  <input style={{ color: '#111827' }} className="sd-input" value={formData.full_name} onChange={e => handleChange('full_name', e.target.value)} placeholder="e.g. John Doe" />
                  {errors.full_name && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.full_name}</span>}
                </div>

                {/* Branch */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Branch *</label>
                  <select style={{ color: '#111827' }} className="sd-input" value={formData.branch} onChange={e => handleChange('branch', e.target.value)}>
                    <option value="">Select</option>
                    {BRANCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  {errors.branch && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.branch}</span>}
                </div>

                {/* Division */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Division *</label>
                  <select style={{ color: '#111827' }} className="sd-input" value={formData.division_id} onChange={e => handleChange('division_id', e.target.value)} disabled={noDivisions}>
                    <option value="">{noDivisions ? 'No divisions found. Ask HOD to add one.' : 'Select Division'}</option>
                    {divisions.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {errors.division_id && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.division_id}</span>}
                </div>

                {/* Roll Number */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Roll Number *</label>
                  <input type="number" style={{ color: '#111827' }} className="sd-input" value={formData.roll_number} onChange={e => handleChange('roll_number', e.target.value)} placeholder="e.g. 101" />
                  {errors.roll_number && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.roll_number}</span>}
                </div>

                {/* PRN Number */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>PRN Number *</label>
                  <input style={{ color: '#111827' }} className="sd-input" value={formData.prn_number} onChange={e => handleChange('prn_number', e.target.value)} placeholder="e.g. 20240001" />
                  {errors.prn_number && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.prn_number}</span>}
                </div>

                {/* APAAR ID */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>APAAR ID</label>
                  <input style={{ color: '#111827' }} className="sd-input" value={formData.apaar_id} onChange={e => handleChange('apaar_id', e.target.value)} placeholder="Optional" />
                </div>

                {/* Category */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Category *</label>
                  <select style={{ color: '#111827' }} className="sd-input" value={formData.category} onChange={e => handleChange('category', e.target.value)}>
                    <option value="">Select</option>
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.category}</span>}
                </div>

                {/* Gender */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Gender *</label>
                  <select style={{ color: '#111827' }} className="sd-input" value={formData.gender} onChange={e => handleChange('gender', e.target.value)}>
                    <option value="">Select</option>
                    <option value="Boy">Boy</option>
                    <option value="Girl">Girl</option>
                  </select>
                  {errors.gender && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.gender}</span>}
                </div>

                {/* SGPA Sem 1 */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>SGPA Sem 1</label>
                  <input style={{ color: '#111827' }} className="sd-input" value={formData.sgpa_sem1} onChange={e => handleChange('sgpa_sem1', e.target.value)} placeholder="Optional, e.g. 8.5" />
                </div>

                {/* SGPA Sem 2 */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>SGPA Sem 2</label>
                  <input style={{ color: '#111827' }} className="sd-input" value={formData.sgpa_sem2} onChange={e => handleChange('sgpa_sem2', e.target.value)} placeholder="Optional, e.g. 8.5" />
                </div>
              </div>
            </div>

            {/* ═══ SECTION 2: Attendance ════════════════════════════════════════ */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 16px', borderBottom: '1px solid #F3F4F6', paddingBottom: 12 }}>Attendance</h2>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Semester 1 Attendance (%)</label>
                  <input type="number" min="0" max="100" step="0.1" style={{ color: '#111827' }} className="sd-input" value={formData.sem1_attendance} onChange={e => handleChange('sem1_attendance', e.target.value)} placeholder="e.g. 85.5" />
                  {errors.sem1_attendance && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.sem1_attendance}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Semester 2 Attendance (%)</label>
                  <input type="number" min="0" max="100" step="0.1" style={{ color: '#111827' }} className="sd-input" value={formData.sem2_attendance} onChange={e => handleChange('sem2_attendance', e.target.value)} placeholder="e.g. 90.0" />
                  {errors.sem2_attendance && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.sem2_attendance}</span>}
                </div>
              </div>
            </div>

            {/* ═══ SECTION 3: Financials & Contact ══════════════════════════════ */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 16px', borderBottom: '1px solid #F3F4F6', paddingBottom: 12 }}>Financials & Contact</h2>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* Fees Status */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Fees Status</label>
                  <select style={{ color: '#111827' }} className="sd-input" value={formData.fees_status} onChange={e => handleChange('fees_status', e.target.value)}>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>

                {/* Scholarship Status */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Scholarship Status</label>
                  <select style={{ color: '#111827' }} className="sd-input" value={formData.scholarship_status} onChange={e => handleChange('scholarship_status', e.target.value)}>
                    <option value="Availed">Availed</option>
                    <option value="Not Availed">Not Availed</option>
                  </select>
                </div>

                {/* Hostel Status */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Hostel Status</label>
                  <select style={{ color: '#111827' }} className="sd-input" value={formData.hostel_status} onChange={e => handleChange('hostel_status', e.target.value)}>
                    <option value="Hosteller">Hosteller</option>
                    <option value="Day Scholar">Day Scholar</option>
                  </select>
                </div>

                {/* Hostel Fees */}
                {formData.hostel_status === 'Hosteller' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Hostel Fees</label>
                    <input type="number" style={{ color: '#111827' }} className="sd-input" value={formData.hostel_fees} onChange={e => handleChange('hostel_fees', e.target.value)} />
                  </div>
                )}

                {/* Spacer if Hostel Status is Day Scholar to keep alignment */}
                {formData.hostel_status === 'Day Scholar' && <div />}

                {/* Student Mobile */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Student's Mobile *</label>
                  <input type="tel" style={{ color: '#111827' }} className="sd-input" value={formData.student_mobile} onChange={e => handleChange('student_mobile', e.target.value)} placeholder="10-digit number" />
                  {errors.student_mobile && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.student_mobile}</span>}
                </div>

                {/* Father Mobile */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Father's Mobile *</label>
                  <input type="tel" style={{ color: '#111827' }} className="sd-input" value={formData.father_mobile} onChange={e => handleChange('father_mobile', e.target.value)} placeholder="10-digit number" />
                  {errors.father_mobile && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.father_mobile}</span>}
                </div>

                {/* Mother Mobile */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Mother's Mobile *</label>
                  <input type="tel" style={{ color: '#111827' }} className="sd-input" value={formData.mother_mobile} onChange={e => handleChange('mother_mobile', e.target.value)} placeholder="10-digit number" />
                  {errors.mother_mobile && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{errors.mother_mobile}</span>}
                </div>

                {/* Address */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Address</label>
                  <textarea style={{ color: '#111827' }} className="sd-input" rows={3} value={formData.address} onChange={e => handleChange('address', e.target.value)} placeholder="Optional" />
                </div>

              </div>
            </div>

          </div>

          <div className="header-actions" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              onClick={() => router.push('/students')}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#4F46E5', fontSize: 14, fontWeight: 600, padding: '10px 16px',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || noDivisions}
              style={{
                background: '#4F46E5', color: '#FFFFFF',
                border: 'none', borderRadius: 8,
                padding: '10px 32px', fontSize: 14,
                fontWeight: 600, cursor: (saving || noDivisions) ? 'not-allowed' : 'pointer', minHeight: 44,
                opacity: (saving || noDivisions) ? 0.7 : 1, transition: 'background 0.15s',
              }}
            >
              {saving ? 'Adding…' : 'Add Student'}
            </button>
          </div>

        </div>
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
          const isActive = pathname.startsWith(path);
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
              <span style={{ display: 'flex', alignItems: 'center' }}><Icon size={isHodNav ? 18 : 20} strokeWidth={1.75} /></span>
              <span style={{ fontSize: isHodNav ? 9 : 10, fontWeight: isActive ? 600 : 400, color: isActive ? '#818CF8' : '#A0A0B0' }}>
                {label}
              </span>
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
    </div>
  );
}
