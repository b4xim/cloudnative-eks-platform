import { useState, useEffect, useCallback } from 'react';
import { fetchTasks, createTask, updateTask, deleteTask } from './api/tasks';
import TaskDashboard from './components/TaskDashboard';
import TaskForm from './components/TaskForm';
import FilterBar from './components/FilterBar';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [toast, setToast] = useState(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTasks(filters);
      setTasks(data);
    } catch (err) {
      setError('Unable to connect to the backend. Is the API running?');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // -------------------------------------------------------------------------
  // Toast notifications
  // -------------------------------------------------------------------------

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // -------------------------------------------------------------------------
  // CRUD handlers
  // -------------------------------------------------------------------------

  const handleCreate = async (data) => {
    try {
      await createTask(data);
      showToast('Task created successfully');
      setShowForm(false);
      loadTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateTask(editingTask.id, data);
      showToast('Task updated successfully');
      setEditingTask(null);
      loadTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTask(id);
      showToast('Task deleted');
      loadTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
  };

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <div className="logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div>
              <h1 className="header-title">Task Manager</h1>
              <p className="header-subtitle">CloudNative EKS Platform</p>
            </div>
          </div>
          <button
            className="btn btn-primary btn-create"
            onClick={() => setShowForm(true)}
            id="create-task-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Task
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <section className="stats-bar">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card stat-todo">
          <span className="stat-value">{stats.todo}</span>
          <span className="stat-label">To Do</span>
        </div>
        <div className="stat-card stat-progress">
          <span className="stat-value">{stats.inProgress}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card stat-done">
          <span className="stat-value">{stats.done}</span>
          <span className="stat-label">Done</span>
        </div>
      </section>

      {/* Filters */}
      <section className="controls">
        <FilterBar filters={filters} onFilterChange={setFilters} />
        <button className="btn btn-ghost" onClick={loadTasks} id="refresh-tasks-btn" title="Refresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </section>

      {/* Dashboard */}
      <main className="main-content">
        <TaskDashboard
          tasks={tasks}
          loading={loading}
          error={error}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </main>

      {/* Task form modal */}
      {(showForm || editingTask) && (
        <TaskForm
          task={editingTask}
          onSubmit={editingTask ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`} id="toast-notification">
          {toast.message}
        </div>
      )}
    </div>
  );
}
