import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Clock, LayoutDashboard, Briefcase, FileText, User as UserIcon, LogOut } from 'lucide-react';

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
          <Clock className="logo-icon" />
          <span>OnCloud Time</span>
        </div>
        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) =>isActive ? 'active' : ''}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}>
            <Briefcase size={18} /> Projects
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) =>  isActive ? 'active' : ''}>
            <FileText size={18} /> Reports
          </NavLink>
          {user.role === 'admin' && (
            <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
               <UserIcon size={18} /> Users
            </NavLink>
          )}
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

