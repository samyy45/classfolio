'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCachedProfile, setCachedProfile, clearCachedProfile } from '@/lib/profileCache';
import { LayoutGrid, GraduationCap, Users, UserCheck, Upload, User, LogOut, Check, AlertCircle, Pencil } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();

  const [profile, setProfile] = useState<{ full_name: string; email: string; role: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const [fullName, setFullName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchProfile = useCallback(() => {
    const cached = getCachedProfile();
    if (cached) {
      setProfile(cached as any); // using inline type inside this file or any
      setFullName(cached.full_name);
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
          setFullName(data.full_name);
          setCachedProfile(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (!trimmed) {
      setSaveError('Full Name cannot be empty');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'Failed to update profile');
      } else {
        setProfile(prev => prev ? { ...prev, full_name: data.full_name } : null);
        setFullName(data.full_name);
        setIsEditing(false);
        setToast({ type: 'success', message: 'Profile updated successfully' });
      }
    } catch (err) {
      setSaveError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const userName = loadingProfile ? '...' : (profile?.full_name ?? 'User');
  const hasChanges = profile && fullName.trim() !== profile.full_name && fullName.trim() !== '';

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
        
        .sd-input {
          width: 100%;
          padding: 10px 12px;
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

        @media (max-width: 767px) {
          #cf-sidebar { display: none !important; }
          #cf-bottom-nav { display: flex !important; }
          #cf-main { margin-left: 0 !important; padding-bottom: 80px !important; }
        }
        @media (min-width: 768px) {
          #cf-bottom-nav { display: none !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          SIDEBAR (desktop only) - Note: No Profile link here
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
          ) : (profile?.role === 'hod' ? [
            { label: 'Dashboard', path: '/hod/dashboard', Icon: LayoutGrid },
            { label: 'Students', path: '/students', Icon: Users },
            { label: 'Attendance', path: '/class-attendance', Icon: UserCheck },
            { label: 'Profile', path: '/profile', Icon: User },
          ] : [
            { label: 'Dashboard', path: '/dashboard', Icon: LayoutGrid },
            { label: 'Students', path: '/students', Icon: Users },
            { label: 'Attendance', path: '/class-attendance', Icon: UserCheck },
            { label: 'Profile', path: '/profile', Icon: User },
          ]).map((item) => {
            const active = pathname === item.path;
            return (
            <button
              key={item.path}
              onClick={() => navTo(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '10px 12px',
                background: active ? '#4F46E5' : 'transparent',
                color: active ? '#FFFFFF' : '#A0A0B0',
                border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.2s',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.7 }}><item.Icon size={18} strokeWidth={1.75} /></span>
              {item.label}
            </button>
          )})}
        </nav>

        <div style={{ padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#313244', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#CBA6F7' }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#E1E1E6', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userName}</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#A0A0B0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {profile?.role === 'hod' ? 'HOD Account' : 'Faculty'}
              </p>
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
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>Profile Settings</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Manage your personal account details.</p>
        </header>

        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '32px', maxWidth: '600px' }}>
          {loadingProfile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div className="skeleton" style={{ height: '14px', width: '80px', marginBottom: '8px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '6px' }} />
              </div>
              <div>
                <div className="skeleton" style={{ height: '14px', width: '60px', marginBottom: '8px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '6px' }} />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', margin: 0 }}>
                    Full Name
                  </label>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#4F46E5', fontSize: '13px', fontWeight: 500, padding: 0,
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#4338CA'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#4F46E5'}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    className="sd-input"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    disabled={saving}
                    autoFocus
                  />
                ) : (
                  <div style={{
                    padding: '10px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB',
                    borderRadius: '6px', fontSize: '14px', color: '#111827'
                  }}>
                    {profile?.full_name}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{
                  padding: '10px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB',
                  borderRadius: '6px', fontSize: '14px', color: '#6B7280'
                }}>
                  {profile?.email || '—'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Role
                </label>
                <span style={{ 
                  display: 'inline-block',
                  background: profile?.role === 'hod' ? '#E0E7FF' : '#F3F4F6',
                  color: profile?.role === 'hod' ? '#3730A3' : '#374151',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {profile?.role === 'hod' ? 'HOD' : 'Faculty'}
                </span>
              </div>

              {isEditing && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="submit"
                    disabled={!hasChanges || saving}
                    style={{
                      background: '#4F46E5', color: '#FFFFFF',
                      border: 'none', borderRadius: '6px',
                      padding: '10px 20px', fontSize: '14px', fontWeight: 500,
                      cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer',
                      opacity: (!hasChanges || saving) ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFullName(profile?.full_name || '');
                      setSaveError(null);
                    }}
                    disabled={saving}
                    style={{
                      background: '#FFFFFF', color: '#374151',
                      border: '1px solid #D1D5DB', borderRadius: '6px',
                      padding: '10px 20px', fontSize: '14px', fontWeight: 500,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    Cancel
                  </button>
                  {saveError && (
                    <span style={{ color: '#DC2626', fontSize: '13px', fontWeight: 500, marginLeft: '4px' }}>{saveError}</span>
                  )}
                </div>
              )}

              {profile?.role === 'hod' && (
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>Administration</h3>
                  <button
                    type="button"
                    onClick={() => router.push('/hod/teachers')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: '#FFFFFF', color: '#4F46E5',
                      border: '1px solid #4F46E5', borderRadius: '6px',
                      padding: '10px 20px', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#EEF2FF'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'}
                  >
                    <GraduationCap size={18} />
                    Manage Teachers
                  </button>
                </div>
              )}

              {/* Mobile-only logout button inside profile form as a fallback, 
                  since there's no sidebar to log out from on mobile */}
              <div style={{ display: 'block', marginTop: '16px' }} className="mobile-logout-wrapper">
                <style>{`@media (min-width: 768px) { .mobile-logout-wrapper { display: none !important; } }`}</style>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  style={{
                    width: '100%', padding: '12px',
                    background: '#FEF2F2', color: '#DC2626',
                    border: '1px solid #FCA5A5', borderRadius: '6px',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {logoutLoading ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </form>
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
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '64px', background: '#1E1E2E',
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
          { Icon: Users,         label: 'Students', path: '/students',      active: false },
          { Icon: UserCheck, label: 'Attendance', path: '/class-attendance' },
          { Icon: User,          label: 'Profile',  path: '/profile',       active: true  },
        ] : [
          { Icon: LayoutGrid, label: 'Home',     path: '/dashboard', active: false },
          { Icon: Users,      label: 'Students', path: '/students',  active: false },
          { Icon: UserCheck, label: 'Attendance', path: '/class-attendance' },
          { Icon: User,       label: 'Profile',  path: '/profile',   active: true },
        ]).map(({ Icon, label, path, active }) => {
          const isHodNav = profile?.role === 'hod';
          return (
            <button
              key={path}
              onClick={(e) => {
                e.preventDefault();
                navTo(path);
              }}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isHodNav ? '2px' : '3px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: active ? '#4F46E5' : '#A0A0B0',
                minWidth: isHodNav ? '44px' : '60px', minHeight: '44px', padding: isHodNav ? '4px 0' : '6px 0',
              }}
            >
              <Icon size={isHodNav ? 18 : 20} strokeWidth={1.75} />
              <span style={{ fontSize: isHodNav ? '9px' : '10px', fontWeight: active ? 600 : 400, color: active ? '#818CF8' : '#A0A0B0' }}>
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
          <span>{toast.type === 'success' ? <Check size={16}/> : <AlertCircle size={16}/>}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
