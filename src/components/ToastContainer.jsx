import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import './ToastContainer.css';

export default function ToastContainer() {
  const { toasts, removeToast } = useNotifications();
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast, idx) => (
        <div
          key={toast.id}
          className={`toast-item toast-${toast.type}`}
          style={{ animationDelay: `${idx * 60}ms` }}
          onClick={() => {
            if (toast.link) navigate(toast.link);
            removeToast(toast.id);
          }}
        >
          <div className="toast-icon-wrap">
            <span className="toast-icon">{toast.icon}</span>
          </div>
          <div className="toast-body">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button
            className="toast-close"
            onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
            aria-label="Dismiss"
          >
            ×
          </button>
          <div className="toast-progress">
            <div className={`toast-progress-bar toast-progress-${toast.type}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
