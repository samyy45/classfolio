'use client';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.50)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        aria-describedby="cd-message"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <h2
          id="cd-title"
          style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3 }}
        >
          {title}
        </h2>

        <p
          id="cd-message"
          style={{ fontSize: 14, color: '#6B7280', marginTop: 8, marginBottom: 24, lineHeight: 1.55 }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            id="cd-cancel"
            onClick={onCancel}
            style={{
              padding: '9px 20px', fontSize: 14, fontWeight: 500,
              color: '#374151', background: '#FFFFFF',
              border: '1px solid #D1D5DB', borderRadius: 6,
              cursor: 'pointer', minHeight: 40,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
          >
            Cancel
          </button>

          <button
            id="cd-confirm"
            onClick={onConfirm}
            style={{
              padding: '9px 20px', fontSize: 14, fontWeight: 600,
              color: '#FFFFFF', background: '#DC2626',
              border: '1px solid #DC2626', borderRadius: 6,
              cursor: 'pointer', minHeight: 40,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#B91C1C'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#DC2626'; }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
