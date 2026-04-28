import React from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-body">
      <header className="landing-header">
        <Link to="/" className="landing-logo-container">
          <img src="/assets/logo.png" alt="SAVRIN" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
          <div className="landing-logo-text">SAVRIN</div>
        </Link>
        <nav className="landing-nav-actions">
          <a href="#" className="landing-btn-nav">Features</a>
          <a href="#" className="landing-btn-nav">Solutions</a>
          <Link to="/admin-login" className="landing-btn-admin-access">Admin Access</Link>
        </nav>
      </header>

      <main className="landing-hero-section">
        <div className="landing-left-panel">
          <div className="landing-badge">✨ Next-Generation Workforce Management</div>
          <h1>Empower Your <span>Team</span> with Savrin.</h1>
          <p className="landing-description">The all-in-one HRMS platform designed to streamline operations, monitor performance, and boost organizational productivity with real-time insights.</p>
          
          <div className="landing-hero-actions">
            <Link to="/login" className="landing-btn-get-started">Employee Login</Link>
            <Link to="/admin-login" className="landing-btn-secondary">Admin Portal</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
