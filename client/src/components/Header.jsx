import React from 'react';
import { 
  Layers, ShieldCheck, ArrowLeft, LayoutGrid,
  Files, Scissors, Trash2, ArrowUpDown, FileText, Lock
} from 'lucide-react';
import { TOOLS } from '../config/tools';

const NAV_ICON_MAP = {
  Files: Files,
  Scissors: Scissors,
  Trash2: Trash2,
  ArrowUpDown: ArrowUpDown,
  FileWord: FileText,
  FileText: FileText,
  Lock: Lock
};

export function Header({ activeTool, onSelectTool, onNavigateDashboard, onShowToast }) {
  const activeTools = TOOLS.filter((tool) => tool.isAvailable);

  const handleToolClick = (tool) => {
    if (tool.isAvailable && onSelectTool) {
      onSelectTool(tool.id);
    } else if (onShowToast) {
      onShowToast({
        type: 'info',
        message: `${tool.title} is coming soon in our upcoming release!`
      });
    }
  };

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

      {/* Small, Simple Feature Navbar for Direct Access Without Scrolling */}
      <nav className="header-feature-nav" id="header-feature-nav" aria-label="Quick Feature Navigation">
        <div className="header-feature-nav-inner">
          <button
            id="nav-tool-dashboard"
            type="button"
            className={`nav-feature-pill ${!activeTool ? 'active' : ''}`}
            onClick={onNavigateDashboard}
            title="View All Tools Dashboard"
          >
            <LayoutGrid size={13} className="nav-feature-icon" />
            <span>All Tools</span>
          </button>

          <span className="nav-feature-divider" aria-hidden="true" />

          {activeTools.map((tool) => {
            const IconComponent = NAV_ICON_MAP[tool.iconName] || Files;
            const isActive = activeTool === tool.id;

            return (
              <button
                key={tool.id}
                id={`nav-tool-${tool.id}`}
                type="button"
                className={`nav-feature-pill ${isActive ? 'active' : ''}`}
                onClick={() => handleToolClick(tool)}
                title={`Launch ${tool.title}`}
                style={isActive ? { 
                  borderColor: tool.accentColor,
                  background: `${tool.accentColor}20`,
                  boxShadow: `0 0 12px ${tool.accentColor}30`,
                  color: '#fff'
                } : {}}
              >
                <IconComponent 
                  size={13} 
                  className="nav-feature-icon" 
                  style={{ color: isActive ? '#fff' : tool.accentColor }} 
                />
                <span>{tool.title}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
