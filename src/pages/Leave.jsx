import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { collection, addDoc, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase-config';
import './Leave.css';

export default function Leave() {
  const { userData } = useAuth();
  
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [formData, setFormData] = useState({
    type: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    if (!userData) return;

    const q = query(
      collection(db, 'leaves'), 
      where('userId', '==', userData.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to avoid index requirements
      docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLeaveRequests(docs);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'leaves'), {
        userId: userData.id,
        userName: userData.name,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setFormData({ type: '', startDate: '', endDate: '', reason: '' });
      alert('Leave request submitted successfully.');
    } catch (err) {
      console.error("Failed to submit leave", err);
      alert('Failed to submit leave request.');
    }
  };

  const getStatusBadge = (status) => {
    const s = status.toLowerCase();
    if (s === 'approved') return 'badge-approved';
    if (s === 'rejected') return 'badge-rejected';
    return 'badge-pending';
  };

  return (
    <DashboardLayout title="Leave Requests">
      <div className="leave-layout">
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#38bdf8', marginBottom: '14px' }}>
            Your Leave History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leaveRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ fontSize: '38px', marginBottom: '12px', opacity: 0.4 }}>⛱️</div>
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>No leave requests found.</p>
              </div>
            ) : (
              leaveRequests.map(leave => (
                <div key={leave.id} className="leave-card">
                  <div className="leave-card-icon">
                    {leave.type === 'Medical' ? '🤒' : leave.type === 'Annual' ? '✈️' : '☕'}
                  </div>
                  <div className="leave-card-body">
                    <div className="leave-card-title">{leave.type} Leave</div>
                    <div className="leave-card-dates">{new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className={`badge ${getStatusBadge(leave.status)}`}>{leave.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ background: '#fff', borderRadius: '10px', padding: '22px', border: '1px solid #e2e8f0', position: 'sticky', top: '74px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '18px' }}>
            Request Leave
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Leave Type</label>
              <select 
                className="form-control" 
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                required
              >
                <option value="">Select type</option>
                <option value="Casual">Casual Leave</option>
                <option value="Medical">Medical Leave</option>
                <option value="Annual">Annual Leave</option>
              </select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Start Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>End Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                  required 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Reason</label>
              <textarea 
                className="form-control" 
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', minHeight: '80px', resize: 'vertical' }}
                placeholder="Briefly explain your reason..." 
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                required
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #38bdf8, #7dd3fc)', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>
              Submit Request
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
