import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Dashboard } from './components/Dashboard';
import { MergeStudio } from './components/MergeStudio';
import { SplitStudio } from './components/SplitStudio';
import { ProtectStudio } from './components/ProtectStudio';
import { RemovePagesStudio } from './components/RemovePagesStudio';
import { ReorderPagesStudio } from './components/ReorderPagesStudio';
import { PdfToWordStudio } from './components/PdfToWordStudio';
import { ToastContainer } from './components/Toast';

export function App() {
  const [activeTool, setActiveTool] = useState(null); // null (dashboard) | 'merge-pdf' | 'split-pdf' | 'protect-pdf' | 'remove-pages' | 'reorder-pages' | 'pdf-to-word'
  const [toasts, setToasts] = useState([]);

  const showToast = ({ type = 'info', message, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="app-container" id="app-root">
      {/* Dynamic Ambient Glow Background */}
      <div className="ambient-glow-wrapper" aria-hidden="true">
        <div className="ambient-orb orb-1"></div>
        <div className="ambient-orb orb-2"></div>
        <div className="ambient-orb orb-3"></div>
      </div>

      {/* Main Navigation Header */}
      <Header 
        activeTool={activeTool} 
        onNavigateDashboard={() => setActiveTool(null)} 
      />

      {/* Main Content Area */}
      <main className="main-content" id="main-content-region">
        {activeTool === 'merge-pdf' ? (
          <MergeStudio
            onBackToDashboard={() => setActiveTool(null)}
            onShowToast={showToast}
          />
        ) : activeTool === 'split-pdf' ? (
          <SplitStudio
            onBackToDashboard={() => setActiveTool(null)}
            onShowToast={showToast}
          />
        ) : activeTool === 'protect-pdf' ? (
          <ProtectStudio
            onBackToDashboard={() => setActiveTool(null)}
            onShowToast={showToast}
          />
        ) : activeTool === 'remove-pages' ? (
          <RemovePagesStudio
            onBackToDashboard={() => setActiveTool(null)}
            onShowToast={showToast}
          />
        ) : activeTool === 'reorder-pages' ? (
          <ReorderPagesStudio
            onBackToDashboard={() => setActiveTool(null)}
            onShowToast={showToast}
          />
        ) : activeTool === 'pdf-to-word' ? (
          <PdfToWordStudio
            onBackToDashboard={() => setActiveTool(null)}
            onShowToast={showToast}
          />
        ) : (
          <Dashboard
            onSelectTool={(toolId) => setActiveTool(toolId)}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Persistent Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Site Footer */}
      <Footer />
    </div>
  );
}

export default App;
