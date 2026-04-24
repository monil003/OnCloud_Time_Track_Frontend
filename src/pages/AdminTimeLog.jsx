import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks, subMonths, startOfYear, endOfYear, addDays } from 'date-fns';
import { Clock, Users, Briefcase, CalendarRange, Download, Edit2, Trash2, Filter, Upload, AlertCircle, Mail, ArrowUpDown, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
import './AdminTimeLog.css';

const AdminTimeLog = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  // Data
  const [allEntries, setAllEntries] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  // Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  
  // Import modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importLines, setImportLines] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  
  const parseCSVLine = (str) => {
    const result = [];
    let inQuotes = false;
    let currentWord = "";
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(currentWord.trim());
        currentWord = "";
      } else {
        currentWord += char;
      }
    }
    result.push(currentWord.trim());
    return result;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      const parsedLines = [];
      
      // Expected headers: Date, Project, Task, Duration, Notes
      for (let i = 1; i < lines.length; i++) {
         const cols = parseCSVLine(lines[i]);
         if (cols.length >= 4) {
           const projectNameStr = cols[1]?.toLowerCase() || '';
           const projNameMatch = allProjects.find(p => p.name.toLowerCase() === projectNameStr);
           
           parsedLines.push({
             index: i,
             date: cols[0] || '',
             projectName: cols[1] || '',
             projectId: projNameMatch ? projNameMatch._id : null,
             taskType: cols[2] || '',
             durationStr: cols[3] || '0',
             durationMins: parseDurationToMins(cols[3] || '0'),
             notes: cols[4] || ''
           });
         }
      }
      setImportLines(parsedLines);
      setIsImportOpen(true);
    };
    reader.readAsText(file);
    e.target.value = null; // reset
  };

  const confirmImport = async () => {
    const validLines = importLines.filter(l => l.projectId && l.durationMins > 0);
    if (!validLines.length) return alert('No valid entries to import. Please check project names and durations.');
    
    setImportLoading(true);
    try {
      const payload = validLines.map(l => ({
        date: l.date,
        projectId: l.projectId,
        taskType: l.taskType,
        duration: l.durationMins,
        notes: l.notes
      }));
      
      await api.post('/api/time-entries/import', { entries: payload });
      setIsImportOpen(false);
      setImportLines([]);
      fetchData(); // reload
    } catch (err) {
      console.error(err);
      alert('Import failed. ' + (err.response?.data?.message || ''));
    } finally {
      setImportLoading(false);
    }
  };
  
  const handleQuickFilter = (type) => {
    const today = new Date();
    let start, end;
    switch(type) {
      case 'this_week':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'last_week':
        start = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        end = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        break;
      case 'this_month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'last_month':
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case 'this_year':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      default:
        return;
    }
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };
  const [editProjectId, setEditProjectId] = useState('');
  const [editTaskType, setEditTaskType] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDuration, setEditDuration] = useState('0:00');
  const [initialFormState, setInitialFormState] = useState({
    projectId: '',
    taskType: '',
    notes: '',
    duration: '0:00'
  });

  // ---- Data fetching ----
  const fetchData = async () => {
    try {
      setLoading(true);

      let entriesUrl;
      if (isAdmin) {
        entriesUrl = `/api/time-entries/admin?startDate=${startDate}&endDate=${endDate}&sort=${sortOrder}`;
        if (selectedUserId) entriesUrl += `&userId=${selectedUserId}`;
      } else {
        entriesUrl = `/api/time-entries?startDate=${startDate}&endDate=${endDate}&sort=${sortOrder}`;
      }

      const requests = [
        api.get(entriesUrl),
        api.get('/api/projects'),
      ];
      if (isAdmin) requests.push(api.get('/api/auth'));

      const results = await Promise.all(requests);
      setAllEntries(results[0].data);
      setAllProjects(results[1].data);
      if (isAdmin && results[2]) setAllUsers(results[2].data);
    } catch (err) {
      console.error('Error fetching time log', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedUserId, sortOrder]);

  // ---- Unique project names for filter (from actual entries returned) ----
  const uniqueProjectNames = useMemo(() => {
    const names = new Set(allEntries.map(e => e.projectId?.name).filter(Boolean));
    return Array.from(names).sort();
  }, [allEntries]);

  // ---- Client-side project name filter ----
  const filteredEntries = useMemo(() => {
    if (!selectedProjectName) return allEntries;
    return allEntries.filter(e => e.projectId?.name === selectedProjectName);
  }, [allEntries, selectedProjectName]);

  // ---- Totals ----
  const totalMins = filteredEntries.reduce((acc, e) => acc + e.duration, 0);
  const totalFormatted = `${Math.floor(totalMins / 60)}:${(totalMins % 60).toString().padStart(2, '0')}`;

  // ---- Grouping entries by day ----
  const groupedEntries = useMemo(() => {
    const groups = {};
    filteredEntries.forEach(entry => {
      // Use local date string instead of UTC date part to avoid timezone shifts
      const dateKey = format(new Date(entry.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    });
    
    // Maintain the sort order of the original filteredEntries
    const orderedKeys = [];
    filteredEntries.forEach(entry => {
      const dateKey = format(new Date(entry.date), 'yyyy-MM-dd');
      if (!orderedKeys.includes(dateKey)) orderedKeys.push(dateKey);
    });

    return orderedKeys.map(key => {
      const dayEntries = groups[key];
      const dayTotalMins = dayEntries.reduce((sum, e) => sum + e.duration, 0);
      const uniqueEmps = new Set(dayEntries.map(e => e.userId?._id)).size;
      
      return {
        date: key,
        entries: dayEntries,
        totalHours: `${Math.floor(dayTotalMins / 60)}:${(dayTotalMins % 60).toString().padStart(2, '0')}`,
        entryCount: dayEntries.length,
        employeeCount: uniqueEmps
      };
    });
  }, [filteredEntries]);

  // ---- Helpers ----
  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const parseDurationToMins = (str) => {
    if (!str.includes(':')) return parseFloat(str) * 60;
    const [h, m] = str.split(':');
    return (parseInt(h) || 0) * 60 + (parseInt(m) || 0);
  };

  // ---- Edit ----
  const openEdit = (entry) => {
    const projId = entry.projectId?._id || entry.projectId;
    const task = entry.taskType;
    const notes = entry.notes || '';
    const dur = formatDuration(entry.duration);

    setEditingEntry(entry);
    setEditProjectId(projId);
    setEditTaskType(task);
    setEditNotes(notes);
    setEditDuration(dur);

    setInitialFormState({
      projectId: projId,
      taskType: task,
      notes: notes,
      duration: dur
    });
    setIsModalOpen(true);
  };

  const isFormDirty = () => {
    return editProjectId !== initialFormState.projectId ||
           editTaskType !== initialFormState.taskType ||
           editNotes !== initialFormState.notes ||
           editDuration !== initialFormState.duration;
  };

  const handleCloseEdit = () => {
    if (isFormDirty()) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to close?")) {
        return;
      }
    }
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!editProjectId) return alert('Select a project');
    const mins = parseDurationToMins(editDuration);
    if (mins <= 0) return alert('Enter valid duration');
    try {
      const res = await api.put(`/api/time-entries/${editingEntry._id}`, {
        projectId: editProjectId,
        taskType: editTaskType,
        duration: mins,
        notes: editNotes,
      });
      setAllEntries(prev => prev.map(e => e._id === editingEntry._id ? res.data : e));
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await api.delete(`/api/time-entries/${id}`);
      setAllEntries(prev => prev.filter(e => e._id !== id));
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ---- Export CSV ----
  const handleExport = () => {
    if (filteredEntries.length === 0) return alert('No entries to export');
    const headers = isAdmin
      ? 'Employee,Date,Project,Client,Sub Task,Hours,Notes\n'
      : 'Date,Project,Client,Sub Task,Hours,Notes\n';
    let csv = headers;
    filteredEntries.forEach(e => {
      const date = format(new Date(e.date), 'yyyy-MM-dd');
      const proj = e.projectId?.name || '';
      const client = e.projectId?.clientOrTask || '';
      const task = e.taskType || '';
      const hours = (e.duration / 60).toFixed(2);
      const notes = (e.notes || '').replace(/"/g, "''").replace(/\n/g, ' | ');
      if (isAdmin) {
        const emp = e.userId?.name || 'Unknown';
        csv += `"${emp}","${date}","${proj}","${client}","${task}",${hours},"${notes}"\n`;
      } else {
        csv += `"${date}","${proj}","${client}","${task}",${hours},"${notes}"\n`;
      }
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TimeLog_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleEmailTimesheet = async () => {
    if (filteredEntries.length === 0) return alert('No entries to email for this filter.');
    try {
      await api.post('/api/time-entries/email-timesheet', {
        startDate,
        endDate,
        targetUserId: isAdmin ? selectedUserId || undefined : undefined
      });
      alert('Timesheet emailed successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to send email. ' + (err.response?.data?.message || ''));
    }
  };

  if (loading) {
    return (
      <div className="atl-loading">
        <Clock className="atl-spinner" size={32} />
        <span>Loading time log...</span>
      </div>
    );
  }

  return (
    <div className="atl-container">
      {/* Page Header */}
      <div className="atl-page-header">
        <div className="atl-page-title">
          <div className="atl-title-icon"><Clock size={22} /></div>
          <div>
            <h1>{isAdmin ? 'Team Time Log' : 'My Time Log'}</h1>
            <p>{isAdmin ? 'View and manage all employee time entries' : 'Filter and review your time entries'}</p>
          </div>
        </div>
        <div className="atl-header-actions">
          <button className="atl-export-btn" onClick={handleEmailTimesheet}>
            <Mail size={16} /> {isAdmin && selectedUserId ? 'Email User' : 'Email Me'}
          </button>
          <label className="atl-action-btn atl-action-btn--outline">
            <Upload size={16} /> Import CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <button className="atl-export-btn" onClick={handleExport}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="atl-quick-filters">
        <span className="atl-qf-label">Filter:</span>
        <button className="atl-qf-btn" onClick={() => handleQuickFilter('this_week')}>This Week</button>
        <button className="atl-qf-btn" onClick={() => handleQuickFilter('last_week')}>Last Week</button>
        <button className="atl-qf-btn" onClick={() => handleQuickFilter('this_month')}>This Month</button>
        <button className="atl-qf-btn" onClick={() => handleQuickFilter('last_month')}>Last Month</button>
        <button className="atl-qf-btn" onClick={() => handleQuickFilter('this_year')}>This Year</button>
      </div>

      {/* Filters */}
      <div className="atl-filters">
        {/* Employee filter — admin only */}
        {isAdmin && (
          <div className="atl-filter-group">
            <label><Users size={14} /> Employee</label>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
              <option value="">All Employees</option>
              {allUsers.map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="atl-filter-group">
          <label><Briefcase size={14} /> Project</label>
          <select value={selectedProjectName} onChange={e => setSelectedProjectName(e.target.value)}>
            <option value="">All Projects</option>
            {uniqueProjectNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="atl-filter-group">
          <label><CalendarRange size={14} /> From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>

        <div className="atl-filter-group">
          <label><CalendarRange size={14} /> To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>

        <div className="atl-filter-group" style={{ flex: '0 0 auto', minWidth: '100px' }}>
          <label><ArrowUpDown size={14} /> Sort</label>
          <button 
            className="atl-action-btn" 
            style={{ width: '100%', justifyContent: 'center', height: '40px' }}
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <ArrowUpAZ size={16} /> : <ArrowDownAZ size={16} />}
            {sortOrder === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="atl-summary-banner">
        <div className="atl-summary-stat">
          <span className="atl-summary-label">Total Hours</span>
          <span className="atl-summary-value">{totalFormatted}</span>
        </div>
        <div className="atl-summary-divider" />
        <div className="atl-summary-stat">
          <span className="atl-summary-label">Entries</span>
          <span className="atl-summary-value">{filteredEntries.length}</span>
        </div>
        {isAdmin && (
          <>
            <div className="atl-summary-divider" />
            <div className="atl-summary-stat">
              <span className="atl-summary-label">Employees</span>
              <span className="atl-summary-value">
                {new Set(filteredEntries.map(e => e.userId?._id)).size}
              </span>
            </div>
          </>
        )}
        {selectedProjectName && (
          <>
            <div className="atl-summary-divider" />
            <div className="atl-active-filter">
              <Filter size={14} /> Filtered by: <strong>{selectedProjectName}</strong>
              <button onClick={() => setSelectedProjectName('')}>✕</button>
            </div>
          </>
        )}
      </div>

      {/* Entry Detail List */}
      {filteredEntries.length === 0 ? (
        <div className="atl-empty">
          <Clock size={48} />
          <p>No time entries found for this filter.</p>
        </div>
      ) : (
        <div className="atl-detail-list">
          {groupedEntries.map(group => (
            <div key={group.date} className="atl-day-group">
              <div className="atl-day-header">
                <div className="atl-day-date">
                  {/* group.date is YYYY-MM-DD. Adding T12:00 parses to local noon, stable across timezones. */}
                  {format(new Date(group.date + 'T12:00:00'), 'EEEE, MMM d, yyyy')}
                </div>
                <div className="atl-day-stats-row">
                  <div className="atl-day-mini-stat">
                    <span>Hours</span>
                    <strong>{group.totalHours}</strong>
                  </div>
                  <div className="atl-day-mini-stat">
                    <span>Entries</span>
                    <strong>{group.entryCount}</strong>
                  </div>
                  {isAdmin && (
                    <div className="atl-day-mini-stat">
                      <span>Employees</span>
                      <strong>{group.employeeCount}</strong>
                    </div>
                  )}
                </div>
              </div>

              {group.entries.map(entry => {
                const noteLines = (entry.notes || '').split('\n').filter(l => l.trim());
                return (
                  <div
                    className={`atl-entry-row ${isAdmin ? 'atl-entry-row--admin' : 'atl-entry-row--user'}`}
                    key={entry._id}
                  >
                    {/* Employee column — admin only */}
                    {isAdmin && (
                      <div className="atl-entry-emp">
                        <div className="atl-emp-avatar">
                          {entry.userId?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="atl-emp-meta">
                          <span className="atl-emp-name">{entry.userId?.name || 'Unknown'}</span>
                        </div>
                      </div>
                    )}

                    {/* Date — user view (since no employee column) */}
                    {!isAdmin && (
                      <div className="atl-entry-date-col">
                        <Clock size={16} color="var(--text-light)" />
                      </div>
                    )}

                    {/* Entry detail */}
                    <div className="atl-entry-main">
                      <div className="atl-entry-project">
                        <strong>{entry.projectId?.name || 'Internal'}</strong>
                        {entry.projectId?.clientOrTask && (
                          <span className="atl-entry-client"> ({entry.projectId.clientOrTask})</span>
                        )}
                      </div>
                      <div className="atl-entry-subtask">{entry.taskType}</div>
                      {noteLines.length > 0 && (
                        <>
                          <div className="atl-entry-desc-label">Notes:</div>
                          <div className="atl-entry-notes">
                            {noteLines.map((line, i) => (
                              <div key={i} className="atl-note-line">{line}</div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right: duration + actions */}
                    <div className="atl-entry-right">
                      <span className="atl-entry-duration">{formatDuration(entry.duration)}</span>
                      <div className="unified-actions">
                        <button className="action-btn-mini edit" onClick={() => openEdit(entry)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="action-btn-mini delete" onClick={() => handleDelete(entry._id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Total footer */}
          <div className="atl-list-total">
            <span className="atl-list-total-label">Total:</span>
            <span className="atl-list-total-value">{totalFormatted}</span>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingEntry && (
        <div className="modal-overlay">
          <div className="atl-modal" onClick={e => e.stopPropagation()}>
            <div className="atl-modal-header">
              <div>
                <h3>Edit Time Entry</h3>
                <p>
                  {isAdmin
                    ? <><strong>{editingEntry.userId?.name}</strong> · </>
                    : null
                  }
                  {format(new Date(editingEntry.date), 'MMM d, yyyy')}
                </p>
              </div>
              <button className="apm-close-btn" onClick={handleCloseEdit}>✕</button>
            </div>
            <div className="atl-modal-body">
              <div className="atl-modal-row">
                <div className="atl-modal-group">
                  <label>Project</label>
                  <select value={editProjectId} onChange={e => setEditProjectId(e.target.value)}>
                    <option value="" disabled>Select project...</option>
                    {allProjects.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name}{p.clientOrTask ? ` — ${p.clientOrTask}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="atl-modal-group atl-modal-group--sm">
                  <label>Sub Task</label>
                  <input
                    type="text"
                    value={editTaskType}
                    onChange={e => setEditTaskType(e.target.value)}
                    placeholder="e.g. Programming"
                  />
                </div>
                <div className="atl-modal-group atl-modal-group--xs">
                  <label>Hours</label>
                  <input
                    type="text"
                    value={editDuration}
                    onChange={e => setEditDuration(e.target.value)}
                    placeholder="0:00"
                    className="atl-duration-input"
                  />
                </div>
              </div>
              <div className="atl-modal-group">
                <label>Notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={5}
                  placeholder="Work details..."
                />
              </div>
            </div>
            <div className="atl-modal-footer">
              <button className="btn btn-primary" onClick={handleSave}>Update Entry</button>
              <button className="btn btn-outline" onClick={handleCloseEdit}>Cancel</button>
              <button className="atl-delete-btn" onClick={() => handleDelete(editingEntry._id)}>Delete Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <div className="modal-overlay">
          <div className="atl-modal import-modal" onClick={e => e.stopPropagation()}>
            <div className="atl-modal-header">
              <div>
                <h3>Review Import</h3>
                <p>Verify timesheet entries before importing</p>
              </div>
              <button className="apm-close-btn" onClick={() => setIsImportOpen(false)}>✕</button>
            </div>
            <div className="atl-modal-body">
              <div className="import-table-container">
                <table className="import-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Task</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importLines.map((line, i) => (
                      <tr key={i} className={!line.projectId ? 'import-error-row' : ''}>
                        <td>{line.date}</td>
                        <td>{line.projectName}</td>
                        <td>{line.taskType}</td>
                        <td>{line.durationStr}</td>
                        <td>
                          {line.projectId ? (
                            <span className="import-status-ok">Valid</span>
                          ) : (
                            <span className="import-status-err">Not found</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="import-summary">
                Valid entries: {importLines.filter(l => l.projectId).length} / {importLines.length}
                {importLines.filter(l => !l.projectId).length > 0 && (
                  <div className="import-warning">
                    <AlertCircle size={14} /> Unrecognized projects will be ignored.
                  </div>
                )}
              </div>
            </div>
            <div className="atl-modal-footer">
              <button 
                className="btn btn-primary" 
                onClick={confirmImport}
                disabled={importLoading || importLines.filter(l => l.projectId).length === 0}
              >
                {importLoading ? 'Importing...' : 'Confirm Import'}
              </button>
              <button className="btn btn-outline" onClick={() => setIsImportOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTimeLog;
