import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase-config';
import { collection, addDoc } from 'firebase/firestore';
import './Topbar.css';

export default function Topbar({ title, toggleSidebar }) {
  const { userData } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(localStorage.getItem('hrms_isCheckedIn') === 'true');
  const [isOnBreak, setIsOnBreak] = useState(localStorage.getItem('hrms_isOnBreak') === 'true');
  const [seconds, setSeconds] = useState(parseInt(localStorage.getItem('hrms_secondsElapsed') || '0'));
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

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
