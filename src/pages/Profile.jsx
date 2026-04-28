import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

export default function Profile() {
  const { userData } = useAuth();

  return (
    <DashboardLayout title="My Profile">
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#38bdf8', color: '#fff', fontSize: '40px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
            {userData?.name?.charAt(0).toUpperCase()}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>{userData?.name}</h2>
          <p style={{ color: '#64748b', textTransform: 'capitalize' }}>{userData?.role}</p>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px' }}>Email Address</label>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{userData?.email}</div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px' }}>Employee ID</label>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{userData?.id?.substring(0, 8).toUpperCase()}</div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px' }}>Joined On</label>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
