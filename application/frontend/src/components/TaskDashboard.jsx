import TaskCard from './TaskCard';

export default function TaskDashboard({ tasks, loading, error, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="dashboard-state">
        <div className="spinner" />
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-state dashboard-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{error}</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="dashboard-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
        <p>No tasks found. Create one to get started!</p>
      </div>
    );
  }

  // Group tasks by status for a Kanban-style layout
  const columns = {
    'todo': { label: 'To Do', icon: '○', tasks: [] },
    'in-progress': { label: 'In Progress', icon: '◐', tasks: [] },
    'done': { label: 'Done', icon: '●', tasks: [] },
  };

  tasks.forEach((task) => {
    if (columns[task.status]) {
      columns[task.status].tasks.push(task);
    }
  });

  return (
    <div className="dashboard" id="task-dashboard">
      {Object.entries(columns).map(([status, column]) => (
        <div className="dashboard-column" key={status} id={`column-${status}`}>
          <div className="column-header">
            <span className="column-icon">{column.icon}</span>
            <h2 className="column-title">{column.label}</h2>
            <span className="column-count">{column.tasks.length}</span>
          </div>
          <div className="column-tasks">
            {column.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
