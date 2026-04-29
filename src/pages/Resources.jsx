import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase-config';
import { collection, addDoc, query, onSnapshot, orderBy, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { sendWorkshopTicket } from '../services/emailService';

import './AdminDashboard.css';

export default function Resources() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const isCompany = userData?.role === 'company';
  const isStaffAdmin = userData?.role === 'admin';
  const canManageResources = isCompany || isStaffAdmin;
  const canEditPolicy = isCompany; // Only Company Owners can edit policies
  const [activeTab, setActiveTab] = useState(tab || 'workshops');
  const [showMenu, setShowMenu] = useState(null); // Tracks which item's menu is open

  
  const [workshops, setWorkshops] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [registrations, setRegistrations] = useState([]); // Tracks current user's registrations
  const [allRegistrations, setAllRegistrations] = useState([]); // For Admin view
  const [feedbacks, setFeedbacks] = useState([]); // For both admin and user
  const [feedbackCategory, setFeedbackCategory] = useState('Work Environment');


  
  const [editingItem, setEditingItem] = useState(null); // For edit forms
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date()); // For calendar navigation




  console.log("Resources component rendering. activeTab:", activeTab, "canManage:", canManageResources);

  useEffect(() => {
    if (tab) {
      console.log("Tab changed from URL:", tab);
      setActiveTab(tab);
    }
  }, [tab]);

  useEffect(() => {
    if (!userData?.companyId) return;
    const companyId = userData.companyId;

    console.log("Setting up company-scoped snapshots in Resources for:", companyId);
    
    const unsubWorkshops = onSnapshot(query(collection(db, 'workshops'), where('companyId', '==', companyId)), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorkshops(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    const unsubMeetings = onSnapshot(query(collection(db, 'meetings'), where('companyId', '==', companyId)), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeetings(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    const unsubTimetable = onSnapshot(query(collection(db, 'timetable'), where('companyId', '==', companyId)), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTimetable(data.sort((a, b) => (a.time || '').localeCompare(b.time || '')));
    });

    const unsubEvents = onSnapshot(query(collection(db, 'calendar_events'), where('companyId', '==', companyId)), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCalendarEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
    });

    const unsubPolicies = onSnapshot(query(collection(db, 'policies'), where('companyId', '==', companyId)), (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      p.sort((a, b) => (parseInt(a.title) || 0) - (parseInt(b.title) || 0));
      setPolicies(p);
    });

    const unsubContacts = onSnapshot(query(collection(db, 'contacts'), where('companyId', '==', companyId)), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContacts(data.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    });

    const unsubRegs = onSnapshot(query(collection(db, 'registrations'), where('companyId', '==', companyId), where('userId', '==', userData.id)), (snapshot) => {
      setRegistrations(snapshot.docs.map(doc => doc.data().workshopId));
    });
    
    const unsubFeedback = onSnapshot(
      canManageResources 
        ? query(collection(db, 'feedback'), where('companyId', '==', companyId))
        : query(collection(db, 'feedback'), where('companyId', '==', companyId), where('userId', '==', userData.id)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFeedbacks(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    );

    let unsubAllRegs = () => {};
    if (canManageResources) {
      unsubAllRegs = onSnapshot(query(collection(db, 'registrations'), where('companyId', '==', companyId)), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllRegistrations(data.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)));
      });
    }

    return () => { 
      unsubWorkshops(); unsubMeetings(); unsubTimetable(); unsubEvents(); unsubPolicies(); unsubContacts(); unsubRegs(); unsubAllRegs(); unsubFeedback();
    };
  }, [userData?.companyId, userData?.id, canManageResources]);


  // Auto-seeding for policies if empty and is admin
  useEffect(() => {
    if (canEditPolicy && policies.length === 0) {
      const seedPolicies = async () => {
        const initialPolicies = [
          {
            title: "1. Employee Conduct Policy 2026",
            content: "1.1 Professional Behavior\nAll employees must maintain respectful and professional behavior in the workplace.\nHarassment, discrimination, bullying, or abusive language will not be tolerated.\nMaintain positive communication with team members, clients, and management.\n\n1.2 Attendance & Punctuality\nEmployees must report to work on time.\nLate arrivals or unapproved absences may lead to disciplinary action.\nAttendance must be marked daily through the HRMS Log Time system.\n\n1.3 Dress Code\nSmart casual or professional attire is expected during office hours.\nClean and presentable appearance is mandatory.\n\n1.4 Confidentiality\nEmployees must protect company data, client information, and internal documents.\nSharing confidential data without permission is prohibited.\n\n1.5 Use of Company Property\nCompany laptops, systems, IDs, and resources should be used only for official work.\nDamage caused by negligence may be chargeable."
          },
          {
            title: "2. Remote Work Guidelines",
            content: "2.1 Work Hours\nEmployees working remotely must be available during official working hours.\nDaily login and logout must be updated in HRMS.\n\n2.2 Communication\nEmployees must respond to emails/messages within reasonable time.\nAttend scheduled meetings on time.\n\n2.3 Productivity\nComplete assigned tasks before deadlines.\nDaily progress updates may be required.\n\n2.4 Security\nUse secure internet connections.\nDo not share passwords or access company files on public devices."
          },
          {
            title: "3. IT Security Protocols",
            content: "3.1 Password Policy\nUse strong passwords with letters, numbers, and symbols.\nChange passwords regularly.\n\n3.2 Data Protection\nBackup important files regularly.\nDo not install unauthorized software.\n\n3.3 Email Safety\nAvoid clicking suspicious links or attachments.\nReport phishing attempts immediately.\n\n3.4 Device Usage\nLock screens when away from desk.\nAntivirus updates must remain active."
          },
          {
            title: "4. Leave Policy",
            content: "All leave requests must be submitted through HRMS.\nEmergency leave must be informed to manager immediately.\nUnapproved leave may be considered absent."
          },
          {
            title: "5. Workplace Discipline",
            content: "The following may lead to warning or termination:\n- Repeated lateness\n- Misconduct\n- Data theft\n- Harassment\n- Poor performance without improvement\n- Unauthorized absence\n- Violation of company rules"
          },
          {
            title: "6. Employee Responsibilities",
            content: "Complete assigned tasks sincerely.\nRespect deadlines.\nMaintain teamwork.\nProtect company reputation.\nFollow management instructions."
          },
          {
            title: "7. Management Rights",
            content: "Management reserves the right to:\n- Update policies anytime\n- Monitor work systems\n- Take disciplinary actions\n- Assign tasks based on business needs"
          },
          {
            title: "8. Acknowledgement",
            content: "All employees are expected to read, understand, and follow this Company Policy & Rule Book."
          }
        ];
        
        console.log("Auto-seeding initial policies...");
        for (const p of initialPolicies) {
          await addDoc(collection(db, 'policies'), { 
            ...p, 
            companyId: userData.companyId,
            createdAt: new Date().toISOString() 
          });
        }
      };
      
      // Wait a bit to ensure it's actually empty and not just loading
      const timer = setTimeout(() => {
        if (policies.length === 0) seedPolicies();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [canEditPolicy, policies.length]);



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
      companyId: userData.companyId,
      createdAt: new Date().toISOString()
    });
    e.target.reset();
  };

  const handleDelete = async (coll, id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, coll, id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleCreateTimetable = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    await addDoc(collection(db, 'timetable'), {
      time: data.get('time'),
      mon: data.get('mon'),
      tue: data.get('tue'),
      wed: data.get('wed'),
      thu: data.get('thu'),
      fri: data.get('fri'),
      companyId: userData.companyId,
      createdAt: new Date().toISOString()
    });
    e.target.reset();
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    await addDoc(collection(db, 'calendar_events'), {
      title: data.get('title'),
      date: data.get('date'),
      type: data.get('type') || 'meeting',
      companyId: userData.companyId,
      createdAt: new Date().toISOString()
    });
    e.target.reset();
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    await addDoc(collection(db, 'policies'), {
      title: data.get('title'),
      content: data.get('content'),
      companyId: userData.companyId,
      createdAt: new Date().toISOString()
    });
    e.target.reset();
  };

  const handleCreateContact = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    await addDoc(collection(db, 'contacts'), {
      name: data.get('name'),
      email: data.get('email'),
      phone: data.get('phone'),
      role: data.get('role'),
      icon: data.get('icon') || '👔',
      companyId: userData.companyId,
      createdAt: new Date().toISOString()
    });
    e.target.reset();
  };
  const handleUpdatePolicy = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    try {
      await updateDoc(doc(db, 'policies', editingItem.id), {
        title: data.get('title'),
        content: data.get('content')
      });
      setEditingItem(null);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleUpdateTimetable = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    try {
      await updateDoc(doc(db, 'timetable', editingItem.id), {
        time: data.get('time'),
        mon: data.get('mon'),
        tue: data.get('tue'),
        wed: data.get('wed'),
        thu: data.get('thu'),
        fri: data.get('fri')
      });
      setEditingItem(null);
    } catch (err) {
      console.error("Update failed:", err);
    }
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

  const handleRegisterWorkshop = async (workshop) => {
    if (!userData) {
      alert("Please login to register.");
      return;
    }
    
    if (registrations.includes(workshop.id)) {
      alert("You are already registered for this workshop!");
      return;
    }

    try {
      const ticketNumber = 'TKT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      await addDoc(collection(db, 'registrations'), {
        workshopId: workshop.id,
        workshopTitle: workshop.title,
        userId: userData.id,
        userEmail: userData.email,
        userName: userData.name || userData.email.split('@')[0],
        registeredAt: new Date().toISOString(),
        ticketNumber: ticketNumber,
        companyId: userData.companyId
      });

      // Send real email ticket
      await sendWorkshopTicket(
        userData.email,
        userData.name || userData.email.split('@')[0],
        workshop.title,
        workshop.date,
        workshop.time,
        ticketNumber
      );

      alert(`Registration Successful! A ticket has been sent to ${userData.email}`);
    } catch (err) {
      console.error("Registration failed:", err);
      alert("Failed to register. Please try again.");
    }
  };




  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const category = data.get('category');
    const otherCategory = data.get('otherCategory');
    
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: userData.id,
        userName: userData.name || userData.email.split('@')[0],
        userEmail: userData.email,
        category: category === 'Other' ? otherCategory : category,
        details: data.get('details'),
        status: 'Pending',
        companyId: userData.companyId,
        createdAt: new Date().toISOString()
      });
      alert("Feedback submitted successfully!");
      e.target.reset();
      setFeedbackCategory('Work Environment');
    } catch (err) {
      console.error("Feedback failed:", err);
      alert("Failed to submit feedback.");
    }
  };



  const getTabTitle = (tab) => {
    const titles = {
      workshops: 'Professional Workshops',
      timetable: 'Weekly Timetable',
      calendar: 'Company Calendar',
      policy: 'Policies & Rule Book',
      feedback: 'Support & Feedback',
      contacts: 'Contact Directory',
      meetings: 'Virtual Meetings'
    };
    return titles[tab] || 'Resources';
  };

  return (
    <DashboardLayout title={getTabTitle(activeTab)}>
      {/* Premium Tab Navigation */}
      <div className="card" style={{ padding: '8px', marginBottom: '32px', display: 'flex', gap: '8px', overflowX: 'auto', background: '#fff' }}>
        {[
          { id: 'workshops', label: 'Workshops', icon: '🎓' },
          { id: 'timetable', label: 'Timetable', icon: '🕒' },
          { id: 'calendar', label: 'Calendar', icon: '📅' },
          { id: 'policy', label: 'Policies', icon: '📜' },
          { id: 'feedback', label: 'Feedback', icon: '📣' },
          { id: 'contacts', label: 'Contacts', icon: '👔' },
          { id: 'meetings', label: 'Meetings', icon: '📹' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              whiteSpace: 'nowrap',
              padding: '10px 20px',
              borderRadius: '12px'
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="resource-content-area" style={{ minHeight: '400px' }}>
        {activeTab === 'workshops' && (
          <div className="resource-section">
            {canManageResources && (
              <div className="card" style={{ marginBottom: '32px' }}>
                <h3 className="card-title">Add New Workshop</h3>
                <form onSubmit={handleCreateWorkshop} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '15px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input name="title" type="text" className="form-control" placeholder="Workshop Title" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input name="category" type="text" className="form-control" placeholder="Category" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input name="date" type="date" className="form-control" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input name="time" type="time" className="form-control" required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ height: '45px' }}>Create Workshop</button>
                </form>
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {workshops.length > 0 ? workshops.map(w => (
                <div key={w.id} className="card workshop-card-modern">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ fontSize: '32px' }}>🎓</div>
                    {canManageResources && (
                      <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowMenu(showMenu === w.id ? null : w.id)} className="btn btn-ghost btn-small">⋮</button>
                        {showMenu === w.id && (
                          <div className="card" style={{ position: 'absolute', right: 0, top: '35px', padding: '8px', zIndex: 10, minWidth: '120px', boxShadow: 'var(--shadow-lg)' }}>
                            <button onClick={() => { handleDelete('workshops', w.id); setShowMenu(null); }} style={{ width: '100%', textAlign: 'left', color: 'var(--danger)', fontSize: '12px', fontWeight: 600 }}>Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <span className="badge badge-info" style={{ marginBottom: '12px' }}>{w.category}</span>
                  <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>{w.title}</h4>
                  
                  <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                    <span>📅 {w.date}</span>
                    <span>⏰ {w.time}</span>
                  </div>

                  <button 
                    onClick={() => handleRegisterWorkshop(w)}
                    className={`btn btn-block ${registrations.includes(w.id) ? 'btn-primary' : 'btn-outline'}`}
                    disabled={registrations.includes(w.id)}
                  >
                    {registrations.includes(w.id) ? '✓ Already Registered' : 'Enroll in Workshop'}
                  </button>
                </div>
              )) : (
                <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px' }}>
                  <div style={{ fontSize: '40px', opacity: 0.3, marginBottom: '16px' }}>🎓</div>
                  <p style={{ color: 'var(--text-muted)' }}>No workshops are currently scheduled.</p>
                </div>
              )}
            </div>

            {canManageResources && allRegistrations.length > 0 && (
              <div className="card" style={{ marginTop: '30px' }}>
                <h3 className="card-title" style={{ marginBottom: '20px' }}>Workshop Registration Records</h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Workshop</th>
                        <th>Employee</th>
                        <th>Email</th>
                        <th>Ticket #</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRegistrations.map((reg) => (
                        <tr key={reg.id}>
                          <td><strong>{reg.workshopTitle}</strong></td>
                          <td>{reg.userName}</td>
                          <td>{reg.userEmail}</td>
                          <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{reg.ticketNumber}</code></td>
                          <td>{new Date(reg.registeredAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}


        {activeTab === 'timetable' && (
          <div className="resource-section">
            {canManageResources && (
              <div className="card" style={{ marginBottom: '25px' }}>
                <h3 className="card-title">{editingItem ? 'Edit Timetable Row' : 'Add Timetable Row'}</h3>
                <form onSubmit={editingItem ? handleUpdateTimetable : handleCreateTimetable} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '15px' }}>
                  <input name="time" type="text" className="form-control" placeholder="Time (e.g. 09:00 AM)" defaultValue={editingItem?.time || ''} required />
                  <input name="mon" type="text" className="form-control" placeholder="Monday" defaultValue={editingItem?.mon || ''} required />
                  <input name="tue" type="text" className="form-control" placeholder="Tuesday" defaultValue={editingItem?.tue || ''} required />
                  <input name="wed" type="text" className="form-control" placeholder="Wednesday" defaultValue={editingItem?.wed || ''} required />
                  <input name="thu" type="text" className="form-control" placeholder="Thursday" defaultValue={editingItem?.thu || ''} required />
                  <input name="fri" type="text" className="form-control" placeholder="Friday" defaultValue={editingItem?.fri || ''} required />
                  <div style={{ gridColumn: 'span 3', display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingItem ? 'Update Row' : 'Add Row'}</button>
                    {editingItem && <button type="button" onClick={() => setEditingItem(null)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>}
                  </div>
                </form>
              </div>
            )}
            <div className="card">
              <h3 className="card-title">Weekly Timetable</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Time</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th>{canManageResources && <th></th>}</tr>
                  </thead>
                  <tbody>
                    {timetable.map((row) => (
                      <tr key={row.id}>
                        <td>{row.time}</td>
                        <td>{row.mon}</td>
                        <td>{row.tue}</td>
                        <td>{row.wed}</td>
                        <td>{row.thu}</td>
                        <td>{row.fri}</td>
                        {canManageResources && (
                          <td style={{ position: 'relative' }}>
                            <button onClick={() => setShowMenu(showMenu === row.id ? null : row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>⋮</button>
                            {showMenu === row.id && (
                              <div style={{ position: 'absolute', right: 0, top: '30px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '6px', zIndex: 10, padding: '5px', minWidth: '100px' }}>
                                <button onClick={() => { setEditingItem(row); setShowMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                                <button onClick={() => { handleDelete('timetable', row.id); setShowMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}

                    {timetable.length === 0 && (
                      <tr><td colSpan={canManageResources ? 7 : 6} style={{ textAlign: 'center', padding: '20px' }}>No schedule set.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="resource-section">
            {canManageResources && (
              <div className="card" style={{ marginBottom: '25px' }}>
                <h3 className="card-title">Add Calendar Event</h3>
                <form onSubmit={handleCreateEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '15px' }}>
                  <input name="title" type="text" className="form-control" placeholder="Event Title" required />
                  <input name="date" type="date" className="form-control" required />
                  <select name="type" className="form-control">
                    <option value="meeting">Meeting</option>
                    <option value="holiday">Holiday</option>
                    <option value="event">Event</option>
                  </select>
                  <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2' }}>Add Event</button>
                </form>
              </div>
            )}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="card-title">Company Calendar</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                    className="btn btn-outline" style={{ padding: '5px 12px' }}
                  >
                    &larr;
                  </button>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <select 
                      className="form-control" 
                      style={{ padding: '5px', width: '120px', height: '35px' }}
                      value={currentDate.getMonth()}
                      onChange={(e) => setCurrentDate(new Date(currentDate.getFullYear(), parseInt(e.target.value), 1))}
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                        <option key={m} value={idx}>{m}</option>
                      ))}
                    </select>
                    <select 
                      className="form-control" 
                      style={{ padding: '5px', width: '90px', height: '35px' }}
                      value={currentDate.getFullYear()}
                      onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentDate.getMonth(), 1))}
                    >
                      {Array.from({ length: 1001 }, (_, i) => 2000 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                    className="btn btn-outline" style={{ padding: '5px 12px' }}
                  >
                    &rarr;
                  </button>
                </div>
              </div>

              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#64748b', padding: '10px 0' }}>{d}</div>
                ))}
                
                {(() => {
                  const year = currentDate.getFullYear();
                  const month = currentDate.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  
                  const days = [];
                  // Empty slots before the first day
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} style={{ height: '100px', background: '#f8fafc', borderRadius: '8px' }}></div>);
                  }
                  
                  const today = new Date();
                  const isTodayMonth = today.getMonth() === month && today.getFullYear() === year;

                  // Actual days
                  for (let day = 1; day <= daysInMonth; day++) {
                    const isToday = isTodayMonth && today.getDate() === day;
                    const dayEvents = calendarEvents.filter(e => {
                      const d = new Date(e.date);
                      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
                    });
                    
                    days.push(
                      <div key={day} style={{ 
                        height: '100px', border: isToday ? '2px solid #38bdf8' : '1px solid #e2e8f0', 
                        borderRadius: '8px', padding: '8px',
                        background: isToday ? '#eff6ff' : (dayEvents.length > 0 ? '#f0f9ff' : 'none'),
                        boxShadow: isToday ? '0 0 10px rgba(56, 189, 248, 0.2)' : 'none',
                        position: 'relative',
                        overflowY: 'auto'
                      }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '700', 
                          marginBottom: '5px',
                          color: isToday ? '#0284c7' : 'inherit',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span>{day}</span>
                          {isToday && <span style={{ fontSize: '9px', background: '#38bdf8', color: '#fff', padding: '1px 4px', borderRadius: '4px' }}>TODAY</span>}
                        </div>
                        {dayEvents.map(e => (
                          <div key={e.id} style={{ position: 'relative', marginBottom: '4px' }}>
                            <div style={{ 
                              fontSize: '9px', background: e.type === 'holiday' ? '#ef4444' : '#38bdf8', 
                              color: '#fff', padding: '2px 4px', borderRadius: '4px',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                              {e.title}
                            </div>
                            {canManageResources && (
                              <div style={{ position: 'absolute', right: 0, top: 0 }}>
                                <button onClick={() => setShowMenu(showMenu === e.id ? null : e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '10px' }}>⋮</button>
                                {showMenu === e.id && (
                                  <div style={{ position: 'absolute', right: 0, top: '12px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '4px', zIndex: 10, padding: '4px', minWidth: '80px' }}>
                                    <button onClick={() => { handleDelete('calendar_events', e.id); setShowMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '4px 8px', background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return days;
                })()}
              </div>
            </div>
          </div>
        )}


        {activeTab === 'policy' && (
          <div className="resource-section">
            {canEditPolicy && (
              <div className="card" style={{ marginBottom: '25px' }}>
                <h3 className="card-title">{editingItem ? 'Edit Policy' : 'Add New Policy'}</h3>
                <form onSubmit={editingItem ? handleUpdatePolicy : handleCreatePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '15px' }}>
                  <input name="title" type="text" className="form-control" placeholder="Policy Title" defaultValue={editingItem?.title || ''} required />
                  <textarea name="content" className="form-control" rows="4" placeholder="Policy Content" defaultValue={editingItem?.content || ''} required></textarea>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingItem ? 'Update Policy' : 'Create Policy'}</button>
                    {editingItem && <button type="button" onClick={() => setEditingItem(null)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>}
                  </div>
                </form>
              </div>
            )}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="card-title">Policy & Rule Book</h3>
                <select 
                  className="form-control" 
                  style={{ maxWidth: '300px' }}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                  value={selectedPolicyId || ''}
                >
                  <option value="">-- Select a Policy to View --</option>
                  {policies.map((p, idx) => (
                    <option key={p.id} value={p.id}>{idx + 1}. {p.title.replace(/^[0-9.]+\s*/, '')}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {policies.filter(p => !selectedPolicyId || p.id === selectedPolicyId).map((p, idx) => (
                  <div key={p.id} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>
                      <h4 style={{ color: '#0369a1', margin: 0 }}>{idx + 1}. {p.title.replace(/^[0-9.]+\s*/, '')}</h4>
                      {canEditPolicy && (
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => setShowMenu(showMenu === p.id ? null : p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>⋮</button>
                          {showMenu === p.id && (
                            <div style={{ position: 'absolute', right: 0, top: '20px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '6px', zIndex: 10, padding: '5px', minWidth: '100px' }}>
                              <button onClick={() => { setEditingItem(p); setShowMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                              <button onClick={() => { handleDelete('policies', p.id); setShowMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{p.content}</p>
                  </div>
                ))}
                {policies.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No policies uploaded yet.</div>
                )}
              </div>
            </div>

          </div>
        )}



        {activeTab === 'feedback' && (
          <div className="card" style={{ maxWidth: canManageResources ? '100%' : '800px' }}>
            <h3 className="card-title">{canManageResources ? 'Employee Complaints & Feedback' : 'Submit a Complaint / Feedback'}</h3>
            {!canManageResources ? (
              <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                <div className="form-group">
                  <label>Employee Name</label>
                  <input type="text" className="form-control" value={userData?.name || userData?.email?.split('@')[0]} disabled style={{ background: '#f8fafc' }} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select 
                    name="category" 
                    className="form-control" 
                    required 
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    value={feedbackCategory}
                  >
                    <option>Work Environment</option>
                    <option>Facilities</option>
                    <option>Management</option>
                    <option>Other</option>
                  </select>
                </div>
                {feedbackCategory === 'Other' && (
                  <div className="form-group">
                    <label>Specify Other Category</label>
                    <input name="otherCategory" type="text" className="form-control" placeholder="Please specify..." required />
                  </div>
                )}
                <div className="form-group">
                  <label>Details / Complaint</label>
                  <textarea name="details" className="form-control" rows="4" placeholder="Describe your issue in detail..." required></textarea>
                </div>
                <button type="submit" className="btn btn-primary btn-block">Submit Complaint</button>
              </form>
            ) : (
              <div className="table-wrapper" style={{ marginTop: '20px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Category</th>
                      <th>Details</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbacks.map((fb) => (
                      <tr key={fb.id}>
                        <td><strong>{fb.userName}</strong><br/><small>{fb.userEmail}</small></td>
                        <td><span className="badge badge-info">{fb.category}</span></td>
                        <td style={{ maxWidth: '300px', whiteSpace: 'normal', fontSize: '13px' }}>{fb.details}</td>
                        <td>{new Date(fb.createdAt).toLocaleDateString()}</td>
                        <td>
                          <select 
                            className={`badge ${fb.status === 'Resolved' ? 'badge-success' : 'badge-warning'}`}
                            style={{ border: 'none', cursor: 'pointer' }}
                            value={fb.status}
                            onChange={async (e) => {
                              await updateDoc(doc(db, 'feedback', fb.id), { status: e.target.value });
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {feedbacks.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No feedback submissions found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}


        {activeTab === 'contacts' && (
          <div className="resource-section">
            {canManageResources && (
              <div className="card" style={{ marginBottom: '25px' }}>
                <h3 className="card-title">Add Point of Contact</h3>
                <form onSubmit={handleCreateContact} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '15px' }}>
                  <input name="name" type="text" className="form-control" placeholder="Name" required />
                  <input name="role" type="text" className="form-control" placeholder="Role (e.g. HR Manager)" required />
                  <input name="email" type="email" className="form-control" placeholder="Email" required />
                  <input name="phone" type="text" className="form-control" placeholder="Phone" required />
                  <input name="icon" type="text" className="form-control" placeholder="Icon (Emoji)" defaultValue="👔" />
                  <button type="submit" className="btn btn-primary">Add Contact</button>
                </form>
              </div>
            )}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '20px' }}>Points of Contact</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                {contacts.map((c) => (
                  <div key={c.id} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
                    <div style={{ fontSize: '30px' }}>{c.icon || '👔'}</div>
                    <div>
                      <h4 style={{ margin: 0 }}>{c.role}</h4>
                      <p style={{ margin: '2px 0', fontSize: '13px', fontWeight: 600 }}>{c.name}</p>
                      <p style={{ margin: '2px 0', fontSize: '13px', color: '#64748b' }}>{c.email}</p>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{c.phone}</p>
                    </div>
                    {canManageResources && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                        <button onClick={() => setShowMenu(showMenu === c.id ? null : c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>⋮</button>
                        {showMenu === c.id && (
                          <div style={{ position: 'absolute', right: 0, top: '20px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '6px', zIndex: 10, padding: '5px', minWidth: '100px' }}>
                            <button onClick={() => { handleDelete('contacts', c.id); setShowMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                ))}
                {contacts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', gridColumn: '1/-1' }}>No contacts listed yet.</div>
                )}
              </div>
            </div>
          </div>
        )}


        {activeTab === 'meetings' && (
          <div className="resource-section">
            {canManageResources && (
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <a href={m.link} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ color: '#38bdf8' }}>Join Link</a>
                      {canManageResources && (
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => setShowMenu(showMenu === m.id ? null : m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '18px' }}>⋮</button>
                          {showMenu === m.id && (
                            <div style={{ position: 'absolute', right: 0, top: '25px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '6px', zIndex: 10, padding: '5px', minWidth: '100px' }}>
                              <button onClick={() => { handleDelete('meetings', m.id); setShowMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>


                ))}
                {meetings.length === 0 && <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No meetings scheduled.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
