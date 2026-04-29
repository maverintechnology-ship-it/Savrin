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
    if (!userData?.companyId) return;

    const q = query(
      collection(db, 'leaves'), 
      where('companyId', '==', userData.companyId),
      where('userId', '==', userData.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        companyId: userData.companyId,
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
    <DashboardLayout title="Leave Management">
      <div className="leave-layout">
        <div className="leave-history-section">
          <h3 className="card-title" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⏳</span> Your Leave History
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {leaveRequests.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '48px', opacity: 0.2, marginBottom: '16px' }}>⛱️</div>
                <p style={{ color: 'var(--text-muted)' }}>No leave requests submitted yet.</p>
              </div>
            ) : (
              leaveRequests.map(leave => (
                <div key={leave.id} className="card leave-card-premium" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div className="stat-icon-wrap indigo" style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                    {leave.type === 'Medical' ? '🤒' : leave.type === 'Annual' ? '✈️' : '☕'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{leave.type} Leave</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className={`badge ${
                      leave.status === 'approved' ? 'badge-success' : 
                      leave.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="leave-form-section">
          <div className="card" style={{ position: 'sticky', top: '24px' }}>
            <h3 className="card-title" style={{ marginBottom: '24px' }}>Request New Leave</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Leave Type</label>
                <select 
                  className="form-control" 
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
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reason for Leave</label>
                <textarea 
                  className="form-control" 
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Provide a brief explanation..." 
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', marginTop: '10px' }}>
                Submit Request
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
