import { useState, useEffect, useCallback } from 'react';
import { getMembers, createUser } from '../services/api';

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ROLE_MANAGER'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim() || !form.email.trim() || !form.password || form.password.length < 6 || !form.role) {
          setError('All fields required. Password must be 6+ chars.');
          return;
        }
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role.startsWith('ROLE_') ? form.role : `ROLE_${form.role}`,
        };
        console.log("Create user payload:", payload);
        setLoading(true);
        try {
          const res = await createUser(payload);
          console.log("Create user success:", res.data);
          onCreated(res.data);
          setForm({ name: '', email: '', password: '', role: 'ROLE_MANAGER' }); // Reset form
          onClose();
        } catch (err) {
          console.error("Create user error:", err.response?.data);
          setError(err.response?.data?.message || err.response?.data || 'Failed to create user.');
        } finally {
          setLoading(false);
        }
      };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Create User</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input name="name" className="form-control" placeholder="John Doe" value={form.name} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-control" placeholder="john@company.com" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" className="form-control" placeholder="Min 6 chars" value={form.password} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select name="role" className="form-control" value={form.role} onChange={handleChange}>
              <option value="ROLE_ADMIN">Admin</option>
              <option value="ROLE_MANAGER">Manager</option>
              <option value="ROLE_MEMBER">Member</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const rawUser = localStorage.getItem('user');
  let currentUser = {};
  try { if (rawUser) currentUser = JSON.parse(rawUser); } catch (_) {}
  const isAdmin = currentUser.role === 'ROLE_ADMIN';

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--danger)' }}>Access Denied</h1>
        <p>Only administrators can manage users.</p>
      </div>
    );
  }

  useEffect(() => {
    console.log("Loading users with getMembers()...");
    getMembers()
      .then(res => {
        console.log("Users getMembers success:", res.data);
        setUsers(res.data || []);
      })
      .catch(err => {
        console.error("Users getMembers error:", err.response?.data || err.message);
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = useCallback((newUser) => {
    setUsers(prev => [newUser, ...prev]);
  }, []);

  if (loading) {
    return (
      <div className="loading-wrapper" style={{ padding: '4rem 2rem' }}>
        <div className="spinner" />
        <span className="loading-text">Loading users...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{users.length} user{users.length !== 1 ? 's' : ''} in workspace</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create User
        </button>
      </div>

      {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}

      {users.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">No users yet</div>
            <div className="empty-subtitle">
              Create your first user to get started.
            </div>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <div className="table-header">
            <span className="table-title">All Users</span>
            <span className="table-count">{users.length}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((user) => (
                <tr key={user.id || user.email}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td><span className={`badge ${user.role === 'ROLE_MANAGER' ? 'badge-purple' : 'badge-blue'}`}>
                    {user.role === 'ROLE_MANAGER' ? 'Manager' : 'Employee'}
                  </span></td>
                  <td>
                    <span className={`badge ${user.active ? 'badge-success' : 'badge-danger'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm">Edit</button>
                      <button className="btn btn-outline btn-sm btn-danger">Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
      )}
    </>
  );
}

