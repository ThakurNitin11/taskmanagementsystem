import { useEffect, useState } from 'react';
import { 
  getProjects, 
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  getMyTeam,
  getProjectMembers,
  updateProjectMembers,
  getManagers 
} from '../services/api';



function CreateProjectModal({ onClose, onCreated, managers = [] }) {

const [form, setForm] = useState({
    name: '',
    description: '',
    managerId: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!form.managerId) {
      setError('Project manager is required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        managerId: Number(form.managerId)
      };
      console.log('Create project payload:', payload);
      const res = await createProject(payload);
      onCreated(res.data);
      setForm({ name: '', description: '', managerId: '' });
      onClose();
    } catch (err) {
      console.log('Create project error:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Project</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              name="name"
              type="text"
              className="form-control"
              placeholder="e.g. Marketing Campaign Q3"
              value={form.name}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              className="form-control"
              placeholder="Brief description of the project…"
              value={form.description}
              onChange={handleChange}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Project Manager <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select
              name="managerId"
              className="form-control"
              value={form.managerId}
              onChange={handleChange}
              required
            >
              <option value="">Select manager...</option>
              {managers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>


          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Project'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Project Modal ─────────────────────────────────────────────────────
function EditProjectModal({ onClose, project, onUpdated, users }) {
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    members: project?.members || [],
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Project name is required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        memberIds: form.members.map(m => Number(m.id))
      };
      console.log('Update project payload:', payload);
      const res = await updateProject(project.id, payload);
      onUpdated(res.data);
      onClose();
    } catch (err) {
      console.log('Update project error:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to update project.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Edit Project</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input name="name" className="form-control" value={form.name} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" className="form-control" value={form.description} onChange={handleChange} rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label">Members</label>
            <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
              {users.slice(0, 8).map((u) => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={form.members.some(m => m.id === u.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm(prev => ({
                        ...prev,
                        members: checked 
                          ? [...prev.members, u]
                          : prev.members.filter(m => m.id !== u.id)
                      }));
                    }}
                  />
                  <span>{u.name} ({u.email})</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating…' : 'Update Project'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ────────────────────────────────────────────────────
function DeleteConfirmModal({ onClose, projectId, onDeleted }) {
  const handleDelete = async () => {
    try {
      await deleteProject(projectId);
      onDeleted(projectId);
      onClose();
    } catch (err) {
      if (err.response?.status === 409) {
        alert(err.response?.data?.message || 'Cannot delete project with tasks.');
      } else {
        alert(err.response?.data?.message || 'Failed to delete project.');
      }
    }
  };


  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Delete Project</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>Are you sure?</div>
          <div style={{ color: 'var(--text-muted)' }}>This action cannot be undone.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

    </div>
  );
}

// ── Manage Members Modal ───────────────────────────────────────────────────
function ManageMembersModal({ onClose, project, team = [], projectMembers = [], manageError = '', onUpdated }) {
  const [selectedMembers, setSelectedMembers] = useState(projectMembers);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedMembers(projectMembers);
  }, [projectMembers]);

  const toggleMember = (user) => {
    setSelectedMembers(prev => 
      prev.some(m => m.id === user.id)
        ? prev.filter(m => m.id !== user.id)
        : [...prev, user]
    );
  };

  const handleSave = async () => {
    if (!project?.id) {
      console.log("No project ID for save");
      return;
    }
    
    setLoading(true);
    try {
      const memberIds = (selectedMembers || []).filter(m => m?.id).map(m => Number(m.id));
      console.log("Saving memberIds:", memberIds);
      
      await updateProjectMembers(project.id, { memberIds });
      console.log("Members saved successfully");
      
      // Safe update - no response.data.id dependency
      onUpdated({ id: project.id, membersCount: memberIds.length });
      onClose();
    } catch (err) {
      console.log("Save members error:", err);
      let msg = err.response?.data?.message || 'Failed to update members.';
      if (err.response?.status === 403) msg = "You do not manage this project";
      if (err.response?.status === 400) msg = err.response?.data?.message || msg;
      
      // Show inline instead of alert
      // Note: need memberError state for modal, using manageError for now
      // setManageError(msg); // Would need state change
      alert(msg); // Temporary until state added
    } finally {
      setLoading(false);
    }
  };

  if (team.length === 0 && manageError) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 500 }}>
          <div className="modal-header">
            <h2 className="modal-title">Manage Members - {project.name}</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          {manageError && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>⚠</span> {manageError}
            </div>
          )}
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
            No team members available to assign.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 className="modal-title">Manage Members</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {manageError && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <span>⚠</span> {manageError}
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', mb: 12 }}>Project: {project.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Available: {team.length} | Selected: {selectedMembers.length}
          </div>
        </div>
        <div style={{ maxHeight: 300, overflow: 'auto', marginBottom: 16 }}>
          {team.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
              No team members available.
            </div>
          ) : (
            team.map((u) => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderBottom: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  checked={selectedMembers.some(m => m.id === u.id)}
                  onChange={() => toggleMember(u)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{u.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
              </label>
            ))
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || team.length === 0}>
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);
  const [manageError, setManageError] = useState('');
  const [managingTeam, setManagingTeam] = useState([]);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [managingProject, setManagingProject] = useState(null);


  const rawUser = localStorage.getItem('user');
  let user = {};
  try { if (rawUser) user = JSON.parse(rawUser); } catch (_) {}
  const isAdmin = user.role === 'ROLE_ADMIN';
  const isManager = user.role === 'ROLE_MANAGER';

  useEffect(() => {
    getProjects()
      .then((res) => setProjects(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || 'Failed to load projects.')
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isAdmin) {
      console.log("Projects loading managers...");
      getManagers()
        .then((res) => {
          console.log("Projects getManagers success:", res.data);
          setUsers(res.data);
        })
        .catch((err) => {
          console.error("Projects getManagers error:", err.response?.data);
          setUsers([]);
        });
    }
  }, [isAdmin]);



  const handleCreated = (project) => {
    setProjects((prev) => [project, ...prev]);
  };

  const handleUpdated = (updatedProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleDeleted = (projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const handleMembersUpdated = (updatedProject) => {
    if (!updatedProject?.id) return;
    setProjects(prev => prev.map(p => 
      p.id === updatedProject.id ? { ...p, membersCount: updatedProject.membersCount || 0 } : p
    ));
  };


  const COLORS = ['blue', 'green', 'yellow', 'purple', 'red'];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isManager ? 'My Projects' : 'Projects'}</h1>
          <p className="page-subtitle">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
            {isManager ? ' assigned to you' : ' in your workspace'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Project
          </button>
        )}

      </div>

      {error && (
        <div className="alert alert-error" style={{ position: 'relative', zIndex: 1 }}>
          <span>⚠</span> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-wrapper">
          <div className="spinner" />
          <span className="loading-text">Loading projects…</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-icon">◫</div>
            <div className="empty-title">No projects yet</div>
            <div className="empty-subtitle">
              {isAdmin
                ? 'Click "+ New Project" to get started.'
                : 'Ask your admin to create a project.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.filter(p => {
            if (isAdmin) return true;
            if (isManager) return p.managerId == user.id;
            return p.members?.some(m => m.email === user.email) || p.createdBy === user.name;
          }).map((p, i) => (

            <div
              key={p.id ?? i}
              className="project-card"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div
                  className={`stat-icon ${COLORS[i % COLORS.length]}`}
                  style={{ marginBottom: 0, fontSize: 18 }}
                >
                  ◫
                </div>
              </div>
              <div className="project-card-name">
                {p.name || 'Untitled Project'}
              </div>
              {p.description && (
                <div className="project-card-desc">{p.description}</div>
              )}
              <div className="project-card-meta">
<span>👑</span>
                <span>{p.manager?.name || (p.managerId ? 'Manager' : 'No Manager - Admin must assign')}</span>
                {p.createdAt && (
                  <>
                    <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
                    <span>
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 13 }}>
                <span className="badge badge-small">
                  <span style={{ fontSize: 10 }}>👤</span> {p.members?.length || 0}
                </span>
                <span className="badge badge-small">
                  <span style={{ fontSize: 10 }}>◳</span> {p.taskCount || 0}
                </span>
              </div>
              {isManager ? (
                <div className="project-actions" style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={async () => {
                      console.log("Opening manage members for project:", p);
                      console.log("Project ID:", p.id);
                      
                      if (!p.managerId || p.managerId != user.id) {
                        setManageError("Admin has not assigned this project to you as manager.");
                        setShowManageModal(true);
                        return;
                      }
                      
                      setManagingProject(p);
                      setShowManageModal(true);
                      setMembersLoading(true);
                      setManageError('');
                      
                      // Load team first
                      try {
                        const teamRes = await getMyTeam();
                        console.log("my-team success:", teamRes.data);
                        const team = Array.isArray(teamRes.data) ? teamRes.data : teamRes.data?.members || teamRes.data?.team || [];
                        
                        if (team.length === 0) {
                          setManagingTeam([]);
                          setManageError("No employees assigned to you by admin.");
                          setProjectMembers([]);
                          setMembersLoading(false);
                          return;
                        }
                        setManagingTeam(team);
                      } catch (teamErr) {
                        console.log("getMyTeam full error:", teamErr);
                        console.log("getMyTeam message:", teamErr.message);
                        console.log("getMyTeam response:", teamErr.response);
                        setManageError("Failed to load your team");
                        setManagingTeam([]);
                        setProjectMembers([]);
                        setMembersLoading(false);
                        return;
                      }
                      
                      // Load project members separately
                      try {
                        const membersRes = await getProjectMembers(p.id);
                        console.log("project members success:", membersRes.data);
                        const projectMembersData = Array.isArray(membersRes.data) ? membersRes.data : membersRes.data?.members || [];
                        setProjectMembers(projectMembersData);
                      } catch (membersErr) {
                        console.log("getProjectMembers full error:", membersErr);
                        console.log("getProjectMembers message:", membersErr.message);
                        console.log("getProjectMembers response:", membersErr.response);
                        setManageError(`Failed to load project members: ${membersErr.message}`);
                        setProjectMembers([]);
                      } finally {
                        setMembersLoading(false);
                      }
                    }}
                    disabled={membersLoading || !p.managerId || p.managerId != user.id}
                    title={!p.managerId || p.managerId != user.id ? "Admin must assign you as manager first" : ""}
                  >
                    {membersLoading ? 'Loading...' : 'Manage Members'}
                  </button>
                </div>
              ) : isAdmin ? (
                <div className="project-actions" style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => {
                      setEditingProject(p);
                      setShowEditModal(true);
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-outline btn-danger" 
                    onClick={() => {
                      setDeletingProjectId(p.id);
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </button>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => {
                      setManagingProject(p);
                      setShowManageModal(true);
                    }}
                  >
                    Manage Members
                  </button>
                </div>
              ) : (
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={async () => {
                    setMembersLoading(true);
                    try {
                      const res = await getProjectMembers(p.id);
                      setProjectMembers(res.data);
                      setManagingProject(p);
                      setShowManageModal(true);
                    } catch (err) {
                      alert(err.response?.data?.message || 'Failed to load members');
                    } finally {
                      setMembersLoading(false);
                    }
                  }}
                  disabled={membersLoading}
                >
                  {membersLoading ? 'Loading...' : 'View Members'}
                </button>
              )}

            </div>

          ))}
        </div>
      )}

{showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
          managers={users}
        />
      )}

      {showEditModal && editingProject && (
        <EditProjectModal
          onClose={() => {
            setShowEditModal(false);
            setEditingProject(null);
          }}
          project={editingProject}
          onUpdated={handleUpdated}
          users={users}
        />
      )}

      {showDeleteModal && deletingProjectId && (
        <DeleteConfirmModal
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingProjectId(null);
          }}
          projectId={deletingProjectId}
          onDeleted={handleDeleted}
        />
      )}

{showManageModal && managingProject && (
        <ManageMembersModal
          onClose={() => {
            setShowManageModal(false);
            setManagingProject(null);
            setProjectMembers([]);
            setManagingTeam([]);
            setManageError('');
          }}
          project={managingProject}
          team={managingTeam}
          projectMembers={projectMembers}
          manageError={manageError}
          onUpdated={handleMembersUpdated}
        />
      )}

    </>
  );
}
