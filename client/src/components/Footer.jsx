import React from 'react';
import { ShieldCheck, Code2, Cpu, FileLock2 } from 'lucide-react';

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

        {/* WeCode License & Disclaimer Card */}
        <div className="footer-disclaimer-card" id="wecode-disclaimer-section">
          <div className="disclaimer-header">
            <div className="wecode-pill">
              <Code2 size={15} />
              <span>Developed under WeCode</span>
            </div>
            <span className="license-tag">Open Architecture • WeCode License</span>
          </div>
          <p className="disclaimer-text">
            <strong>Project Disclaimer & License Notice:</strong> This project is developed and maintained under the 
            <strong> WeCode</strong> initiative. Built with a strict privacy-by-design policy, all document byte streams 
            are processed exclusively within volatile, ephemeral server memory and are immediately garbage-collected 
            upon delivery—ensuring zero permanent storage or document logging. Released for developer, institutional, 
            and general productivity use in accordance with the WeCode Open Platform Guidelines.
          </p>
        </div>
      </div>
    </footer>
  );
}
