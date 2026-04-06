import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { Users as UsersIcon, Search, Mail, Shield, Briefcase, Settings2, Loader2, UserPlus, Trash2, Filter, UserCheck, UserMinus, Power } from 'lucide-react';
import AssignProjectsModal from '../components/AssignProjectsModal';
import './Users.css';

const Users = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState('active'); // active, inactive, all

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/users?status=${statusFilter}`);
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]);

  const handleAssignProjects = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleStatusToggle = async (userId, currentActive, userName) => {
    const action = currentActive ? 'deactivate' : 'reactivate';
    const confirmMessage = currentActive 
      ? `Are you sure you want to deactivate ${userName}? They will no longer be able to log in, but their data will be preserved.`
      : `Reactivate ${userName}? They will regain access to the application.`;

    if (window.confirm(confirmMessage)) {
      try {
        await api.put(`/api/users/${userId}/status`, { active: !currentActive });
        fetchUsers();
      } catch (err) {
        console.error('Error updating user status', err);
        alert(`Failed to ${action} employee. Please try again.`);
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && users.length === 0) {
    return (
      <div className="loading-state">
        <Loader2 className="spinner" />
        <p>Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="users-page-container">
      <div className="users-header">
        <div className="header-left">
          <UsersIcon className="icon-main" />
          <div className="header-text">
            <h1>Employee Management</h1>
            <p>Manage project assignments for your team</p>
          </div>
        </div>
        <div className="header-actions">
           <div className="filter-group">
              <Filter size={16} className="filter-icon" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-select"
              >
                <option value="active">Active Employees</option>
                <option value="inactive">Inactive Employees</option>
                <option value="all">All Employees</option>
              </select>
           </div>
           <div className="search-bar">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>
      </div>

      <div className="users-grid">
        {filteredUsers.length === 0 ? (
          <div className="empty-results">
            <UserPlus size={48} />
            <p>No {statusFilter !== 'all' ? statusFilter : ''} employees found matching "{searchTerm}"</p>
          </div>
        ) : (
          filteredUsers.map(u => (
            <div key={u._id} className={`user-card ${u.active === false ? 'inactive' : ''}`}>
              <div className="user-card-header">
                <div className="user-card-header-top">
                  <div className="user-avatar-initials">
                    {u.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="user-info">
                    <h3>{u.name}</h3>
                  </div>
                  <div className="badges">
                    {u.active === false && (
                      <div className="status-badge inactive">
                        Inactive
                      </div>
                    )}
                    <div className={`role-badge ${u.role}`}>
                      <Shield size={11} />
                      <span>{u.role}</span>
                    </div>
                  </div>
                </div>
                <div className="user-email">
                  <Mail size={12} />
                  <span>{u.email}</span>
                </div>
              </div>

              <div className="user-card-body">
                <div className="assignment-stats">
                  <div className="stat-item">
                    <Briefcase size={16} />
                    <span>{u.assignedProjects?.length || 0} Projects Assigned</span>
                  </div>
                </div>
                
                <div className="assigned-projects-preview">
                  {u.assignedProjects && u.assignedProjects.length > 0 ? (
                    <div className="project-tags">
                      {u.assignedProjects.slice(0, 3).map(p => (
                        <span key={p._id} className="project-tag">
                          {p.name}
                        </span>
                      ))}
                      {u.assignedProjects.length > 3 && (
                        <span className="project-tag-more">+{u.assignedProjects.length - 3} more</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-assignments">No projects assigned yet</span>
                  )}
                </div>
              </div>

              <div className="user-card-footer">
                <button 
                  className="btn btn-primary btn-assign" 
                  onClick={() => handleAssignProjects(u)}
                >
                  <Settings2 size={16} /> Manage Projects
                </button>
                <button 
                  className={`btn ${u.active === false ? 'btn-success' : 'btn-danger'} btn-status`}
                  onClick={() => handleStatusToggle(u._id, u.active !== false, u.name)}
                  title={u.active === false ? 'Reactivate Employee' : 'Deactivate Employee'}
                >
                  <Power size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <AssignProjectsModal 
          user={selectedUser} 
          onClose={() => setIsModalOpen(false)} 
          onSave={fetchUsers}
        />
      )}
    </div>
  );
};

export default Users;
