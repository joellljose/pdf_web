import React from 'react';
import { Shield, Zap, Lock, Cpu } from 'lucide-react';

export function Footer() {
  return (
    <footer className="site-footer" id="main-site-footer">
      <div className="footer-inner">
        <div>
          © {new Date().getFullYear()} PDFCraft Studio. Powered by Node.js, Express & React.
        </div>
        <div className="footer-links">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
            API Engine Online
          </span>
          <span className="footer-link">No Permanent Storage</span>
          <span className="footer-link">Pure In-Memory Processing</span>
        </div>
      </div>
    </footer>
  );
}
