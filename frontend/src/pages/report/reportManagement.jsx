import React, { useState, useEffect, useCallback, useContext } from 'react';
import SideNav from '../../components/SideNav';
import { AppContext } from '../../context/AppContext';
import {
  FiDownload, FiFilter, FiCalendar, FiTrendingUp,
  FiCheckCircle, FiClock, FiMapPin, FiUser, FiFileText,
  FiEye, FiRefreshCw, FiAlertCircle, FiUsers, FiX,
  FiAward, FiActivity, FiBarChart2, FiAlertTriangle,
  FiThumbsDown, FiArrowUp, FiArrowDown
} from 'react-icons/fi';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';
import './reportManagement.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const COLORS = {
  completed: '#10b981',
  pending:   '#f59e0b',
  in_progress: '#3b82f6',
  rejected:  '#ef4444',
  verified:  '#8b5cf6',
};
const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];
const BAR_COLORS = ['#1a4d2e', '#2d7a47', '#4caf70', '#a8d5b5', '#d4edda'];

const exportCSV = (data, filename) => {
  if (!data?.length) return;
  const keys = Object.keys(data[0]).filter(k => !Array.isArray(data[0][k]) && typeof data[0][k] !== 'object');
  const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${filename}.csv`; a.click();
};

const exportPDF = (reportType, data, summary) => {
  const win = window.open('', '_blank');
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const buildRows = () => {
    if (reportType === 'task-completion') return data.map(r =>
      `<tr><td>${r.task_name}</td><td>${r.field_name}</td><td>${r.crop_name}</td>
       <td>${r.assigned_date ? new Date(r.assigned_date).toLocaleDateString() : '-'}</td>
       <td>${r.completed_count}/${r.total_count}</td><td><b>${r.completion_rate}%</b></td>
       <td>${r.total_expected_hours}h</td><td>${r.supervisor_name}</td></tr>`
    ).join('');
    if (reportType === 'worker-performance') return data.map(r =>
      `<tr><td>${r.full_name}</td><td>${r.total_assigned}</td><td>${r.total_completed}</td>
       <td><b>${r.completion_rate}%</b></td><td>${r.total_verified}</td>
       <td>${r.total_expected_hours}h</td><td>${r.days_worked}</td></tr>`
    ).join('');
    if (reportType === 'field-status') return data.map(r =>
      `<tr><td>${r.field_name}</td><td>${r.crop_name}</td><td>${r.location}</td>
       <td>${r.completed_assignments}/${r.total_assignments}</td>
       <td><b>${r.completion_rate}%</b></td><td>${r.overdue_count}</td><td>${r.health}</td></tr>`
    ).join('');
    if (reportType === 'overdue') return data.map(r =>
      `<tr><td>${r.task_name}</td><td>${r.field_name}</td><td>${r.crop_name}</td>
       <td>${r.days_overdue}</td><td>${r.next_due_date}</td><td>${r.supervisor_name || '-'}</td></tr>`
    ).join('');
    if (reportType === 'incident-reports') return data.map(r =>
      `<tr><td>${r.title}</td><td>${r.incident_type}</td><td>${r.severity}</td>
       <td>${r.field_name}</td><td>${r.reported_by}</td><td>${r.status}</td>
       <td>${r.reported_at ? new Date(r.reported_at).toLocaleDateString() : '-'}</td></tr>`
    ).join('');
    return '';
  };

  const headers = {
    'task-completion':    '<th>Task</th><th>Field</th><th>Crop</th><th>Date</th><th>Workers</th><th>Completion%</th><th>Hours</th><th>Supervisor</th>',
    'worker-performance': '<th>Worker</th><th>Assigned</th><th>Completed</th><th>Rate</th><th>Verified</th><th>Hours</th><th>Days</th>',
    'field-status':       '<th>Field</th><th>Crop</th><th>Location</th><th>Assignments</th><th>Completion%</th><th>Overdue</th><th>Health</th>',
    'overdue':            '<th>Task</th><th>Field</th><th>Crop</th><th>Days Overdue</th><th>Was Due</th><th>Supervisor</th>',
    'incident-reports':   '<th>Title</th><th>Type</th><th>Severity</th><th>Field</th><th>Reported By</th><th>Status</th><th>Date</th>',
  };

  win.document.write(`<!DOCTYPE html><html><head><title>Plantro Report</title>
    <style>* { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #1a1a1a; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #1a4d2e; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 800; color: #1a4d2e; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #1a4d2e; color: white; padding: 8px; text-align: left; }
    td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f8fafb; }
    .footer { margin-top: 24px; font-size: 11px; color: #999; text-align: center; }</style>
    </head><body>
    <div class="header"><div><div class="brand">Plantro</div>
    <div style="font-size:13px;color:#666;margin-top:4px;">${reportType.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase())} Report</div></div>
    <div style="text-align:right;font-size:12px;color:#666">
    <div>Generated: ${date}</div><div>Records: ${data.length}</div></div></div>
    <table><thead><tr>${headers[reportType] || ''}</tr></thead><tbody>${buildRows()}</tbody></table>
    <div class="footer">Plantro — Confidential — ${date}</div>
    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
};

