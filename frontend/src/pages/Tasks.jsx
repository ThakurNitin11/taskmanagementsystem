import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getAllTasks, getMyTasks,
  createTask, updateTask, deleteTask, updateTaskStatus,
  getProjects, getMembers, getMyTeam,
} from '../services/api';
import CreateEditModal from '../components/tasks/CreateEditModal';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';
import KanbanBoard from '../components/tasks/KanbanBoard';

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];
const statusLabel = (s) => ({ TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' }[s] || s);
const priorityLabel = (p) => ({ HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }[p] || p);

function statusBadgeClass(s) {
  return { 
    TODO: 'badge-todo', 
    IN_PROGRESS: 'badge-progress', 
    DONE: 'badge-done',
    BLOCKED: 'badge-blocked'
  }[s] || '';
}
function priorityBadgeStyle(p) {
  const map = {
    HIGH:   { bg: 'var(--danger-light)',  color: 'var(--danger)',  dot: 'var(--danger)' },
    MEDIUM: { bg: 'var(--warning-light)', color: 'var(--warning)', dot: 'var(--warning)' },
    LOW:    { bg: 'var(--success-light)', color: 'var(--success)', dot: 'var(--success)' },
  };
  return map[p] || { bg: 'var(--border)', color: 'var(--text-muted)', dot: 'var(--text-muted)' };
}
function isOverdue(dueDate, status) {
  if (!dueDate || status === 'DONE') return false;
  return new Date(dueDate) < new Date();
}

function SkeletonRows({ count = 5 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: 7 }).map((__, j) => (
        <td key={j}>
          <div style={{
            height: 14, borderRadius: 4,
            background: 'linear-gradient(90deg,var(--bg-secondary) 25%,var(--bg-card-hover) 50%,var(--bg-secondary) 75%)',
            backgroundSize: '200% 100%',
            animation: `shimmer 1.4s ease infinite ${i * 0.07}s`,
            width: j === 0 ? '80%' : j === 4 ? '60%' : '70%',
          }} />
        </td>
      ))}
    </tr>
  ));
}

