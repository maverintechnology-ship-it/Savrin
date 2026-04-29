import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db } from '../firebase-config';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, where } from 'firebase/firestore';
import EmployeeDetailsModal from '../components/EmployeeDetailsModal';
import { useAuth } from '../context/AuthContext';

export default function AdminLeaves() {
  const { userData } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [filterUser, setFilterUser] = useState('');

  const downloadCSV = async () => {
    try {
      const q = query(collection(db, 'leaves'), where('companyId', '==', userData.companyId), orderBy('createdAt', 'desc'));
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
    if (!userData?.companyId) return;

    const companyId = userData.companyId;

    const qLeaves = query(collection(db, 'leaves'), where('companyId', '==', companyId));
    const unsub = onSnapshot(qLeaves, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLeaves(docs);
    });

    const qUsers = query(collection(db, 'users'), where('companyId', '==', companyId));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const u = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(u.filter(user => user.role === 'employee' || user.role === 'admin'));
    });

    return () => {
      unsub();
      unsubUsers();
    };
  }, [userData]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'leaves', id), { status });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLeaves = filterUser 
    ? leaves.filter(l => l.userId === filterUser)
    : leaves;

  return (
    <DashboardLayout title="Leave Management">
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Filter by Employee:</label>
            <select 
              className="form-control" 
              style={{ width: '200px', padding: '6px 12px' }}
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <button onClick={downloadCSV} className="btn btn-outline btn-small">
            <img src="/assets/icons/leave.png" width="14" style={{ marginRight: '8px' }} alt="" />
            Download CSV
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Employee Leave Requests {filterUser && `for ${employees.find(e => e.id === filterUser)?.name}`}</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredLeaves.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No requests found.</td></tr>
              ) : (
                filteredLeaves.map(leave => (
                  <tr key={leave.id}>
                    <td className="clickable-name" onClick={() => setSelectedUserId(leave.userId)}>{leave.userName}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedUserId && <EmployeeDetailsModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </DashboardLayout>
  );
}
