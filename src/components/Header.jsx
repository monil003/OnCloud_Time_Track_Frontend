import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Briefcase, FileText, User as UserIcon, LogOut, Clock } from 'lucide-react';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <header className="main-header glass-header">
      <div className="header-content container">
        <div className="logo">
          <img src="/oncloud-logo.png" className="logo-img" alt="OnCloud Consulting Logo" />
          <span>OnCloud Consulting</span>
        </div>
        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) =>isActive ? 'active' : ''}>
            <LayoutDashboard size={18} /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}>
            <Briefcase size={18} /> <span>Projects</span>
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) =>  isActive ? 'active' : ''}>
            <FileText size={18} /> <span>Reports</span>
          </NavLink>
          {user.role === 'admin' && (
            <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
               <UserIcon size={18} /> <span>Users</span>
            </NavLink>
          )}
          <NavLink to="/timelog" className={({ isActive }) => isActive ? 'active' : ''}>
            <Clock size={18} /> <span>Time Log</span>
          </NavLink>
        </nav>
        <div className="user-menu">
          <NavLink to="/profile" className="user-info">
            <div className="avatar">
              <UserIcon size={18} />
            </div>
            <span>{user.name}</span>
          </NavLink>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