function SummaryCards({ tasks }) {
  const cards = [
    { label: 'Total Tasks',   value: tasks.length, icon: '◫', color: 'blue'   },
    { label: 'Completed',     value: tasks.filter(t => t.status === 'DONE').length, icon: '✓', color: 'green'  },
    { label: 'Pending',       value: tasks.filter(t => t.status !== 'DONE').length, icon: '○', color: 'purple' },
    { label: 'Overdue',       value: tasks.filter(t => isOverdue(t.dueDate, t.status)).length, icon: '⚑', color: 'red'    },
    { label: 'High Priority', value: tasks.filter(t => t.priority === 'HIGH' && t.status !== 'DONE').length, icon: '▲', color: 'yellow' },
  ];
  return (
    <div className="stats-grid" style={{ marginBottom: 24 }}>
      {cards.map((c, i) => (
        <div key={c.label} className={`stat-card ${c.color}`} style={{ animationDelay: `${i * 0.06}s` }}>
          <div className={`stat-icon ${c.color}`}>{c.icon}</div>
          <div className="stat-value">{c.value}</div>
          <div className="stat-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ task, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">Delete Task</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
          Are you sure you want to delete{' '}
          <strong style={{ color: 'var(--text-primary)' }}>"{task.title}"</strong>?
          This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}
            style={{ background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' }}>
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function FilterBar({ filters, setFilters, members, clearFilters, activeCount }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '16px 20px',
      display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      marginBottom: 20, position: 'relative', zIndex: 1,
    }}>
      <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
        <input className="form-control" placeholder="Search by title…" value={filters.search}
          onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
          style={{ paddingLeft: 32 }} />
      </div>
      <select className="form-control" style={{ flex: '0 0 140px' }}
        value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
        <option value="">All Statuses</option>
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
      </select>
      <select className="form-control" style={{ flex: '0 0 140px' }}
        value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}>
        <option value="">All Priorities</option>
        {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{priorityLabel(p)}</option>)}
      </select>
      <select className="form-control" style={{ flex: '0 0 180px' }}
        value={filters.assignee} onChange={e => setFilters(p => ({ ...p, assignee: e.target.value }))}>
        <option value="">All Assignees</option>
        {members.map(m => <option key={m.id ?? m.email} value={m.email ?? m.name}>{m.name}</option>)}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        color: filters.overdue ? 'var(--danger)' : 'var(--text-muted)',
        fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', userSelect: 'none' }}>
        <input type="checkbox" checked={filters.overdue}
          onChange={e => setFilters(p => ({ ...p, overdue: e.target.checked }))}
          style={{ accentColor: 'var(--danger)', width: 15, height: 15 }} />
        Overdue only
      </label>
      {activeCount > 0 && (
        <button className="btn btn-outline btn-sm" onClick={clearFilters} style={{ whiteSpace: 'nowrap' }}>
          ✕ Clear ({activeCount})
        </button>
      )}
    </div>
  );
}

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [createModal, setCreateModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [viewTask, setViewTask] = useState(null);
  const [deleteTaskItem, setDeleteTaskItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', assignee: '', overdue: false });

  const rawUser = localStorage.getItem('user');
  let user = {};
  try { if (rawUser) user = JSON.parse(rawUser); } catch (_) {}
  const userRole = user.role;
  const isAdmin = userRole === 'ROLE_ADMIN';
  const isManager = userRole === 'ROLE_MANAGER';
  const canCreateTasks = isAdmin || isManager;

  // Auto-open create modal from query param
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create' && canCreateTasks) {
      setCreateModal(true);
      // Clear the param after opening
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, canCreateTasks, setSearchParams]);

  useEffect(() => {
    console.log("Tasks page loading data...");
    const taskFetcher = canCreateTasks ? getAllTasks : getMyTasks;
    const memberPromises = [];
    if (isAdmin) {
      memberPromises.push(getMembers().then(res => res.data));
    } else {
      memberPromises.push(getMyTeam().then(res => res.data));
    }
    Promise.allSettled([
      taskFetcher(), 
      getProjects(),
      ...memberPromises
    ])
      .then(([tasksRes, projectsRes, membersRes]) => {
        if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.data);
        else setError('Failed to load tasks.');
        if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data);
        if (membersRes.status === 'fulfilled') {
          const teamMembers = membersRes.value || [];
          console.log("Tasks members loaded:", teamMembers.length);
          setMembers(teamMembers);
          setAllMembers(isAdmin ? teamMembers : []);
        } else {
          console.error("Tasks members fail, members=[]");
          setMembers([]);
          setAllMembers([]);
        }
      }).finally(() => setLoading(false));
  }, [isAdmin]);

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (filters.search && !t.title?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.assignee && t.assignedTo !== filters.assignee) return false;
    if (filters.overdue && !isOverdue(t.dueDate, t.status)) return false;
    return true;
  }), [tasks, filters]);

  const activeFilterCount = useMemo(() =>
    [filters.search, filters.status, filters.priority, filters.assignee, filters.overdue].filter(Boolean).length,
  [filters]);

  const clearFilters = useCallback(() =>
    setFilters({ search: '', status: '', priority: '', assignee: '', overdue: false }), []);

  const handleCreate = useCallback(async (formData) => {
    const res = await createTask(formData);
    setTasks(prev => [res.data, ...prev]);
    setCreateModal(false);
  }, []);

  const handleEdit = useCallback(async (formData) => {
    const res = await updateTask(editTask.id, formData);
    setTasks(prev => prev.map(t => t.id === editTask.id ? res.data : t));
    setEditTask(null);
  }, [editTask]);

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    setUpdatingId(taskId);
    try {
      await updateTaskStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally { setUpdatingId(null); }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTaskItem) return;
    setDeleteLoading(true);
    try {
      await deleteTask(deleteTaskItem.id);
      setTasks(prev => prev.filter(t => t.id !== deleteTaskItem.id));
      setDeleteTaskItem(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task.');
    } finally { setDeleteLoading(false); }
  }, [deleteTaskItem]);

  const getProjectName = useCallback((id) =>
    projects.find(p => String(p.id) === String(id))?.name || (id ? `#${id}` : '—'), [projects]);

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{canCreateTasks ? 'All workspace tasks' : 'Tasks assigned to you'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
            {[['table', '☰ Table'], ['board', '⊞ Board']].map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                background: viewMode === mode ? 'var(--accent)' : 'transparent',
                color: viewMode === mode ? 'white' : 'var(--text-muted)',
                border: 'none', borderRadius: 4, padding: '6px 14px',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'var(--transition)', fontFamily: 'var(--font-body)',
              }}>{label}</button>
            ))}
          </div>
          {canCreateTasks && (
            <button className="btn btn-primary" onClick={() => setCreateModal(true)}>+ New Task</button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ position: 'relative', zIndex: 1 }}><span>⚠</span> {error}</div>}

      {!loading && <SummaryCards tasks={tasks} />}

      <FilterBar filters={filters} setFilters={setFilters} members={members || []}
        clearFilters={clearFilters} activeCount={activeFilterCount} />

      {loading ? (
        <div className="table-wrapper">
          <div className="table-header"><span className="table-title">Task List</span></div>
          <table>
            <thead><tr>{['Title','Priority','Status','Assigned','Project','Due','Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody><SkeletonRows count={6} /></tbody>
          </table>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-icon">◳</div>
            <div className="empty-title">{activeFilterCount > 0 ? 'No tasks match your filters' : 'No tasks yet'}</div>
            <div className="empty-subtitle">
              {activeFilterCount > 0
                ? <button className="btn btn-outline btn-sm" onClick={clearFilters} style={{ marginTop: 10 }}>Clear filters</button>
                : canCreateTasks ? 'Click "+ New Task" to get started.' : 'No tasks assigned to you.'}
            </div>
          </div>
        </div>
      ) : viewMode === 'board' ? (
        <KanbanBoard tasks={filteredTasks} isAdmin={isAdmin}
          onView={setViewTask} onEdit={setEditTask} onStatusChange={handleStatusChange} />
      ) : (
        <div className="table-wrapper">
          <div className="table-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="table-title">Task List</span>
              <span className="table-count">{filteredTasks.length}</span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Title</th><th>Priority</th><th>Status</th>
                  {isAdmin && <th>Assigned To</th>}
                  <th>Project</th><th>Due Date</th><th>Update Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, i) => {
                  const overdue = isOverdue(task.dueDate, task.status);
                  const pStyle = priorityBadgeStyle(task.priority);
                  return (
                    <tr key={task.id} style={{ animation: `fadeIn 0.3s ease ${i * 0.03}s both` }}>
                      <td>
                        <div className="name-cell" style={{ maxWidth: 220 }}>{task.title}</div>
                        {task.description && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {task.priority ? (
                          <span className="badge" style={{ background: pStyle.bg, color: pStyle.color }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: pStyle.dot,
                              display: 'inline-block', marginRight: 5 }} />
                            {priorityLabel(task.priority)}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>--</span>}
                      </td>
                      <td>
                        {overdue
                          ? <span className="badge badge-overdue">Overdue</span>
                          : <span className={`badge ${statusBadgeClass(task.status)}`}>{statusLabel(task.status)}</span>}
                      </td>
                      {isAdmin && (
                        <td>
                          {task.assignedTo ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 26, height: 26, borderRadius: '50%',
                                background: 'var(--accent-light)', border: '1px solid var(--border-active)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                                {String(task.assignedTo)[0]?.toUpperCase()}
                              </div>
                              <span style={{ fontSize: 13 }}>{task.assignedTo}</span>
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Unassigned</span>}
                        </td>
                      )}
                      <td>
                        {task.projectId ? (
                          <span style={{ fontSize: 12, background: 'var(--purple-light)',
                            color: 'var(--purple)', padding: '3px 10px', borderRadius: 20 }}>
                            {getProjectName(task.projectId)}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>--</span>}
                      </td>
                      <td>
                        {task.dueDate ? (
                          <span style={{ fontSize: 13,
                            color: overdue ? 'var(--danger)' : 'var(--text-secondary)',
                            fontWeight: overdue ? 600 : 400 }}>
                            {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>--</span>}
                      </td>
                      <td>
                        <select className="status-select" value={task.status}
                          disabled={updatingId === task.id}
                          onChange={e => handleStatusChange(task.id, e.target.value)}>
                          {['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" title="View"
                            onClick={() => setViewTask(task)} style={{ padding: '5px 10px', fontSize: 13 }}>👁</button>
                          {canCreateTasks && (
                            <>
                              <button className="btn btn-outline btn-sm" title="Edit"
                                onClick={() => setEditTask(task)} style={{ padding: '5px 10px', fontSize: 13 }}>✏</button>
                              <button className="btn btn-danger btn-sm" title="Delete"
                                onClick={() => setDeleteTaskItem(task)} style={{ padding: '5px 10px', fontSize: 13 }}>🗑</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createModal && (
        <CreateEditModal task={null} projects={projects} members={members}
          onClose={() => setCreateModal(false)} onSave={handleCreate} />
      )}
      {editTask && (
        <CreateEditModal task={editTask} projects={projects} members={members}
          onClose={() => setEditTask(null)} onSave={handleEdit} />
      )}
      {viewTask && (
        <TaskDetailsModal task={viewTask} projects={projects} onClose={() => setViewTask(null)} />
      )}
      {deleteTaskItem && (
        <ConfirmDialog task={deleteTaskItem} onConfirm={handleDelete}
          onClose={() => setDeleteTaskItem(null)} loading={deleteLoading} />
      )}
    </>
  );
}
