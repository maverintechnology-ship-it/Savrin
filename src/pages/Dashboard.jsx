import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db } from '../firebase-config';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

export default function Dashboard() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({ status: 'Out', leaves: 0, tasks: 0 });
  const [meetings, setMeetings] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userData) return;

    // Status from attendance
    const unsubAtt = onSnapshot(query(collection(db, 'attendance'), where('userId', '==', userData.id), orderBy('time', 'desc')), (snapshot) => {
      if (!snapshot.empty) {
        const last = snapshot.docs[0].data();
        setStats(prev => ({ ...prev, status: last.type === 'checkin' ? 'In' : 'Out' }));
      }
    });

    // Leaves count
    const unsubLeaves = onSnapshot(query(collection(db, 'leaves'), where('userId', '==', userData.id)), (snapshot) => {
      setStats(prev => ({ ...prev, leaves: snapshot.size }));
    });

    // Tasks count
    const unsubTasks = onSnapshot(query(collection(db, 'kanban_tasks'), where('userId', '==', userData.id)), (snapshot) => {
      setStats(prev => ({ ...prev, tasks: snapshot.docs.filter(d => d.data().column !== 'completed').length }));
    });

    // Meetings listener (scoped to company)
    let unsubMeetings = () => {};
    if (userData.companyId) {
      unsubMeetings = onSnapshot(
        query(collection(db, 'meetings'), where('companyId', '==', userData.companyId)),
        (snapshot) => {
          const m = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          m.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
          setMeetings(m);
        }
      );
    }

    return () => {
      unsubAtt();
      unsubLeaves();
      unsubTasks();
      unsubMeetings();
    };
  }, [userData]);

  return (
    <DashboardLayout title="Dashboard Overview">
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon-wrap blue">🕒</div>
          <div>
            <div className="stat-value">{stats.status}</div>
            <div className="stat-label">Current Status</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap green">⛱️</div>
          <div>
            <div className="stat-value">{stats.leaves}</div>
            <div className="stat-label">Total Leaves</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap amber">📋</div>
          <div>
            <div className="stat-value">{stats.tasks}</div>
            <div className="stat-label">Active Tasks</div>
          </div>
        </div>
      </div>

      {/* ===== SCHEDULED MEETINGS SECTION ===== */}
      {meetings.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', border: '1px solid #e0e7ff', background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f0ff 100%)' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%', background: '#10b981',
              display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite',
              boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)'
            }}></span>
            Scheduled Meetings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {meetings.map(m => {
              // Support both datetime-local (scheduledAt) and separate date/time from Resources
              const meetingTime = m.scheduledAt ? new Date(m.scheduledAt) : new Date(`${m.date}T${m.time}`);
              const isStarted = currentTime >= meetingTime;
              const formattedTime = meetingTime.toLocaleString();

              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
                  background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                  transition: 'var(--transition)', cursor: isStarted ? 'pointer' : 'default',
                  opacity: isStarted ? 1 : 0.8
                }}
                onClick={() => {
                  if (isStarted) window.open(m.link, '_blank', 'noopener,noreferrer');
                }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: isStarted ? 'linear-gradient(135deg, #6366f1, #818cf8)' : '#e2e8f0', 
                    color: isStarted ? '#fff' : '#94a3b8',
                    fontSize: '20px', flexShrink: 0, boxShadow: isStarted ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                  }}>📅</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '3px', fontSize: '15px' }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', display: 'flex', gap: '12px' }}>
                      <span style={{ color: isStarted ? '#059669' : '#f59e0b', fontWeight: 600 }}>
                        {formattedTime}
                      </span>
                      <span>Scheduled by {m.createdBy || 'Admin'}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (isStarted) window.open(m.link, '_blank', 'noopener,noreferrer'); 
                    }}
                    className="btn"
                    disabled={!isStarted}
                    style={{
                      background: isStarted ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#f1f5f9',
                      color: isStarted ? '#fff' : '#94a3b8',
                      boxShadow: isStarted ? '0 4px 12px rgba(99, 102, 241, 0.25)' : 'none',
                      fontWeight: 700, letterSpacing: '0.03em', border: 'none',
                      cursor: isStarted ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {isStarted ? '🚀 Join' : '⏳ Waiting'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Welcome back, {userData?.name}!</h3>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
          Use the sidebar to manage your attendance, request leaves, or chat with the HR team.
        </p>

        {(!userData?.mobile || !userData?.address) && (
          <div style={{ background: '#fff9db', border: '1px solid #fab005', borderRadius: '10px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '30px' }}>👋</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, color: '#856404' }}>Complete Your Profile</h4>
              <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#856404' }}>
                It looks like your profile information is incomplete. Please update your mobile number and address to stay connected.
              </p>
            </div>
            <a href="/profile" className="btn btn-primary" style={{ background: '#fab005', borderColor: '#fab005', color: '#000' }}>Update Profile</a>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
