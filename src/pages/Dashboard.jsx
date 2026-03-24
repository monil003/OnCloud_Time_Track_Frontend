import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Clock, Calendar, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  
  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [taskType, setTaskType] = useState('Programming');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('0:00');
  const [editingEntryId, setEditingEntryId] = useState(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [projRes, entriesRes] = await Promise.all([
        api.get('/api/projects'),
        api.get('/api/time-entries')
      ]);
      setProjects(projRes.data);
      setTimeEntries(entriesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  const formatDurationDisplay = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const parseDurationToMins = (str) => {
    if (!str.includes(':')) return parseFloat(str) * 60;
    const [h, m] = str.split(':');
    return (parseInt(h) || 0) * 60 + (parseInt(m) || 0);
  };

  const handleSaveEntry = async () => {
    if (!selectedProjectId) return alert("Select a project");
    const mins = parseDurationToMins(duration);
    if (mins <= 0) return alert("Enter valid duration");

    try {
      if (editingEntryId) {
        const res = await api.put(`/api/time-entries/${editingEntryId}`, {
          projectId: selectedProjectId,
          taskType,
          date: currentDate,
          duration: mins,
          notes
        });
        setTimeEntries(timeEntries.map(e => e._id === editingEntryId ? res.data : e));
      } else {
        const res = await api.post('/api/time-entries', {
          projectId: selectedProjectId,
          taskType,
          date: currentDate,
          duration: mins,
          notes
        });
        setTimeEntries([res.data, ...timeEntries]);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this time entry?")) return;
    try {
      await api.delete(`/api/time-entries/${id}`);
      setTimeEntries(timeEntries.filter(e => e._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (entry) => {
    setEditingEntryId(entry._id);
    setSelectedProjectId(entry.projectId?._id || entry.projectId);
    setTaskType(entry.taskType);
    setNotes(entry.notes);
    setDuration(formatDurationDisplay(entry.duration));
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setTaskType('Programming');
    setNotes('');
    setDuration('0:00');
    setEditingEntryId(null);
  };

  const todayEntries = timeEntries.filter(e => isSameDay(new Date(e.date), currentDate));
  const weekTotalMins = timeEntries.filter(e => {
    const d = new Date(e.date);
    return d >= weekStart && d <= addDays(weekStart, 6);
  }).reduce((acc, curr) => acc + curr.duration, 0);

  if (loading) return <div className="loading-state">Loading dashboard...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="date-nav">
          <div className="nav-controls">
            <button className="date-nav-btn" onClick={() => setCurrentDate(addDays(currentDate, -1))}><ChevronLeft /></button>
            <button className="date-nav-btn" onClick={() => setCurrentDate(addDays(currentDate, 1))}><ChevronRight /></button>
          </div>
          <div className="current-date-info">
            <div className="date-picker-wrapper">
              <h2>{format(currentDate, 'EEEE, d MMM')}</h2>
              <label htmlFor="dashboard-date-picker" className="date-picker-icon" title="Jump to date">
                <Calendar size={18} />
              </label>
              <input 
                type="date" 
                id="dashboard-date-picker"
                className="hidden-date-input"
                value={format(currentDate, 'yyyy-MM-dd')}
                onChange={(e) => setCurrentDate(new Date(e.target.value))}
              />
            </div>
            {!isSameDay(currentDate, new Date()) && (
              <span className="return-today" onClick={() => setCurrentDate(new Date())}>Return to today</span>
            )}
          </div>
        </div>
        <div className="view-mode-toggle glass-card">
          <button 
            className={`toggle-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            Day
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
        </div>
      </div>

      <div className="time-tracking-content">
        <div className="week-overview glass-card">
          <div className="week-days-row">
            {weekDays.map(day => {
              const isActive = isSameDay(day, currentDate);
              const dayEntries = timeEntries.filter(e => isSameDay(new Date(e.date), day));
              const dayTotal = dayEntries.reduce((acc, curr) => acc + curr.duration, 0);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`day-column ${isActive ? 'active' : ''}`} 
                  onClick={() => setCurrentDate(day)}
                >
                  <div className="day-label">{format(day, 'eee')}</div>
                  <div className="day-date">{format(day, 'd')}</div>
                  <div className="day-duration">{formatDurationDisplay(dayTotal)}</div>
                  {dayTotal > 0 && <div className="day-indicator" />}
                </div>
              );
            })}
          </div>
          <div className="week-summary">
            <div className="total-label">Week total</div>
            <div className="total-value">{formatDurationDisplay(weekTotalMins)}</div>
          </div>
        </div>

          <div className="today-entries-list">
            <div className="entries-list-header">
              <h3>{viewMode === 'day' ? "Today's Entries" : "Weekly Summary"}</h3>
              {viewMode === 'day' && (
                <button className="add-entry-inline-btn" onClick={() => setIsModalOpen(true)}>
                  <Plus size={18} /> Track Time
                </button>
              )}
            </div>

            {viewMode === 'day' ? (
              todayEntries.length === 0 ? (
                <div className="empty-dashboard glass-card">
                  <Clock className="empty-icon" size={48} />
                  <p>"Time is on my side, yes it is."</p>
                  <span>- The Rolling Stones</span>
                </div>
              ) : (
                <div className="entries-grid">
                  {todayEntries.map(entry => (
                    <div className="entry-card glass-card" key={entry._id}>
                      <div className="entry-main">
                        <div className="project-badge">
                          {entry.projectId?.name || 'Internal'}
                        </div>
                        <h4 className="entry-title">{entry.projectId?.clientOrTask || 'General Task'}</h4>
                        <p className="entry-meta">{entry.taskType} • {entry.notes || 'No notes'}</p>
                      </div>
                      <div className="entry-right">
                        <span className="duration-text">{formatDurationDisplay(entry.duration)}</span>
                        <div className="unified-actions">
                          <button className="action-btn-mini edit" onClick={() => openEditModal(entry)} title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn-mini delete" onClick={() => handleDeleteEntry(entry._id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                        <div className="entry-status"><CheckCircle2 size={16} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Week View Summary
              <div className="week-summary-grid">
                {projects.map(proj => {
                  const projWeekEntries = timeEntries.filter(e => {
                    const d = new Date(e.date);
                    return (e.projectId?._id === proj._id || e.projectId === proj._id) && d >= weekStart && d <= addDays(weekStart, 6);
                  });
                  const projTotal = projWeekEntries.reduce((acc, curr) => acc + curr.duration, 0);
                  
                  if (projTotal === 0) return null;

                  return (
                    <div key={proj._id} className="week-project-card glass-card">
                      <div className="week-project-info">
                        <div className="project-badge">{proj.name}</div>
                        <h4>{proj.clientOrTask || 'Internal Task'}</h4>
                        <p>{projWeekEntries.length} entries this week</p>
                      </div>
                      <div className="week-project-total">
                        <span className="label">Total</span>
                        <span className="value">{formatDurationDisplay(projTotal)}</span>
                      </div>
                    </div>
                  );
                })}
                {weekTotalMins === 0 && (
                  <div className="empty-dashboard glass-card">
                    <Calendar className="empty-icon" size={48} />
                    <p>No time tracked yet for this week.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEntryId ? 'Edit Time Entry' : 'Track Time'}</h3>
              <p>{format(currentDate, 'EEEE, d MMMM')}</p>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Project / Task</label>
                  <select 
                    value={selectedProjectId} 
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="" disabled>Select project...</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name} - {p.clientOrTask}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Task Type</label>
                  <select 
                    value={taskType} 
                    onChange={(e) => setTaskType(e.target.value)}
                  >
                    <option value="Programming">Programming</option>
                    <option value="Design">Design</option>
                    <option value="Research">Research</option>
                    <option value="NetSuite">NetSuite Support</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Notes</label>
                  <textarea 
                    placeholder="Work details..." 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="modal-textarea"
                    rows={4}
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Duration</label>
                  <input 
                    type="text" 
                    placeholder="0:00" 
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-orange" onClick={handleSaveEntry}>
                {editingEntryId ? 'Update Entry' : 'Save Entry'}
              </button>
              <button className="btn btn-outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancel</button>
              <div className="calendar-sync">
                <Calendar size={16} />
                <span>Sync Calendar</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