//  Stat Card 
const StatCard = ({ icon, label, value, sub, color, trend }) => (
  <div className={`rm-stat-card ${color}`}>
    <div className="rm-stat-icon">{icon}</div>
    <div className="rm-stat-body">
      <div className="rm-stat-value">{value ?? '—'}</div>
      <div className="rm-stat-label">{label}</div>
      {sub && <div className="rm-stat-sub">{sub}</div>}
    </div>
    {trend !== undefined && (
      <div className={`rm-stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
        {trend >= 0 ? <FiArrowUp size={12}/> : <FiArrowDown size={12}/>}
        {Math.abs(trend)}%
      </div>
    )}
  </div>
);

//  Custom Tooltip 
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rm-tooltip">
      <p className="rm-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

//  Health Badge 
const HealthBadge = ({ health }) => {
  const map = { Excellent: 'green', Good: 'blue', Fair: 'amber', Poor: 'orange', Critical: 'red' };
  return <span className={`rm-health-badge ${map[health] || 'gray'}`}>{health}</span>;
};

//  Main Component 
const ReportManagement = () => {
  const { userData } = useContext(AppContext);
  const [activeTab, setActiveTab]     = useState('reports');
  const [reportType, setReportType]   = useState('overview');
  const [reports, setReports]         = useState([]);
  const [summary, setSummary]         = useState(null);
  const [analytics, setAnalytics]     = useState(null);
  const [fields, setFields]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError]             = useState(null);
  const [selectedReport, setSelected] = useState(null);

  const [filterField, setFilterField] = useState('all');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');

  //  Fetch summary 
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/reports/summary`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setSummary(data.summary);
    } catch (e) { console.error(e); }
  }, []);

  //  Fetch analytics 
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API}/api/reports/analytics`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setAnalytics(data.analytics);
    } catch (e) { console.error(e); }
    finally { setAnalyticsLoading(false); }
  }, []);

  //  Fetch fields dropdown 
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/reports/fields-list`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success) setFields(data.fields);
      } catch (e) { console.error(e); }
    })();
    fetchSummary();
    fetchAnalytics();
  }, [fetchSummary, fetchAnalytics]);

  //  Fetch report data 
  const fetchReports = useCallback(async () => {
    if (reportType === 'overview') return;
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filterField !== 'all') params.append('field_id', filterField);
      if (startDate) params.append('start_date', startDate);
      if (endDate)   params.append('end_date', endDate);

      const endpoint = {
        'task-completion':    'task-completion',
        'worker-performance': 'worker-performance',
        'field-status':       'field-status',
        'overdue':            'overdue',
        'incident-reports':   'incident-reports',
        'harvesting-reports': 'harvesting-reports',
      }[reportType] || 'task-completion';

      const res = await fetch(`${API}/api/reports/${endpoint}?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setReports(data.reports || []);
      else setError(data.message || 'Failed to load');
    } catch (e) { setError('Failed to load reports.'); }
    finally { setLoading(false); }
  }, [reportType, filterField, startDate, endDate]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const refreshAll = () => { fetchSummary(); fetchAnalytics(); fetchReports(); };

  const TABS = [
    { id: 'overview',            icon: <FiBarChart2 size={15}/>,    label: 'Overview' },
    { id: 'task-completion',     icon: <FiCheckCircle size={15}/>,  label: 'Task Completion' },
    { id: 'worker-performance',  icon: <FiUser size={15}/>,         label: 'Workers' },
    { id: 'field-status',        icon: <FiMapPin size={15}/>,       label: 'Field Status' },
    { id: 'overdue',             icon: <FiAlertTriangle size={15}/>, label: 'Overdue' },
    { id: 'incident-reports',    icon: <FiAlertCircle size={15}/>,  label: 'Incidents' },
    { id: 'harvesting-reports',  icon: <FiTrendingUp size={15}/>,   label: 'Harvesting' },
  ];

  //  Overview Analytics Panel 
  const renderOverview = () => {
    if (analyticsLoading) return <div className="rm-loading"><div className="rm-spinner"/><p>Loading analytics...</p></div>;
    if (!analytics) return <div className="rm-empty"><FiBarChart2 size={48}/><h3>No analytics data</h3></div>;

    const { statusDistribution, dailyTrend, topWorkers, fieldComparison, taskBreakdown } = analytics;

    // Build status pie data
    const statusOrder = ['completed','pending','in_progress','rejected'];
    const pieData = statusOrder.map(s => ({
      name: s.replace('_', ' '),
      value: Number(statusDistribution?.find(r => r.status === s)?.count || 0),
      color: COLORS[s]
    })).filter(d => d.value > 0);

    return (
      <div className="rm-overview">
        {/*  charts */}
        <div className="rm-charts-grid">
          {/* Status donut */}
          <div className="rm-chart-card">
            <h3 className="rm-chart-title">Assignment Status</h3>
            <div className="rm-donut-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={2}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="rm-donut-legend">
                {pieData.map((d, i) => (
                  <div key={i} className="rm-donut-item">
                    <span className="rm-dot" style={{ background: d.color }}/>
                    <span className="rm-donut-name">{d.name}</span>
                    <span className="rm-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily trend line chart */}
          <div className="rm-chart-card rm-chart-wide">
            <h3 className="rm-chart-title">Daily Task Trend — Last 14 Days</h3>
            {dailyTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }}
                    tickFormatter={v => new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}/>
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend/>
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Completed"/>
                  <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Pending"/>
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" dot={false} name="Total"/>
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="rm-no-chart">No trend data for the last 14 days.</p>}
          </div>
        </div>

        {/*  field comparison + task breakdown */}
        <div className="rm-charts-grid">
          {/* Field comparison bar */}
          <div className="rm-chart-card rm-chart-wide">
            <h3 className="rm-chart-title">Field Performance Comparison</h3>
            {fieldComparison?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={fieldComparison} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                  <XAxis dataKey="field_name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end"/>
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend/>
                  <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[3,3,0,0]}/>
                  <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[3,3,0,0]}/>
                  <Bar dataKey="overdue" fill="#ef4444" name="Overdue" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="rm-no-chart">No field data available.</p>}
          </div>

          {/* Task breakdown */}
          <div className="rm-chart-card">
            <h3 className="rm-chart-title">Task Type Breakdown</h3>
            {taskBreakdown?.length > 0 ? (
              <div className="rm-task-breakdown">
                {taskBreakdown.map((t, i) => {
                  const rate = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
                  return (
                    <div key={i} className="rm-breakdown-row">
                      <span className="rm-breakdown-name">{t.task_name}</span>
                      <div className="rm-breakdown-bar-wrap">
                        <div className="rm-breakdown-bar">
                          <div className="rm-breakdown-fill" style={{ width: `${rate}%` }}/>
                        </div>
                        <span className="rm-breakdown-pct">{rate}%</span>
                      </div>
                      <span className="rm-breakdown-counts">{t.completed}/{t.total}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="rm-no-chart">No task data.</p>}
          </div>
        </div>

        {/* Top Workers */}
        {topWorkers?.length > 0 && (
          <div className="rm-chart-card rm-chart-full">
            <h3 className="rm-chart-title">Top Performers</h3>
            <div className="rm-top-workers">
              {topWorkers.map((w, i) => (
                <div key={i} className="rm-top-worker">
                  <div className="rm-rank">#{i + 1}</div>
                  <div className="rm-worker-av-lg">{w.full_name?.charAt(0)}</div>
                  <div className="rm-worker-details">
                    <p className="rm-worker-nm">{w.full_name}</p>
                    <p className="rm-worker-meta">{w.completed} completed · {w.hours}h</p>
                    <div className="rm-worker-prog">
                      <div className="rm-worker-prog-fill" style={{ width: `${w.rate}%` }}/>
                    </div>
                  </div>
                  <div className="rm-worker-rate">{w.rate}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision Insights */}
        {summary && (
          <div className="rm-chart-card rm-chart-full rm-insights">
            <h3 className="rm-chart-title">Decision Insights</h3>
            <div className="rm-insights-grid">
              {summary.overdueCount > 0 && (
                <div className="rm-insight rm-insight-warn">
                  <FiAlertTriangle size={18}/>
                  <div>
                    <p className="rm-insight-title">{summary.overdueCount} overdue task{summary.overdueCount !== 1 ? 's' : ''}</p>
                    <p className="rm-insight-body">Assign workers to overdue tasks immediately to avoid crop damage.</p>
                    <button className="rm-insight-btn" onClick={() => setReportType('overdue')}>View overdue →</button>
                  </div>
                </div>
              )}
              {summary.completionRate < 60 && (
                <div className="rm-insight rm-insight-danger">
                  <FiThumbsDown size={18}/>
                  <div>
                    <p className="rm-insight-title">Low completion rate: {summary.completionRate}%</p>
                    <p className="rm-insight-body">More than 40% of tasks are incomplete. Review worker capacity and task allocation.</p>
                    <button className="rm-insight-btn" onClick={() => setReportType('worker-performance')}>Review workers →</button>
                  </div>
                </div>
              )}
              {summary.pending > 0 && (
                <div className="rm-insight rm-insight-info">
                  <FiClock size={18}/>
                  <div>
                    <p className="rm-insight-title">{summary.pending} pending assignments</p>
                    <p className="rm-insight-body">Workers have unstarted tasks. Check if attendance is marked and tasks are acknowledged.</p>
                    <button className="rm-insight-btn" onClick={() => setReportType('task-completion')}>View tasks →</button>
                  </div>
                </div>
              )}
              {summary.completionRate >= 80 && (
                <div className="rm-insight rm-insight-success">
                  <FiAward size={18}/>
                  <div>
                    <p className="rm-insight-title">Good performance: {summary.completionRate}% completion rate</p>
                    <p className="rm-insight-body">Operations are running well. Keep monitoring overdue tasks and verify completed work.</p>
                  </div>
                </div>
              )}
              {summary.totalHours > 0 && (
                <div className="rm-insight rm-insight-info">
                  <FiActivity size={18}/>
                  <div>
                    <p className="rm-insight-title">{summary.totalHours}h total labor assigned</p>
                    <p className="rm-insight-body">
                      Avg {summary.totalAssignments > 0 ? (summary.totalHours / summary.totalAssignments).toFixed(1) : 0}h per task. 
                      {summary.weekCompleted > 0 ? ` ${summary.weekCompleted} tasks completed this week.` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  //  Render table content 
  const renderTable = () => {
    if (loading) return <div className="rm-loading"><div className="rm-spinner"/><p>Loading...</p></div>;
    if (error) return <div className="rm-error"><FiAlertCircle size={32}/><p>{error}</p><button className="rm-btn rm-btn-primary" onClick={fetchReports}>Retry</button></div>;
    if (!reports.length) return <div className="rm-empty"><FiFileText size={48}/><h3>No records found</h3><p>Try adjusting filters or date range</p></div>;

    return (
      <div className="rm-table-wrap">
        <div className="rm-table-header">
          <span className="rm-record-count">{reports.length} record{reports.length !== 1 ? 's' : ''}</span>
          <div className="rm-table-actions">
            <button className="rm-btn rm-btn-outline rm-btn-sm" onClick={() => exportCSV(reports, `plantro_${reportType}_${new Date().toISOString().slice(0,10)}`)}>
              <FiDownload size={13}/> CSV
            </button>
            <button className="rm-btn rm-btn-primary rm-btn-sm" onClick={() => exportPDF(reportType, reports, summary)}>
              <FiFileText size={13}/> PDF
            </button>
          </div>
        </div>

        {/* Task Completion */}
        {reportType === 'task-completion' && (
          <div className="rm-table-scroll">
            <table className="rm-table">
              <thead><tr>
                <th>Task</th><th>Field</th><th>Crop</th><th>Date</th>
                <th>Workers</th><th>Completion</th><th>Hours</th>
                <th>Supervisor</th><th></th>
              </tr></thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.task_name}</strong></td>
                    <td>{r.field_name}</td>
                    <td><span className="rm-badge crop">{r.crop_name}</span></td>
                    <td className="rm-nowrap">{r.assigned_date ? new Date(r.assigned_date).toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`rm-badge ${r.completed_count === r.total_count && r.total_count > 0 ? 'done' : 'partial'}`}>
                        {r.completed_count}/{r.total_count}
                      </span>
                    </td>
                    <td>
                      <div className="rm-prog-cell">
                        <div className="rm-mini-bar">
                          <div className="rm-mini-fill" style={{ width: `${r.completion_rate}%`,
                            background: r.completion_rate >= 100 ? '#10b981' : r.completion_rate >= 50 ? '#f59e0b' : '#ef4444'
                          }}/>
                        </div>
                        <span>{r.completion_rate}%</span>
                      </div>
                    </td>
                    <td>{r.total_expected_hours}h</td>
                    <td>{r.supervisor_name}</td>
                    <td>
                      <button className="rm-icon-btn view" onClick={() => setSelected(r)}><FiEye size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Worker Performance */}
        {reportType === 'worker-performance' && (
          <div className="rm-table-scroll">
            <table className="rm-table">
              <thead><tr>
                <th>Worker</th><th>Assigned</th><th>Completed</th><th>Rate</th>
                <th>Verified</th><th>Rejected</th><th>Hours</th><th>Days worked</th><th>Fields</th><th></th>
              </tr></thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <div className="rm-worker-cell">
                        <div className="rm-avatar">{r.full_name?.charAt(0) || '?'}</div>
                        <div>
                          <div className="rm-worker-name">{r.full_name}</div>
                          <div className="rm-worker-email">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="rm-num">{r.total_assigned}</span></td>
                    <td><span className="rm-num green">{r.total_completed}</span></td>
                    <td>
                      <div className="rm-prog-cell">
                        <div className="rm-mini-bar">
                          <div className="rm-mini-fill" style={{ width: `${r.completion_rate}%`,
                            background: r.completion_rate >= 80 ? '#10b981' : r.completion_rate >= 50 ? '#f59e0b' : '#ef4444'
                          }}/>
                        </div>
                        <span>{r.completion_rate}%</span>
                      </div>
                    </td>
                    <td><span className="rm-num purple">{r.total_verified}</span></td>
                    <td><span className="rm-num red">{r.total_rejected}</span></td>
                    <td>{r.total_expected_hours}h</td>
                    <td>{r.days_worked}</td>
                    <td className="rm-text-sm rm-muted">{r.fields_worked || '—'}</td>
                    <td>
                      <button className="rm-icon-btn view" onClick={() => setSelected(r)}><FiEye size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Field Status */}
        {reportType === 'field-status' && (
          <div className="rm-table-scroll">
            <table className="rm-table">
              <thead><tr>
                <th>Field</th><th>Crop</th><th>Location</th><th>Area</th>
                <th>Supervisor</th><th>Assignments</th><th>Rate</th>
                <th>Overdue</th><th>Verify Pending</th><th>Health</th><th></th>
              </tr></thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.field_name}</strong></td>
                    <td><span className="rm-badge crop">{r.crop_name}</span></td>
                    <td>{r.location}</td>
                    <td>{r.area} ac</td>
                    <td>{r.supervisor_name || <span className="rm-muted">Unassigned</span>}</td>
                    <td>
                      <span className={`rm-badge ${r.completed_assignments === r.total_assignments && r.total_assignments > 0 ? 'done' : 'partial'}`}>
                        {r.completed_assignments}/{r.total_assignments}
                      </span>
                    </td>
                    <td>
                      <div className="rm-prog-cell">
                        <div className="rm-mini-bar">
                          <div className="rm-mini-fill" style={{ width: `${r.completion_rate}%`,
                            background: r.completion_rate >= 80 ? '#10b981' : r.completion_rate >= 50 ? '#f59e0b' : '#ef4444'
                          }}/>
                        </div>
                        <span>{r.completion_rate}%</span>
                      </div>
                    </td>
                    <td>
                      {r.overdue_count > 0
                        ? <span className="rm-badge overdue">{r.overdue_count} overdue</span>
                        : <span className="rm-badge done">On track</span>}
                    </td>
                    <td>
                      {r.pending_verification_count > 0
                        ? <span className="rm-badge verify">{r.pending_verification_count}</span>
                        : <span className="rm-muted">—</span>}
                    </td>
                    <td><HealthBadge health={r.health}/></td>
                    <td>
                      <button className="rm-icon-btn view" onClick={() => setSelected(r)}><FiEye size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Overdue */}
        {reportType === 'overdue' && (
          <div className="rm-table-scroll">
            <table className="rm-table">
              <thead><tr>
                <th>Task</th><th>Field</th><th>Crop</th><th>Was Due</th>
                <th>Days Overdue</th><th>Frequency</th><th>Est. Hours</th><th>Supervisor</th>
              </tr></thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i} className={r.days_overdue > 14 ? 'rm-row-critical' : r.days_overdue > 7 ? 'rm-row-warn' : ''}>
                    <td><strong>{r.task_name}</strong></td>
                    <td>{r.field_name}</td>
                    <td><span className="rm-badge crop">{r.crop_name}</span></td>
                    <td className="rm-nowrap">{r.next_due_date ? new Date(r.next_due_date + 'T00:00:00').toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`rm-badge ${r.days_overdue > 14 ? 'overdue-critical' : r.days_overdue > 7 ? 'overdue' : 'partial'}`}>
                        {r.days_overdue}d overdue
                      </span>
                    </td>
                    <td>Every {r.frequency_days}d</td>
                    <td>{r.estimated_man_hours}h</td>
                    <td>{r.supervisor_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Incident Reports */}
        {reportType === 'incident-reports' && (
          <div className="rm-table-scroll">
            <table className="rm-table">
              <thead><tr>
                <th>Title</th><th>Type</th><th>Severity</th><th>Field</th>
                <th>Reported By</th><th>Supervisor</th><th>Date</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.title}</strong></td>
                    <td><span className="rm-badge info">{r.incident_type?.replace('_',' ')}</span></td>
                    <td>
                      <span className={`rm-badge ${r.severity === 'high' ? 'overdue' : r.severity === 'medium' ? 'partial' : 'done'}`}>
                        {r.severity}
                      </span>
                    </td>
                    <td>{r.field_name}</td>
                    <td>{r.reported_by}</td>
                    <td>{r.supervisor_name}</td>
                    <td className="rm-nowrap">{r.reported_at ? new Date(r.reported_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`rm-badge ${r.status === 'resolved' ? 'done' : 'partial'}`}>{r.status}</span>
                    </td>
                    <td>
                      <button className="rm-icon-btn view" onClick={() => setSelected(r)}><FiEye size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Harvesting */}
        {reportType === 'harvesting-reports' && (
          <div className="rm-table-scroll">
            <table className="rm-table">
              <thead><tr>
                <th>Field</th><th>Crop</th><th>Date</th>
                <th>Quantity</th><th>Unit</th><th>Supervisor</th>
              </tr></thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr><td colSpan={6} className="rm-empty-cell">No harvest records yet. Add harvest records to track yield data.</td></tr>
                ) : reports.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.field_name}</strong></td>
                    <td><span className="rm-badge crop">{r.crop_name}</span></td>
                    <td className="rm-nowrap">{r.harvest_date ? new Date(r.harvest_date).toLocaleDateString() : '—'}</td>
                    <td><strong>{r.quantity}</strong></td>
                    <td>{r.unit}</td>
                    <td>{r.supervisor_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rm-layout">
      <SideNav role="admin" activeTab={activeTab} setActiveTab={setActiveTab} userName="Admin" userRole="Owner"/>

      <div className="rm-main">
        <header className="rm-header">
          <div className="rm-header-left">
            <h1 className="rm-title">Reports & Analytics</h1>
            <p className="rm-subtitle">Real-time plantation operations insights</p>
          </div>
          <div className="rm-header-actions">
            <button className="rm-btn rm-btn-outline" onClick={refreshAll} disabled={loading}>
              <FiRefreshCw size={14} className={loading ? 'spin' : ''}/> Refresh
            </button>
          </div>
        </header>

        <div className="rm-body">
          {/* Summary Stats */}
          {summary && (
            <div className="rm-stats-grid">
              <StatCard icon={<FiActivity size={18}/>}    color="blue"   label="Total Assignments" value={summary.totalAssignments} sub={`Today: ${summary.todayAssignments}`}/>
              <StatCard icon={<FiCheckCircle size={18}/>} color="green"  label="Completed"         value={summary.completed}        sub={`${summary.completionRate}% rate`}/>
              <StatCard icon={<FiClock size={18}/>}       color="orange" label="Pending"           value={summary.pending}          sub={`${summary.inProgress} in progress`}/>
              <StatCard icon={<FiAward size={18}/>}       color="purple" label="Verified"          value={summary.verified}/>
              <StatCard icon={<FiAlertTriangle size={18}/>} color="red"  label="Overdue Tasks"     value={summary.overdueCount}/>
              <StatCard icon={<FiUsers size={18}/>}       color="teal"   label="Active Workers"    value={summary.totalWorkers}     sub={`${summary.totalFields} fields`}/>
            </div>
          )}

          {/* Tabs */}
          <div className="rm-tabs">
            {TABS.map(tab => (
              <button key={tab.id} className={`rm-tab ${reportType === tab.id ? 'active' : ''}`}
                onClick={() => setReportType(tab.id)}>
                {tab.icon} {tab.label}
                {tab.id === 'overdue' && summary?.overdueCount > 0 && (
                  <span className="rm-tab-badge">{summary.overdueCount}</span>
                )}
                {tab.id === 'incident-reports' && (
                  <span className="rm-tab-badge-dot"/>
                )}
              </button>
            ))}
          </div>

          {/* Filters — only when NOT on overview */}
          {reportType !== 'overview' && (
            <div className="rm-filters">
              <div className="rm-filter-group">
                <label><FiMapPin size={12}/> Field</label>
                <select value={filterField} onChange={e => setFilterField(e.target.value)}>
                  <option value="all">All Fields</option>
                  {fields.map(f => <option key={f.field_id} value={f.field_id}>{f.field_name}</option>)}
                </select>
              </div>
              {!['overdue','incident-reports','harvesting-reports','field-status'].includes(reportType) && (
                <>
                  <div className="rm-filter-group">
                    <label><FiCalendar size={12}/> From</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}/>
                  </div>
                  <div className="rm-filter-group">
                    <label><FiCalendar size={12}/> To</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}/>
                  </div>
                </>
              )}
              {(filterField !== 'all' || startDate || endDate) && (
                <button className="rm-clear-btn" onClick={() => { setFilterField('all'); setStartDate(''); setEndDate(''); }}>
                  <FiX size={12}/> Clear
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {reportType === 'overview' ? renderOverview() : renderTable()}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="rm-modal-overlay" onClick={() => setSelected(null)}>
          <div className="rm-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <h3>{selectedReport.task_name || selectedReport.full_name || selectedReport.field_name || selectedReport.title}</h3>
              <button className="rm-modal-close" onClick={() => setSelected(null)}><FiX size={18}/></button>
            </div>
            <div className="rm-modal-body">
              {reportType === 'task-completion' && (
                <>
                  <div className="rm-detail-grid">
                    {[
                      ['Task', selectedReport.task_name],
                      ['Field', selectedReport.field_name],
                      ['Crop', selectedReport.crop_name],
                      ['Location', selectedReport.location],
                      ['Date', selectedReport.assigned_date ? new Date(selectedReport.assigned_date).toLocaleDateString() : '—'],
                      ['Supervisor', selectedReport.supervisor_name],
                      ['Workers', `${selectedReport.completed_count} / ${selectedReport.total_count} completed`],
                      ['Completion Rate', `${selectedReport.completion_rate}%`],
                      ['Expected Hours', `${selectedReport.total_expected_hours}h`],
                      ['Completed At', selectedReport.completed_at ? new Date(selectedReport.completed_at).toLocaleDateString() : 'Not yet'],
                      ['Verified At', selectedReport.verified_at ? new Date(selectedReport.verified_at).toLocaleDateString() : 'Not yet'],
                      ['Deadline', selectedReport.deadline_time || '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="rm-detail-item">
                        <span className="rm-detail-key">{k}</span>
                        <span className="rm-detail-val">{v}</span>
                      </div>
                    ))}
                  </div>
                  {selectedReport.workers?.length > 0 && (
                    <div className="rm-detail-workers">
                      <h4>Workers</h4>
                      {selectedReport.workers.map((w, i) => (
                        <div key={i} className="rm-worker-row">
                          <div className="rm-avatar sm">{w.name?.charAt(0)}</div>
                          <span>{w.name}</span>
                          <span className={`rm-badge ${w.status === 'completed' ? 'done' : w.status === 'rejected' ? 'overdue' : 'partial'}`}>{w.status}</span>
                          <span className="rm-muted">{w.expected_hours}h</span>
                          {w.remarks && <span className="rm-muted rm-text-sm">"{w.remarks}"</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {reportType === 'worker-performance' && (
                <div className="rm-detail-grid">
                  {[
                    ['Name', selectedReport.full_name],
                    ['Email', selectedReport.email],
                    ['Total Assigned', selectedReport.total_assigned],
                    ['Completed', selectedReport.total_completed],
                    ['Pending', selectedReport.total_pending],
                    ['In Progress', selectedReport.total_in_progress],
                    ['Rejected', selectedReport.total_rejected],
                    ['Verified', selectedReport.total_verified],
                    ['Completion Rate', `${selectedReport.completion_rate}%`],
                    ['Expected Hours', `${selectedReport.total_expected_hours}h`],
                    ['Days Worked', selectedReport.days_worked],
                    ['First Assignment', selectedReport.first_assignment ? new Date(selectedReport.first_assignment).toLocaleDateString() : '—'],
                    ['Last Assignment', selectedReport.last_assignment ? new Date(selectedReport.last_assignment).toLocaleDateString() : '—'],
                    ['Fields Worked', selectedReport.fields_worked || '—'],
                    ['Skills', (selectedReport.skills || []).join(', ') || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="rm-detail-item">
                      <span className="rm-detail-key">{k}</span>
                      <span className="rm-detail-val">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {reportType === 'field-status' && (
                <div className="rm-detail-grid">
                  {[
                    ['Field', selectedReport.field_name],
                    ['Crop', selectedReport.crop_name],
                    ['Location', selectedReport.location],
                    ['Area', `${selectedReport.area} acres`],
                    ['Supervisor', selectedReport.supervisor_name || 'Unassigned'],
                    ['Total Assignments', selectedReport.total_assignments],
                    ['Completed', selectedReport.completed_assignments],
                    ['Pending', selectedReport.pending_assignments],
                    ['In Progress', selectedReport.inprogress_assignments],
                    ['Rejected', selectedReport.rejected_assignments],
                    ['Completion Rate', `${selectedReport.completion_rate}%`],
                    ['Overdue Tasks', selectedReport.overdue_count],
                    ['Pending Verification', selectedReport.pending_verification_count],
                    ['Total Schedules', selectedReport.total_schedules],
                    ['Unique Workers', selectedReport.unique_workers],
                    ['Total Hours Assigned', `${selectedReport.total_hours_assigned}h`],
                    ['Last Activity', selectedReport.last_activity_date ? new Date(selectedReport.last_activity_date).toLocaleDateString() : '—'],
                    ['Health', selectedReport.health],
                  ].map(([k, v]) => (
                    <div key={k} className="rm-detail-item">
                      <span className="rm-detail-key">{k}</span>
                      <span className="rm-detail-val">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {reportType === 'incident-reports' && (
                <div className="rm-detail-grid">
                  {[
                    ['Title', selectedReport.title],
                    ['Description', selectedReport.description],
                    ['Type', selectedReport.incident_type?.replace('_',' ')],
                    ['Severity', selectedReport.severity],
                    ['Field', selectedReport.field_name],
                    ['Reported By', selectedReport.reported_by],
                    ['Supervisor', selectedReport.supervisor_name],
                    ['Status', selectedReport.status],
                    ['Reported At', selectedReport.reported_at ? new Date(selectedReport.reported_at).toLocaleString() : '—'],
                    ['Updated At', selectedReport.updated_at ? new Date(selectedReport.updated_at).toLocaleString() : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="rm-detail-item">
                      <span className="rm-detail-key">{k}</span>
                      <span className="rm-detail-val">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rm-modal-footer">
              <button className="rm-btn rm-btn-outline" onClick={() => setSelected(null)}>Close</button>
              {['task-completion','worker-performance','field-status','incident-reports'].includes(reportType) && (
                <button className="rm-btn rm-btn-primary" onClick={() => exportPDF(reportType, [selectedReport], summary)}>
                  <FiDownload size={13}/> Export PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagement;