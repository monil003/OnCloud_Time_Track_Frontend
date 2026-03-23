import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [taskType, setTaskType] = useState('Programming');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('0:00');

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
      const res = await api.post('/api/time-entries', {
        projectId: selectedProjectId,
        taskType,
        date: currentDate,
        duration: mins,
        notes
      });
      setTimeEntries([res.data, ...timeEntries]);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setTaskType('Programming');
    setNotes('');
    setDuration('0:00');
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
            <h2>{format(currentDate, 'EEEE, d MMM')}</h2>
            {!isSameDay(currentDate, new Date()) && (
              <span className="return-today" onClick={() => setCurrentDate(new Date())}>Return to today</span>
            )}
          </div>
        </div>
        <div className="view-toggles glass-card">
          <button className="view-toggle-btn active">Day</button>
          <button className="view-toggle-btn">Week</button>
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
              <h3>Today's Entries</h3>
              <button className="add-entry-inline-btn" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} /> Track Time
              </button>
            </div>
            {todayEntries.length === 0 ? (
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
                      <div className="entry-status"><CheckCircle2 size={16} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Track Time</h3>
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
                  <input 
                    type="text" 
                    placeholder="What did you work on?" 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
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
              <button className="btn btn-orange" onClick={handleSaveEntry}>Save Entry</button>
              <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
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

