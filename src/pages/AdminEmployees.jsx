import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db, firebaseConfig } from '../firebase-config';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';
import EmployeeDetailsModal from '../components/EmployeeDetailsModal';

import { sendWelcomeEmail } from '../services/emailService';

export default function AdminEmployees() {
  const { userData } = useAuth();
  const [users, setUsers] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newEmp, setNewEmp] = useState({ name: '', email: '', password: '', role: 'employee' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!userData?.companyId) return;

    // Fetch company info for email templates
    const fetchCompany = async () => {
      const docSnap = await getDoc(doc(db, 'companies', userData.companyId));
      if (docSnap.exists()) {
        setCompanyInfo(docSnap.data());
      }
    };
    fetchCompany();

    // Show admins too if the user is a company owner
    const allowedRoles = userData.role === 'company' ? ['employee', 'admin'] : ['employee'];
    
    const q = query(collection(db, 'users'), where('companyId', '==', userData.companyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const u = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(u.filter(user => allowedRoles.includes(user.role)));
    });
    return () => unsubscribe();
  }, [userData]);

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
        role: newEmp.role,
        companyId: userData.companyId,
        status: 'active',
        createdAt: new Date().toISOString()
      });

      // Send Welcome Email
      await sendWelcomeEmail(
        newEmp.email, 
        newEmp.name, 
        newEmp.role, 
        newEmp.password, 
        companyInfo?.name || 'Your Organization', 
        companyInfo?.companyCode || 'N/A'
      );

      setMsg({ text: `${newEmp.role.charAt(0).toUpperCase() + newEmp.role.slice(1)} registered and email invitation sent!`, type: 'success' });
      setNewEmp({ name: '', email: '', password: '', role: 'employee' });
    } catch (err) {
      console.error(err);
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout title="Staff Directory">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
        <div className="card">
          <h3 className="card-title">Register Team Member</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Onboard a new employee by creating their workspace access credentials.</p>
          <form onSubmit={handleAddEmployee}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="form-control" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} required placeholder="e.g. Rahul Sharma" />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" className="form-control" value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} required placeholder="e.g. rahul@company.com" />
            </div>
            <div className="form-group">
              <label>Default Password</label>
              <input type="password" className="form-control" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} required placeholder="Min 6 characters" />
            </div>
            
            <div className="form-group">
              <label>Assigned Role</label>
              <select 
                className="form-control" 
                value={newEmp.role} 
                onChange={e => setNewEmp({...newEmp, role: e.target.value})}
                disabled={userData?.role !== 'company'}
              >
                <option value="employee">Employee</option>
                <option value="admin">Administrator</option>
              </select>
              {userData?.role !== 'company' && <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Only Company Owners can promote to Admin.</small>}
            </div>

            {msg.text && (
              <div className={`badge badge-${msg.type === 'error' ? 'danger' : 'success'}`} style={{ width: '100%', marginBottom: '20px', padding: '10px', borderRadius: '8px' }}>
                {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
              </div>
            )}
            
            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
              {loading ? 'Registering...' : '🚀 Register and Invite'}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Organization Roster</h3>
            <span className="badge badge-info">{users.length} Active Staff</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Contact Email</th>
                  <th>Access Role</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No staff members registered in this company.
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="clickable-name" onClick={() => setSelectedUserId(user.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar-small" style={{ background: 'var(--bg-indigo)', color: 'var(--primary)', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>{user.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{user.email}</td>
                      <td>
                        <span className={`badge ${user.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ textTransform: 'capitalize' }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteUser(user.id)} 
                          className="btn btn-ghost" 
                          style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 600 }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {selectedUserId && <EmployeeDetailsModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </DashboardLayout>
  );
}
