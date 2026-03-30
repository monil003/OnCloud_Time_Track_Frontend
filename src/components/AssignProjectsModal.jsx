import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Save, Loader2, Search, Briefcase } from 'lucide-react';
import api from '../utils/api';
import './AssignProjectsModal.css';

const AssignProjectsModal = ({ user, onClose, onSave }) => {
  const [allProjects, setAllProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/projects');
        setAllProjects(res.data);

        if (user.assignedProjects) {
          const initialSelected = user.assignedProjects.map(p => p._id || p);
          setSelectedProjects(initialSelected);
        }
      } catch (err) {
        console.error('Error fetching data for assignment', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const toggleProject = (projectId) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/api/users/${user._id}/assign-projects`, { projectIds: selectedProjects });
      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving assignments', err);
      alert('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = allProjects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.clientOrTask && p.clientOrTask.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="apm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="apm-modal">
        {/* Header */}
        <div className="apm-header">
          <div className="apm-user-info">
            <div className="apm-user-avatar">{initials}</div>
            <div>
              <h3 className="apm-title">Assign Projects</h3>
              <p className="apm-subtitle">
                Managing access for <strong>{user.name}</strong>
              </p>
            </div>
          </div>
          <div className="apm-header-meta">
            {!loading && (
              <span className="apm-count-badge">
                {selectedProjects.length} / {allProjects.length} selected
              </span>
            )}
            <button className="apm-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="apm-search-bar">
          <Search size={16} className="apm-search-icon" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="apm-search-input"
          />
        </div>

        {/* Body */}
        <div className="apm-body">
          {loading ? (
            <div className="apm-loading">
              <Loader2 className="apm-spinner" size={32} />
              <span>Loading projects...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="apm-empty">
              <Briefcase size={40} />
              <p>{searchTerm ? `No projects matching "${searchTerm}"` : 'No projects available. Create some first!'}</p>
            </div>
          ) : (
            <div className="apm-list">
              {filteredProjects.map(project => {
                const isSelected = selectedProjects.includes(project._id);
                return (
                  <div
                    key={project._id}
                    className={`apm-item ${isSelected ? 'apm-item--selected' : ''}`}
                    onClick={() => toggleProject(project._id)}
                  >
                    <div className="apm-item-checkbox">
                      {isSelected
                        ? <CheckSquare size={20} className="apm-icon-checked" />
                        : <Square size={20} className="apm-icon-unchecked" />
                      }
                    </div>
                    <div className="apm-item-details">
                      <span className="apm-item-name">{project.name}</span>
                      {project.clientOrTask && (
                        <span className="apm-item-client">{project.clientOrTask}</span>
                      )}
                    </div>
                    {isSelected && <div className="apm-item-indicator" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="apm-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving
              ? <><Loader2 className="apm-spinner-sm" size={16} /> Saving...</>
              : <><Save size={16} /> Save Assignments</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignProjectsModal;
