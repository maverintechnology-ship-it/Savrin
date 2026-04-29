import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db } from '../firebase-config';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, where, getDocs, updateDoc } from 'firebase/firestore';
import './AdminDashboard.css';

export default function SuperDashboard() {
  const [companies, setCompanies] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'companies'), orderBy('createdAt', 'desc')), (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const code = data.get('code').toUpperCase();
    const ownerEmail = data.get('email');
    
    // Check if code already exists
    if (companies.some(c => c.companyCode === code)) {
      alert("This Company Code is already in use.");
      return;
    }

    const docRef = await addDoc(collection(db, 'companies'), {
      name: data.get('name'),
      companyCode: code,
      ownerEmail: ownerEmail,
      status: 'active',
      createdAt: new Date().toISOString()
    });

    const companyId = docRef.id;

    // Also create/update the user record for the company owner
    const userQuery = query(collection(db, 'users'), where('email', '==', ownerEmail));
    const userSnap = await getDocs(userQuery);

    if (userSnap.empty) {
      // Create new user record
      await addDoc(collection(db, 'users'), {
        email: ownerEmail,
        name: data.get('name') + " Owner",
        role: 'company',
        companyId: companyId,
        status: 'active',
        createdAt: new Date().toISOString()
      });
    } else {
      // Update existing user record
      const userDoc = userSnap.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        role: 'company',
        companyId: companyId,
        status: 'active'
      });
    }

    setShowAddModal(false);
  };

  const handleDeleteCompany = async (id) => {
    if (window.confirm("Are you sure you want to delete this company? All data will be lost.")) {
      await deleteDoc(doc(db, 'companies', id));
    }
  };

  return (
    <DashboardLayout title="Platform Control Center">
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon-wrap blue">🏢</div>
          <div>
            <div className="stat-value">{companies.length}</div>
            <div className="stat-label">Total Companies</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap green">✅</div>
          <div>
            <div className="stat-value">{companies.filter(c => c.status === 'active').length}</div>
            <div className="stat-label">Active Clients</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 className="card-title">Managed Companies</h3>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">Add New Company</button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Code</th>
                <th>Owner Email</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(company => (
                <tr key={company.id}>
                  <td><strong>{company.name}</strong></td>
                  <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{company.companyCode}</code></td>
                  <td>{company.ownerEmail}</td>
                  <td><span className={`badge ${company.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{company.status}</span></td>
                  <td>{new Date(company.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleDeleteCompany(company.id)} className="btn btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444', padding: '5px 10px', fontSize: '12px' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <h3 className="card-title">Onboard New Company</h3>
            <form onSubmit={handleCreateCompany} style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group">
                <label>Company Name</label>
                <input name="name" className="form-control" placeholder="e.g. Acme Corp" required />
              </div>
              <div className="form-group">
                <label>Company Code (Unique)</label>
                <input name="code" className="form-control" placeholder="e.g. ACM001" required />
              </div>
              <div className="form-group">
                <label>Owner Email</label>
                <input name="email" type="email" className="form-control" placeholder="owner@acme.com" required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Account</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
