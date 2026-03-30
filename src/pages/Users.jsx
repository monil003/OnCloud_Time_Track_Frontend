import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { Users as UsersIcon, Search, Mail, Shield, Briefcase, Settings2, Loader2, UserPlus } from 'lucide-react';
import AssignProjectsModal from '../components/AssignProjectsModal';
import './Users.css';

const Users = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAssignProjects = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
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
            <p>No employees found matching "{searchTerm}"</p>
          </div>
        ) : (
          filteredUsers.map(u => (
            <div key={u._id} className="user-card">
              <div className="user-card-header">
                <div className="user-card-header-top">
                  <div className="user-avatar-initials">
                    {u.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="user-info">
                    <h3>{u.name}</h3>
                  </div>
                  <div className={`role-badge ${u.role}`}>
                    <Shield size={11} />
                    <span>{u.role}</span>
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
                  className="btn btn-primary btn-full" 
                  onClick={() => handleAssignProjects(u)}
                >
                  <Settings2 size={16} /> Manage Projects
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
