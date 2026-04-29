import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase-config';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import './Kanban.css';

const columnMeta = {
  todo: { title: 'To-Do', color: '#6366f1' },
  progress: { title: 'In Progress', color: '#f59e0b' },
  review: { title: 'In Review', color: '#8b5cf6' },
  completed: { title: 'Completed', color: '#10b981' }
};

export default function Kanban() {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState({ todo: [], progress: [], review: [], completed: [] });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetColumn, setTargetColumn] = useState('todo');
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    desc: '',
    category: 'Development',
    priority: 'LOW',
    progress: 0
  });

  useEffect(() => {
    if (!userData?.companyId) return;

    const companyId = userData.companyId;

    // Filter by company first
    let q;
    if (userData.role === 'admin' || userData.role === 'company') {
      q = query(collection(db, 'kanban_tasks'), where('companyId', '==', companyId));
    } else {
      q = query(collection(db, 'kanban_tasks'), where('companyId', '==', companyId), where('userId', '==', userData.id));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTasks = { todo: [], progress: [], review: [], completed: [] };
      snapshot.forEach(doc => {
        const data = doc.data();
        if (newTasks[data.column]) {
          newTasks[data.column].push({ id: doc.id, ...data });
        }
      });
      setTasks(newTasks);
    });

    return () => unsubscribe();
  }, [userData]);

  const downloadCSV = () => {
    let all = [...tasks.todo, ...tasks.progress, ...tasks.review, ...tasks.completed];
    if (all.length === 0) return;
    let csv = 'Title,Category,Priority,Status,Progress\n';
    all.forEach(t => {
      csv += `${t.title},${t.category},${t.priority},${t.column},${t.progress}%\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDragStart = (e, taskId, sourceColumn) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('sourceColumn', sourceColumn);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, destColumn) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const sourceColumn = e.dataTransfer.getData('sourceColumn');
    
    if (!taskId || sourceColumn === destColumn) return;

    try {
      await updateDoc(doc(db, 'kanban_tasks', taskId), {
        column: destColumn
      });
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  const openModal = (col) => {
    setTargetColumn(col);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTaskForm({ title: '', desc: '', category: 'Development', priority: 'LOW', progress: 0 });
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'kanban_tasks'), {
        ...taskForm,
        userId: userData.id,
        companyId: userData.companyId,
        column: targetColumn,
        createdAt: new Date().toISOString()
      });
      closeModal();
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteDoc(doc(db, 'kanban_tasks', taskId));
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const handleProgressChange = async (taskId, value) => {
    let val = parseInt(value);
    if (isNaN(val)) val = 0;
    val = Math.max(0, Math.min(100, val));
    try {
      await updateDoc(doc(db, 'kanban_tasks', taskId), {
        progress: val
      });
    } catch (err) {
      console.error("Failed to update progress", err);
    }
  };

  return (
    <DashboardLayout title="Project Management">
      <div className="page-body">
        <div className="kanban-board">
          <div className="board-header">
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Task Board</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Track and manage your team's workflow</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-outline" onClick={downloadCSV}>
                Export CSV
              </button>
              <button className="btn btn-primary" onClick={() => openModal('todo')}>
                Create Task
              </button>
            </div>
          </div>

          <div className="board-columns">
            {Object.entries(columnMeta).map(([colId, meta]) => (
              <div 
                key={colId} 
                className="kanban-column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, colId)}
              >
                <div className="column-header">
                  <div className="column-title">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color }}></span>
                    <span>{meta.title}</span>
                    <span className="task-count">{tasks[colId].length}</span>
                  </div>
                </div>
                
                <div className="column-tasks">
                  {tasks[colId].map(task => (
                    <div 
                      key={task.id} 
                      className="task-card" 
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, task.id, colId)}
                    >
                      <div className="task-header-row">
                        <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
                        <button className="task-delete-btn" onClick={() => handleDeleteTask(task.id)} title="Delete">
                          &times;
                        </button>
                      </div>
                      <div className="task-body">
                        <p className="task-category">{task.category}</p>
                        <h4 className="task-title-text">{task.title}</h4>
                        <p className="task-desc">{task.desc}</p>
                      </div>
                      <div className="task-progress">
                        <div className="progress-label">
                          <span>Progress</span>
                          <span>
                            <input 
                              type="number" 
                              className="progress-input-inline" 
                              min="0" max="100" 
                              value={task.progress}
                              onChange={(e) => handleProgressChange(task.id, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              style={{ width: '30px', border: 'none', background: 'none', fontWeight: 700, textAlign: 'right' }}
                            />%
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${task.progress}%`, background: meta.color }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="add-task-btn" onClick={() => openModal(colId)}>
                  + Add New Task
                </button>
              </div>
            ))}
          </div>
        </div>

        {isModalOpen && (
          <div className="kanban-modal-overlay">
            <div className="kanban-modal card" style={{ maxWidth: '480px', padding: 0 }}>
              <div className="kanban-modal-header">
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>New Task in {columnMeta[targetColumn].title}</h3>
                <button onClick={closeModal} className="btn btn-ghost btn-small">&times;</button>
              </div>
              <form onSubmit={handleCreateTask}>
                <div className="kanban-modal-body">
                  <div className="form-group">
                    <label>Task Title</label>
                    <input className="form-control" placeholder="What needs to be done?" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea className="form-control" rows="3" placeholder="Describe the task details..." value={taskForm.desc} onChange={e => setTaskForm({...taskForm, desc: e.target.value})}></textarea>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Category</label>
                      <select className="form-control" value={taskForm.category} onChange={e => setTaskForm({...taskForm, category: e.target.value})}>
                        <option>Development</option>
                        <option>Design</option>
                        <option>Marketing</option>
                        <option>QA</option>
                        <option>Planning</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Priority</label>
                      <select className="form-control" value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})}>
                        <option value="LOW">Low</option>
                        <option value="MODERATE">Moderate</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="kanban-modal-footer">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Task</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
