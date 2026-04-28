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
    if (!userData) return;

    // Admin sees all tasks, employee sees only theirs
    const q = userData.role === 'admin' 
      ? collection(db, 'kanban_tasks')
      : query(collection(db, 'kanban_tasks'), where('userId', '==', userData.id));

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
    <DashboardLayout title="My Allocated Tasks">
      <div className="kanban-board">
        <div className="board-header">
          <h2>Kanban Board</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" onClick={downloadCSV}>
              Download CSV
            </button>
            <button className="btn btn-primary" onClick={() => openModal('todo')}>
              New Task
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
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: meta.color }}></span>
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
                      <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority} PRIORITY</span>
                      <button className="task-delete-btn" onClick={() => handleDeleteTask(task.id)} title="Delete">
                        ⨉
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
                          />%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${task.progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="add-task-btn" onClick={() => openModal(colId)}>
                + Add Task
              </button>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="kanban-modal-overlay">
          <div className="kanban-modal">
            <div className="kanban-modal-header">
              <h3>Add Task to {columnMeta[targetColumn].title}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '20px' }}>&times;</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="kanban-modal-body">
                <div className="kanban-form-group">
                  <label>Task Title</label>
                  <input type="text" placeholder="What needs to be done?" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} />
                </div>
                <div className="kanban-form-group">
                  <label>Description</label>
                  <textarea placeholder="Describe the task..." value={taskForm.desc} onChange={e => setTaskForm({...taskForm, desc: e.target.value})}></textarea>
                </div>
                <div className="kanban-form-group">
                  <label>Category</label>
                  <select value={taskForm.category} onChange={e => setTaskForm({...taskForm, category: e.target.value})}>
                    <option>Development</option>
                    <option>Design</option>
                    <option>Marketing</option>
                    <option>QA</option>
                    <option>Planning</option>
                    <option>DevOps</option>
                    <option>Architecture</option>
                  </select>
                </div>
                <div className="kanban-form-group">
                  <label>Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})}>
                    <option value="LOW">Low</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="kanban-form-group">
                  <label>Initial Progress (%)</label>
                  <input type="number" min="0" max="100" value={taskForm.progress} onChange={e => setTaskForm({...taskForm, progress: parseInt(e.target.value) || 0})} />
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
    </DashboardLayout>
  );
}
