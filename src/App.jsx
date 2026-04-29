import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Checkin from './pages/Checkin';
import Leave from './pages/Leave';
import Kanban from './pages/Kanban';
import Resources from './pages/Resources';
import AdminDashboard from './pages/AdminDashboard';
import AdminEmployees from './pages/AdminEmployees';
import AdminAttendance from './pages/AdminAttendance';
import AdminLeaves from './pages/AdminLeaves';
import SuperDashboard from './pages/SuperDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import TicketSystem from './pages/TicketSystem';
import VerifyCompany from './pages/VerifyCompany';

import DashboardLayout from './components/layout/DashboardLayout';

function PrivateRoute({ children, requiredRole }) {
  const { currentUser, userData, loading } = useAuth();
  
  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  if (!currentUser) return <Navigate to="/login" />;
  
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(userData?.role)) {
      // Automatic redirection based on their actual role
      switch(userData?.role) {
        case 'super_owner': return <Navigate to="/super-admin" />;
        case 'company': return <Navigate to="/company" />;
        case 'admin': return <Navigate to="/admin" />;
        default: return <Navigate to="/dashboard" />;
      }
    }
  }
  
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-company" element={<VerifyCompany />} />
          
          {/* Super Owner Routes */}
          <Route path="/super-admin" element={<PrivateRoute requiredRole="super_owner"><SuperDashboard /></PrivateRoute>} />
          
          {/* Company Owner Routes */}
          <Route path="/company" element={<PrivateRoute requiredRole="company"><CompanyDashboard /></PrivateRoute>} />
          
          {/* Admin & Company Management Routes */}
          <Route path="/admin" element={<PrivateRoute requiredRole={['admin', 'company']}><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/attendance" element={<PrivateRoute requiredRole={['admin', 'company']}><AdminAttendance /></PrivateRoute>} />
          <Route path="/admin/leaves" element={<PrivateRoute requiredRole={['admin', 'company']}><AdminLeaves /></PrivateRoute>} />
          <Route path="/admin/employees" element={<PrivateRoute requiredRole={['admin', 'company']}><AdminEmployees /></PrivateRoute>} />
          <Route path="/kanban" element={<PrivateRoute requiredRole={['admin', 'company', 'employee']}><Kanban /></PrivateRoute>} />
          <Route path="/tickets" element={<PrivateRoute requiredRole={['admin', 'company', 'employee']}><TicketSystem /></PrivateRoute>} />
          
          {/* Employee Routes */}
          <Route path="/dashboard" element={<PrivateRoute requiredRole="employee"><Dashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute requiredRole="employee"><Profile /></PrivateRoute>} />
          <Route path="/checkin" element={<PrivateRoute requiredRole="employee"><Checkin /></PrivateRoute>} />
          <Route path="/leave" element={<PrivateRoute requiredRole="employee"><Leave /></PrivateRoute>} />
          
          {/* Shared Routes */}
          <Route path="/resources" element={<PrivateRoute requiredRole={['admin', 'employee', 'company']}><Resources /></PrivateRoute>} />
          <Route path="/resources/:tab" element={<PrivateRoute requiredRole={['admin', 'employee', 'company']}><Resources /></PrivateRoute>} />
          
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
