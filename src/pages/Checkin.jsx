import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { collection, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase-config';
import './Checkin.css';

export default function Checkin() {
  const { userData } = useAuth();
  
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  
  const [timeIn, setTimeIn] = useState('—');
  const [timeOut, setTimeOut] = useState('—');
  const [totalHours, setTotalHours] = useState('—');
  
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [breakSecondsUsed, setBreakSecondsUsed] = useState(0);
  
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const processingRef = useRef(false);

  useEffect(() => {
    // Load local state
    setIsCheckedIn(localStorage.getItem('hrms_isCheckedIn') === 'true');
    setIsOnBreak(localStorage.getItem('hrms_isOnBreak') === 'true');
    setTimeIn(localStorage.getItem('hrms_timeIn') || '—');
    setTimeOut(localStorage.getItem('hrms_timeOut') || '—');
    setTotalHours(localStorage.getItem('hrms_totalHours') || '—');
    
    // We don't set secondsElapsed here as the timer effect will calculate it from lastCheckInTime
  }, []);

  const calculateBreakTime = () => {
    const savedBreaks = JSON.parse(localStorage.getItem('hrms_breakHistory') || '[]');
    let total = 0;
    savedBreaks.forEach((b) => {
      if (b.start && b.end) {
        total += Math.floor((new Date(b.end) - new Date(b.start)) / 1000);
      }
    });
    if (localStorage.getItem('hrms_isOnBreak') === 'true') {
      const current = localStorage.getItem('hrms_currentBreakStart');
      if (current) {
        total += Math.floor((Date.now() - new Date(current)) / 1000);
      }
    }
    return total;
  };

  useEffect(() => {
    let interval;
    if (isCheckedIn) {
      interval = setInterval(() => {
        const checkInTime = localStorage.getItem('hrms_lastCheckInTime');
        if (!checkInTime) return;

        const totalElapsed = Math.floor((Date.now() - new Date(checkInTime)) / 1000);
        const breakUsed = calculateBreakTime();
        setBreakSecondsUsed(breakUsed);
        const working = Math.max(0, totalElapsed - breakUsed);
        setSecondsElapsed(working);
        localStorage.setItem('hrms_secondsElapsed', working.toString());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCheckedIn]);

  useEffect(() => {
    if (!userData) return;

    const q = query(
      collection(db, 'attendance'), 
      where('userId', '==', userData.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      // Sort in memory to avoid index requirements
      docs.sort((a, b) => new Date(b.time) - new Date(a.time));
      setAttendanceHistory(docs);
    });

    return () => unsubscribe();
  }, [userData]);

  const formatTime = (sec) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleCheckIn = async () => {
    if (processingRef.current || isCheckedIn) return;
    processingRef.current = true;

    try {
      const now = new Date();
      const isoTime = now.toISOString();
      const displayTime = now.toLocaleString();

      await addDoc(collection(db, 'attendance'), {
        userId: userData.id,
        userName: userData.name,
        type: 'checkin',
        time: isoTime
      });

      setIsCheckedIn(true);
      setSecondsElapsed(0);
      setBreakSecondsUsed(0);
      setTimeIn(displayTime);
      
      localStorage.setItem('hrms_isCheckedIn', 'true');
      localStorage.setItem('hrms_lastCheckInTime', isoTime);
      localStorage.setItem('hrms_timeIn', displayTime);
      localStorage.setItem('hrms_secondsElapsed', '0');
      localStorage.setItem('hrms_breakHistory', '[]');
      localStorage.setItem('hrms_isOnBreak', 'false');
    } catch (err) {
      console.error(err);
      alert('Check-in failed');
    } finally {
      processingRef.current = false;
    }
  };

  const handleCheckOut = async () => {
    if (!isCheckedIn || processingRef.current) return;
    processingRef.current = true;

    try {
      if (isOnBreak) handleBreak('end');
      
      const now = new Date();
      const displayTime = now.toLocaleString();
      const totalSec = secondsElapsed;
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const totalHoursStr = `${h}h ${m}m`;

      await addDoc(collection(db, 'attendance'), {
        userId: userData.id,
        userName: userData.name,
        type: 'checkout',
        time: now.toISOString(),
        secondsElapsed: totalSec
      });

      setIsCheckedIn(false);
      setSecondsElapsed(0);
      setTimeOut(displayTime);
      setTotalHours(totalHoursStr);

      localStorage.setItem('hrms_isCheckedIn', 'false');
      localStorage.setItem('hrms_timeOut', displayTime);
      localStorage.setItem('hrms_totalHours', totalHoursStr);
      localStorage.removeItem('hrms_lastCheckInTime');
      localStorage.removeItem('hrms_secondsElapsed');
      localStorage.removeItem('hrms_breakHistory');
      localStorage.removeItem('hrms_isOnBreak');
      localStorage.removeItem('hrms_currentBreakStart');
    } catch (err) {
      console.error(err);
      alert('Checkout failed');
    } finally {
      processingRef.current = false;
    }
  };

  const handleBreak = (type) => {
    const now = new Date().toISOString();
    if (type === 'start') {
      setIsOnBreak(true);
      localStorage.setItem('hrms_isOnBreak', 'true');
      localStorage.setItem('hrms_currentBreakStart', now);
    } else {
      const start = localStorage.getItem('hrms_currentBreakStart');
      if (!start) return;
      
      const history = JSON.parse(localStorage.getItem('hrms_breakHistory') || '[]');
      history.push({ start, end: now });
      localStorage.setItem('hrms_breakHistory', JSON.stringify(history));
      localStorage.removeItem('hrms_currentBreakStart');
      localStorage.setItem('hrms_isOnBreak', 'false');
      
      setIsOnBreak(false);
      setBreakSecondsUsed(calculateBreakTime());
    }
  };

  const getGroupedHistory = () => {
    const sessions = [];
    const sorted = [...attendanceHistory].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    let currentSession = null;
    
    sorted.forEach(record => {
      const date = new Date(record.time).toLocaleDateString();
      const time = new Date(record.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (record.type === 'checkin') {
        if (currentSession) sessions.push(currentSession);
        currentSession = { date, name: record.userName, in: time, out: '—' };
      } else if (record.type === 'checkout') {
        if (currentSession) {
          currentSession.out = time;
          sessions.push(currentSession);
          currentSession = null;
        } else {
          sessions.push({ date, name: record.userName, in: '—', out: time });
        }
      }
    });
    
    if (currentSession) sessions.push(currentSession);
    return sessions.reverse(); // Newest first
  };

  const downloadCSV = () => {
    const history = getGroupedHistory();
    if (history.length === 0) return;
    let csv = 'Date,Name,In Time,Out Time\n';
    history.forEach(row => {
      csv += `${row.date},${row.name},${row.in},${row.out}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="Attendance">
      <div className="checkin-hero">
        <div className="checkin-hero-text">
          <h2>Check In to Start Working</h2>
          <p>Track your work hours accurately. Check in when you start and check out when you're done. Breaks are recorded separately.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="timer-card">
            <div className="time">{formatTime(secondsElapsed)}</div>
            <div className="status">{isCheckedIn ? (isOnBreak ? 'ON BREAK' : 'CHECKED IN') : 'NOT CHECKED IN'}</div>
          </div>
          <div className="checkin-hero-actions">
            <button className="btn btn-success" onClick={handleCheckIn} disabled={isCheckedIn}>Check In</button>
            <button className="btn btn-danger" onClick={handleCheckOut} disabled={!isCheckedIn}>Log Out</button>
          </div>
        </div>
      </div>

      {isCheckedIn && (
        <div style={{ marginBottom: '20px' }}>
          <div className="card" style={{ background: '#fff', borderRadius: '10px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
              <span style={{ fontSize: '15px', fontWeight: '700' }}>☕ Break Management</span>
              <div className="break-info-row">
                <span>Used: <b>{formatTime(breakSecondsUsed)}</b></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-warning" onClick={() => handleBreak('start')} disabled={isOnBreak}>Start Break</button>
              <button className="btn btn-ghost" onClick={() => handleBreak('end')} disabled={!isOnBreak}>End Break</button>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#38bdf8', marginBottom: '14px' }}>Login Details</h3>
      <div className="dark-card" style={{ marginBottom: '24px', maxWidth: '600px' }}>
        <div className="dark-card-row">
          <span className="label">Log In Time</span><span className="sep">:</span><span className="value">{timeIn}</span>
        </div>
        <div className="dark-card-row">
          <span className="label">Log Out Time</span><span className="sep">:</span><span className="value">{timeOut}</span>
        </div>
        <div className="dark-card-row">
          <span className="label">Duration</span><span className="sep">:</span><span className="value">{totalHours}</span>
        </div>
      </div>

      <div className="card" style={{ background: '#fff', borderRadius: '10px', padding: '22px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <div className="card-header" style={{ marginBottom: '18px', padding: 0, border: 'none' }}>
          <span style={{ fontSize: '15px', fontWeight: '700' }}>Attendance History</span>
          <button onClick={downloadCSV} className="btn btn-outline btn-small" disabled={attendanceHistory.length === 0}>
            Download CSV
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>In Time</th>
                <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Out Time</th>
              </tr>
            </thead>
            <tbody>
              {getGroupedHistory().length === 0 ? (
                <tr><td colSpan="4"><div className="empty-state"><p>No records yet</p></div></td></tr>
              ) : (
                getGroupedHistory().map((session, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>{session.date}</td>
                    <td style={{ padding: '12px 16px' }}>{session.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                        {session.in}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                        {session.out}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}