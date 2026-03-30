import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Save, Loader2 } from 'lucide-react';
import api from '../utils/api';
import './AssignProjectsModal.css';

const AssignProjectsModal = ({ user, onClose, onSave }) => {
  const [allProjects, setAllProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch ALL projects (since we are admin)
        const res = await api.get('/api/projects');
        setAllProjects(res.data);
        
        // Pre-select projects already assigned to this user
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
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter(id => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/api/users/${user._id}/assign-projects`, { projectIds: selectedProjects });
      onSave(); // Refresh user list in parent
      onClose();
    } catch (err) {
      console.error('Error saving assignments', err);
      alert('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <div className="header-info">
            <h3>Assign Projects</h3>
            <p>Managing access for <strong>{user.name}</strong></p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-projects">
              <Loader2 className="spinner" />
              <span>Loading projects...</span>
            </div>
          ) : (
            <div className="projects-assignment-list">
              {allProjects.length === 0 ? (
                <p className="no-projects">No projects available to assign. Create some first!</p>
              ) : (
                allProjects.map(project => (
                  <div 
                    key={project._id} 
                    className={`assignment-item ${selectedProjects.includes(project._id) ? 'selected' : ''}`}
                    onClick={() => toggleProject(project._id)}
                  >
                    <div className="checkbox-icon">
                      {selectedProjects.includes(project._id) ? 
                        <CheckSquare className="icon-checked" size={20} /> : 
                        <Square className="icon-unchecked" size={20} />
                      }
                    </div>
                    <div className="project-details">
                      <span className="project-name">{project.name}</span>
                      <span className="project-task">{project.clientOrTask || 'General'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? <><Loader2 className="spinner-small" size={16} /> Saving...</> : <><Save size={18} /> Save Assignments</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignProjectsModal;
