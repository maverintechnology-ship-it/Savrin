import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db } from '../firebase-config';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css'; // Reuse common dashboard styles

export default function Dashboard() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({ status: 'Out', leaves: 0, tasks: 0 });

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

    return () => {
      unsubAtt();
      unsubLeaves();
      unsubTasks();
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
