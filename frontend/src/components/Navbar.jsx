import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawUser = localStorage.getItem('user');
  let user = { name: 'User', email: '', role: 'ROLE_MEMBER' };

  try {
    if (rawUser) user = JSON.parse(rawUser);
  } catch (_) {}

  const isAdmin = user.role === 'ROLE_ADMIN';
  const isManager = user.role === 'ROLE_MANAGER';
  const isMember = user.role === 'ROLE_MEMBER';

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const roleLabel = isAdmin ? 'Admin' : isManager ? 'Manager' : 'Member';
  const roleClass = isAdmin ? 'badge-admin' : isManager ? 'badge-manager' : 'badge-member';

  const NAV_LINKS = [
    { to: '/dashboard', label: 'Dashboard', icon: '⬡' },
  ];

  // Role-based links
  if (isAdmin) {
    NAV_LINKS.push(
      { to: '/projects', label: 'Projects', icon: '📁' },
      { to: '/employees', label: 'Employees', icon: '👥' },
      { to: '/tasks', label: 'Tasks', icon: '◳' },
      { to: '/tasks?action=create', label: 'Create Task', icon: '✏' }
    );
  } else if (isManager) {
    NAV_LINKS.push(
      { to: '/projects', label: 'My Projects', icon: '📁' },
      { to: '/employees', label: 'My Team', icon: '👥' },
      { to: '/tasks', label: 'My Tasks', icon: '◳' },
      { to: '/tasks?action=create', label: 'Create Task', icon: '✏' }
    );
  } else if (isMember) {
    NAV_LINKS.push(
      { to: '/tasks', label: 'My Tasks', icon: '◳' }
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">🗂</div>
        <div>
          <div className="sidebar-brand-name">TaskFlow</div>
          <div className="sidebar-brand-tagline">Task Manager</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu</div>

        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            <span className="nav-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>

          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name || 'User'}</div>

            <div className="sidebar-user-role">
              <span className={roleClass}>{roleLabel}</span>
            </div>
          </div>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <span>⎋</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
