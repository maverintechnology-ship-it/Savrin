import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db } from '../firebase-config';
import { collection, query, orderBy, onSnapshot, getDocs, where } from 'firebase/firestore';
import EmployeeDetailsModal from '../components/EmployeeDetailsModal';
import { useAuth } from '../context/AuthContext';

export default function AdminAttendance() {
  const { userData } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [filterUser, setFilterUser] = useState('');

  const formatDuration = (sec) => {
    if (!sec || sec < 0) return '0h 0m';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getGroupedData = () => {
    const groups = {};
    
    // Sort oldest first for easier processing
    const sorted = [...attendance].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    sorted.forEach(record => {
      const date = new Date(record.time).toLocaleDateString();
      const key = `${record.userId}_${date}`;
      
      if (!groups[key]) {
        groups[key] = {
          userId: record.userId,
          name: record.userName,
          date: date,
          inTime: null,
          outTime: null,
          totalBreakSec: 0,
          lastBreakStart: null,
          status: 'LOGGED OUT',
          lastActionTime: new Date(record.time)
        };
      }
      
      const g = groups[key];
      const recTime = new Date(record.time);
      g.lastActionTime = recTime;

      if (record.type === 'checkin') {
        if (!g.inTime) g.inTime = recTime;
        g.status = 'ACTIVE';
      } else if (record.type === 'checkout') {
        g.outTime = recTime;
        g.status = 'LOGGED OUT';
      } else if (record.type === 'break_start') {
        g.lastBreakStart = recTime;
        g.status = 'BREAK';
      } else if (record.type === 'break_end') {
        if (g.lastBreakStart) {
          g.totalBreakSec += Math.floor((recTime - g.lastBreakStart) / 1000);
        }
        g.status = 'ACTIVE';
      }
    });

    return Object.values(groups).map(g => {
      let workingSec = 0;
      if (g.inTime) {
        const end = g.outTime || (g.date === new Date().toLocaleDateString() ? new Date() : g.lastActionTime);
        workingSec = Math.floor((end - g.inTime) / 1000) - g.totalBreakSec;
      }
      
      return {
        ...g,
        workingTimeStr: formatDuration(workingSec),
        breakTimeStr: formatDuration(g.totalBreakSec)
      };
    }).reverse(); // Newest first
  };

  const downloadCSV = async () => {
    const data = getGroupedData();
    if (data.length === 0) return;

    let csv = 'Date,Name,In Time,Out Time,Working Time,Break Time,Status\n';
    data.forEach(row => {
      csv += `${row.date},${row.name},${row.inTime?.toLocaleTimeString() || '-'},${row.outTime?.toLocaleTimeString() || '-'},${row.workingTimeStr},${row.breakTimeStr},${row.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!userData?.companyId) return;

    const companyId = userData.companyId;

    const qAtt = query(collection(db, 'attendance'), where('companyId', '==', companyId));
    const unsub = onSnapshot(qAtt, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => new Date(b.time) - new Date(a.time));
      setAttendance(docs);
    });

    const qUsers = query(collection(db, 'users'), where('companyId', '==', companyId));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const u = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(u.filter(user => user.role === 'employee' || user.role === 'admin'));
    });

    return () => {
      unsub();
      unsubUsers();
    };
  }, [userData]);

  const filteredAttendance = filterUser 
    ? getGroupedData().filter(record => record.userId === filterUser)
    : getGroupedData();

  return (
    <DashboardLayout title="Organization Attendance">
      <div className="stats-row" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-icon-wrap indigo">👥</div>
          <div className="stat-info">
            <span className="stat-value">{employees.length}</span>
            <span className="stat-label">Total Staff</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap green">✅</div>
          <div className="stat-info">
            <span className="stat-value">{getGroupedData().filter(r => r.date === new Date().toLocaleDateString() && r.status === 'ACTIVE').length}</span>
            <span className="stat-label">Currently Active</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap amber">☕</div>
          <div className="stat-info">
            <span className="stat-value">{getGroupedData().filter(r => r.date === new Date().toLocaleDateString() && r.status === 'BREAK').length}</span>
            <span className="stat-label">On Break</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="stat-icon-wrap" style={{ width: '40px', height: '40px', fontSize: '18px', background: 'var(--bg-indigo)', color: 'var(--primary)' }}>🔍</div>
            <div style={{ minWidth: '240px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Filter by Employee</label>
              <select 
                className="form-control" 
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                style={{ borderRadius: '10px' }}
              >
                <option value="">View All Team Members</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={downloadCSV} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}>
            <span>📥</span> Export Logs (CSV)
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '24px' }}>Detailed Attendance History</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Shift Start</th>
                <th>Shift End</th>
                <th>Work Duration</th>
                <th>Break Time</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '32px', opacity: 0.2, marginBottom: '12px' }}>📅</div>
                    No attendance records match your criteria.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{record.date}</td>
                    <td>
                      <div className="clickable-name" onClick={() => setSelectedUserId(record.userId)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar-small" style={{ background: 'var(--bg-indigo)', color: 'var(--primary)', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                          {record.name?.charAt(0)}
                        </div>
                        {record.name}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success" style={{ background: 'var(--bg-success)', color: 'var(--success)', padding: '4px 10px', fontSize: '11px' }}>
                        {record.inTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-danger" style={{ background: 'var(--bg-pink)', color: 'var(--danger)', padding: '4px 10px', fontSize: '11px' }}>
                        {record.outTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || '—'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>{record.workingTimeStr}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{record.breakTimeStr}</td>
                    <td>
                      <span className={`badge ${
                        record.status === 'ACTIVE' ? 'badge-success' : 
                        record.status === 'BREAK' ? 'badge-warning' : 
                        'badge-secondary'
                      }`} style={{ minWidth: '90px', textAlign: 'center' }}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedUserId && <EmployeeDetailsModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </DashboardLayout>
  );
}
