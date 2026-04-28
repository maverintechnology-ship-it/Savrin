import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase-config';
import { ADMIN_EMAILS } from '../constants';
import './AdminLogin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      let role = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'employee';

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Auto-upgrade if in admin list
        if (role === 'admin' && userData.role !== 'admin') {
          await setDoc(userDocRef, { ...userData, role: 'admin' }, { merge: true });
          userData.role = 'admin';
        }

        if (userData.role !== 'admin') {
          setError(`Access Denied. This account has an ${userData.role} role.`);
          auth.signOut();
          return;
        }
        navigate('/admin');
      } else {
        if (role !== 'admin') {
          setError('Access Denied. Admin privileges required.');
          auth.signOut();
          return;
        }

        const userData = {
          id: user.uid,
          email: user.email,
          name: user.email.split('@')[0],
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, userData);
        navigate('/admin');
      }
    } catch (err) {
      console.error(err);
      setError(err.message.includes('password') ? 'Incorrect password.' : 'Authentication failed.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      let role = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'employee';

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role !== 'admin' && role !== 'admin') {
          setError(`Access Denied. Admin privileges required.`);
          await auth.signOut();
          return;
        }
        // Auto-upgrade if in admin list
        if (role === 'admin' && userData.role !== 'admin') {
          await setDoc(userDocRef, { ...userData, role: 'admin' }, { merge: true });
        }
        navigate('/admin');
      } else {
        if (role !== 'admin') {
          setError('Access Denied. Admin privileges required.');
          await auth.signOut();
          return;
        }
        const userData = {
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, userData);
        navigate('/admin');
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error(err);
        setError('Google sign-in failed.');
      }
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your admin email.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent.');
    } catch (err) {
      console.error(err);
      setError('Failed to send reset email.');
    }
  };

  return (
    <div className="admin-login-body">
      <header className="admin-header">
        <Link to="/" className="admin-logo-container">
          <img src="/assets/logo.png" alt="SAVRIN" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
          <div className="admin-logo-text">SAVRIN <span>ADMIN</span></div>
        </Link>
        <div className="admin-nav-actions">
          <Link to="/login" className="admin-btn-portal">Employee Portal</Link>
        </div>
      </header>

      <main className="admin-hero-section">
        <div className="admin-left-panel">
          <h1>Admin Access.</h1>
          <p className="admin-subtitle">Secure gateway for administrators to manage resources, monitor performance, and oversee team operations.</p>

          {error && <div className="admin-error-message">🔒 {error}</div>}

          <form onSubmit={handleLogin}>
            <div className="admin-form-group">
              <input 
                type="email" 
                className="admin-form-control" 
                placeholder="Admin Email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="admin-form-group">
              <input 
                type="password" 
                className="admin-form-control" 
                placeholder="Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required 
              />
            </div>
            <a href="#" onClick={handleForgotPassword} className="admin-forgot-pass">Forgot Password?</a>
            <button type="submit" className="admin-btn-submit">Verify Credentials</button>
          </form>

          <div className="admin-divider">or manage via</div>

          <button onClick={handleGoogleSignIn} className="admin-btn-submit" style={{ background: '#fff', color: '#0f172a', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Google Admin
          </button>
        </div>

        <div className="admin-right-panel">
          <div className="admin-visual-container">
            <img src="/assets/admin_login_illustration.png" alt="Admin Dashboard" className="admin-illustration" />
          </div>
        </div>
      </main>
    </div>
  );
}
