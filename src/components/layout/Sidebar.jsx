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

  const isAdmin = userData?.role === 'admin';

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={toggleSidebar}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/assets/logo.png" alt="Savrin Technologies" style={{ width: '80px', height: '80px', borderRadius: '8px' }} />
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">SAVRIN </div>
            <div className="sidebar-logo-sub">PORTAL</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>

          {isAdmin ? (
            <>
              <div className="nav-section-label">Overview</div>
              <NavLink to="/admin" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>
                <span className="nav-icon"><img src="/assets/icons/dashboard.png" width="18" height="18" alt="" /></span>
                Master Dashboard
              </NavLink>

              <div className="nav-section-label" style={{ marginTop: '10px' }}>Management</div>
              <NavLink to="/admin/attendance" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><img src="/assets/icons/attendance.png" width="18" height="18" alt="" /></span>
                Attendance Logs
              </NavLink>
              <NavLink to="/admin/leaves" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><img src="/assets/icons/leave.png" width="18" height="18" alt="" /></span>
                Leave Requests
              </NavLink>
              <NavLink to="/admin/employees" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><img src="/assets/icons/management.png" width="18" height="18" alt="" /></span>
                Employee Directory
              </NavLink>
              <NavLink to="/admin/kanban" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></span>
                Task Management
              </NavLink>
              <NavLink to="/chats" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></span>
                Employee Chats
              </NavLink>

              <div className="nav-section-label" style={{ marginTop: '10px' }}>Resources & Support</div>
              <NavLink to="/resources/workshops" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></span>
                Workshops
              </NavLink>
              <NavLink to="/resources/timetable" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
                Timetable
              </NavLink>
              <NavLink to="/resources/calendar" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><img src="/assets/icons/calendar.png" width="18" height="18" alt="" /></span>
                Calendar
              </NavLink>
              <NavLink to="/resources/policy" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></span>
                Policy/Rule Book
              </NavLink>
              <NavLink to="/resources/feedback" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span>
                Employee Feedback
              </NavLink>
              <NavLink to="/resources/contacts" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>
                Contacts
              </NavLink>
              <NavLink to="/resources/meetings" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><img src="/assets/icons/meeting.png" width="18" height="18" alt="" /></span>
                Meetings
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/dashboard" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><img src="/assets/icons/dashboard.png" width="18" height="18" alt="" /></span>
                Dashboard
              </NavLink>
              <NavLink to="/profile" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
                My Profile
              </NavLink>

              <div className={`nav-parent ${openMenus.att ? 'open' : ''}`} onClick={() => toggleMenu('att')}>
                <span className="nav-icon"><img src="/assets/icons/attendance.png" width="18" height="18" alt="" /></span>
                <span>Log Time</span>
                <span className="nav-chevron">▼</span>
              </div>
              <div className={`nav-children ${openMenus.att ? 'open' : ''}`}>
                <NavLink to="/checkin" className={({isActive}) => `nav-child-link ${isActive ? 'active' : ''}`}>
                  Attendance
                </NavLink>
              </div>

              <div className={`nav-parent ${openMenus.leave ? 'open' : ''}`} onClick={() => toggleMenu('leave')}>
                <span className="nav-icon"><img src="/assets/icons/leave.png" width="18" height="18" alt="" /></span>
                <span>Leave</span>
                <span className="nav-chevron">▼</span>
              </div>
              <div className={`nav-children ${openMenus.leave ? 'open' : ''}`}>
                <NavLink to="/leave" className={({isActive}) => `nav-child-link ${isActive ? 'active' : ''}`}>
                  Leave Requests
                </NavLink>
              </div>

              <div className={`nav-parent ${openMenus.tasks ? 'open' : ''}`} onClick={() => toggleMenu('tasks')}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></span>
                <span>My Tasks</span>
                <span className="nav-chevron">▼</span>
              </div>
              <div className={`nav-children ${openMenus.tasks ? 'open' : ''}`}>
                <NavLink to="/kanban" className={({isActive}) => `nav-child-link ${isActive ? 'active' : ''}`}>
                  Allocated Tasks
                </NavLink>
              </div>

              <NavLink to="/chats" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></span>
                Chats
              </NavLink>

              <div className="nav-section-label">Resources & Support</div>
              <NavLink to="/resources/workshops" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></span>
                Workshops
              </NavLink>
              <NavLink to="/resources/timetable" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
                Timetable
              </NavLink>
              <NavLink to="/resources/calendar" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><img src="/assets/icons/calendar.png" width="18" height="18" alt="" /></span>
                Calendar
              </NavLink>
              <NavLink to="/resources/policy" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></span>
                Policy & Rule Book
              </NavLink>
              <NavLink to="/resources/feedback" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span>
                Employee Feedback
              </NavLink>
              <NavLink to="/resources/contacts" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>
                Contacts
              </NavLink>
              <NavLink to="/resources/meetings" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><img src="/assets/icons/meeting.png" width="18" height="18" alt="" /></span>
                Meetings
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
