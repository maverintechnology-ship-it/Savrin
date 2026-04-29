import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db } from '../firebase-config';
import { collection, onSnapshot, query, where, addDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

export default function CompanyDashboard() {
  const { userData } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [showAddAdmin, setShowAddAdmin] = useState(false);

  useEffect(() => {
    if (!userData?.companyId) return;

    // Fetch Company Info
    getDoc(doc(db, 'companies', userData.companyId)).then(snap => {
      if (snap.exists()) setCompanyInfo(snap.data());
    });

    const unsubAdmins = onSnapshot(query(collection(db, 'users'), where('companyId', '==', userData.companyId), where('role', '==', 'admin')), (snapshot) => {
      setAdmins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubEmployees = onSnapshot(query(collection(db, 'users'), where('companyId', '==', userData.companyId), where('role', '==', 'employee')), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubAdmins(); unsubEmployees(); };
  }, [userData]);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    await addDoc(collection(db, 'users'), {
      name: data.get('name'),
      email: data.get('email'),
      role: 'admin',
      companyId: userData.companyId,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    setShowAddAdmin(false);
  };

  return (
    <DashboardLayout title={`${companyInfo?.name || 'Company'} Overview`}>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap amber">🔑</div>
          <div className="stat-content">
            <div className="stat-value">{admins.length}</div>
            <div className="stat-label">Administrators</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap blue">👥</div>
          <div className="stat-content">
            <div className="stat-value">{employees.length}</div>
            <div className="stat-label">Employees</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap green">🏷️</div>
          <div className="stat-content">
            <div className="stat-value">{companyInfo?.companyCode}</div>
            <div className="stat-label">Company Code</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="card-title">System Administrators</h3>
            <button onClick={() => setShowAddAdmin(true)} className="btn btn-primary">Add New Admin</button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No administrators assigned yet.</td></tr>
                ) : (
                  admins.map(admin => (
                    <tr key={admin.id}>
                      <td><strong>{admin.name}</strong></td>
                      <td>{admin.email}</td>
                      <td><span className="badge badge-success">{admin.status}</span></td>
                      <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            <Link to="/admin/employees" className="btn btn-outline" style={{ textAlign: 'center' }}>Manage Staff Directory</Link>
            <Link to="/resources/policy" className="btn btn-outline" style={{ textAlign: 'center' }}>Update Company Policies</Link>
            <Link to="/admin" className="btn btn-outline" style={{ textAlign: 'center' }}>View Full Admin Dashboard</Link>
          </div>
          
          <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Onboarding Tip</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Admins can manage day-to-day operations like attendance and leaves, while you focus on company-wide growth and policy management.
            </p>
          </div>
        </div>
      </div>

      {showAddAdmin && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <h3 className="card-title">Promote New Admin</h3>
            <form onSubmit={handleCreateAdmin} style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input name="name" className="form-control" required />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input name="email" type="email" className="form-control" required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Admin Account</button>
                <button type="button" onClick={() => setShowAddAdmin(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
