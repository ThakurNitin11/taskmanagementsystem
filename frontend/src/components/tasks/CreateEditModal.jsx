import { useState, useEffect } from 'react';

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'];

const statusLabel = (s) =>
  ({ 
    TODO: 'To Do', 
    IN_PROGRESS: 'In Progress', 
    DONE: 'Done',
    BLOCKED: 'Blocked'
  }[s] || s);

const today = () => new Date().toISOString().split('T')[0];

export default function CreateEditModal({ task, projects, members, onClose, onSave }) {
  const isEdit = !!task;

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'TODO',
    priority: task?.priority || 'MEDIUM',
    assignedTo: task?.assignedTo || '',
    projectId: task?.projectId ? String(task.projectId) : '',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Trap focus inside modal
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Task title is required.';
    if (form.dueDate && form.dueDate < today())
      e.dueDate = 'Due date cannot be in the past.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setApiError('');
    setLoading(true);
    try {
      await onSave({
        ...form,
        projectId: form.projectId ? Number(form.projectId) : undefined,
      });
    } catch (err) {
      setApiError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Task' : 'Create New Task'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {apiError && (
          <div className="alert alert-error"><span>⚠</span> {apiError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input
              className={`form-control${errors.title ? ' input-error' : ''}`}
              placeholder="e.g. Design landing page hero section"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
            {errors.title && <div className="field-error">{errors.title}</div>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              placeholder="Task details, acceptance criteria…"
              rows={3}
              style={{ resize: 'vertical' }}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {/* Status + Priority */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-control" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Project dropdown */}
          <div className="form-group">
            <label className="form-label">Project</label>
            <select className="form-control" value={form.projectId} onChange={(e) => set('projectId', e.target.value)}>
              <option value="">— Select a project —</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Assignee dropdown */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assign To</label>
              <select className="form-control" value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}>
                <option value="">— Unassigned —</option>
                {members.map((m) => (
                  <option key={m.id ?? m.email} value={m.email ?? m.name}>
                    {m.name} {m.email ? `(${m.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className={`form-control${errors.dueDate ? ' input-error' : ''}`}
                min={today()}
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
              {errors.dueDate && <div className="field-error">{errors.dueDate}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? <><Spinner /> {isEdit ? 'Saving…' : 'Creating…'}</>
                : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 13, height: 13,
      border: '2px solid rgba(255,255,255,0.25)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}
