const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'components', 'UploadModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remove Sidebar
content = content.replace(/\/\/ ─── Sidebar ────────────────[\s\S]*?\}\n/m, '');
// Wait, the Sidebar function goes up to `  );\n}`. Using a strict regex is better.
content = content.replace(/function Sidebar\(\{[\s\S]*?\n\}\n/m, '');

// Replace UploadPage definition
content = content.replace(/export default function UploadPage\(\) \{/m, `interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const router = useRouter();`);

// Add early return
content = content.replace(/const router = useRouter\(\);/, `if (!isOpen) return null;\n\n  const router = useRouter();`);

// In the Render section, replace the layout wrappers
// We need to replace the outermost div and main with a modal wrapper
const renderStart = `  // ─── Render ───────────────────────────────────────────────────────────────`;
const originalRenderStart = content.indexOf(renderStart);

if (originalRenderStart !== -1) {
  let renderPart = content.slice(originalRenderStart);
  
  // Replace the wrappers
  renderPart = renderPart.replace(/<div style=\{\{\s*fontFamily: "Inter.*?\}\}>\s*<style>[\s\S]*?<\/style>\s*<Sidebar[\s\S]*?\/>\s*<main\s*id="sl-main"[^>]*>\s*<header[^>]*>[\s\S]*?<\/header>/m, 
`<div
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
          padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB'
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111827' }}>Upload Students</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6B7280' }}>&times;</button>
        </header>
`);

  // Replace the closing tags and bottom nav
  renderPart = renderPart.replace(/<\/main>\s*<nav\s*id="cf-bottom-nav"[\s\S]*?<\/nav>\s*\{toast && \([\s\S]*?<\/div>\s*\)\}\s*<\/div>/m, 
`      </div>
    </div>
    {/* Toast inside portal or just overlay */}
    {toast && (
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
        background: toast.type === 'success' ? '#16A34A' : '#DC2626',
        color: '#FFFFFF', padding: '12px 24px', borderRadius: 8,
        fontSize: 14, fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}>
        {toast.message}
      </div>
    )}`);

  // Remove the `flex: 1` and replace overflow on the inner div
  renderPart = renderPart.replace(/<div style=\{\{ padding: 32, flex: 1, overflow: 'auto' \}\}>/, 
    `<div style={{ padding: 32, overflowY: 'auto', flex: 1 }}>`);

  content = content.slice(0, originalRenderStart) + renderPart;
}

// In the final save logic where it sets success, call onSuccess()
content = content.replace(/setStage3Success\(\{ inserted: data.inserted \}\);/g, `setStage3Success({ inserted: data.inserted });\n      if(onSuccess) onSuccess();`);

fs.writeFileSync(filePath, content);
console.log("Refactored UploadModal.tsx");
