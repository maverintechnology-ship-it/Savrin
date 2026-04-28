import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db, firebaseConfig } from '../firebase-config';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import './AdminDashboard.css';

export default function AdminEmployees() {
  const [users, setUsers] = useState([]);
  const [newEmp, setNewEmp] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const u = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(u.filter(user => user.role === 'employee'));
    });
    return () => unsubscribe();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      // Initialize secondary app only if it doesn't exist
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

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this employee?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout title="Employee Management">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        <div className="card">
          <h3 className="card-title">Add New Employee</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Create a new account for an employee.</p>
          <form onSubmit={handleAddEmployee}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="form-control" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} required placeholder="e.g. Rahul Sharma" />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" className="form-control" value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} required placeholder="e.g. rahul@yastha.com" />
            </div>
            <div className="form-group">
              <label>Default Password</label>
              <input type="password" className="form-control" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} required placeholder="Enter password" />
            </div>
            {msg.text && <div className={`badge badge-${msg.type}`} style={{ marginBottom: '15px', display: 'block', textAlign: 'center' }}>{msg.text}</div>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Adding...' : 'Add Employee'}</button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Employee Directory</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Action</th></tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No employees found.</td></tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 600 }}>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <button onClick={() => handleDeleteUser(user.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Remove</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
