'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherInfo } from '@/types/index';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getCachedProfile, setCachedProfile, clearCachedProfile } from '@/lib/profileCache';
import { LayoutGrid, GraduationCap, Users, UserCheck, Upload, User, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';

export default function HODTeachersPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [activePath, setActivePath] = useState('/hod/teachers');

  const [teacherToRemove, setTeacherToRemove] = useState<TeacherInfo | null>(null);
  const [removing, setRemoving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchProfileAndTeachers = useCallback(() => {
    setLoading(true);

    const cached = getCachedProfile();
    if (cached) {
      setProfile(cached as any);
    }

    fetch('/api/auth/me')
      .then((res) => {
        if (res.status === 401) {
          clearCachedProfile();
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setProfile(data);
          setCachedProfile(data);
          // fetch teachers via dashboard stats to reuse the endpoint
          return fetch('/api/hod/dashboard');
        }
        return null;
      })
      .then(res => {
        if (!res) return null;
        if (!res.ok) throw new Error('Failed to fetch teachers');
        return res.json();
      })
      .then((data) => {
        if (data && data.teachers) {
          setTeachers(data.teachers);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetchProfileAndTeachers();
  }, [fetchProfileAndTeachers]);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.type === 'success' ? 3000 : 5000;
    const timer = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(timer);
  }, [toast]);

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

  const handleRemove = async () => {
    if (!teacherToRemove) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/hod/teachers/${teacherToRemove.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setToast({ type: 'error', message: data.error || 'Failed to remove faculty account' });
      } else {
        setToast({ type: 'success', message: 'Faculty account permanently removed.' });
        setTeachers(prev => prev.filter(t => t.id !== teacherToRemove.id));
      }
    } catch (err) {
      setToast({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setRemoving(false);
      setTeacherToRemove(null);
    }
  };

  const hodName = loading ? '...' : (profile?.full_name ?? 'HOD');

  const navItems = [
    { label: 'Dashboard', path: '/hod/dashboard', Icon: LayoutGrid },
    { label: 'Students', path: '/students', Icon: Users },
    { label: 'Attendance', path: '/class-attendance', Icon: UserCheck },
            { label: 'Profile', path: '/profile', Icon: User },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F9FA', fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        
        .skeleton {
          background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 767px) {
          #cf-sidebar { display: none !important; }
          #cf-bottom-nav { display: flex !important; }
          #cf-main { margin-left: 0 !important; padding: 24px 16px 80px 16px !important; }
          #th-table-section { display: none !important; }
          #th-cards-section { display: block !important; }
        }
        @media (min-width: 768px) {
          #cf-bottom-nav { display: none !important; }
          #th-table-section { display: block !important; }
          #th-cards-section { display: none !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          SIDEBAR (desktop only)
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        id="cf-sidebar"
        style={{
          width: '240px', background: '#1E1E2E', color: '#FFFFFF',
          display: 'flex', flexDirection: 'column', position: 'fixed',
          top: 0, bottom: 0, left: 0, zIndex: 20
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GraduationCap size={22} strokeWidth={1.75} /> ClassFolio
          </h1>
        </div>

        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          ) : navItems.map((item) => {
            const isActive = activePath === item.path || (item.path === '/profile' && activePath.startsWith('/hod/teachers'));
            return (
              <button
                key={item.path}
                onClick={() => navTo(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', padding: '10px 12px',
                  background: isActive ? '#4F46E5' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#A0A0B0',
                  border: 'none', borderRadius: '8px',
                  fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.2s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.7 }}><item.Icon size={18} strokeWidth={1.75} /></span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#313244', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#CBA6F7' }}>
              {hodName.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#E1E1E6', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{hodName}</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#A0A0B0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>HOD Account</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: '8px 12px',
              background: 'transparent', color: '#F38BA8',
              border: 'none', borderRadius: '6px',
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
      <main id="cf-main" style={{ marginLeft: '240px', flex: 1, padding: '32px 40px', maxWidth: '1200px' }}>
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>Registered Teachers</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>View and manage faculty accounts for your department.</p>
          </div>
        </header>

        {loading ? (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden', padding: '24px' }}>
            <div className="skeleton" style={{ height: '40px', width: '100%', marginBottom: '12px' }} />
            <div className="skeleton" style={{ height: '40px', width: '100%', marginBottom: '12px' }} />
            <div className="skeleton" style={{ height: '40px', width: '100%' }} />
          </div>
        ) : error ? (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '48px 24px', textAlign: 'center', color: '#DC2626' }}>{error}</div>
        ) : teachers.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '48px 24px', textAlign: 'center', color: '#6B7280' }}>No registered teachers found.</div>
        ) : (
          <>
            {/* ─── Desktop Table ─── */}
            <div id="th-table-section" style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                      <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                      <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined Date</th>
                      <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map(teacher => {
                      const joinedDate = new Date(teacher.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      return (
                        <tr key={teacher.id} style={{ borderBottom: '1px solid #E5E7EB', background: '#FFFFFF' }}>
                          <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                            {teacher.full_name}
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: '14px', color: '#4B5563' }}>
                            {teacher.email}
                          </td>
                          <td style={{ padding: '16px 24px', fontSize: '14px', color: '#4B5563' }}>
                            {joinedDate}
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            <button
                              onClick={() => setTeacherToRemove(teacher)}
                              style={{
                                background: 'transparent',
                                border: '1px solid #FCA5A5',
                                color: '#DC2626',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── Mobile Cards ─── */}
            <div id="th-cards-section">
              {teachers.map(teacher => {
                const joinedDate = new Date(teacher.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                return (
                  <div
                    key={teacher.id}
                    style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>{teacher.full_name}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#4B5563' }}>{teacher.email}</p>
                      </div>
                    </div>
                    <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#6B7280' }}>
                      Joined: {joinedDate}
                    </p>
                    <button
                      onClick={() => setTeacherToRemove(teacher)}
                      style={{
                        width: '100%', padding: '10px',
                        background: '#FEF2F2', color: '#DC2626',
                        border: '1px solid #FCA5A5', borderRadius: '8px',
                        fontSize: '14px', fontWeight: 600, cursor: 'pointer', minHeight: '44px',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
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
        ) : [
          { Icon: LayoutGrid,    label: 'Home',     path: '/hod/dashboard' },
          { Icon: Users,         label: 'Students', path: '/students' },
          { Icon: UserCheck, label: 'Attendance', path: '/class-attendance' },
          { Icon: User,          label: 'Profile',  path: '/profile' },
        ].map(({ Icon, label, path }) => {
          const active = activePath === path || (path === '/profile' && activePath.startsWith('/hod/teachers'));
          return (
            <button
              key={path}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                navTo(path);
              }}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: active ? '#4F46E5' : '#A0A0B0',
                minWidth: '44px', minHeight: '44px', padding: '4px 0',
              }}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span style={{ fontSize: '9px', fontWeight: active ? 600 : 400, color: active ? '#818CF8' : '#A0A0B0' }}>
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

      {teacherToRemove && (
        <ConfirmDialog
          isOpen={!!teacherToRemove}
          title="Remove Faculty Account?"
          message={`This will permanently delete ${teacherToRemove.full_name}'s account. They will be logged out immediately and will need to re-register with the staff code if they need access again. Records they previously added or edited will remain in the system, but will no longer show their name as the editor. This action cannot be undone.`}
          onConfirm={handleRemove}
          onCancel={() => {
            if (!removing) setTeacherToRemove(null);
          }}
        />
      )}
    </div>
  );
}
