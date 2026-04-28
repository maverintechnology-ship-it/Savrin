import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase-config';
import './Login.css';

export default function Login() {
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
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role !== 'employee') {
          setError(`Please use the ${userData.role} login portal for this account.`);
          auth.signOut();
          return;
        }
        navigate('/checkin');
      } else {
        const userData = {
          id: user.uid,
          email: user.email,
          name: user.email.split('@')[0],
          role: 'employee',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), userData);
        navigate('/checkin');
      }
    } catch (err) {
      console.error(err);
      setError('Invalid email or password.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role !== 'employee') {
          setError(`Please use the Admin login portal for this account.`);
          await auth.signOut();
          return;
        }
        navigate('/checkin');
      } else {
        const userData = {
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          role: 'employee',
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, userData);
        navigate('/checkin');
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error(err);
        setError('Google sign-in failed. Please try again.');
      }
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent! Please check your inbox.');
    } catch (err) {
      console.error(err);
      setError('Failed to send reset email.');
    }
  };

  return (
    <div className="login-body">
      <header className="login-header">
        <Link to="/" className="login-logo-container">
          <img src="/assets/logo.png" alt="SAVRIN" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
          <div className="login-logo-text">SAVRIN</div>
        </Link>
        <div className="login-nav-actions">
          <Link to="/admin-login" className="login-btn-admin">Admin Access</Link>
        </div>
      </header>

      <main className="login-hero-section">
        <div className="login-left-panel">
          <h1>Welcome back!</h1>
          <p className="login-subtitle">Your all-in-one platform for team collaboration and performance tracking. Log in to your workspace.</p>

          {error && <div className="login-error-message">⚠️ {error}</div>}

          <form onSubmit={handleLogin}>
            <div className="login-form-group">
              <input 
                type="email" 
                className="login-form-control" 
                placeholder="Email Address" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="login-form-group">
              <input 
                type="password" 
                className="login-form-control" 
                placeholder="Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required 
              />
            </div>
            
            <a href="#" onClick={handleForgotPassword} className="login-forgot-pass">Forgot Password?</a>
            <button type="submit" className="btn-signin login-btn-submit">Sign In</button>
          </form>

          <div className="login-divider">or continue with</div>

          <button onClick={handleGoogleSignIn} className="login-btn-submit" style={{ background: '#fff', color: '#0f172a', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Google Account
          </button>
        </div>

        <div className="login-right-panel">
          <div className="login-visual-container">
            <img src="/assets/employee_login_illustration.png" alt="Savrin Workflow" className="login-illustration" />
          </div>
        </div>
      </main>
    </div>
  );
}
