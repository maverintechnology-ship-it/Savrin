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
    if (!userData?.companyId) return;

    const q = query(
      collection(db, 'attendance'), 
      where('companyId', '==', userData.companyId),
      where('userId', '==', userData.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
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
        companyId: userData.companyId,
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
        companyId: userData.companyId,
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

  const handleBreak = async (type) => {
    const now = new Date();
    const isoTime = now.toISOString();
    
    if (type === 'start') {
      try {
        await addDoc(collection(db, 'attendance'), {
          userId: userData.id,
          userName: userData.name,
          companyId: userData.companyId,
          type: 'break_start',
          time: isoTime
        });
        setIsOnBreak(true);
        localStorage.setItem('hrms_isOnBreak', 'true');
        localStorage.setItem('hrms_currentBreakStart', isoTime);
      } catch (err) {
        console.error("Failed to start break", err);
      }
    } else {
      try {
        const start = localStorage.getItem('hrms_currentBreakStart');
        await addDoc(collection(db, 'attendance'), {
          userId: userData.id,
          userName: userData.name,
          companyId: userData.companyId,
          type: 'break_end',
          time: isoTime,
          breakStart: start
        });
        
        const history = JSON.parse(localStorage.getItem('hrms_breakHistory') || '[]');
        history.push({ start, end: isoTime });
        localStorage.setItem('hrms_breakHistory', JSON.stringify(history));
        localStorage.removeItem('hrms_currentBreakStart');
        localStorage.setItem('hrms_isOnBreak', 'false');
        
        setIsOnBreak(false);
        setBreakSecondsUsed(calculateBreakTime());
      } catch (err) {
        console.error("Failed to end break", err);
      }
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
    <DashboardLayout title="Attendance Hub">
      <div style={{ position: 'relative' }}>
        {/* Decorative Background Elements for Glassmorphism */}
        {/* Decorative Background Elements for Sky Blue Glassmorphism */}
        <div style={{ 
          position: 'absolute', top: '-40px', left: '20%', width: '300px', height: '300px', 
          background: 'radial-gradient(circle, rgba(125, 211, 252, 0.3) 0%, transparent 70%)', 
          borderRadius: '50%', zIndex: 0, pointerEvents: 'none' 
        }}></div>
        <div style={{ 
          position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', 
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%)', 
          borderRadius: '50%', zIndex: 0, pointerEvents: 'none' 
        }}></div>

        <div className="checkin-hero" style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #7dd3fc 100%)', boxShadow: '0 20px 40px rgba(56, 189, 248, 0.15)', border: '1px solid rgba(255, 255, 255, 0.4)' }}>
          <div className="checkin-hero-text">
            <h2 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.02em', color: '#0369a1' }}>
              {isCheckedIn ? 'Have a Productive Day!' : 'Ready to Start Your Shift?'}
            </h2>
            <p style={{ maxWidth: '500px', fontSize: '17px', lineHeight: '1.6', color: '#075985', fontWeight: '500' }}>
              Every second counts towards excellence. Log your presence, maintain your flow, and stay connected with your team.
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div className="timer-card" style={{ minWidth: '320px', background: 'rgba(255, 255, 255, 0.4)', border: '1px solid rgba(255, 255, 255, 0.6)', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.1)' }}>
              <div className="time" style={{ fontSize: '56px', letterSpacing: '3px', fontWeight: '900', textShadow: '0 2px 10px rgba(255,255,255,0.5)', color: '#0369a1' }}>{formatTime(secondsElapsed)}</div>
              <div className="status" style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '2px', color: '#075985' }}>
                {isCheckedIn ? (isOnBreak ? 'ON OFFICIAL BREAK' : 'ACTIVE WORK SESSION') : 'SYSTEM OFFLINE'}
              </div>
            </div>
            <div className="checkin-hero-actions" style={{ display: 'flex', gap: '16px' }}>
              {!isCheckedIn ? (
                <button className="btn btn-primary" onClick={handleCheckIn} style={{ background: '#0369a1', color: '#fff', padding: '14px 48px', fontWeight: '800', fontSize: '16px', borderRadius: '16px', boxShadow: '0 10px 20px rgba(3, 105, 161, 0.2)' }}>
                  🚀 Start Session
                </button>
              ) : (
                <button className="btn btn-danger" onClick={handleCheckOut} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '14px 48px', fontWeight: '800', fontSize: '16px', borderRadius: '16px' }}>
                  🏁 End Session
                </button>
              )}
            </div>
          </div>
        </div>

        {isCheckedIn && (
          <div style={{ marginBottom: '40px', position: 'relative', zIndex: 1 }}>
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', background: 'rgba(240, 249, 255, 0.7)', borderColor: 'rgba(186, 230, 253, 0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="stat-icon-wrap" style={{ width: '56px', height: '56px', fontSize: '24px', background: '#fff', color: '#0ea5e9', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.1)' }}>☕</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '17px', color: '#0369a1' }}>Break Management</div>
                  <div style={{ fontSize: '14px', color: '#075985', marginTop: '2px' }}>Total break time used: <strong style={{ color: '#0ea5e9' }}>{formatTime(breakSecondsUsed)}</strong></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                {!isOnBreak ? (
                  <button className="btn btn-outline" onClick={() => handleBreak('start')} style={{ borderRadius: '12px', padding: '10px 24px', fontWeight: '600', borderColor: '#0ea5e9', color: '#0ea5e9', background: '#fff' }}>
                    Start Break
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => handleBreak('end')} style={{ borderRadius: '12px', padding: '10px 24px', fontWeight: '600', background: '#0ea5e9' }}>
                    Resume Work
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="stats-row" style={{ marginBottom: '40px', position: 'relative', zIndex: 1 }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '28px', background: 'rgba(255, 255, 255, 0.8)' }}>
            <div className="stat-icon-wrap" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>🕒</div>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '20px', fontWeight: '800', color: '#0369a1' }}>{timeIn}</span>
              <span className="stat-label" style={{ color: '#0ea5e9' }}>Check-In Time</span>
            </div>
          </div>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '28px', background: 'rgba(255, 255, 255, 0.8)' }}>
            <div className="stat-icon-wrap" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>🕒</div>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '20px', fontWeight: '800', color: '#0369a1' }}>{timeOut}</span>
              <span className="stat-label" style={{ color: '#0ea5e9' }}>Check-Out Time</span>
            </div>
          </div>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '28px', background: 'rgba(255, 255, 255, 0.8)' }}>
            <div className="stat-icon-wrap" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>⌛</div>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: '20px', fontWeight: '800', color: '#0369a1' }}>{totalHours}</span>
              <span className="stat-label" style={{ color: '#0ea5e9' }}>Last Duration</span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '32px', position: 'relative', zIndex: 1, background: 'rgba(255, 255, 255, 0.9)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h3 className="card-title" style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0369a1' }}>Attendance History</h3>
              <p style={{ color: '#0ea5e9', fontSize: '13px', marginTop: '4px', opacity: 0.8 }}>Review your past activity and session details.</p>
            </div>
            <button onClick={downloadCSV} className="btn btn-outline btn-small" disabled={attendanceHistory.length === 0} style={{ padding: '8px 20px', borderRadius: '10px', borderColor: '#0ea5e9', color: '#0ea5e9', background: '#fff' }}>
              📥 Export Data
            </button>
          </div>
          <div className="table-wrapper" style={{ background: 'transparent', border: 'none' }}>
            <table style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <thead style={{ background: '#f0f9ff' }}>
                <tr>
                  <th style={{ background: 'transparent', color: '#0369a1' }}>Date</th>
                  <th style={{ background: 'transparent', color: '#0369a1' }}>Staff Member</th>
                  <th style={{ background: 'transparent', color: '#0369a1' }}>Check In</th>
                  <th style={{ background: 'transparent', color: '#0369a1' }}>Check Out</th>
                </tr>
              </thead>
              <tbody>
                {getGroupedHistory().length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '60px', color: '#0ea5e9' }}>
                      <div style={{ fontSize: '32px', opacity: 0.2, marginBottom: '12px' }}>📅</div>
                      No attendance records found yet.
                    </td>
                  </tr>
                ) : (
                  getGroupedHistory().map((session, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f9ff' }}>
                      <td style={{ fontWeight: '700', color: '#0369a1' }}>{session.date}</td>
                      <td style={{ color: '#075985' }}>{session.name}</td>
                      <td>
                        <span className="badge" style={{ padding: '6px 14px', fontWeight: '700', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a' }}>
                          {session.in}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ padding: '6px 14px', fontWeight: '700', borderRadius: '10px', background: '#fef2f2', color: '#dc2626' }}>
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
      </div>
    </DashboardLayout>
  );
}