import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase-config';
import { signOut } from 'firebase/auth';
import './Sidebar.css';

export default function Sidebar({ isOpen, toggleSidebar }) {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({});

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const toggleMenu = (menuId) => {
    setOpenMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const role = userData?.role;

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={toggleSidebar}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/assets/logo.png" alt="Savrin" />
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">SAVRIN</div>
            <div className="sidebar-logo-sub">PORTAL</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {role === 'super_owner' && (
            <>
              <div className="nav-section-label">System Control</div>
              <NavLink to="/super-admin" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>
                Platform Master
              </NavLink>
            </>
          )}

          {role === 'company' && (
            <>
              <div className="nav-section-label">Management</div>
              <NavLink to="/company" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>
                Company Overview
              </NavLink>
              <NavLink to="/resources/policy" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                Company Policies
              </NavLink>
            </>
          )}

          {(role === 'admin' || role === 'company') && (
            <>
              <div className="nav-section-label">Administrative</div>
              <NavLink to="/admin" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>
                Admin Dashboard
              </NavLink>
              <NavLink to="/admin/employees" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                Staff Directory
              </NavLink>
              <NavLink to="/admin/attendance" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                Attendance
              </NavLink>
              <NavLink to="/admin/leaves" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                Leave Management
              </NavLink>
            </>
          )}

          {role === 'employee' && (
            <>
              <div className="nav-section-label">Employee Portal</div>
              <NavLink to="/dashboard" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                My Dashboard
              </NavLink>
              <NavLink to="/profile" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                My Profile
              </NavLink>
              <NavLink to="/checkin" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                Log Attendance
              </NavLink>
              <NavLink to="/leave" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                My Leaves
              </NavLink>
            </>
          )}

          {role !== 'super_owner' && (
            <>
              <div className="nav-section-label">Collaboration</div>
              
              <div className={`nav-menu-group ${openMenus['tasks'] ? 'open' : ''}`}>
                <div className="nav-link" onClick={() => toggleMenu('tasks')} style={{ cursor: 'pointer' }}>
                  Tasks
                  <span className="menu-arrow" style={{ marginLeft: 'auto', fontSize: '10px', transform: openMenus['tasks'] ? 'rotate(180deg)' : 'none', transition: '0.3s' }}>▼</span>
                </div>
                
                {openMenus['tasks'] && (
                  <div className="nav-submenu">
                    <NavLink to="/tickets" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                      Ticket Rise Page
                    </NavLink>
                    <NavLink to="/kanban" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                      Kanban Board
                    </NavLink>
                  </div>
                )}
              </div>
              
              <NavLink to="/resources/workshops" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                Resources
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{userData?.name || 'Loading...'}</div>
              <div className="sidebar-user-role">{userData?.role || 'User'}</div>
            </div>
            <button className="sidebar-logout" onClick={handleLogout} title="Logout">
              ⏻
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
