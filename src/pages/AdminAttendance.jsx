import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { db } from '../firebase-config';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';

export default function AdminAttendance() {
  const [attendance, setAttendance] = useState([]);

  const downloadCSV = async () => {
    try {
      const q = query(collection(db, 'attendance'), orderBy('time', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        let csv = 'User ID,User Name,Action,Date & Time\n';
        snapshot.forEach(docSnap => {
          const record = docSnap.data();
          const dateStr = new Date(record.time).toLocaleString().replace(/,/g, '');
          csv += `${record.userId},${record.userName},${record.type},${dateStr}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attendance_logs.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'attendance'), orderBy('time', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <DashboardLayout title="Attendance Logs">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Full System Attendance History</h3>
          <button onClick={downloadCSV} className="btn btn-outline btn-small">
            <img src="/assets/icons/attendance.png" width="14" style={{ marginRight: '8px' }} alt="" />
            Download CSV
          </button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Employee</th><th>Type</th><th>Date</th><th>Time</th></tr>
            </thead>
            <tbody>
              {attendance.map(record => (
                <tr key={record.id}>
                  <td style={{ fontWeight: 600 }}>{record.userName}</td>
                  <td><span className={`badge ${record.type === 'checkin' ? 'badge-success' : 'badge-warning'}`}>{record.type}</span></td>
                  <td>{new Date(record.time).toLocaleDateString()}</td>
                  <td>{new Date(record.time).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
