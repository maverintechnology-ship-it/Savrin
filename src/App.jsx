import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Checkin from './pages/Checkin';
import Leave from './pages/Leave';
import Kanban from './pages/Kanban';
import Chats from './pages/Chats';
import Resources from './pages/Resources';
import AdminDashboard from './pages/AdminDashboard';
import AdminEmployees from './pages/AdminEmployees';
import AdminAttendance from './pages/AdminAttendance';
import AdminLeaves from './pages/AdminLeaves';

function PrivateRoute({ children, requiredRole }) {
  const { currentUser, userData, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!currentUser) return <Navigate to="/login" />;
  if (requiredRole && userData?.role !== requiredRole) {
    return <Navigate to={userData?.role === 'admin' ? '/admin' : '/dashboard'} />;
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
          <Route path="/admin-login" element={<AdminLogin />} />
          
          {/* Employee Routes */}
          <Route path="/dashboard" element={<PrivateRoute requiredRole="employee"><Dashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute requiredRole="employee"><Profile /></PrivateRoute>} />
          <Route path="/checkin" element={<PrivateRoute requiredRole="employee"><Checkin /></PrivateRoute>} />
          <Route path="/leave" element={<PrivateRoute requiredRole="employee"><Leave /></PrivateRoute>} />
          <Route path="/kanban" element={<PrivateRoute requiredRole="employee"><Kanban /></PrivateRoute>} />
          <Route path="/resources" element={<PrivateRoute requiredRole="employee"><Resources /></PrivateRoute>} />
          <Route path="/resources/:tab" element={<PrivateRoute requiredRole="employee"><Resources /></PrivateRoute>} />
          <Route path="/chats" element={<PrivateRoute><Chats /></PrivateRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/attendance" element={<PrivateRoute requiredRole="admin"><AdminAttendance /></PrivateRoute>} />
          <Route path="/admin/leaves" element={<PrivateRoute requiredRole="admin"><AdminLeaves /></PrivateRoute>} />
          <Route path="/admin/employees" element={<PrivateRoute requiredRole="admin"><AdminEmployees /></PrivateRoute>} />
          <Route path="/admin/kanban" element={<PrivateRoute requiredRole="admin"><Kanban /></PrivateRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
