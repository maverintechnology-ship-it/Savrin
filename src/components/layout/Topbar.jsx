import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { db } from '../../firebase-config';
import { collection, addDoc } from 'firebase/firestore';
import './Topbar.css';

export default function Topbar({ title, toggleSidebar }) {
  const { userData } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    readNotifIds, 
    markAsRead, 
    markAllAsRead, 
    clearAllNotifications, 
    deleteNotification 
  } = useNotifications();
  const navigate = useNavigate();

  const [isCheckedIn, setIsCheckedIn] = useState(localStorage.getItem('hrms_isCheckedIn') === 'true');
  const [isOnBreak, setIsOnBreak] = useState(localStorage.getItem('hrms_isOnBreak') === 'true');
  const [seconds, setSeconds] = useState(parseInt(localStorage.getItem('hrms_secondsElapsed') || '0'));
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifDropdownRef = useRef(null);

  useEffect(() => {
    const handleStorage = () => {
      setIsCheckedIn(localStorage.getItem('hrms_isCheckedIn') === 'true');
      setIsOnBreak(localStorage.getItem('hrms_isOnBreak') === 'true');
      setSeconds(parseInt(localStorage.getItem('hrms_secondsElapsed') || '0'));
    };
    
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1000);
    
    // Click outside handler
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatTime = (s) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const handleCheckIn = async () => {
    const now = new Date();
    const isoTime = now.toISOString();
    const displayTime = now.toLocaleString();

    await addDoc(collection(db, 'attendance'), {
      userId: userData.id,
      userName: userData.name,
      type: 'checkin',
      time: isoTime
    });

    localStorage.setItem('hrms_isCheckedIn', 'true');
    localStorage.setItem('hrms_lastCheckInTime', isoTime);
    localStorage.setItem('hrms_timeIn', displayTime);
    localStorage.setItem('hrms_secondsElapsed', '0');
    localStorage.setItem('hrms_breakHistory', '[]');
    localStorage.setItem('hrms_isOnBreak', 'false');
    
    setIsCheckedIn(true);
    setShowDropdown(false);
  };

  const handleCheckOut = async () => {
    if (isOnBreak) handleBreak('end');
    
    const now = new Date();
    const totalSec = parseInt(localStorage.getItem('hrms_secondsElapsed') || '0');
    
    await addDoc(collection(db, 'attendance'), {
      userId: userData.id,
      userName: userData.name,
      type: 'checkout',
      time: now.toISOString(),
      secondsElapsed: totalSec
    });

    localStorage.setItem('hrms_isCheckedIn', 'false');
    localStorage.setItem('hrms_timeOut', now.toLocaleString());
    localStorage.removeItem('hrms_lastCheckInTime');
    localStorage.removeItem('hrms_secondsElapsed');
    localStorage.removeItem('hrms_breakHistory');
    localStorage.removeItem('hrms_isOnBreak');
    localStorage.removeItem('hrms_currentBreakStart');

    setIsCheckedIn(false);
    setShowDropdown(false);
  };

  const handleBreak = (type) => {
    const now = new Date().toISOString();
    if (type === 'start') {
      localStorage.setItem('hrms_isOnBreak', 'true');
      localStorage.setItem('hrms_currentBreakStart', now);
      setIsOnBreak(true);
    } else {
      const start = localStorage.getItem('hrms_currentBreakStart');
      const history = JSON.parse(localStorage.getItem('hrms_breakHistory') || '[]');
      history.push({ start, end: now });
      localStorage.setItem('hrms_breakHistory', JSON.stringify(history));
      localStorage.removeItem('hrms_currentBreakStart');
      localStorage.setItem('hrms_isOnBreak', 'false');
      setIsOnBreak(false);
    }
    setShowDropdown(false);
  };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffSec = Math.floor((now - new Date(date)) / 1000);
    
    if (diffSec < 60) return 'just now';
    
    const minutes = Math.floor(diffSec / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const d = new Date();
  const dateStr = d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
        <span className="topbar-title">{title || 'Dashboard'}</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <span className="topbar-date" style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{dateStr}</span>
        
        {/* Premium Notifications Bell & Dropdown */}
        {userData && (
          <div className="notification-bell-container" ref={notifDropdownRef}>
            <button className="notification-bell" onClick={() => setShowNotifDropdown(!showNotifDropdown)} title="Notifications">
              <Bell size={18} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
            
            {showNotifDropdown && (
              <div className="notification-dropdown">
                <div className="notification-dropdown-header">
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <button className="mark-read-btn" onClick={markAllAsRead}>
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="notification-list">
                  {notifications.length > 0 ? (
                    notifications.map(notif => {
                      const isUnread = !readNotifIds.includes(notif.id);
                      return (
                        <div
                          key={notif.id}
                          className={`notification-item ${isUnread ? 'unread' : ''}`}
                          onClick={() => {
                            markAsRead(notif.id);
                            setShowNotifDropdown(false);
                            navigate(notif.link);
                          }}
                        >
                          <div className="notification-item-icon">
                            {notif.icon}
                          </div>
                          <div className="notification-item-content">
                            <div className="notification-item-title">
                              {notif.title}
                            </div>
                            <div className="notification-item-message">
                              {notif.message}
                            </div>
                            <div className="notification-item-time">
                              {formatTimeAgo(notif.timestamp)}
                            </div>
                          </div>
                          {isUnread && <div className="notification-item-unread-dot" />}
                          <button
                            className="notification-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            title="Dismiss"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="notification-empty">
                      <div className="notification-empty-icon">🔔</div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>All caught up!</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>No new notifications</div>
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="notification-dropdown-footer">
                    <button className="clear-all-btn" onClick={clearAllNotifications}>
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {userData?.role === 'employee' && (
          <div className="global-checkin-widget" ref={dropdownRef} onClick={() => setShowDropdown(!showDropdown)}>
            <span className="timer-text" style={{ color: isCheckedIn ? (isOnBreak ? 'var(--warning)' : 'var(--primary)') : 'var(--text-light)' }}>
              {isCheckedIn ? formatTime(seconds) : '00:00:00'}
            </span>
            <div className="status-indicator" style={{ background: isCheckedIn ? (isOnBreak ? 'var(--warning)' : 'var(--success)') : 'var(--text-light)' }}></div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isCheckedIn ? (isOnBreak ? 'Break' : 'Active') : 'Offline'}
            </span>
            
            {showDropdown && (
              <div className="widget-dropdown" onClick={(e) => e.stopPropagation()}>
                {!isCheckedIn ? (
                  <div className="dropdown-item" onClick={handleCheckIn}>
                    <span style={{ fontSize: '18px' }}>🚀</span> Check In Now
                  </div>
                ) : (
                  <>
                    <div className="dropdown-item" onClick={handleCheckOut}>
                      <span style={{ fontSize: '18px' }}>🏁</span> Log Out
                    </div>
                    {!isOnBreak ? (
                      <div className="dropdown-item" onClick={() => handleBreak('start')}>
                        <span style={{ fontSize: '18px' }}>☕</span> Take a Break
                      </div>
                    ) : (
                      <div className="dropdown-item" onClick={() => handleBreak('end')}>
                        <span style={{ fontSize: '18px' }}>🛠</span> Resume Work
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
