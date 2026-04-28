import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db } from '../firebase-config';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([]);

  const downloadCSV = async () => {
    try {
      const q = query(collection(db, 'leaves'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        let csv = 'Employee,Type,Start Date,End Date,Status,Reason\n';
        snapshot.forEach(docSnap => {
          const l = docSnap.data();
          csv += `${l.userName},${l.type},${l.startDate},${l.endDate},${l.status},${(l.reason || '').replace(/,/g, ' ')}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leave_requests.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'leaves'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setLeaves(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'leaves', id), { status });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout title="Leave Management">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Employee Leave Requests</h3>
          <button onClick={downloadCSV} className="btn btn-outline btn-small">
            <img src="/assets/icons/leave.png" width="14" style={{ marginRight: '8px' }} alt="" />
            Download CSV
          </button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {leaves.map(leave => (
                <tr key={leave.id}>
                  <td style={{ fontWeight: 600 }}>{leave.userName}</td>
                  <td>{leave.type}</td>
                  <td>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${leave.status === 'approved' ? 'success' : leave.status === 'rejected' ? 'danger' : 'warning'}`}>{leave.status}</span></td>
                  <td>
                    {leave.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleUpdateStatus(leave.id, 'approved')} className="btn btn-primary btn-small">Approve</button>
                        <button onClick={() => handleUpdateStatus(leave.id, 'rejected')} className="btn btn-outline btn-small" style={{ color: '#ef4444' }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
