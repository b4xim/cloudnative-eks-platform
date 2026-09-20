const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Fetch all tasks, optionally filtered by status and/or priority.
 */
export async function fetchTasks({ status, priority } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);

  const query = params.toString();
  const url = `${API_URL}/api/tasks${query ? `?${query}` : ''}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  const json = await res.json();
  return json.data;
}

/**
 * Fetch a single task by ID.
 */
export async function fetchTask(id) {
  const res = await fetch(`${API_URL}/api/tasks/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch task: ${res.status}`);
  const json = await res.json();
  return json.data;
}

/**
 * Create a new task.
 */
export async function createTask(data) {
  const res = await fetch(`${API_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.details?.join(', ') || 'Failed to create task');
  }
  const json = await res.json();
  return json.data;
}

/**
 * Update an existing task.
 */
export async function updateTask(id, data) {
  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.details?.join(', ') || 'Failed to update task');
  }
  const json = await res.json();
  return json.data;
}

/**
 * Delete a task.
 */
export async function deleteTask(id) {
  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`);
}
