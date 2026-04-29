import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db, firebaseConfig } from '../firebase-config';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, deleteDoc, where } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import './AdminDashboard.css';
import { useAuth } from '../context/AuthContext';
import EmployeeDetailsModal from '../components/EmployeeDetailsModal';

export default function AdminDashboard({ initialTab = 'dashboard' }) {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [stats, setStats] = useState({ employees: 0, checkedIn: 0, pendingLeaves: 0, openTasks: 0 });
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!userData?.companyId) return;

    const companyId = userData.companyId;

    const unsubUsers = onSnapshot(query(collection(db, 'users'), where('companyId', '==', companyId)), (snapshot) => {
      const u = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(u);
      setStats(prev => ({ ...prev, employees: u.filter(user => user.role === 'employee').length }));
    });

    const unsubAttendance = onSnapshot(query(collection(db, 'attendance'), where('companyId', '==', companyId)), (snapshot) => {
      const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      allRecords.sort((a, b) => new Date(b.time) - new Date(a.time));
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

    const unsubLeaves = onSnapshot(query(collection(db, 'leaves'), where('companyId', '==', companyId)), (snapshot) => {
      const l = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      l.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLeaves(l);
      setStats(prev => ({ ...prev, pendingLeaves: l.filter(req => req.status === 'pending').length }));
    });

    const unsubTasks = onSnapshot(query(collection(db, 'kanban_tasks'), where('companyId', '==', companyId)), (snapshot) => {
      const t = snapshot.docs.map(doc => doc.data());
      setStats(prev => ({ ...prev, openTasks: t.filter(task => task.column !== 'completed').length }));
    });

    return () => {
      unsubUsers();
      unsubAttendance();
      unsubLeaves();
      unsubTasks();
    };
  }, [userData]);

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
      let secondaryApp;
      if (getApps().find(app => app.name === 'Secondary')) {
        secondaryApp = getApp('Secondary');
      } else {
        secondaryApp = initializeApp(firebaseConfig, "Secondary");
      }
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

  return (
    <DashboardLayout title="Admin Portal">
      {/* Focus strictly on Overview as other sections are in the Sidebar */}

      {activeTab === 'dashboard' && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon-wrap indigo">👥</div>
              <div className="stat-info">
                <span className="stat-value">{stats.employees}</span>
                <span className="stat-label">Total Employees</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap green">✅</div>
              <div className="stat-info">
                <span className="stat-value">{stats.checkedIn}</span>
                <span className="stat-label">Checked In Today</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap pink">🏖️</div>
              <div className="stat-info">
                <span className="stat-value">{stats.pendingLeaves}</span>
                <span className="stat-label">Pending Leaves</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap amber">📋</div>
              <div className="stat-info">
                <span className="stat-value">{stats.openTasks}</span>
                <span className="stat-label">Open Tasks</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Recent Activity</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Action</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.slice(0, 5).map(record => (
                    <tr key={record.id}>
                      <td className="clickable-name" onClick={() => setSelectedUserId(record.userId)}>{record.userName}</td>
                      <td>
                        <span className={`badge ${record.type === 'checkin' ? 'badge-success' : 'badge-warning'}`}>
                          {record.type}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(record.time).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {selectedUserId && <EmployeeDetailsModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </DashboardLayout>
  );
}
