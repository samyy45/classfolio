'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HODDashboardStats } from '@/types/index';
import { getCachedProfile, setCachedProfile, clearCachedProfile } from '@/lib/profileCache';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell as BarCell,
  LabelList
} from 'recharts';
import { LayoutGrid, GraduationCap, Users, UserCheck, Upload, User, LogOut, CheckCircle, AlertTriangle, Pencil, Users2, Banknote, AlertCircle } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserProfile {
  full_name: string;
  email: string;
  role: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subtext,
  subtextColor,
  Icon,
  loading
}: {
  label: string;
  value: string | number;
  subtext?: string;
  subtextColor?: string;
  Icon?: React.ElementType;
  loading?: boolean;
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px #E5E7EB',
        padding: '24px',
        flex: '1 1 0',
        minWidth: '180px',
      }}
    >
      <p
        style={{
          fontSize: '12px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#6B7280',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        {Icon && <Icon size={14} strokeWidth={2} style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} />}
        {label}
      </p>

      {loading ? (
        <div className="skeleton" style={{ height: '32px', width: '60%', borderRadius: '4px' }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <p
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {value}
          </p>
          {subtext && (
            <span style={{ fontSize: '14px', fontWeight: 600, color: subtextColor || '#6B7280' }}>
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HODDashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<HODDashboardStats | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [activePath, setActivePath] = useState('/hod/dashboard');

  const [newDivName, setNewDivName] = useState('');
  const [addingDiv, setAddingDiv] = useState(false);
  const [divError, setDivError] = useState<string | null>(null);
  const [showDivForm, setShowDivForm] = useState(false);

  const [editingDivId, setEditingDivId] = useState<number | null>(null);
  const [editDivName, setEditDivName] = useState('');
  const [editDivError, setEditDivError] = useState<string | null>(null);
  const [savingDiv, setSavingDiv] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchProfile = useCallback(() => {
    const cached = getCachedProfile();
    if (cached) setProfile(cached as any);

    fetch('/api/auth/me')
      .then((res) => {
        if (res.status === 401) {
          clearCachedProfile();
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data: UserProfile | null) => {
        if (data) {
          setProfile(data);
          setCachedProfile(data);
        }
      })
      .catch(() => { })
      .finally(() => setLoadingProfile(false));
  }, [router]);

  const fetchStats = useCallback(() => {
    setLoadingStats(true);
    setStatsError(null);
    fetch('/api/hod/dashboard')
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/login');
          return null;
        }
        if (!res.ok) {
          throw new Error('Failed to load dashboard data.');
        }
        return res.json();
      })
      .then((data: HODDashboardStats | null) => {
        if (data) setStats(data);
      })
      .catch((err) => {
        setStatsError(err.message);
      })
      .finally(() => setLoadingStats(false));
  }, [router]);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [fetchProfile, fetchStats]);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.type === 'success' ? 3000 : 5000;
    const timer = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleAddDivision = async () => {
    if (!newDivName.trim()) {
      setDivError('Name is required');
      return;
    }
    setAddingDiv(true);
    setDivError(null);
    try {
      const res = await fetch('/api/divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDivName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDivError(data.error || 'Failed to add division');
      } else {
        setNewDivName('');
        setShowDivForm(false);
        setToast({ type: 'success', message: `Division "${data.name}" added successfully.` });
        fetchStats();
      }
    } catch (err) {
      setDivError('An unexpected error occurred');
    } finally {
      setAddingDiv(false);
    }
  };

  const handleEditDivision = async (divisionId: number, originalName: string) => {
    const trimmed = editDivName.trim();
    if (!trimmed) {
      setEditDivError('Name cannot be empty');
      return;
    }
    if (trimmed === originalName) {
      setEditingDivId(null);
      setEditDivError(null);
      return;
    }
    setSavingDiv(true);
    setEditDivError(null);
    try {
      const res = await fetch(`/api/divisions/${divisionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditDivError(data.error || 'Failed to update division');
      } else {
        setEditingDivId(null);
        setToast({ type: 'success', message: 'Division renamed successfully.' });
        fetchStats();
      }
    } catch (err) {
      setEditDivError('An unexpected error occurred');
    } finally {
      setSavingDiv(false);
    }
  };

  const handleLogout = useCallback(async () => {
    setLogoutLoading(true);
    try {
      clearCachedProfile();
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  }, [router]);

  const navTo = (path: string) => {
    setActivePath(path);
    router.push(path);
  };

  // ── Prefetch nav routes on mount ──────────────────────────────────────────

  useEffect(() => {
    ['/hod/dashboard', '/students', '/upload', '/hod/teachers', '/profile'].forEach(
      (path) => router.prefetch(path)
    );
  }, [router]);

  const hodName = loadingProfile ? '...' : (profile?.full_name ?? 'HOD');

  const navItems = [
    { label: 'Dashboard', path: '/hod/dashboard', Icon: LayoutGrid },
    { label: 'Students', path: '/students', Icon: Users },
    { label: 'Attendance', path: '/class-attendance', Icon: UserCheck },
            { label: 'Profile', path: '/profile', Icon: User },
  ];

  const totalStudents = stats?.total_students ?? 0;

  const getPercentage = (count: number, total: number) => {
    if (total === 0) return '0%';
    return Math.round((count / total) * 100) + '%';
  };

  const feeData = [
    { name: 'Paid', value: stats?.fees_paid ?? 0, color: '#16A34A' },
    { name: 'Unpaid', value: stats?.fees_unpaid ?? 0, color: '#DC2626' },
    { name: 'Partial', value: stats?.fees_partial ?? 0, color: '#D97706' },
  ].filter(d => d.value > 0);

  const barData = stats?.divisions?.map(d => {
    const hasData = d.avg_attendance !== null;
    return {
      name: d.division_name,
      realAttendance: hasData ? d.avg_attendance : null,
      displayAttendance: hasData ? Math.max(d.avg_attendance!, 1) : 20, // 20% width placeholder
      hasData,
      label: hasData ? '' : 'No data yet'
    };
  }) ?? [];

  const getBarColor = (val: number, hasData: boolean) => {
    if (!hasData) return '#E5E7EB';
    if (val >= 75) return '#16A34A';
    if (val >= 60) return '#D97706';
    return '#DC2626';
  };

  return (
    <div
      style={{
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#F8F9FA',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @media (max-width: 767px) {
          #cf-sidebar { display: none !important; }
          #cf-bottom-nav { display: flex !important; }
          #cf-main { padding: 0 0 72px 0 !important; margin-left: 0 !important; }
          #cf-topbar { 
            padding: 12px 16px !important; 
            height: auto !important; 
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          #cf-content { padding: 16px !important; }
          #cf-cards { flex-direction: column !important; }
          #cf-charts { flex-direction: column !important; }
        }
        @media (min-width: 768px) {
          #cf-bottom-nav { display: none !important; }
        }

        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid #4F46E5; outline-offset: 2px; }

        .sd-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          font-size: 14px;
          color: #111827;
          background: #FFFFFF;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .sd-input:focus {
          outline: none;
          border-color: #4F46E5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        .sd-input:disabled {
          background: #F3F4F6;
          color: #6B7280;
          cursor: not-allowed;
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .skeleton {
          animation: shimmer 2s infinite linear;
          background: linear-gradient(to right, #f6f7f8 4%, #edeef1 25%, #f6f7f8 36%);
          background-size: 1000px 100%;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          SIDEBAR (desktop only)
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        id="cf-sidebar"
        style={{
          width: '240px',
          flexShrink: 0,
          background: '#1E1E2E',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            padding: '28px 24px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span
            style={{
              color: '#FFFFFF',
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            ClassFolio
          </span>
        </div>

        <nav
          style={{
            flex: 1,
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
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
            const isActive = activePath === path;
            return (
              <button
                key={path}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  navTo(path);
                }}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? '#4F46E5' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#A0A0B0',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'background 0.15s ease, color 0.15s ease',
                  width: '100%',
                  textAlign: 'left',
                  minHeight: '44px',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = '#A0A0B0';
                  }
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.75} />
                {label}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            padding: '16px 12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              marginBottom: '12px',
            }}
          >
            <p
              style={{
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {hodName}
            </p>
            <p
              style={{
                color: '#A0A0B0',
                fontSize: '12px',
                margin: '2px 0 0',
                textTransform: 'capitalize',
              }}
            >
              {profile?.role ?? 'HOD'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            style={{
              width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: 'rgba(255,255,255,0.05)', color: '#FFFFFF',
              border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            <LogOut size={16} strokeWidth={1.75} /> {logoutLoading ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════════════════════════════ */}
      <main
        id="cf-main"
        style={{
          marginLeft: '240px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'auto',
        }}
      >
        {/* Top bar */}
        <header
          id="cf-topbar"
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            padding: '0 32px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#111827',
                margin: 0,
              }}
            >
              HOD Command Center
            </h1>
          </div>
          <span
            style={{
              background: '#DBEAFE',
              color: '#2563EB',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: '9999px',
            }}
          >
            HOD
          </span>
        </header>

        {/* Page content */}
        <div
          id="cf-content"
          style={{
            padding: '32px',
            flex: 1,
          }}
        >
          {statsError ? (
            <div style={{ background: '#FEE2E2', border: '1px solid #F87171', borderRadius: '8px', padding: '16px', color: '#B91C1C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Error: </strong> {statsError}
              </div>
              <button
                onClick={fetchStats}
                style={{ background: '#DC2626', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          ) : totalStudents === 0 && !loadingStats ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: '#FFFFFF', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>No students yet</h2>
              <p style={{ color: '#6B7280', marginBottom: '24px' }}>Add students from the Students page or upload an Excel file to see stats here.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => navTo('/students/new')} style={{ background: '#4F46E5', color: '#FFF', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                  Add Student
                </button>
                <button onClick={() => navTo('/upload')} style={{ background: '#FFF', color: '#4F46E5', border: '1px solid #4F46E5', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                  Upload Excel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Row 1: Stat Cards */}
              <div
                id="cf-cards"
                style={{
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                  marginBottom: '24px',
                }}
              >
                <StatCard
                  label="Total Students"
                  value={totalStudents}
                  Icon={Users2}
                  loading={loadingStats}
                />
                <StatCard
                  label="Fees Paid"
                  value={stats?.fees_paid ?? 0}
                  subtext={getPercentage(stats?.fees_paid ?? 0, totalStudents)}
                  subtextColor="#16A34A"
                  Icon={Banknote}
                  loading={loadingStats}
                />
                <StatCard
                  label="Fees Unpaid"
                  value={stats?.fees_unpaid ?? 0}
                  subtext={getPercentage(stats?.fees_unpaid ?? 0, totalStudents)}
                  subtextColor="#DC2626"
                  Icon={AlertCircle}
                  loading={loadingStats}
                />
              </div>

              {/* Row 2: Charts */}
              <div
                id="cf-charts"
                style={{
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Financial Overview Card */}
                <div style={{ flex: '1 1 300px', minWidth: 0, background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px #E5E7EB', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>Financial Overview</h3>

                  {loadingStats ? (
                    <div className="skeleton" style={{ height: '250px', borderRadius: '8px' }} />
                  ) : (
                    <>
                      <div style={{ height: '220px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={feeData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                            >
                              {feeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              labelStyle={{ color: '#111827', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}
                              itemStyle={{ color: '#111827', fontWeight: 500, fontSize: '13px' }}
                              formatter={(value) => [`${value} student${Number(value) !== 1 ? 's' : ''}`, 'Count']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                        {feeData.map(d => (
                          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4B5563' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, display: 'inline-block' }}></span>
                            {d.name}
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E5E7EB', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', color: '#4B5563', fontSize: '14px' }}>
                        <div><strong>Scholarship:</strong> {stats?.scholarship_availed ?? 0} students</div>
                        <div><strong>Hostellers:</strong> {stats?.hostellers ?? 0} students</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Attendance by Division Card */}
                <div style={{ flex: '1 1 300px', minWidth: 0, background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px #E5E7EB', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>Attendance by Division</h3>

                  {loadingStats ? (
                    <div className="skeleton" style={{ height: '250px', borderRadius: '8px' }} />
                  ) : barData.length === 0 ? (
                    <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                      No divisions found
                    </div>
                  ) : (
                    <div style={{ height: '270px', width: '100%', marginLeft: '-20px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={barData}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                          <XAxis type="number" domain={[0, 100]} hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4B5563', fontSize: 13, fontWeight: 500 }} width={70} />
                          <Tooltip
                            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                            contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            labelStyle={{ color: '#111827', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}
                            itemStyle={{ color: '#111827', fontWeight: 500, fontSize: '13px' }}
                            formatter={(value, name, props) => {
                              if (!props?.payload?.hasData) return ['No data yet', 'Attendance'];
                              return [`${props.payload.realAttendance}%`, 'Attendance'];
                            }}
                          />
                          <Bar dataKey="displayAttendance" barSize={24} radius={[0, 4, 4, 0]}>
                            {barData.map((entry, index) => (
                              <BarCell key={`cell-${index}`} fill={getBarColor(entry.realAttendance ?? 0, entry.hasData)} />
                            ))}
                            <LabelList
                              dataKey="label"
                              position="insideLeft"
                              fill="#4B5563"
                              fontSize={12}
                              fontWeight={500}
                              offset={8}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Division Management & Row 4: Teachers Preview */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '24px' }}>

                {/* Division Management */}
                <div style={{ flex: '1 1 300px', minWidth: 0, background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px #E5E7EB', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>Division Management</h3>
                    <button
                      onClick={() => setShowDivForm(!showDivForm)}
                      style={{ background: 'transparent', border: 'none', color: '#4F46E5', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                    >
                      {showDivForm ? 'Cancel' : '+ Add Division'}
                    </button>
                  </div>

                  {showDivForm && (
                    <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Division Name</label>
                      <input
                        value={newDivName}
                        onChange={e => setNewDivName(e.target.value)}
                        placeholder="e.g. Division D"
                        disabled={addingDiv}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', marginBottom: '8px' }}
                      />
                      {divError && <p style={{ color: '#DC2626', fontSize: '13px', margin: '0 0 8px 0' }}>{divError}</p>}
                      <button
                        onClick={handleAddDivision}
                        disabled={addingDiv}
                        style={{ background: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 500, cursor: addingDiv ? 'not-allowed' : 'pointer', opacity: addingDiv ? 0.7 : 1 }}
                      >
                        {addingDiv ? 'Adding...' : 'Add Division'}
                      </button>
                    </div>
                  )}

                  {loadingStats ? (
                    <div className="skeleton" style={{ height: '150px', borderRadius: '8px' }} />
                  ) : stats?.divisions?.length === 0 ? (
                    <p style={{ color: '#6B7280', fontSize: '14px' }}>No divisions found.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stats?.divisions?.map(d => {
                        const isEditing = editingDivId === d.division_id;
                        const hasChanges = editDivName.trim() !== d.division_name && editDivName.trim() !== '';

                        return (
                          <div key={d.division_id} style={{ padding: '12px 16px', background: '#F8F9FA', borderRadius: '6px', border: '1px solid #F3F4F6' }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    className="sd-input"
                                    value={editDivName}
                                    onChange={e => setEditDivName(e.target.value)}
                                    disabled={savingDiv}
                                    autoFocus
                                    style={{ flex: 1 }}
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => handleEditDivision(d.division_id, d.division_name)}
                                    disabled={!hasChanges || savingDiv}
                                    style={{
                                      background: '#4F46E5', color: '#FFFFFF',
                                      border: 'none', borderRadius: '6px',
                                      padding: '6px 12px', fontSize: '13px', fontWeight: 500,
                                      cursor: (!hasChanges || savingDiv) ? 'not-allowed' : 'pointer',
                                      opacity: (!hasChanges || savingDiv) ? 0.6 : 1,
                                    }}
                                  >
                                    {savingDiv ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingDivId(null);
                                      setEditDivError(null);
                                    }}
                                    disabled={savingDiv}
                                    style={{
                                      background: '#FFFFFF', color: '#374151',
                                      border: '1px solid #D1D5DB', borderRadius: '6px',
                                      padding: '6px 12px', fontSize: '13px', fontWeight: 500,
                                      cursor: savingDiv ? 'not-allowed' : 'pointer',
                                      opacity: savingDiv ? 0.6 : 1,
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  {editDivError && (
                                    <span style={{ color: '#DC2626', fontSize: '12px', fontWeight: 500 }}>{editDivError}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{d.division_name}</span>
                                  <button
                                    onClick={() => {
                                      setEditingDivId(d.division_id);
                                      setEditDivName(d.division_name);
                                      setEditDivError(null);
                                    }}
                                    style={{
                                      background: 'none', border: 'none', cursor: 'pointer',
                                      color: '#4F46E5', fontSize: '12px', fontWeight: 500, padding: 0,
                                      display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#4338CA'}
                                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#4F46E5'}
                                    title="Edit Division Name"
                                  >
                                    <Pencil size={14} /> Edit
                                  </button>
                                </div>
                                <span style={{ fontSize: '14px', color: '#6B7280' }}>{d.student_count} students</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Registered Teachers Preview */}
                <div style={{ flex: '1 1 300px', minWidth: 0, background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px #E5E7EB', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>Registered Teachers</h3>
                    <button
                      onClick={() => navTo('/hod/teachers')}
                      style={{ background: 'transparent', border: 'none', color: '#4F46E5', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                    >
                      View All
                    </button>
                  </div>

                  {loadingStats ? (
                    <div className="skeleton" style={{ height: '150px', borderRadius: '8px' }} />
                  ) : stats?.teachers?.length === 0 ? (
                    <p style={{ color: '#6B7280', fontSize: '14px' }}>No teachers found.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stats?.teachers?.slice(0, 5).map(t => (
                        <div key={t.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', background: '#F8F9FA', borderRadius: '6px', border: '1px solid #F3F4F6' }}>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{t.full_name}</span>
                          <span style={{ fontSize: '13px', color: '#6B7280' }}>{t.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          BOTTOM NAVIGATION (mobile only)
      ══════════════════════════════════════════════════════════════════ */}
      <nav
        id="cf-bottom-nav"
        aria-label="Mobile navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: '#1E1E2E',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center', gap: 32,
          zIndex: 30,
        }}
      >
        {[
          { Icon: LayoutGrid,    label: 'Home',     path: '/hod/dashboard' },
          { Icon: Users,         label: 'Students', path: '/students' },
          { Icon: UserCheck, label: 'Attendance', path: '/class-attendance' },
          { Icon: User,          label: 'Profile',  path: '/profile' },
        ].map(({ Icon, label, path }) => {
          const isActive = activePath === path;
          return (
            <button
              key={path}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                navTo(path);
              }}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? '#4F46E5' : '#A0A0B0',
                minWidth: '44px',
                minHeight: '44px',
                padding: '4px 0',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.7 }}><Icon size={18} strokeWidth={1.75} /></span>
              <span style={{ fontSize: '9px', fontWeight: isActive ? 600 : 400, color: isActive ? '#818CF8' : '#A0A0B0' }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: toast.type === 'success' ? '#DEF7EC' : '#FDE8E8',
          color: toast.type === 'success' ? '#03543F' : '#9B1C1C',
          padding: '12px 20px', borderRadius: 8,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 8,
          zIndex: 100, fontSize: 14, fontWeight: 500,
          border: `1px solid ${toast.type === 'success' ? '#84E1BC' : '#F8B4B4'}`
        }}>
          <span>{toast.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
