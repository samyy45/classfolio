'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedProfile, setCachedProfile, clearCachedProfile, UserProfile } from '@/lib/profileCache';
import { LayoutGrid, GraduationCap, Users, UserCheck, Upload, User, LogOut, Users2, Folder, Briefcase, PlusCircle, FileUp } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

// The UserProfile interface is now imported from '@/lib/profileCache'

interface DashboardStats {
  total_students: number;
  total_divisions: number;
  uploaded_today: number;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string | number;
  Icon: React.ElementType;
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
        }}
      >
        <Icon size={14} style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '4px' }} strokeWidth={2} /> {label}
      </p>
      <p
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#111827',
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function QuickActionButton({
  label,
  Icon,
  onClick,
}: {
  label: string;
  Icon: React.ElementType;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#4338CA' : '#4F46E5',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        width: '100%',
        minHeight: '44px',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <Icon size={18} strokeWidth={2} />
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FacultyDashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [activePath, setActivePath] = useState('/dashboard');

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    const cached = getCachedProfile();
    if (cached) setProfile(cached);

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
      .catch(() => {/* network error — profile stays null */ })
      .finally(() => setLoadingProfile(false));
  }, [router]);

  useEffect(() => {
    fetch('/api/faculty/stats')
      .then((res) => res.json())
      .then((data: DashboardStats) => setStats(data))
      .catch(() => {/* use placeholder */ })
      .finally(() => setLoadingStats(false));
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    setLogoutLoading(true);
    try {
      clearCachedProfile();
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  }, [router]);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const navTo = (path: string) => {
    setActivePath(path);
    router.push(path);
  };

  // ── Prefetch nav routes on mount ──────────────────────────────────────────

  useEffect(() => {
    const role = profile?.role;
    const routes = role === 'hod'
      ? ['/hod/dashboard', '/students', '/upload', '/hod/teachers', '/profile']
      : ['/dashboard', '/students', '/upload', '/profile'];
    routes.forEach((path) => router.prefetch(path));
  }, [profile?.role, router]);

  // ── Derived display values ────────────────────────────────────────────────

  const teacherName = loadingProfile
    ? '...'
    : (profile?.full_name ?? 'Teacher');

  const totalStudents = loadingStats ? '—' : (stats?.total_students ?? 0);
  const totalDivisions = loadingStats ? '—' : (stats?.total_divisions ?? 0);
  const uploadedToday = loadingStats ? '—' : (stats?.uploaded_today ?? 0);

  // ── Shared nav items ──────────────────────────────────────────────────────

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', Icon: LayoutGrid },
    { label: 'Students', path: '/students', Icon: Users },
    { label: 'Attendance', path: '/class-attendance', Icon: UserCheck },
            { label: 'Profile', path: '/profile', Icon: User },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#F8F9FA',
      }}
    >
      {/* ── Google Inter font import ─────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Sidebar hidden on mobile */
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
          #cf-actions { flex-direction: column !important; }
        }
        /* Bottom nav hidden on desktop */
        @media (min-width: 768px) {
          #cf-bottom-nav { display: none !important; }
        }

        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid #4F46E5; outline-offset: 2px; }
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
        {/* App name */}
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

        {/* Nav links */}
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
                onClick={() => navTo(path)}
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
                    (e.currentTarget as HTMLButtonElement).style.color =
                      '#FFFFFF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color =
                      '#A0A0B0';
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
        <div
          style={{
            padding: '16px 12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              marginBottom: '8px',
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
              {teacherName}
            </p>
            <p
              style={{
                color: '#A0A0B0',
                fontSize: '12px',
                margin: '2px 0 0',
                textTransform: 'capitalize',
              }}
            >
              {profile?.role ?? 'Faculty'}
            </p>
          </div>
          <button
            id="sidebar-logout-btn"
            onClick={handleLogout}
            disabled={logoutLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: logoutLoading ? 'not-allowed' : 'pointer',
              background: 'transparent',
              color: '#A0A0B0',
              fontSize: '14px',
              fontWeight: 400,
              width: '100%',
              textAlign: 'left',
              minHeight: '44px',
              transition: 'background 0.15s, color 0.15s',
              opacity: logoutLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'rgba(220,38,38,0.12)';
              (e.currentTarget as HTMLButtonElement).style.color = '#FCA5A5';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#A0A0B0';
            }}
          >
            <LogOut size={16} strokeWidth={1.75} />
            {logoutLoading ? 'Signing out…' : 'Logout'}
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
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
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
              Welcome,{' '}
              <span style={{ color: '#4F46E5' }}>{teacherName}</span>
            </h1>
            <p
              style={{
                fontSize: '12px',
                color: '#6B7280',
                margin: '2px 0 0',
              }}
            >
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Role badge */}
          <span
            style={{
              background: '#DBEAFE',
              color: '#2563EB',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: '9999px',
              textTransform: 'capitalize',
            }}
          >
            {profile?.role ?? 'Faculty'}
          </span>
        </header>

        {/* ── Page content ─────────────────────────────────────────────────── */}
        <div
          id="cf-content"
          style={{
            padding: '32px',
            flex: 1,
          }}
        >
          {/* Section: Stat cards */}
          <section aria-labelledby="stats-heading">
            <h2
              id="stats-heading"
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '16px',
                marginTop: 0,
              }}
            >
              Overview
            </h2>

            <div
              id="cf-cards"
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '32px',
              }}
            >
              <StatCard
                label="Total Students"
                value={totalStudents}
                Icon={Users2}
              />
              <StatCard
                label="Total Divisions"
                value={totalDivisions}
                Icon={Folder}
              />
              <StatCard
                label="My Role"
                value="Faculty"
                Icon={Briefcase}
              />
            </div>
          </section>

          {/* Divider */}
          <hr
            style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '0 0 28px' }}
          />

          {/* Section: Quick Actions */}
          <section aria-labelledby="actions-heading">
            <h2
              id="actions-heading"
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '16px',
                marginTop: 0,
              }}
            >
              Quick Actions
            </h2>

            <div
              id="cf-actions"
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 180px' }}>
                <QuickActionButton
                  label="View All Students"
                  Icon={Users}
                  onClick={() => navTo('/students')}
                />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <QuickActionButton
                  label="Add Student Manually"
                  Icon={PlusCircle}
                  onClick={() => navTo('/students/new')}
                />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <QuickActionButton
                  label="Upload Excel"
                  Icon={FileUp}
                  onClick={() => navTo('/upload')}
                />
              </div>
            </div>
          </section>

          {/* Upload today card — below quick actions */}
          {!loadingStats && (
            <div
              style={{
                marginTop: '32px',
                background: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px #E5E7EB',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <span style={{ fontSize: '28px' }}>📈</span>
              <div>
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#6B7280',
                    margin: '0 0 4px',
                  }}
                >
                  Students Added Today
                </p>
                <p
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#16A34A',
                    margin: 0,
                  }}
                >
                  {uploadedToday}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          BOTTOM NAVIGATION (mobile only — hidden on desktop via CSS)
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
          display: 'none', /* shown on mobile via CSS */
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
          const isActive = activePath === path;
          const isHodNav = profile?.role === 'hod';
          return (
            <button
              key={path}
              onClick={() => navTo(path)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: isHodNav ? '2px' : '3px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? '#4F46E5' : '#A0A0B0',
                minWidth: isHodNav ? '44px' : '60px',
                minHeight: '44px',
                padding: isHodNav ? '4px 0' : '6px 0',
              }}
            >
              <Icon size={isHodNav ? 18 : 20} strokeWidth={1.75} />
              <span
                style={{
                  fontSize: isHodNav ? '9px' : '10px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#818CF8' : '#A0A0B0',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
