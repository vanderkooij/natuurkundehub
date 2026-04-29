import type React from 'react';
import { t, type Lang } from './i18n';

interface MobileToolbarProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  onLoad: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
}

const btnStyle: React.CSSProperties = {
  height: 36, padding: '0 14px',
  border: '1px solid #e0e0e0', borderRadius: 6,
  background: '#fff', cursor: 'pointer',
  fontSize: 13, color: '#1a1a1a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  whiteSpace: 'nowrap',
  display: 'flex', alignItems: 'center', gap: 6,
};

export function MobileToolbar({ lang, setLang, onLoad, onExportPNG, onExportSVG }: MobileToolbarProps) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 56,
      display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px',
      background: '#fff', borderTop: '1px solid #e0e0e0', zIndex: 15,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflowX: 'auto',
    }}>
      <button onClick={onLoad} style={btnStyle}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="2" y="4" width="12" height="10" rx="1"/>
          <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
          <line x1="8" y1="7" x2="8" y2="11"/>
          <polyline points="6,9 8,11 10,9"/>
        </svg>
        {t(lang, 'btn.load')}
      </button>

      <button onClick={onExportPNG} style={btnStyle}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="1" y="3" width="14" height="10" rx="1"/>
          <path d="M1 11l4-4 3 3 2-2 5 5"/>
          <circle cx="5" cy="7" r="1.2" fill="currentColor" stroke="none"/>
        </svg>
        PNG
      </button>

      <button onClick={onExportSVG} style={btnStyle}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="2,5 2,2 14,2 14,5"/>
          <polyline points="2,11 2,14 14,14 14,11"/>
          <line x1="8" y1="2" x2="8" y2="14"/>
        </svg>
        SVG
      </button>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', border: '1px solid #e0e0e0', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
        <button
          onClick={() => setLang('en')}
          title="English"
          style={{
            width: 36, height: 36, padding: 0, border: 'none',
            background: lang === 'en' ? '#f0f0f0' : '#fff',
            cursor: 'pointer', fontSize: 18, lineHeight: 1,
          }}
        >🇬🇧</button>
        <button
          onClick={() => setLang('nl')}
          title="Nederlands"
          style={{
            width: 36, height: 36, padding: 0, border: 'none', borderLeft: '1px solid #e0e0e0',
            background: lang === 'nl' ? '#f0f0f0' : '#fff',
            cursor: 'pointer', fontSize: 18, lineHeight: 1,
          }}
        >🇳🇱</button>
      </div>
    </div>
  );
}
