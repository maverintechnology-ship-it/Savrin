import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { auth } from '../../firebase-config';
import { signOut } from 'firebase/auth';
import { 
  Shield, Building, FileText, LayoutDashboard, 
  Users, Clock, Calendar, User, CheckSquare, 
  Ticket, Columns, MessageSquare, BookOpen 
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ isOpen, toggleSidebar }) {
  const { userData } = useAuth();
  const { unreadChat, unreadResources, clearChatBadge, clearResourcesBadge } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});

  // Auto-clear badges when user visits the relevant page
  useEffect(() => {
    if (location.pathname === '/chat') clearChatBadge();
    if (location.pathname.startsWith('/resources')) clearResourcesBadge();
  }, [location.pathname, clearChatBadge, clearResourcesBadge]);

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
                <Shield className="nav-icon" /> Platform Master
              </NavLink>
            </>
          )}

          {role === 'company' && (
            <>
              <div className="nav-section-label">Management</div>
              <NavLink to="/company" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>
                <Building className="nav-icon" /> Company Overview
              </NavLink>
              <NavLink to="/resources/policy" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <FileText className="nav-icon" /> Company Policies
              </NavLink>
            </>
          )}

          {(role === 'admin' || role === 'company') && (
            <>
              <div className="nav-section-label">Administrative</div>
              <NavLink to="/admin" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>
                <LayoutDashboard className="nav-icon" /> Admin Dashboard
              </NavLink>
              <NavLink to="/admin/employees" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <Users className="nav-icon" /> Staff Directory
              </NavLink>
              <NavLink to="/admin/attendance" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <Clock className="nav-icon" /> Attendance
              </NavLink>
              <NavLink to="/admin/leaves" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <Calendar className="nav-icon" /> Leave Management
              </NavLink>
              {role === 'admin' && (
                <NavLink to="/resources/policy" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                  <FileText className="nav-icon" /> Company Policies
                </NavLink>
              )}
            </>
          )}

          {role === 'employee' && (
            <>
              <div className="nav-section-label">Employee Portal</div>
              <NavLink to="/dashboard" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard className="nav-icon" /> My Dashboard
              </NavLink>
              <NavLink to="/profile" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <User className="nav-icon" /> My Profile
              </NavLink>
              <NavLink to="/admin/employees" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <Users className="nav-icon" /> Staff Directory
              </NavLink>
              <NavLink to="/checkin" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <Clock className="nav-icon" /> Log Attendance
              </NavLink>
              <NavLink to="/leave" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <Calendar className="nav-icon" /> My Leaves
              </NavLink>
              <div className="nav-section-label">Company Documents</div>
              <NavLink to="/resources/policy" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <FileText className="nav-icon" /> Company Policies
              </NavLink>
            </>
          )}

          {role !== 'super_owner' && (
            <>
              <div className="nav-section-label">Collaboration</div>
              
              <div className={`nav-menu-group ${openMenus['tasks'] ? 'open' : ''}`}>
                <div className="nav-link" onClick={() => toggleMenu('tasks')} style={{ cursor: 'pointer' }}>
                  <CheckSquare className="nav-icon" />
                  <span>Tasks</span>
                  <span className="menu-arrow" style={{ marginLeft: 'auto', fontSize: '10px', transform: openMenus['tasks'] ? 'rotate(180deg)' : 'none', transition: '0.3s' }}>▼</span>
                </div>
                
                {openMenus['tasks'] && (
                  <div className="nav-submenu">
                    <NavLink to="/tickets" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                      <Ticket className="nav-icon" /> Ticket Rise Page
                    </NavLink>
                    <NavLink to="/kanban" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                      <Columns className="nav-icon" /> Kanban Board
                    </NavLink>
                  </div>
                )}
              </div>
              
              <NavLink to="/chat" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} onClick={clearChatBadge}>
                <MessageSquare className="nav-icon" /> Real-time Chat
                {unreadChat > 0 && (
                  <span className="nav-badge nav-badge-chat">{unreadChat > 9 ? '9+' : unreadChat}</span>
                )}
              </NavLink>

              <NavLink to="/resources/workshops" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} onClick={clearResourcesBadge}>
                <BookOpen className="nav-icon" /> Resources
                {unreadResources > 0 && (
                  <span className="nav-badge nav-badge-resources">{unreadResources > 9 ? '9+' : unreadResources}</span>
                )}
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
