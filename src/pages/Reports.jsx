import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { BarChart, PieChart, Calendar, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import './Reports.css';

const Reports = () => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [entriesRes, projectsRes] = await Promise.all([
        api.get('/api/time-entries'),
        api.get('/api/projects')
      ]);
      setTimeEntries(entriesRes.data);
      setProjects(projectsRes.data);
    } catch (err) {
      console.error('Error fetching report data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const monthEntries = timeEntries.filter(entry => {
    const d = new Date(entry.date);
    return d >= monthStart && d <= monthEnd;
  });

  const totalMinutes = monthEntries.reduce((acc, curr) => acc + curr.duration, 0);
  
  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const projectSummary = projects.map(p => {
    const pEntries = monthEntries.filter(e => e.projectId?._id === p._id);
    const pTotal = pEntries.reduce((acc, curr) => acc + curr.duration, 0);
    return { ...p, total: pTotal };
  }).filter(p => p.total > 0).sort((a, b) => b.total - a.total);

  const taskTypeSummary = Array.from(new Set(monthEntries.map(e => e.taskType))).map(type => {
    const tEntries = monthEntries.filter(e => e.taskType === type);
    const tTotal = tEntries.reduce((acc, curr) => acc + curr.duration, 0);
    return { type, total: tTotal };
  }).sort((a, b) => b.total - a.total);

  if (loading) return <div className="loading-state">Loading reports...</div>;

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div className="header-title">
          <FileText className="icon" />
          <h1>Reports</h1>
        </div>
        <div className="month-nav">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
            <ChevronLeft />
          </button>
          <h2>{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
            <ChevronRight />
          </button>
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
    </div>
  );
};

export default Reports;
