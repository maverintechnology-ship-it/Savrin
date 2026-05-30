import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './DashboardLayout.css';

export default function DashboardLayout({ children, title, fullWidth = false, noPadding = false }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="app-layout">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Topbar title={title} toggleSidebar={toggleSidebar} />
        <div 
          className="page-body" 
          style={{ 
            maxWidth: fullWidth ? 'none' : '900px', 
            padding: noPadding ? '0' : '24px 28px',
            overflow: noPadding ? 'hidden' : 'auto',
            display: noPadding ? 'flex' : 'block',
            flexDirection: 'column'
          }}
        >
          {children}
        </div>
        {!noPadding && (
          <footer className="page-footer">
            © {new Date().getFullYear()} SAVRIN. All Rights Reserved.
          </footer>
        )}
      </div>
    </div>
  );
}
