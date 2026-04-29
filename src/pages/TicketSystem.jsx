import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase-config';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';

export default function TicketSystem() {
  const { userData } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    assignedToId: '',
    assignedToName: '',
    priority: 'MEDIUM',
    deadline: ''
  });

  const isAdmin = userData?.role === 'admin' || userData?.role === 'company';

  useEffect(() => {
    if (!userData?.companyId) return;

    // Fetch tickets
    let q;
    if (isAdmin) {
      q = query(collection(db, 'tickets'), where('companyId', '==', userData.companyId));
    } else {
      q = query(collection(db, 'tickets'), where('assignedToId', '==', userData.id));
    }

    const unsubTickets = onSnapshot(q, (snapshot) => {
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTickets(t.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    // Fetch employees for assignment
    if (isAdmin) {
      const fetchEmployees = async () => {
        const qEmp = query(collection(db, 'users'), where('companyId', '==', userData.companyId));
        const snap = await getDocs(qEmp);
        setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(u => u.role === 'employee'));
      };
      fetchEmployees();
    }

    return () => unsubTickets();
  }, [userData, isAdmin]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    const assignedUser = employees.find(emp => emp.id === newTicket.assignedToId);
    
    await addDoc(collection(db, 'tickets'), {
      ...newTicket,
      assignedToName: assignedUser?.name || 'Unknown',
      status: 'OPEN',
      createdBy: userData.name,
      createdById: userData.id,
      companyId: userData.companyId,
      createdAt: new Date().toISOString()
    });

    setIsModalOpen(false);
    setNewTicket({ title: '', description: '', assignedToId: '', assignedToName: '', priority: 'MEDIUM', deadline: '' });
  };

  const updateStatus = async (ticketId, newStatus) => {
    await updateDoc(doc(db, 'tickets', ticketId), { status: newStatus });
  };

  const getPriorityColor = (p) => {
    switch(p) {
      case 'HIGH': return '#ef4444';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#10b981';
      default: return '#64748b';
    }
  };

  return (
    <DashboardLayout title="Ticket Management System">
      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>Task Tickets</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              {isAdmin ? 'Manage and assign task tickets to your team' : 'Your current active task assignments'}
            </p>
          </div>
          {isAdmin && (
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
              Raise New Ticket
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {tickets.map(ticket => (
            <div key={ticket.id} className="card" style={{ borderTop: `4px solid ${getPriorityColor(ticket.priority)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className={`badge ${ticket.priority === 'HIGH' ? 'badge-danger' : ticket.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info'}`}>
                  {ticket.priority} PRIORITY
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: ticket.status === 'RESOLVED' ? 'var(--success)' : 'var(--text-muted)' }}>
                  {ticket.status}
                </span>
              </div>
              
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{ticket.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>{ticket.description}</p>
              
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Assigned To</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{ticket.assignedToName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Deadline</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{ticket.deadline || 'No Date'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {!isAdmin && ticket.status === 'OPEN' && (
                  <button onClick={() => updateStatus(ticket.id, 'IN_PROGRESS')} className="btn btn-primary btn-small btn-block">Start Task</button>
                )}
                {!isAdmin && ticket.status === 'IN_PROGRESS' && (
                  <button onClick={() => updateStatus(ticket.id, 'RESOLVED')} className="btn btn-primary btn-small btn-block">Mark Resolved</button>
                )}
                {isAdmin && ticket.status === 'RESOLVED' && (
                  <button onClick={() => updateStatus(ticket.id, 'CLOSED')} className="btn btn-success btn-small btn-block">Close Ticket</button>
                )}
              </div>
            </div>
          ))}

          {tickets.length === 0 && (
            <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2 }}>🎫</div>
              <h3 style={{ fontSize: '20px', fontWeight: 600 }}>No tickets found</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>{isAdmin ? 'Raise a new ticket to get started.' : 'You have no active task assignments.'}</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '500px' }}>
            <h2 className="card-title">Raise New Task Ticket</h2>
            <form onSubmit={handleCreateTicket} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-group">
                <label>Ticket Title</label>
                <input 
                  className="form-control" 
                  placeholder="e.g. Update Client Proposal" 
                  value={newTicket.title}
                  onChange={e => setNewTicket({...newTicket, title: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  placeholder="Detail the task requirements..."
                  value={newTicket.description}
                  onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                  required
                ></textarea>
              </div>
              <div className="form-group">
                <label>Assign To Employee</label>
                <select 
                  className="form-control" 
                  value={newTicket.assignedToId}
                  onChange={e => setNewTicket({...newTicket, assignedToId: e.target.value})}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    className="form-control"
                    value={newTicket.priority}
                    onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Deadline</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={newTicket.deadline}
                    onChange={e => setNewTicket({...newTicket, deadline: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Ticket</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
