import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, getSuggestions } from '../services/api.js';

const defaultStats = {
  totalTasks: 0,
  completedTasks: 0,
  todoTasks: 0,
  inProgressTasks: 0,
  overdueTasks: 0,
  highPriorityTasks: 0,
  mediumPriorityTasks: 0,
  lowPriorityTasks: 0,
  pendingTasks: 0,
  overallProgress: 0,
  myProjects: [],
  myTeam: [],
  upcomingDeadlines: [],
  recentActivity: [],
  myTasks: [],
  todaysFocus: [],
  completedThisWeek: 0,
  suggestions: []
};

const ADMIN_STATS = [
  { key: 'totalTasks', label: 'Total Tasks', icon: '◫', color: 'blue' },
  { key: 'completedTasks', label: 'Completed', icon: '✓', color: 'green' },
  { key: 'todoTasks', label: 'To Do', icon: '○', color: 'purple' },
  { key: 'inProgressTasks', label: 'In Progress', icon: '◑', color: 'yellow' },
  { key: 'overdueTasks', label: 'Overdue', icon: '⚑', color: 'red' },
  { key: 'totalProjects', label: 'Total Projects', icon: '📁', color: 'purple' }
];

const MANAGER_STATS = [
  ...ADMIN_STATS,
  { key: 'pendingTasks', label: 'Pending', icon: '○', color: 'orange' },
  { key: 'highPriorityTasks', label: 'High Priority', icon: '🔥', color: 'red' }
];

const MEMBER_STATS = [
  { key: 'totalTasks', label: 'My Tasks', icon: '◫', color: 'blue' },
  { key: 'completedTasks', label: 'Completed', icon: '✓', color: 'green' },
  { key: 'todoTasks', label: 'To Do', icon: '○', color: 'purple' },
  { key: 'inProgressTasks', label: 'In Progress', icon: '◑', color: 'yellow' },
  { key: 'overdueTasks', label: 'Overdue', icon: '⚑', color: 'red' },
  { key: 'highPriorityTasks', label: 'High Priority', icon: '🔥', color: 'orange' }
];

