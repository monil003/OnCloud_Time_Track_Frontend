import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { Briefcase, Plus, LayoutGrid, Calendar, Trash2, Edit2 } from 'lucide-react';
import './Projects.css';

const Projects = () => {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [clientOrTask, setClientOrTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const isAdmin = user?.role === 'admin';

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/projects');
      setProjects(res.data);
    } catch (err) {
      console.error('Error fetching projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !isAdmin) return;
    try {
      if (editingProject) {
        await api.put(`/api/projects/${editingProject._id}`, { name, clientOrTask });
      } else {
        await api.post('/api/projects', { name, clientOrTask });
      }
      resetForm();
      fetchProjects();
    } catch (err) {
      console.error('Error saving project', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`/api/projects/${id}`);
      fetchProjects();
    } catch (err) {
      console.error('Error deleting project', err);
    }
  };

  const startEdit = (proj) => {
    setEditingProject(proj);
    setName(proj.name);
    setClientOrTask(proj.clientOrTask);
    setIsAdding(true);
  };

  const resetForm = () => {
    setName('');
    setClientOrTask('');
    setIsAdding(false);
    setEditingProject(null);
  };

  if (loading) return <div className="loading-state">Loading projects...</div>;

  return (
    <div className="projects-container">
      <div className="projects-header">
        <div className="header-title">
          <Briefcase className="icon" />
          <h1>Projects</h1>
        </div>
        {isAdmin && (
          <button className="btn btn-orange" onClick={() => (isAdding ? resetForm() : setIsAdding(true))}>
            <Plus size={18} /> {isAdding ? 'Cancel' : 'New Project'}
          </button>
        )}
      </div>

      {isAdding && isAdmin && (
        <div className="project-form-card glass-card">
          <h3>{editingProject ? 'Edit Project' : 'Create New Project'}</h3>
          <form onSubmit={handleSubmit} className="project-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Project Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Website Redesign" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Client / Task Description</label>
                <input 
                  type="text" 
                  value={clientOrTask} 
                  onChange={e => setClientOrTask(e.target.value)} 
                  placeholder="e.g. Acme Corp / Landing Page" 
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">{editingProject ? 'Update' : 'Save'} Project</button>
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="projects-list">
        <div className="list-header">
          <h3><LayoutGrid size={20} /> Your Active Projects</h3>
          <span className="project-count">{projects.length} total</span>
        </div>
        
        {projects.length === 0 ? (
          <div className="empty-projects glass-card">
            <Briefcase size={48} className="empty-icon" />
            <p>No projects found. {isAdmin ? 'Create your first project to start tracking time!' : 'Please contact an admin to add projects.'}</p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(proj => (
              <div key={proj._id} className="project-card glass-card">
                <div className="project-card-header">
                  <div className="project-info">
                    <h4>{proj.name}</h4>
                    <p>{proj.clientOrTask || 'Internal Task'}</p>
                  </div>
                  {isAdmin && (
                    <div className="unified-actions">
                      <button className="action-btn-mini edit" onClick={() => startEdit(proj)} title="Edit"><Edit2 size={16} /></button>
                      <button className="action-btn-mini delete" onClick={() => handleDelete(proj._id)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
                <div className="project-card-footer">
                  <div className="project-meta">
                    <Calendar size={14} />
                    <span>Created {new Date(proj.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="project-status">Active</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;


