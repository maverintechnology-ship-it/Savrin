import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db, firebaseConfig } from '../firebase-config';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, deleteDoc, where, addDoc, serverTimestamp } from 'firebase/firestore';
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

  // Meeting link state
  const [meetings, setMeetings] = useState([]);
  const [newMeeting, setNewMeeting] = useState({ title: '', link: '', scheduledAt: '' });
  const [meetingMsg, setMeetingMsg] = useState(null);
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [showMenu, setShowMenu] = useState(null);

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

    // Meetings listener
    const unsubMeetings = onSnapshot(
      query(collection(db, 'meetings'), where('companyId', '==', companyId)),
      (snapshot) => {
        const m = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        m.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setMeetings(m);
      }
    );

    return () => {
      unsubUsers();
      unsubAttendance();
      unsubLeaves();
      unsubTasks();
      unsubMeetings();
    };
  }, [userData]);

  const handleUpdateLeaveStatus = async (leaveId, status) => {
    try {
      await updateDoc(doc(db, 'leaves', leaveId), { status });
    } catch (err) {
      console.error('Failed to update leave', err);
    }
  };

  // --- Meeting handlers ---
  const handleAddMeeting = async (e) => {
    e.preventDefault();
    if (!newMeeting.title.trim() || !newMeeting.link.trim() || !newMeeting.scheduledAt) return;
    try {
      let link = newMeeting.link.trim();
      if (!/^https?:\/\//i.test(link)) link = 'https://' + link;
      
      if (editingMeetingId) {
        await updateDoc(doc(db, 'meetings', editingMeetingId), {
          title: newMeeting.title.trim(),
          link,
          scheduledAt: newMeeting.scheduledAt
        });
        setEditingMeetingId(null);
        setMeetingMsg({ text: 'Meeting updated successfully!', type: 'success' });
      } else {
        await addDoc(collection(db, 'meetings'), {
          title: newMeeting.title.trim(),
          link,
          scheduledAt: newMeeting.scheduledAt, // ISO string from datetime-local
          companyId: userData.companyId,
          createdBy: userData.name || userData.email,
          createdAt: serverTimestamp(),
          isActive: true
        });
        setMeetingMsg({ text: 'Meeting scheduled successfully!', type: 'success' });
      }
      
      setNewMeeting({ title: '', link: '', scheduledAt: '' });
      setTimeout(() => setMeetingMsg(null), 3000);
    } catch (err) {
      console.error('Failed to add meeting:', err);
      setMeetingMsg({ text: 'Error: ' + err.message, type: 'error' });
    }
  };

  const handleDeleteMeeting = async (id) => {
    try {
      await deleteDoc(doc(db, 'meetings', id));
    } catch (err) {
      console.error('Failed to delete meeting:', err);
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

          {/* ===== MEETING LINKS SECTION ===== */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📹</span> Meeting Links
            </h3>

            <form onSubmit={handleAddMeeting} style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Meeting title"
                value={newMeeting.title}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                className="form-control"
                style={{ flex: '1', minWidth: '150px' }}
                required
              />
              <input
                type="text"
                placeholder="Meeting link (Zoom, Meet)"
                value={newMeeting.link}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, link: e.target.value }))}
                className="form-control"
                style={{ flex: '1', minWidth: '150px' }}
                required
              />
              <input
                type="datetime-local"
                value={newMeeting.scheduledAt}
                onChange={(e) => setNewMeeting(prev => ({ ...prev, scheduledAt: e.target.value }))}
                className="form-control"
                style={{ width: 'auto', flexShrink: 0 }}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                {editingMeetingId ? 'Update Meeting' : '+ Schedule Meeting'}
              </button>
              {editingMeetingId && (
                <button type="button" onClick={() => { setEditingMeetingId(null); setNewMeeting({ title: '', link: '', scheduledAt: '' }); }} className="btn btn-outline" style={{ whiteSpace: 'nowrap' }}>
                  Cancel
                </button>
              )}
            </form>

            {meetingMsg && (
              <div style={{ 
                padding: '10px 16px', 
                background: meetingMsg.type === 'error' ? '#fef2f2' : '#ecfdf5', 
                color: meetingMsg.type === 'error' ? '#dc2626' : '#059669', 
                borderRadius: '10px', fontSize: '13px', fontWeight: 600, marginBottom: '16px',
                border: `1px solid ${meetingMsg.type === 'error' ? '#f87171' : '#34d399'}`
              }}>
                {meetingMsg.type === 'error' ? '❌' : '✅'} {meetingMsg.text}
              </div>
            )}

            {meetings.length === 0 ? (
              <p style={{ color: 'var(--text-light)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No active meetings. Add one above to share with employees.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {meetings.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
                    background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                    transition: 'var(--transition)'
                  }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: 'var(--radius)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', background: '#e0e7ff', color: '#4f46e5',
                      fontSize: '18px', flexShrink: 0
                    }}>📹</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{m.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {new Date(m.scheduledAt).toLocaleString()} • {m.link}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                      by {m.createdBy}
                    </span>
                    <a href={m.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-small">
                      Join
                    </a>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowMenu(showMenu === m.id ? null : m.id)}
                        className="btn btn-ghost btn-small"
                        style={{ color: '#64748b', fontSize: '18px', padding: '0 8px' }}
                      >
                        ⋮
                      </button>
                      {showMenu === m.id && (
                        <div style={{ position: 'absolute', right: 0, top: '35px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '6px', zIndex: 10, padding: '5px', minWidth: '100px' }}>
                          <button 
                            onClick={() => { 
                              setEditingMeetingId(m.id); 
                              setNewMeeting({ title: m.title, link: m.link, scheduledAt: m.scheduledAt }); 
                              setShowMenu(null); 
                            }} 
                            style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => { handleDeleteMeeting(m.id); setShowMenu(null); }} 
                            style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
