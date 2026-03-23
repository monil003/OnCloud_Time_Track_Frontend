import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths } from 'date-fns';
import { BarChart, PieChart, Calendar, ChevronLeft, ChevronRight, FileText, Users, User, Download } from 'lucide-react';
import './Reports.css';

const Reports = () => {
  const { user } = useContext(AuthContext);
  const [timeEntries, setTimeEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('personal'); // 'personal' or 'team'

  const fetchData = async () => {
    try {
      setLoading(true);
      const isTeamView = user.role === 'admin' && viewMode === 'team';
      const endpoint = isTeamView ? '/api/time-entries/admin' : '/api/time-entries';
      
      let entriesUrl = `${endpoint}?startDate=${startDate}&endDate=${endDate}`;
      if (isTeamView && selectedUserId) {
        entriesUrl += `&userId=${selectedUserId}`;
      }

      const requests = [
        api.get(entriesUrl),
        api.get('/api/projects')
      ];

      if (user.role === 'admin' && allUsers.length === 0) {
        requests.push(api.get('/api/auth'));
      }

      const results = await Promise.all(requests);
      setTimeEntries(results[0].data);
      setProjects(results[1].data);
      if (results[2]) {
        setAllUsers(results[2].data);
      }
    } catch (err) {
      console.error('Error fetching report data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode, startDate, endDate, selectedUserId]);

  const monthEntries = timeEntries;
  const monthDays = eachDayOfInterval({ 
    start: new Date(startDate), 
    end: new Date(endDate) 
  });

  const totalMinutes = monthEntries.reduce((acc, curr) => acc + curr.duration, 0);
  
  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const projectSummary = projects.map(p => {
    const pEntries = monthEntries.filter(e => e.projectId?._id === p._id || e.projectId === p._id);
    const pTotal = pEntries.reduce((acc, curr) => acc + curr.duration, 0);
    return { ...p, total: pTotal };
  }).filter(p => p.total > 0).sort((a, b) => b.total - a.total);

  const taskTypeSummary = Array.from(new Set(monthEntries.map(e => e.taskType))).map(type => {
    const tEntries = monthEntries.filter(e => e.taskType === type);
    const tTotal = tEntries.reduce((acc, curr) => acc + curr.duration, 0);
    return { type, total: tTotal };
  }).sort((a, b) => b.total - a.total);

  const handleExportCSV = () => {
    if (monthEntries.length === 0) return alert("No entries to export");
    
    // Header
    let csv = "Employee,Date,Project,Task,Hours,Notes\n";
    
    // Rows
    monthEntries.forEach(e => {
      const emp = e.userId?.name || 'Unknown';
      const date = format(new Date(e.date), 'yyyy-MM-dd');
      const proj = e.projectId?.name || 'N/A';
      const task = e.taskType;
      const hours = (e.duration / 60).toFixed(2);
      const notes = (e.notes || '').replace(/,/g, ';'); // basic escaping
      csv += `"${emp}","${date}","${proj}","${task}",${hours},"${notes}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `OnCloud_Time_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) return <div className="loading-state">Loading reports...</div>;

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div className="header-title">
          <FileText className="icon" />
          <h1>Reports</h1>
        </div>
        <div className="report-controls">
          {user.role === 'admin' && (
            <div className="view-mode-tabs">
              <button 
                className={`tab-btn ${viewMode === 'personal' ? 'active' : ''}`}
                onClick={() => setViewMode('personal')}
              >
                <User size={16} /> My Reports
              </button>
              <button 
                className={`tab-btn ${viewMode === 'team' ? 'active' : ''}`}
                onClick={() => setViewMode('team')}
              >
                <Users size={16} /> Team Reports
              </button>
            </div>
          )}
          <div className="filter-controls">
            <div className="date-range-picker">
              <div className="range-group">
                <label>From</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="range-group">
                <label>To</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-label">Total Time Tracked</div>
          <div className="stat-value">{formatDuration(totalMinutes)}</div>
          <div className="stat-sub">{monthEntries.length} entries this month</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-label">Active Projects</div>
          <div className="stat-value">{projectSummary.length}</div>
          <div className="stat-sub">Across {taskTypeSummary.length} task types</div>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-section glass-card">
          <h3><PieChart className="section-icon" /> Projects Breakdown</h3>
          <div className="summary-list">
            {projectSummary.length === 0 ? (
              <p className="empty-msg">No entries for this period</p>
            ) : (
              projectSummary.map(p => (
                <div key={p._id} className="summary-item">
                  <div className="summary-info">
                    <span className="summary-name">{p.name}</span>
                    <span className="summary-desc">{p.clientOrTask}</span>
                  </div>
                  <div className="summary-total">{formatDuration(p.total)}</div>
                  <div className="summary-bar-bg">
                    <div 
                      className="summary-bar-fill" 
                      style={{ 
                        width: `${(p.total / totalMinutes) * 100}%`,
                        backgroundColor: 'var(--primary-orange)'
                      }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="report-section glass-card">
          <h3><BarChart className="section-icon" /> Task Types</h3>
          <div className="summary-list">
            {taskTypeSummary.length === 0 ? (
              <p className="empty-msg">No entries for this period</p>
            ) : (
              taskTypeSummary.map(t => (
                <div key={t.type} className="summary-item">
                  <div className="summary-info">
                    <span className="summary-name">{t.type}</span>
                  </div>
                  <div className="summary-total">{formatDuration(t.total)}</div>
                  <div className="summary-bar-bg">
                    <div 
                      className="summary-bar-fill" 
                      style={{ 
                        width: `${(t.total / totalMinutes) * 100}%`,
                        backgroundColor: 'var(--primary-green)'
                      }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="calendar-section glass-card">
        <h3><Calendar className="section-icon" /> Daily Activity</h3>
        <div className="calendar-grid">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="cal-day-header">{d}</div>
          ))}
          {monthDays.map(day => {
            const dayEntries = monthEntries.filter(e => isSameDay(new Date(e.date), day));
            const dayTotal = dayEntries.reduce((acc, curr) => acc + curr.duration, 0);
            const intensity = Math.min(dayTotal / 480, 1); // Max 8 hours for color intensity
            
            return (
              <div 
                key={day.toISOString()} 
                className="cal-day"
                style={{ 
                  backgroundColor: dayTotal > 0 ? `rgba(243, 108, 33, ${0.1 + intensity * 0.9})` : 'transparent',
                  color: dayTotal > 400 ? 'white' : 'inherit'
                }}
              >
                <span className="cal-date">{format(day, 'd')}</span>
                {dayTotal > 0 && <span className="cal-total">{formatDuration(dayTotal).split(' ')[0]}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {viewMode === 'team' && user.role === 'admin' && (
        <div className="team-activity-section glass-card">
          <div className="section-header">
            <div className="title-area">
              <h3><Users className="section-icon" /> Team Activity Detail</h3>
              <span className="entry-count">{monthEntries.length} entries</span>
            </div>
            <div className="detail-filters">
              <div className="mini-date-picker">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span>to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="user-filter">
                <select 
                  value={selectedUserId} 
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="user-select"
                >
                  <option value="">All Employees</option>
                  {allUsers.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <button className="export-btn" onClick={handleExportCSV} title="Export to CSV">
                <Download size={18} /> Export
              </button>
            </div>
          </div>
          <div className="team-table-wrapper">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Hours</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {monthEntries.map(entry => (
                  <tr key={entry._id}>
                    <td className="emp-cell">
                      <div className="emp-avatar">{entry.userId?.name?.charAt(0).toUpperCase()}</div>
                      <span>{entry.userId?.name}</span>
                    </td>
                    <td>{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                    <td>{entry.projectId?.name || 'Deleted Project'}</td>
                    <td><span className="task-badge">{entry.taskType}</span></td>
                    <td className="hours-cell">{formatDuration(entry.duration)}</td>
                    <td className="notes-cell" title={entry.notes}>{entry.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;