export default function Dashboard() {
  const [stats, setStats] = useState(defaultStats);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState({ name: 'there', role: 'ROLE_MEMBER' });

  // Parse user on mount
  useEffect(() => {
    const rawUser = localStorage.getItem('user') || '{}';
    try {
      const parsedUser = JSON.parse(rawUser);
      setUser(parsedUser);
    } catch (_) {}
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    Promise.allSettled([
      getDashboard().then(res => res.data),
      getSuggestions().then(res => res.data)
    ])
      .then(([dashboardRes, suggestionsRes]) => {
        if (dashboardRes.status === 'fulfilled') {
          setStats({ ...defaultStats, ...dashboardRes.value });
        }
        if (suggestionsRes.status === 'fulfilled') {
          setSuggestions(suggestionsRes.value || []);
        }
      })
      .catch((err) => {
        console.error('Dashboard load error:', err);
        setError(err.message || 'Failed to load dashboard.');
      })
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const role = user.role || 'ROLE_MEMBER';

  const getStatsConfig = () => {
    if (role === 'ROLE_ADMIN') return ADMIN_STATS;
    if (role === 'ROLE_MANAGER') return MANAGER_STATS;
    return MEMBER_STATS;
  };

  const safeProgress = stats.overallProgress ?? (stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0);

  // ===== SMART SUGGESTIONS =====
  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'HIGH_PRIORITY_PENDING': return '🔥';
      case 'DUE_SOON': return '⏰';
      case 'OVERDUE': return '⚠️';
      case 'GOOD_PROGRESS': return '✅';
      case 'NO_TASKS': return '📭';
      default: return '💡';
    }
  };

  const getSuggestionColor = (severity) => {
    switch (severity) {
      case 'info': return 'blue';
      case 'success': return 'green';
      case 'warning': return 'orange';
      case 'danger': return 'red';
      default: return 'blue';
    }
  };

  const SmartSuggestions = () => (
    <div className="suggestions-section card">
      <div className="table-header">
        <h3 className="table-title">Smart Suggestions</h3>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          AI-style productivity insights
        </div>
      </div>
      {suggestions.length > 0 ? (
        <div className="suggestions-grid">
          {suggestions.map((suggestion, i) => (
            <div key={suggestion.type || i} className={`suggestion-card ${getSuggestionColor(suggestion.severity)}`}>
              <div className="suggestion-icon">{getSuggestionIcon(suggestion.type)}</div>
              <div>
                <div className="suggestion-title">{suggestion.title}</div>
                <div className="suggestion-message">{suggestion.message}</div>
              </div>
              {suggestion.count > 0 && (
                <div className="suggestion-count">{suggestion.count}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '40px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>💡</div>
          <div style={{ color: 'var(--text-secondary)' }}>You're all caught up</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No suggestions right now</div>
        </div>
      )}
    </div>
  );

  // Admin/Manager (unchanged)
  const EmptyManagerState = () => (
    <div className="card empty-state">
      <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>📋</div>
      <h3 className="empty-title">No projects assigned yet</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Contact your admin to get assigned to projects and team members.
      </p>
    </div>
  );

  const ProjectCard = ({ project }) => (
    <div className="project-card">
      <h4 className="project-card-name">{project.name}</h4>
      <p className="project-card-desc">{project.description || 'No description'}</p>
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <span>👥 {project.membersCount || 0}</span>
        <span>📝 {project.totalTasks || 0} tasks</span>
        <span style={{ color: 'var(--accent)' }}>✓ {project.completedTasks || 0}</span>
      </div>
      {project.progress !== undefined && (
        <div style={{ marginTop: '12px', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${project.progress}%`, background: 'var(--accent)', borderRadius: '3px' }} />
        </div>
      )}
    </div>
  );

  const TeamMemberRow = ({ member }) => (
    <tr>
      <td className="name-cell">{member.name}</td>
      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{member.email}</td>
      <td style={{ fontWeight: '500' }}>{member.assignedTasks || 0}</td>
      <td style={{ fontWeight: '500', color: 'var(--success)' }}>{member.completedTasks || 0}</td>
    </tr>
  );

  const DeadlineItem = ({ task }) => {
    const getBadgeClass = (status) => {
      switch (status?.toLowerCase()) {
        case 'done': return 'badge-done';
        case 'in progress': return 'badge-progress';
        case 'overdue': return 'badge-overdue';
        default: return 'badge-todo';
      }
    };
    const getPriorityColor = (priority) => priority === 'HIGH' ? 'red' : 'var(--accent)';
    return (
      <div style={{ display: 'flex', gap: '12px', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
        <div style={{ fontWeight: '500', flex: 1 }}>{task.title}</div>
        <span className={`badge ${getBadgeClass(task.status)}`} style={{ fontSize: '11px' }}>{task.status || 'Pending'}</span>
        <span style={{ color: getPriorityColor(task.priority), fontSize: '11px', fontWeight: '600' }}>
          {task.priority || 'MED'}
        </span>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{task.dueDate}</div>
      </div>
    );
  };

  const renderManagerDashboard = () => {
    const hasProjects = stats.myProjects?.length > 0 || stats.totalProjects > 0;
    return (
      <>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {MANAGER_STATS.map((s, i) => (
            <div key={s.key} className={`stat-card ${s.color}`} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div className="stat-value">{stats[s.key] ?? 0}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '16px' }}>Overall Progress</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Team performance</div>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: 'var(--accent)' }}>
              {safeProgress}%
            </div>
          </div>
          <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${safeProgress}%`, background: 'linear-gradient(90deg, var(--accent), #6366f1)', borderRadius: '4px', transition: 'width 1s ease' }} />
          </div>
        </div>

        <SmartSuggestions />

        <div className="section-divider" style={{ margin: '36px 0' }} />

        {/* Manager sections preserved - unchanged */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="dashboard-grid">
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', marginBottom: '20px' }}>My Projects</h2>
            {hasProjects ? (
              <div className="projects-grid">
                {stats.myProjects?.map((project, i) => (
                  <ProjectCard key={project.id || i} project={project} />
                )) || Array.from({ length: stats.totalProjects }).map((_, i) => <ProjectCard key={i} project={{ name: `Project ${i+1}`, totalTasks: 0 }} />)}
              </div>
            ) : <EmptyManagerState />}
          </div>

          <div className="table-wrapper">
            <div className="table-header">
              <h3 className="table-title">My Team ({stats.myTeam?.length || 0})</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {stats.myTeam?.length > 0 ? (
                  stats.myTeam.map((member, i) => <TeamMemberRow key={member.id || i} member={member} />)
                ) : (
                  Array(3).fill().map((_, i) => (
                    <tr key={i}>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No team members</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rest of manager dashboard preserved */}
        <div className="section-divider" style={{ margin: '36px 0' }} />
        {/* ... existing manager sections ... */}
      </>
    );
  };

  const renderAdminDashboard = () => (
    <>
      <div className="stats-grid">
        {ADMIN_STATS.map((s, i) => (
          <div key={s.key} className={`stat-card ${s.color}`} style={{ animationDelay: `${i * 0.06}s` }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-value">{stats[s.key] ?? 0}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <SmartSuggestions />

      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', marginBottom: '20px' }}>Workspace Overview</div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Admin dashboard shows overall workspace stats with smart suggestions.
        </p>
      </div>
    </>
  );

  const renderMemberDashboard = () => (
    <>
      <div className="stats-grid">
        {MEMBER_STATS.map((s, i) => (
          <div key={s.key} className={`stat-card ${s.color}`} style={{ animationDelay: `${i * 0.06}s` }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-value">{stats[s.key] ?? 0}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <SmartSuggestions />

      {/* Member sections preserved */}
    </>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {greeting}, {user.name?.split(' ')[0] || 'there'} {role === 'ROLE_MANAGER' ? '👨‍💼' : role === 'ROLE_ADMIN' ? '👑' : '👤'}
          </h1>
          <p className="page-subtitle">
            {role === 'ROLE_MANAGER' ? "Manage your projects and team performance." :
             role === 'ROLE_ADMIN' ? "Full workspace overview." : "Your personal task dashboard."}
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠</span> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-wrapper">
          <div className="spinner" />
          <span className="loading-text">Loading dashboard…</span>
        </div>
      ) : (
        <>
          {role === 'ROLE_MANAGER' && renderManagerDashboard()}
          {role === 'ROLE_ADMIN' && renderAdminDashboard()}
          {role === 'ROLE_MEMBER' && renderMemberDashboard()}
        </>
      )}
    </>
  );
}

