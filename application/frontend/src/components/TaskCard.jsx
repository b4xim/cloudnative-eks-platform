export default function TaskCard({ task, onEdit, onDelete }) {
  const statusColors = {
    'todo': 'status-todo',
    'in-progress': 'status-in-progress',
    'done': 'status-done',
  };

  const priorityColors = {
    'low': 'priority-low',
    'medium': 'priority-medium',
    'high': 'priority-high',
  };

  const statusLabels = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'done': 'Done',
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`task-card ${task.status === 'done' ? 'task-done' : ''}`} id={`task-${task.id}`}>
      <div className="task-card-header">
        <div className="task-badges">
          <span className={`badge ${statusColors[task.status]}`}>
            {statusLabels[task.status] || task.status}
          </span>
          <span className={`badge ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
        </div>
        <div className="task-actions">
          <button
            className="btn-icon btn-edit"
            onClick={() => onEdit(task)}
            title="Edit task"
            id={`edit-task-${task.id}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="btn-icon btn-delete"
            onClick={() => onDelete(task.id)}
            title="Delete task"
            id={`delete-task-${task.id}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <h3 className="task-title">{task.title}</h3>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-meta">
        <span className="task-date" title="Created">
          {formatDate(task.created_at)}
        </span>
      </div>
    </div>
  );
}
