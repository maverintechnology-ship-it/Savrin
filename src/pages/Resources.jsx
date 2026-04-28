import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase-config';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import './AdminDashboard.css';

export default function Resources() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const isAdmin = userData?.role === 'admin';
  const [activeTab, setActiveTab] = useState(tab || 'workshops');
  
  const [workshops, setWorkshops] = useState([]);
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    const unsubWorkshops = onSnapshot(collection(db, 'workshops'), (snapshot) => {
      setWorkshops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubMeetings = onSnapshot(collection(db, 'meetings'), (snapshot) => {
      setMeetings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubWorkshops(); unsubMeetings(); };
  }, []);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    navigate(`/resources/${newTab}`);
  };

  const handleCreateWorkshop = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    await addDoc(collection(db, 'workshops'), {
      title: data.get('title'),
      category: data.get('category'),
      date: data.get('date'),
      time: data.get('time'),
      createdAt: new Date().toISOString()
    });
    e.target.reset();
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    await addDoc(collection(db, 'meetings'), {
      title: data.get('title'),
      link: data.get('link'),
      date: data.get('date'),
      time: data.get('time'),
      createdAt: new Date().toISOString()
    });
    e.target.reset();
  };

  return (
    <DashboardLayout title="Resources & Support">
      <div className="admin-tabs" style={{ display: 'flex', gap: '15px', marginBottom: '30px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', paddingBottom: '5px' }}>
        {['workshops', 'timetable', 'calendar', 'policy', 'feedback', 'contacts', 'meetings'].map(t => (
          <button 
            key={t}
            onClick={() => handleTabChange(t)} 
            style={{ 
              padding: '10px 15px', border: 'none', background: 'none', cursor: 'pointer', 
              borderBottom: activeTab === t ? '2px solid #38bdf8' : 'none', 
              fontWeight: activeTab === t ? '700' : '500',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap'
            }}
          >
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'workshops' && (
        <div className="resource-section">
          {isAdmin && (
            <div className="card" style={{ marginBottom: '25px' }}>
              <h3 className="card-title">Add New Workshop</h3>
              <form onSubmit={handleCreateWorkshop} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '15px' }}>
                <input name="title" type="text" className="form-control" placeholder="Workshop Title" required />
                <input name="category" type="text" className="form-control" placeholder="Category" required />
                <input name="date" type="date" className="form-control" required />
                <input name="time" type="time" className="form-control" required />
                <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2' }}>Create Workshop</button>
              </form>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {workshops.length > 0 ? workshops.map(w => (
              <div key={w.id} className="card">
                <div style={{ fontSize: '40px', marginBottom: '15px' }}>🎓</div>
                <span className="badge badge-success">{w.category}</span>
                <h4 style={{ margin: '10px 0' }}>{w.title}</h4>
                <p style={{ fontSize: '13px', color: '#64748b' }}>📅 {w.date} | ⏰ {w.time}</p>
                <button className="btn btn-outline btn-block" style={{ marginTop: '15px' }}>Register Now</button>
              </div>
            )) : (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#64748b' }}>No active workshops found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'timetable' && (
        <div className="card">
          <h3 className="card-title">Weekly Timetable</h3>
          {isAdmin && <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '15px' }}>Employees will see this schedule.</p>}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Time</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th></tr>
              </thead>
              <tbody>
                {[
                  { time: '09:00 AM', mon: 'Standup', tue: 'Standup', wed: 'Standup', thu: 'Standup', fri: 'Standup' },
                  { time: '11:00 AM', mon: 'Dev Sync', tue: 'Design', wed: 'Planning', thu: 'Review', fri: 'Free' },
                  { time: '02:00 PM', mon: 'Coding', tue: 'Coding', wed: 'Meetings', thu: 'Coding', fri: 'Demo' }
                ].map((row, i) => (
                  <tr key={i}>
                    <td>{row.time}</td>
                    <td>{row.mon}</td>
                    <td>{row.tue}</td>
                    <td>{row.wed}</td>
                    <td>{row.thu}</td>
                    <td>{row.fri}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="card-title">Company Calendar</h3>
            {isAdmin && <button className="btn btn-primary btn-small">+ Add Event</button>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{d}</div>
            ))}
            {Array.from({ length: 31 }, (_, i) => (
              <div key={i} style={{ 
                height: '80px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px',
                background: (i + 1) === 12 ? '#f0f9ff' : 'none',
                borderColor: (i + 1) === 12 ? '#38bdf8' : '#e2e8f0'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{i + 1}</span>
                {(i + 1) === 12 && <div style={{ fontSize: '10px', background: '#38bdf8', color: '#fff', padding: '2px 4px', borderRadius: '4px', marginTop: '5px' }}>Meeting</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'policy' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="card-title">Policy & Rule Book</h3>
            {isAdmin && <button className="btn btn-primary btn-small">+ New Policy</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {[
              { title: 'Work From Home Policy', content: 'Employees are eligible for WFH based on department approval. Core hours 10 AM - 4 PM.' },
              { title: 'Leave & Absence', content: 'Annual leave requires 7 days notice. Sick leave should be reported by 9:30 AM.' },
              { title: 'Information Security', content: 'Use company VPN for all internal tools. Do not share credentials.' }
            ].map((p, i) => (
              <div key={i} style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h4 style={{ color: '#0369a1', marginBottom: '8px' }}>{p.title}</h4>
                  {isAdmin && <button style={{ border: 'none', background: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer' }}>Edit</button>}
                </div>
                <p style={{ fontSize: '14px', color: '#334155' }}>{p.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="card" style={{ maxWidth: isAdmin ? '100%' : '600px' }}>
          <h3 className="card-title">{isAdmin ? 'Employee Feedback Submissions' : 'Share Your Feedback'}</h3>
          {!isAdmin ? (
            <form style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              <div className="form-group">
                <label>Subject</label>
                <input type="text" className="form-control" placeholder="Enter subject" required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select className="form-control" required>
                  <option>Work Environment</option>
                  <option>Facilities</option>
                  <option>Management</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Details</label>
                <textarea className="form-control" rows="4" placeholder="Your feedback..." required></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Submit Feedback</button>
            </form>
          ) : (
            <div className="table-wrapper" style={{ marginTop: '20px' }}>
              <table>
                <thead>
                  <tr><th>Employee</th><th>Category</th><th>Subject</th><th>Status</th></tr>
                </thead>
                <tbody>
                  <tr><td>John Doe</td><td>Facilities</td><td>AC issue in Room 4</td><td><span className="badge badge-warning">Pending</span></td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="card-title">Points of Contact</h3>
            {isAdmin && <button className="btn btn-primary btn-small">+ Add Contact</button>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ fontSize: '30px' }}>👔</div>
              <div>
                <h4 style={{ margin: 0 }}>HR Manager</h4>
                <p style={{ margin: '4px 0', fontSize: '13px', color: '#64748b' }}>hr@yastha.com</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>9841597834</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="resource-section">
          {isAdmin && (
            <div className="card" style={{ marginBottom: '25px' }}>
              <h3 className="card-title">Schedule New Meeting</h3>
              <form onSubmit={handleCreateMeeting} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '15px' }}>
                <input name="title" type="text" className="form-control" placeholder="Meeting Title" required />
                <input name="link" type="text" className="form-control" placeholder="Meeting Link" required />
                <input name="date" type="date" className="form-control" required />
                <input name="time" type="time" className="form-control" required />
                <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2' }}>Schedule Meeting</button>
              </form>
            </div>
          )}
          <div className="card">
            <h4 style={{ marginBottom: '15px' }}>All Scheduled Meetings</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {meetings.map(m => (
                <div key={m.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.title}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>📅 {m.date} | ⏰ {m.time}</div>
                  </div>
                  <a href={m.link} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ color: '#38bdf8' }}>Join Link</a>
                </div>
              ))}
              {meetings.length === 0 && <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No meetings scheduled.</p>}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
