import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Clock, Calendar, CheckCircle2, Edit2, Trash2, Download } from 'lucide-react';
import './Dashboard.css';

const getEntryDateStr = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } else {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
};

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'

  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [taskType, setTaskType] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('0:00');
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [initialFormState, setInitialFormState] = useState({
    projectId: '',
    taskType: '',
    notes: '',
    duration: '0:00'
  });

  // Derive dynamic sub-task options from the currently selected project
  const selectedProject = projects.find(p => p._id === selectedProjectId);
  const subTaskOptions = (selectedProject?.subTasks && selectedProject.subTasks.length > 0)
    ? selectedProject.subTasks
    : ['General'];

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
          date: format(currentDate, 'yyyy-MM-dd'),
          duration: mins,
          notes
        });
        setTimeEntries(timeEntries.map(e => e._id === editingEntryId ? res.data : e));
      } else {
        const res = await api.post('/api/time-entries', {
          projectId: selectedProjectId,
          taskType,
          date: format(currentDate, 'yyyy-MM-dd'),
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
    const projId = entry.projectId?._id || entry.projectId;
    const durStr = formatDurationDisplay(entry.duration);
    const entryNotes = entry.notes || '';
    
    setEditingEntryId(entry._id);
    setSelectedProjectId(projId);
    setTaskType(entry.taskType);
    setNotes(entryNotes);
    setDuration(durStr);
    
    setInitialFormState({
      projectId: projId,
      taskType: entry.taskType,
      notes: entryNotes,
      duration: durStr
    });
    setIsModalOpen(true);
  };

  const isFormDirty = () => {
    return selectedProjectId !== initialFormState.projectId ||
           taskType !== initialFormState.taskType ||
           notes !== initialFormState.notes ||
           duration !== initialFormState.duration;
  };

  const handleCloseModal = () => {
    if (isFormDirty()) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to close?")) {
        return;
      }
    }
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setTaskType('');
    setNotes('');
    setDuration('0:00');
    setEditingEntryId(null);
  };

  const handleExportCSV = () => {
    if (timeEntries.length === 0) return alert('No entries to export');
    let csv = 'Date,Project,Client,Sub Task,Hours,Notes\n';
    // Sort by date descending for the export
    const sorted = [...timeEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(e => {
      const date = getEntryDateStr(e.date);
      const proj = e.projectId?.name || '';
      const client = e.projectId?.clientOrTask || '';
      const task = e.taskType || '';
      const hours = (e.duration / 60).toFixed(2);
      const notes = (e.notes || '').replace(/"/g, "''").replace(/\n/g, ' | ');
      csv += `"${date}","${proj}","${client}","${task}",${hours},"${notes}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MyTimeEntries_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const todayStr = format(currentDate, 'yyyy-MM-dd');
  const todayEntries = timeEntries.filter(e => getEntryDateStr(e.date) === todayStr);

  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');

  const weekTotalMins = timeEntries.filter(e => {
    const entryDate = getEntryDateStr(e.date);
    return entryDate >= startStr && entryDate <= endStr;
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
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  setCurrentDate(new Date(y, m - 1, d));
                }}
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
              const dayStr = format(day, 'yyyy-MM-dd');
              const isActive = dayStr === todayStr;
              const dayEntries = timeEntries.filter(e => getEntryDateStr(e.date) === dayStr);
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
            <div className="entries-header-actions">
              {viewMode === 'day' && (
                <button className="add-entry-inline-btn" onClick={() => {
                  setInitialFormState({ projectId: '', taskType: '', notes: '', duration: '0:00' });
                  resetForm();
                  setIsModalOpen(true);
                }}>
                  <Plus size={18} /> Track Time
                </button>
              )}
              <button className="export-csv-btn" onClick={handleExportCSV} title="Export all my entries to CSV">
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          {viewMode === 'day' ? (
            todayEntries.length === 0 ? (
              <div className="empty-dashboard glass-card">
                <Clock className="empty-icon" size={48} />
                <p>"Time is on my side, yes it is."</p>
                <span>- The Rolling Stones</span>
              </div>
            ) : (
              <div className="entries-detail-list">
                {todayEntries.map((entry, idx) => {
                  const noteLines = (entry.notes || '').split('\n').filter(l => l.trim());
                  return (
                    <div className="entry-detail-row" key={entry._id}>
                      <div className="entry-detail-main">
                        <div className="entry-detail-project">
                          <strong>{entry.projectId?.name || 'Internal'}</strong>
                          {entry.projectId?.clientOrTask && (
                            <span className="entry-client"> ({entry.projectId.clientOrTask})</span>
                          )}
                        </div>
                        <div className="entry-detail-subtask">{entry.taskType}</div>
                        {entry.notes && (
                          <>
                            <div className="entry-detail-label">Notes:</div>
                            <div className="entry-detail-notes">
                              {noteLines.map((line, i) => (
                                <div key={i} className="entry-note-line">{line}</div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="entry-detail-right">
                        <span className="entry-detail-duration">{formatDurationDisplay(entry.duration)}</span>
                        {entry.createdAt && (
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', textAlign: 'right' }}>
                            Entered: {format(new Date(entry.createdAt), 'h:mm a')}
                          </div>
                        )}
                        <div className="unified-actions">
                          <button className="action-btn-mini edit" onClick={() => openEditModal(entry)} title="Edit"><Edit2 size={14} /></button>
                          <button className="action-btn-mini delete" onClick={() => handleDeleteEntry(entry._id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="entries-day-total">
                  <span className="day-total-label">Total:</span>
                  <span className="day-total-value">{formatDurationDisplay(todayEntries.reduce((a, e) => a + e.duration, 0))}</span>
                </div>
              </div>
            )
          ) : (
            // Week View Summary
            <div className="week-summary-grid">
              {projects.map(proj => {
                const projWeekEntries = timeEntries.filter(e => {
                  const entryDate = getEntryDateStr(e.date);
                  return (e.projectId?._id === proj._id || e.projectId === proj._id) && entryDate >= startStr && entryDate <= endStr;
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
        <div className="modal-overlay">
          <div className="modal-content compact-modal glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-compact">
              <h3>{editingEntryId ? 'Edit time entry' : 'New time entry'} for {format(currentDate, 'EEEE, d MMM')}</h3>
            </div>

            <div className="modal-body-compact">
              <div className="compact-row responsive-row">
                <div className="compact-form-group flex-1">
                  <label className="compact-label">Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setTaskType(''); // reset when project changes
                    }}
                    className="compact-select"
                  >
                    <option value="" disabled>Select project...</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name}{p.clientOrTask ? ` - ${p.clientOrTask}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="compact-form-group flex-1">
                  <label className="compact-label">Sub Task</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="compact-select"
                  >
                    {!taskType && <option value="" disabled>Select sub task...</option>}
                    {subTaskOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="compact-form-group duration-group">
                  <label className="compact-label">Hours</label>
                  <input
                    type="text"
                    placeholder="0:00"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="compact-duration-input"
                  />
                </div>
              </div>

              <div className="compact-row">
                <div className="compact-form-group full-width">
                  <textarea
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="compact-textarea"
                  />
                  <span className="textarea-hint">Shift+Return for line break</span>
                </div>
              </div>

            </div>

            <div className="modal-footer-compact">
              <div className="footer-left">
                <button className="btn btn-save" onClick={handleSaveEntry}>
                  {editingEntryId ? 'Update entry' : 'Save entry'}
                </button>
                <button className="btn btn-cancel" onClick={handleCloseModal}>Cancel</button>
              </div>
              <div className="footer-right">
                <div className="footer-link">
                  <Calendar size={16} />
                  <span>Pull in a calendar event</span>
                </div>
                {editingEntryId && (
                  <button className="delete-link" onClick={() => handleDeleteEntry(editingEntryId)}>Delete</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

