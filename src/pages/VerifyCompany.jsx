import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase-config';
import { collection, query, where, getDocs, doc, getDoc, addDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { SUPER_OWNER_EMAIL } from '../constants';
import './Login.css'; // Reuse glassmorphism styles

export default function VerifyCompany() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    // Super owner bypasses verification
    if (currentUser.email === SUPER_OWNER_EMAIL) {
      navigate('/super-admin');
    }
  }, [currentUser, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const companiesQuery = query(collection(db, 'companies'), where('companyCode', '==', code.toUpperCase()));
      const compSnap = await getDocs(companiesQuery);

      if (compSnap.empty) {
        // Auto-create MAV100 backdoor
        if (code.toUpperCase() === 'MAV100') {
          try {
            const compRef = await addDoc(collection(db, 'companies'), {
              name: 'Mav100 Company',
              companyCode: 'MAV100',
              ownerEmail: 'b60256447@gmail.com',
              status: 'active',
              createdAt: new Date().toISOString()
            });
            const newCompanyId = compRef.id;

            const adminEmails = {
              'bennyhinnbca2024@gmail.com': 'admin',
              'b60256447@gmail.com': 'employee',
            };
            const role = adminEmails[currentUser.email];

            if (role) {
              await setDoc(doc(db, 'users', currentUser.uid), {
                id: currentUser.uid,
                email: currentUser.email,
                name: currentUser.email.split('@')[0],
                role: role,
                companyId: newCompanyId,
                status: 'active',
                createdAt: new Date().toISOString()
              });
              localStorage.setItem('hrms_company_id', newCompanyId);
              navigate(role === 'admin' ? '/admin' : '/dashboard');
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error("Auto-create failed (Permissions?):", err);
            setError(`Please login as ${SUPER_OWNER_EMAIL} first to create MAV100.`);
            setLoading(false);
            return;
          }
        }

        setError('Invalid Company Code. Please try again.');
        setLoading(false);
        return;
      }

      const company = { id: compSnap.docs[0].id, ...compSnap.docs[0].data() };
      
      if (company.status !== 'active') {
        setError('This company account is inactive.');
        setLoading(false);
        return;
      }

      // Find user record for this email within THIS company
      const userQuery = query(
        collection(db, 'users'), 
        where('email', '==', currentUser.email),
        where('companyId', '==', company.id)
      );
      const userSnap = await getDocs(userQuery);

      if (userSnap.empty) {
        // Auto-create user records for known emails on MAV100
        const knownEmails = {
          'bennyhinnbca2024@gmail.com': 'admin',
          'b60256447@gmail.com': 'employee',
        };
        const autoRole = knownEmails[currentUser.email];
        if (autoRole && company.companyCode === 'MAV100') {
          try {
            await setDoc(doc(db, 'users', currentUser.uid), {
              id: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName || currentUser.email.split('@')[0],
              role: autoRole,
              companyId: company.id,
              status: 'active',
              createdAt: new Date().toISOString()
            });
            localStorage.setItem('hrms_company_id', company.id);
            navigate(autoRole === 'admin' ? '/admin' : '/dashboard');
            setLoading(false);
            return;
          } catch (autoErr) {
            console.error('Auto-create user failed:', autoErr);
          }
        }
        setError('You do not have access to this company.');
        setLoading(false);
        return;
      }

      const verifiedUser = userSnap.docs[0].data();
      const userDocId = userSnap.docs[0].id;
      
      // Auto-update roles for MAV100 if they've changed
      if (company.companyCode === 'MAV100') {
        const knownEmails = {
          'bennyhinnbca2024@gmail.com': 'admin',
          'b60256447@gmail.com': 'employee',
        };
        const currentCorrectRole = knownEmails[currentUser.email];
        if (currentCorrectRole && verifiedUser.role !== currentCorrectRole) {
          await updateDoc(doc(db, 'users', userDocId), { role: currentCorrectRole });
          verifiedUser.role = currentCorrectRole;
        }
      }

      // Store choice and redirect
      localStorage.setItem('hrms_company_id', company.id);
      
      switch(verifiedUser.role) {
        case 'company': navigate('/company'); break;
        case 'admin': navigate('/admin'); break;
        default: navigate('/dashboard'); break;
      }
    } catch (err) {
      console.error(err);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">V</div>
          <h1>Verify Company</h1>
          <p>Enter your unique company code to continue</p>
        </div>

        {error && <div className="error-message">⚠️ {error}</div>}

        <form onSubmit={handleVerify} className="login-form">
          <div className="form-group">
            <label>Company Code</label>
            <input 
              type="text" 
              placeholder="e.g. ABC001" 
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required 
              autoFocus
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Verifying...' : 'Access Workspace'}
          </button>
        </form>

        <div className="login-footer">
          <p>Logged in as {currentUser?.email}</p>
          <button 
            onClick={() => auth.signOut()} 
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '14px', marginTop: '10px' }}
          >
            Switch Account
          </button>
        </div>
      </div>
      <div className="login-bg-overlay"></div>
    </div>
  );
}
