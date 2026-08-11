'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DryRunResult, RowError } from '@/types/index';
import { getCachedProfile, setCachedProfile, clearCachedProfile, UserProfile } from '@/lib/profileCache';
import { LayoutGrid, GraduationCap, Users, Upload, User, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';



interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  if (!isOpen) return null;

  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // File states
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [stage3Success, setStage3Success] = useState<{ inserted: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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

  // ── File Handling ─────────────────────────────────────────────────────────
  const processFile = async (selectedFile: File) => {
    setDryRunResult(null);

    // Client-side checks
    if (selectedFile.size > 50 * 1024 * 1024) {
      showToast('File size exceeds 50MB limit', 'error');
      return;
    }
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'csv') {
      showToast('Only .xlsx and .csv files are allowed', 'error');
      return;
    }

    setFile(selectedFile);
    setValidating(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('dryRun', 'true'); // explicitly signal dry-run

    try {
      const res = await fetch('/api/students/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to upload file', 'error');
        setFile(null);
      } else {
        setDryRunResult(data);
      }
    } catch (err: any) {
      showToast(err.message || 'Network error during upload', 'error');
      setFile(null);
    } finally {
      setValidating(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setDryRunResult(null);
    setStage3Success(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCommit = async () => {
    if (!file || !dryRunResult || dryRunResult.errors.length > 0) return;

    setValidating(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dryRun', 'false');

    try {
      const res = await fetch('/api/students/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to commit', 'error');
        setDryRunResult(null);
        setFile(null);
      } else {
        if (data.warning) showToast(data.warning, 'error');
        setStage3Success({ inserted: data.inserted });
      if(onSuccess) onSuccess();
        setDryRunResult(null);
        setFile(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Network error during commit', 'error');
    } finally {
      setValidating(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '800px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden'
        }}
      >
        <header style={{
          padding: '20px 32px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Upload Student Data</h1>
            <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Upload an Excel or CSV file to add multiple students.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: '#6B7280', padding: 0 }}>&times;</button>
        </header>

        <div style={{ padding: 32, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto', width: '100%' }}>

          {/* Stage 1: Upload UI */}
          {!dryRunResult && !validating && !stage3Success && (
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 32 }}>
              <p style={{ margin: '0 0 16px 0', fontSize: 16, color: '#4B5563' }}>
                Upload a .xlsx or .csv file. Download the template below if needed.
              </p>
              <a
                href="/template.xlsx"
                download
                style={{
                  display: 'inline-block', marginBottom: 24, color: '#4F46E5',
                  fontSize: 14, fontWeight: 600, textDecoration: 'none'
                }}
              >
                ↓ Download Template
              </a>

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{
                  border: '2px dashed #D1D5DB', borderRadius: 12, padding: '48px 24px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', background: '#F9FAFB', cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#4F46E5';
                  e.currentTarget.style.background = '#EEF2FF';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.background = '#F9FAFB';
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>Drag & Drop Excel File Here</h3>
                <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#6B7280' }}>or click to browse files</p>
                <button style={{
                  background: '#FFF', color: '#374151', border: '1px solid #D1D5DB',
                  padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  Browse Files
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => e.target.files && e.target.files.length > 0 && processFile(e.target.files[0])}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  style={{ display: 'none' }}
                />
              </div>
              <p style={{ marginTop: 16, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                Accepted formats: .xlsx, .csv (Max size: 50MB)
              </p>
            </div>
          )}

          {/* Validating/Committing State */}
          {validating && (
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 48, textAlign: 'center' }}>
              <div style={{
                display: 'inline-block', width: 40, height: 40,
                border: '3px solid #E5E7EB', borderTopColor: '#4F46E5',
                borderRadius: '50%', animation: 'spin 1s linear infinite'
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <h3 style={{ margin: '16px 0 0 0', fontSize: 18, color: '#111827' }}>Processing...</h3>
              <p style={{ margin: '8px 0 0 0', color: '#6B7280', fontSize: 14 }}>This may take a moment</p>
            </div>
          )}

          {/* Stage 2: Dry Run Report */}
          {dryRunResult && !validating && !stage3Success && (
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

              {/* Summary Bar */}
              <div style={{ padding: 24, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>Validation Report</h2>
                  <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
                    <span style={{ color: '#16A34A', fontWeight: 600 }}>{dryRunResult.valid.length} rows valid ✓</span>
                    <span style={{ color: dryRunResult.errors.length > 0 ? '#DC2626' : '#6B7280', fontWeight: 600 }}>
                      {dryRunResult.errors.length} rows have errors {dryRunResult.errors.length > 0 ? '✗' : ''}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handleCancel}
                    style={{
                      background: '#FFF', color: '#374151', border: '1px solid #D1D5DB',
                      padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCommit}
                    disabled={dryRunResult.errors.length > 0}
                    title={dryRunResult.errors.length > 0 ? "Fix errors to proceed" : "Commit valid rows"}
                    style={{
                      background: dryRunResult.errors.length > 0 ? '#F3F4F6' : '#4F46E5',
                      color: dryRunResult.errors.length > 0 ? '#9CA3AF' : '#FFF',
                      border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                      cursor: dryRunResult.errors.length > 0 ? 'not-allowed' : 'pointer', opacity: dryRunResult.errors.length > 0 ? 1 : 0.9
                    }}
                  >
                    Commit Valid Rows ({dryRunResult.valid.length})
                  </button>
                </div>
              </div>

              {/* Error Table */}
              {dryRunResult.errors.length > 0 ? (
                <div style={{ overflowX: 'auto', maxHeight: 500 }}>
                  <table>
                    <thead style={{ position: 'sticky', top: 0, background: '#F9FAFB', zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '12px 24px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Row</th>
                        <th style={{ padding: '12px 24px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Field</th>
                        <th style={{ padding: '12px 24px', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Issue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dryRunResult.errors.map((err, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#FFF' : '#F9FAFB' }}>
                          <td style={{ padding: '12px 24px', fontSize: 14, color: '#111827', fontWeight: 500 }}>{err.row_number}</td>
                          <td style={{ padding: '12px 24px', fontSize: 14, color: '#374151' }}>{err.field}</td>
                          <td style={{ padding: '12px 24px', fontSize: 14, color: '#DC2626' }}>{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#111827' }}>All rows are valid!</h3>
                  <p style={{ margin: 0, color: '#6B7280', fontSize: 14 }}>
                    Ready to commit {dryRunResult.valid.length} student{dryRunResult.valid.length !== 1 ? 's' : ''} to the database.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stage 3: Success Banner */}
          {stage3Success && (
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 48, textAlign: 'center' }}>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><CheckCircle size={48} color="#16A34A" /></div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 24, color: '#16A34A', fontWeight: 700 }}>
                {stage3Success.inserted} student{stage3Success.inserted !== 1 ? 's' : ''} successfully added.
              </h3>
              <p style={{ margin: '0 0 32px 0', color: '#6B7280', fontSize: 16 }}>
                The records have been saved to the database.
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button
                  onClick={() => router.push('/students')}
                  style={{
                    background: '#4F46E5', color: '#FFF', border: 'none',
                    padding: '12px 24px', borderRadius: 8, fontSize: 16, fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  View Students
                </button>
                <button
                  onClick={() => setStage3Success(null)}
                  style={{
                    background: '#FFF', color: '#374151', border: '1px solid #D1D5DB',
                    padding: '12px 24px', borderRadius: 8, fontSize: 16, fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Upload Another
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Toasts ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
          border: `1px solid ${toast.type === 'error' ? '#F87171' : '#34D399'}`,
          color: toast.type === 'error' ? '#991B1B' : '#065F46',
          padding: '12px 20px', borderRadius: 8, fontSize: 14,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span>{toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}</span>
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
