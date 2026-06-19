import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('pharmacare_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('pharmacare_token');
    localStorage.removeItem('pharmacare_user');
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: '\u2014', label: 'Dashboard' },
    { path: '/inventory', icon: '\u25A1', label: 'Inventory' },
    { path: '/prescriptions', icon: 'Rx', label: 'Prescriptions' },
    { path: '/alerts', icon: '!', label: 'Alerts' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>PHARMACARE</h2>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">NAVIGATION</div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="user-name">{user.name || user.email || 'User'}</div>
            <div className="user-role">{user.role || 'Pharmacist'}</div>
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleLogout}
          style={{ width: '100%' }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Navbar;
