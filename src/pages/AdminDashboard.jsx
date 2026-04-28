import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db, auth, firebaseConfig } from '../firebase-config';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import './AdminDashboard.css';

export default function AdminDashboard({ initialTab = 'dashboard' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [stats, setStats] = useState({ employees: 0, checkedIn: 0, pendingLeaves: 0, openTasks: 0 });
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  
  // Add Employee Form State
  const [newEmp, setNewEmp] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const u = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(u);
      setStats(prev => ({ ...prev, employees: u.filter(user => user.role === 'employee').length }));
    });

    const unsubAttendance = onSnapshot(query(collection(db, 'attendance'), orderBy('time', 'desc')), (snapshot) => {
      const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendance(allRecords);
      
      const today = new Date().toLocaleDateString();
      const records = allRecords.filter(r => new Date(r.time).toLocaleDateString() === today);
      
      const latestCheckins = {};
      records.forEach(r => {
        if (!latestCheckins[r.userId] || new Date(r.time) > new Date(latestCheckins[r.userId].time)) {
          latestCheckins[r.userId] = r;
        }
      });
      
      const currentlyCheckedIn = Object.values(latestCheckins).filter(r => r.type === 'checkin').length;
      setStats(prev => ({ ...prev, checkedIn: currentlyCheckedIn }));
    });

    const qLeaves = query(collection(db, 'leaves'), orderBy('createdAt', 'desc'));
    const unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
      const l = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeaves(l);
      setStats(prev => ({ ...prev, pendingLeaves: l.filter(req => req.status === 'pending').length }));
    });

    const unsubTasks = onSnapshot(collection(db, 'kanban_tasks'), (snapshot) => {
      const t = snapshot.docs.map(doc => doc.data());
      setStats(prev => ({ ...prev, openTasks: t.filter(task => task.column !== 'completed').length }));
    });

    return () => {
      unsubUsers();
      unsubAttendance();
      unsubLeaves();
      unsubTasks();
    };
  }, []);

  const handleUpdateLeaveStatus = async (leaveId, status) => {
    try {
      await updateDoc(doc(db, 'leaves', leaveId), { status });
    } catch (err) {
      console.error('Failed to update leave', err);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      // Create user in secondary auth instance to avoid logging out admin
      const secondaryApp = initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmp.email, newEmp.password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: newEmp.name,
        email: newEmp.email,
        role: 'employee',
        createdAt: new Date().toISOString()
      });

      setMsg({ text: 'Employee added successfully!', type: 'success' });
      setNewEmp({ name: '', email: '', password: '' });
    } catch (err) {
      console.error(err);
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this employee?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout title="Admin Portal">
      <div className="admin-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'dashboard' ? '2px solid #38bdf8' : 'none', fontWeight: activeTab === 'dashboard' ? '700' : '500' }}>Overview</button>
        <button onClick={() => setActiveTab('attendance')} style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'attendance' ? '2px solid #38bdf8' : 'none', fontWeight: activeTab === 'attendance' ? '700' : '500' }}>Attendance</button>
        <button onClick={() => setActiveTab('leaves')} style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'leaves' ? '2px solid #38bdf8' : 'none', fontWeight: activeTab === 'leaves' ? '700' : '500' }}>Leaves</button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon-wrap blue">
                <img src="/assets/icons/management.png" width="20" height="20" alt="" />
              </div>
              <div>
                <div className="stat-value">{stats.employees}</div>
                <div className="stat-label">Total Employees</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap green">
                <img src="/assets/icons/attendance.png" width="20" height="20" alt="" />
              </div>
              <div>
                <div className="stat-value">{stats.checkedIn}</div>
                <div className="stat-label">Checked In Today</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap pink">
                <img src="/assets/icons/leave.png" width="20" height="20" alt="" />
              </div>
              <div>
                <div className="stat-value">{stats.pendingLeaves}</div>
                <div className="stat-label">Pending Leaves</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap amber">
                <img src="/assets/icons/dashboard.png" width="20" height="20" alt="" />
              </div>
              <div>
                <div className="stat-value">{stats.openTasks}</div>
                <div className="stat-label">Open Tasks</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Recent Activity</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Name</th><th>Action</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {attendance.slice(0, 5).map(record => (
                    <tr key={record.id}>
                      <td style={{ fontWeight: 600 }}>{record.userName}</td>
                      <td><span className={`badge ${record.type === 'checkin' ? 'badge-success' : 'badge-warning'}`}>{record.type}</span></td>
                      <td>{new Date(record.time).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'attendance' && (
        <div className="card">
          <h3 className="card-title">Full Attendance Logs</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Name</th><th>Action</th><th>Date</th><th>Time</th></tr>
              </thead>
              <tbody>
                {attendance.map(record => (
                  <tr key={record.id}>
                    <td>{record.userName}</td>
                    <td><span className={`badge ${record.type === 'checkin' ? 'badge-success' : 'badge-warning'}`}>{record.type}</span></td>
                    <td>{new Date(record.time).toLocaleDateString()}</td>
                    <td>{new Date(record.time).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="card">
          <h3 className="card-title">Leave Requests</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {leaves.map(leave => (
                  <tr key={leave.id}>
                    <td>{leave.userName}</td>
                    <td>{leave.type}</td>
                    <td>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</td>
                    <td><span className={`badge badge-${leave.status === 'approved' ? 'success' : leave.status === 'rejected' ? 'danger' : 'warning'}`}>{leave.status}</span></td>
                    <td>
                      {leave.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleUpdateLeaveStatus(leave.id, 'approved')} className="btn btn-primary btn-small">Approve</button>
                          <button onClick={() => handleUpdateLeaveStatus(leave.id, 'rejected')} className="btn btn-outline btn-small" style={{ color: '#ef4444' }}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>

  );
}
