import React, { useState, useEffect } from 'react';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';

export default function EmployeeDetailsModal({ userId, onClose }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEmployee(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching employee:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%', padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Employee Profile</h3>
          <button onClick={onClose} className="btn btn-ghost btn-small" style={{ fontSize: '20px' }}>&times;</button>
        </div>
        <div style={{ padding: '32px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading records...</div>
          ) : employee ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ 
                  width: '90px', height: '90px', borderRadius: '50%', 
                  background: 'var(--primary-light)', 
                  color: 'var(--primary)', fontSize: '36px', fontWeight: '700', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  margin: '0 auto 16px',
                  border: '4px solid var(--surface)',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  {employee.name?.charAt(0).toUpperCase()}
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{employee.name}</h2>
                <p style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{employee.role}</p>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Email Address</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '2px', wordBreak: 'break-all' }}>{employee.email}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Employee ID</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '2px' }}>{employee.id?.substring(0, 8).toUpperCase()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Department</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '2px' }}>{employee.department || 'General'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Joining Date</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '2px' }}>{employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--danger)', fontWeight: 500 }}>Profile not found.</div>
          )}
        </div>
        <div style={{ padding: '16px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-outline btn-block" onClick={onClose}>Close Profile</button>
        </div>
      </div>
    </div>
  );
}
