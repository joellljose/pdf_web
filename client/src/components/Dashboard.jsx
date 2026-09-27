import React, { useState } from 'react';
import { 
  Search, X, Files, Scissors, Minimize2, Image as ImageIcon, 
  Lock, RotateCw, ArrowRight, ShieldCheck, Zap, Sparkles, Layers, CheckCircle 
} from 'lucide-react';
import { TOOLS, TOOL_CATEGORIES } from '../config/tools';

const ICON_MAP = {
  Files: Files,
  Scissors: Scissors,
  Minimize2: Minimize2,
  Image: ImageIcon,
  Lock: Lock,
  RotateCw: RotateCw
};

export function Dashboard({ onSelectTool, onShowToast }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTools = TOOLS.filter((tool) => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch = 
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleToolClick = (tool) => {
    if (tool.isAvailable) {
      onSelectTool(tool.id);
    } else {
      onShowToast({
        type: 'info',
        message: `${tool.title} is coming soon in our upcoming release! Try "Merge PDF" today.`
      });
    }
  };

  return (
    <div className="dashboard-wrapper" id="dashboard-view">
      {/* Hero Section */}
      <section className="hero-section" id="hero-section">
        <div className="hero-pill" id="hero-feature-pill">
          <Sparkles size={14} />
          <span>New: Ultra-Fast In-Memory PDF Engine</span>
        </div>
        
        <h1 className="hero-title" id="hero-main-heading">
          Craft & Merge Documents with <span className="gradient-text">Zero Friction</span>
        </h1>
        
        <p className="hero-subtitle">
          An extensible, privacy-first PDF utility suite. Effortlessly combine, reorder, and optimize 
          your documents with real-time feedback and high-fidelity output.
        </p>

        {/* Search & Category Filter Controls */}
        <div className="hub-controls" id="hub-filter-controls">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              id="tool-search-input"
              type="text"
              className="search-input"
              placeholder="Search tools (e.g. merge, split, compress)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search PDF tools"
            />
            {searchQuery && (
              <button 
                id="search-clear-btn"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="category-filter-bar" id="category-filter-pills" role="tablist">
            {TOOL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                id={`cat-filter-${cat.id}`}
                className={`filter-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
                role="tab"
                aria-selected={selectedCategory === cat.id}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="tools-grid-section" aria-label="Available PDF Tools">
        <div className="tools-grid" id="tools-card-grid">
          {filteredTools.map((tool) => {
            const IconComponent = ICON_MAP[tool.iconName] || Files;
            const isClickable = tool.isAvailable;

            return (
              <div
                key={tool.id}
                id={`tool-card-${tool.id}`}
                className={`tool-card ${!isClickable ? 'coming-soon' : ''}`}
                onClick={() => handleToolClick(tool)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToolClick(tool);
                  }
                }}
                aria-label={`${tool.title}: ${tool.description}`}
              >
                <div>
                  <div className="tool-card-top">
                    <div 
                      className="tool-icon-wrapper" 
                      style={{ 
                        background: `${tool.accentColor}18`, 
                        color: tool.accentColor,
                        border: `1px solid ${tool.accentColor}35` 
                      }}
                    >
                      <IconComponent size={26} />
                    </div>

                    <span className={`tool-badge-pill badge-${tool.badgeType}`}>
                      {tool.badge}
                    </span>
                  </div>

                  <div className="tool-info">
                    <h3 className="tool-name">{tool.title}</h3>
                    <p className="tool-desc">{tool.description}</p>
                  </div>
                </div>

                <div className="tool-card-footer">
                  <span className="tool-cat-tag">{tool.highlight}</span>
                  <span className="tool-action-label">
                    {isClickable ? (
                      <>
                        Launch Tool <ArrowRight size={14} />
                      </>
                    ) : (
                      <span>In Development</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTools.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No tools found matching "{searchQuery}"</p>
            <button 
              className="action-btn-sm" 
              style={{ margin: '0 auto' }}
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            >
              Reset filters
            </button>
          </div>
        )}
      </section>

      {/* Feature Highlights Banner */}
      <section className="highlights-section" id="highlights-section">
        <div className="highlight-card">
          <div className="highlight-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h4 className="highlight-title">100% Private & Safe</h4>
            <p className="highlight-text">Your files are processed in secure volatile memory and never stored or retained.</p>
          </div>
        </div>

        <div className="highlight-card">
          <div className="highlight-icon" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#22d3ee' }}>
            <Zap size={22} />
          </div>
          <div>
            <h4 className="highlight-title">Lightning Processing</h4>
            <p className="highlight-text">Streamlined byte-level PDF assembly ensures quick merging in just milliseconds.</p>
          </div>
        </div>

        <div className="highlight-card">
          <div className="highlight-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
            <Layers size={22} />
          </div>
          <div>
            <h4 className="highlight-title">Interactive Staging</h4>
            <p className="highlight-text">Reorder, inspect page counts, rename output files, and preview before saving.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
