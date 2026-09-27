import React from 'react';
import { Layers, ShieldCheck, ArrowLeft, Sparkles } from 'lucide-react';

export function Header({ activeTool, onNavigateDashboard }) {
  return (
    <header className="site-header" id="main-site-header">
      <div className="header-inner">
        <button 
          id="brand-logo-btn"
          className="brand-link" 
          onClick={onNavigateDashboard}
          title="Return to PDFCraft Dashboard"
        >
          <div className="brand-icon-wrapper">
            <Layers size={22} />
          </div>
          <div className="brand-info">
            <div className="brand-title">
              PDFCraft <span className="brand-badge">Studio</span>
            </div>
            <span className="brand-tagline">High-Performance PDF Suite</span>
          </div>
        </button>

        <div className="header-actions">
          {activeTool ? (
            <button 
              id="header-back-to-hub-btn"
              className="nav-link-btn active"
              onClick={onNavigateDashboard}
            >
              <ArrowLeft size={16} />
              <span>Back to All Tools</span>
            </button>
          ) : (
            <div className="privacy-badge" id="security-assurance-badge">
              <ShieldCheck size={16} />
              <span>Zero-Retention Processing</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
