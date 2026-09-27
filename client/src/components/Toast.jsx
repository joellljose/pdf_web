import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" id="toast-notifications-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 4500);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const isError = toast.type === 'error';

  return (
    <div className={`toast ${isError ? 'toast-error' : 'toast-success'}`} id={`toast-${toast.id}`}>
      {isError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}
