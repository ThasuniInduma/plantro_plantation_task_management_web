import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import { AppContext } from '../../context/AppContext';
import {
  FiDownload, FiFilter, FiCalendar, FiTrendingUp, FiBarChart2,
  FiCheckCircle, FiClock, FiMapPin, FiUser, FiFileText,
  FiEye, FiRefreshCw, FiAlertCircle, FiUsers, FiX,
  FiAward, FiActivity, FiGrid
} from 'react-icons/fi';
import './reportManagement.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// ─── Export helpers ──────────────────────────────────────────────────────────
const exportCSV = (data, filename) => {
  if (!data.length) return;
  const keys = Object.keys(data[0]).filter(k => !Array.isArray(data[0][k]) && typeof data[0][k] !== 'object');
  const header = keys.join(',');
  const rows = data.map(row =>
    keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const exportPDF = (reportType, data, summary) => {
  const win = window.open('', '_blank');
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const tableHTML = (() => {
    if (reportType === 'task-completion') {
      return `
        <table>
          <thead><tr>
            <th>Task</th><th>Field</th><th>Crop</th><th>Date</th>
            <th>Workers</th><th>Completion%</th><th>Status</th><th>Supervisor</th>
          </tr></thead>
          <tbody>
            ${data.map(r => `<tr>
              <td>${r.task_name}</td>
              <td>${r.field_name}</td>
              <td>${r.crop_name}</td>
              <td>${r.assigned_date ? new Date(r.assigned_date).toLocaleDateString() : '-'}</td>
              <td>${r.completed_count}/${r.total_count}</td>
              <td><b>${r.completion_rate}%</b></td>
              <td>${r.completed_count === r.total_count ? ' Done' : ' Partial'}</td>
              <td>${r.supervisor_name}</td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    }
    if (reportType === 'worker-performance') {
      return `
        <table>
          <thead><tr>
            <th>Worker</th><th>Assigned</th><th>Completed</th>
            <th>Completion%</th><th>Verified</th><th>Hours Expected</th><th>Fields</th>
          </tr></thead>
          <tbody>
            ${data.map(r => `<tr>
              <td>${r.full_name}</td>
              <td>${r.total_assigned}</td>
              <td>${r.total_completed}</td>
              <td><b>${r.completion_rate}%</b></td>
              <td>${r.total_verified}</td>
              <td>${r.total_expected_hours}h</td>
              <td>${r.fields_worked || '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    }
    // field-status
    return `
      <table>
        <thead><tr>
          <th>Field</th><th>Crop</th><th>Location</th><th>Area</th>
          <th>Supervisor</th><th>Assignments</th><th>Completion%</th>
          <th>Overdue</th><th>Health</th>
        </tr></thead>
        <tbody>
          ${data.map(r => `<tr>
            <td>${r.field_name}</td>
            <td>${r.crop_name}</td>
            <td>${r.location}</td>
            <td>${r.area} ac</td>
            <td>${r.supervisor_name || '-'}</td>
            <td>${r.completed_assignments}/${r.total_assignments}</td>
            <td><b>${r.completion_rate}%</b></td>
            <td>${r.overdue_count}</td>
            <td>${r.health}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  })();

  win.document.write(`<!DOCTYPE html><html><head>
    <title>Plantro Report - ${reportType}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #1a1a1a; }
      .header { display: flex; justify-content: space-between; align-items: flex-start;
                border-bottom: 3px solid #1a4d2e; padding-bottom: 16px; margin-bottom: 24px; }
      .brand { font-size: 28px; font-weight: 800; color: #1a4d2e; }
      .meta { text-align: right; font-size: 13px; color: #666; }
      h2 { font-size: 20px; color: #1a4d2e; margin-bottom: 16px; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
      .stat-box { background: #f0f7f0; border: 1px solid #c8e6c9; border-radius: 8px;
                  padding: 12px; text-align: center; }
      .stat-box .val { font-size: 22px; font-weight: 700; color: #1a4d2e; }
      .stat-box .lbl { font-size: 11px; color: #666; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #1a4d2e; color: white; padding: 10px 12px; text-align: left; font-weight: 600; }
      td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; }
      tr:nth-child(even) td { background: #f8fafb; }
      .footer { margin-top: 24px; font-size: 11px; color: #999; text-align: center;
                border-top: 1px solid #e5e7eb; padding-top: 12px; }
      @media print { body { padding: 16px; } }
    </style>
  </head><body>
    <div class="header">
      <div>
        <div class="brand">🌿 Plantro</div>
        <div style="font-size:13px;color:#666;margin-top:4px;">Plantation Management System</div>
      </div>
      <div class="meta">
        <div><b>Report Type:</b> ${reportType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
        <div><b>Generated:</b> ${date}</div>
        <div><b>Records:</b> ${data.length}</div>
      </div>
    </div>
    ${summary ? `<div class="summary">
      <div class="stat-box"><div class="val">${summary.totalAssignments}</div><div class="lbl">Total Assignments</div></div>
      <div class="stat-box"><div class="val">${summary.completed}</div><div class="lbl">Completed</div></div>
      <div class="stat-box"><div class="val">${summary.completionRate}%</div><div class="lbl">Completion Rate</div></div>
      <div class="stat-box"><div class="val">${summary.totalWorkers}</div><div class="lbl">Total Workers</div></div>
    </div>` : ''}
    <h2>${reportType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Report</h2>
    ${tableHTML}
    <div class="footer">Plantro Plantation Management System — Confidential Report — Generated ${date}</div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className={`rm-stat-card ${color}`}>
    <div className="rm-stat-icon">{icon}</div>
    <div className="rm-stat-body">
      <div className="rm-stat-value">{value ?? '—'}</div>
      <div className="rm-stat-label">{label}</div>
      {sub && <div className="rm-stat-sub">{sub}</div>}
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const ReportManagement = () => {
  const { userData } = useContext(AppContext);
  const navigate = useNavigate();

  const [reportType, setReportType]   = useState('task-completion');
  const [reports, setReports]         = useState([]);
  const [summary, setSummary]         = useState(null);
  const [fields, setFields]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [selectedReport, setSelected] = useState(null);

  // Filters
  const [filterField, setFilterField]     = useState('all');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');

  // ── Fetch summary ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/reports/summary`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success) setSummary(data.summary);
      } catch (e) { console.error(e); }
    })();
  }, []);

  // ── Fetch fields for filter dropdown ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/reports/fields-list`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success) setFields(data.fields);
      } catch (e) { console.error(e); }
    })();
  }, []);

  // ── Fetch report data ──
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterField !== 'all') params.append('field_id', filterField);
      if (startDate) params.append('start_date', startDate);
      if (endDate)   params.append('end_date', endDate);

      const endpoint = reportType === 'task-completion'    ? 'task-completion'
                     : reportType === 'worker-performance' ? 'worker-performance'
                     : 'field-status';

      const res = await fetch(`${API}/api/reports/${endpoint}?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setReports(data.reports || []);
      else setError(data.message);
    } catch (e) {
      setError('Failed to load reports. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [reportType, filterField, startDate, endDate]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleExportCSV = () => {
    const filename = `plantro_${reportType}_${new Date().toISOString().slice(0,10)}`;
    exportCSV(reports, filename);
  };

  const handleExportPDF = (subset) => {
    exportPDF(reportType, subset || reports, summary);
  };

  return (
    <div className="rm-layout">
      <SideNav />

      <div className="rm-main">
        {/* ── Header ── */}
        <header className="rm-header">
          <div className="rm-header-left">
            <h1 className="rm-title">Reports & Analytics</h1>
            <p className="rm-subtitle">Real-time data from your plantation operations</p>
          </div>
          <div className="rm-header-actions">
            <button className="rm-btn rm-btn-outline" onClick={fetchReports} disabled={loading}>
              <FiRefreshCw className={loading ? 'spin' : ''} size={15} />
              Refresh
            </button>
            <button className="rm-btn rm-btn-secondary" onClick={handleExportCSV} disabled={!reports.length}>
              <FiDownload size={15} /> CSV
            </button>
            <button className="rm-btn rm-btn-primary" onClick={() => handleExportPDF()} disabled={!reports.length}>
              <FiFileText size={15} /> Export PDF
            </button>
          </div>
        </header>

        <div className="rm-body">

          {/* ── Summary Stats ── */}
          {summary && (
            <div className="rm-stats-grid">
              <StatCard icon={<FiActivity size={20}/>}   color="blue"   label="Total Assignments" value={summary.totalAssignments} />
              <StatCard icon={<FiCheckCircle size={20}/>} color="green"  label="Completed"         value={summary.completed}        sub={`${summary.completionRate}% rate`} />
              <StatCard icon={<FiClock size={20}/>}       color="orange" label="Pending"           value={summary.pending} />
              <StatCard icon={<FiAward size={20}/>}       color="purple" label="Verified"          value={summary.verified} />
              <StatCard icon={<FiUsers size={20}/>}       color="teal"   label="Active Workers"    value={summary.totalWorkers} />
              <StatCard icon={<FiMapPin size={20}/>}      color="indigo" label="Total Fields"      value={summary.totalFields} />
            </div>
          )}

          {/* ── Report Type Tabs ── */}
          <div className="rm-tabs">
            {[
              { id: 'task-completion',    icon: <FiCheckCircle size={16}/>, label: 'Task Completion' },
              { id: 'worker-performance', icon: <FiUser size={16}/>,        label: 'Worker Performance' },
              { id: 'field-status',       icon: <FiMapPin size={16}/>,      label: 'Field Status' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`rm-tab ${reportType === tab.id ? 'active' : ''}`}
                onClick={() => setReportType(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── Filters ── */}
          <div className="rm-filters">
            <div className="rm-filter-group">
              <label><FiMapPin size={13}/> Field</label>
              <select value={filterField} onChange={e => setFilterField(e.target.value)}>
                <option value="all">All Fields</option>
                {fields.map(f => (
                  <option key={f.field_id} value={f.field_id}>{f.field_name}</option>
                ))}
              </select>
            </div>
            <div className="rm-filter-group">
              <label><FiCalendar size={13}/> From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="rm-filter-group">
              <label><FiCalendar size={13}/> To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            {(filterField !== 'all' || startDate || endDate) && (
              <button className="rm-clear-btn" onClick={() => { setFilterField('all'); setStartDate(''); setEndDate(''); }}>
                <FiX size={13}/> Clear
              </button>
            )}
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="rm-loading">
              <div className="rm-spinner" />
              <p>Loading report data...</p>
            </div>
          ) : error ? (
            <div className="rm-error">
              <FiAlertCircle size={32} />
              <p>{error}</p>
              <button className="rm-btn rm-btn-primary" onClick={fetchReports}>Retry</button>
            </div>
          ) : reports.length === 0 ? (
            <div className="rm-empty">
              <FiFileText size={48} />
              <h3>No records found</h3>
              <p>Try adjusting your filters or date range</p>
            </div>
          ) : (

            /* ── Tables ── */
            <div className="rm-table-wrap">
              <div className="rm-table-header">
                <span className="rm-record-count">{reports.length} record{reports.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Task Completion Table */}
              {reportType === 'task-completion' && (
                <table className="rm-table">
                  <thead>
                    <tr>
                      <th>Task</th><th>Field</th><th>Crop</th><th>Date</th>
                      <th>Workers</th><th>Completion</th><th>Hrs Planned</th>
                      <th>Supervisor</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r, i) => (
                      <tr key={i}>
                        <td><strong>{r.task_name}</strong></td>
                        <td>{r.field_name}</td>
                        <td><span className="rm-badge crop">{r.crop_name}</span></td>
                        <td>{r.assigned_date ? new Date(r.assigned_date).toLocaleDateString() : '—'}</td>
                        <td>
                          <span className={`rm-badge ${r.completed_count === r.total_count ? 'done' : 'partial'}`}>
                            {r.completed_count}/{r.total_count}
                          </span>
                        </td>
                        <td>
                          <div className="rm-progress-cell">
                            <div className="rm-mini-bar">
                              <div className="rm-mini-fill" style={{ width: `${r.completion_rate}%`,
                                background: r.completion_rate == 100 ? '#10b981' : r.completion_rate > 50 ? '#f59e0b' : '#ef4444'
                              }} />
                            </div>
                            <span>{r.completion_rate}%</span>
                          </div>
                        </td>
                        <td>{r.total_expected_hours}h</td>
                        <td>{r.supervisor_name}</td>
                        <td>
                          <div className="rm-row-actions">
                            <button className="rm-icon-btn view" title="View Details" onClick={() => setSelected(r)}>
                              <FiEye size={14}/>
                            </button>
                            <button className="rm-icon-btn pdf" title="Export PDF" onClick={() => handleExportPDF([r])}>
                              <FiDownload size={14}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Worker Performance Table */}
              {reportType === 'worker-performance' && (
                <table className="rm-table">
                  <thead>
                    <tr>
                      <th>Worker</th><th>Assigned</th><th>Completed</th>
                      <th>Completion%</th><th>Verified</th><th>Hrs Expected</th>
                      <th>Skills</th><th>Fields Worked</th><th>Actions</th>
                    </tr>
                  </thead>
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
                          <div className="rm-progress-cell">
                            <div className="rm-mini-bar">
                              <div className="rm-mini-fill" style={{ width: `${r.completion_rate}%`,
                                background: r.completion_rate == 100 ? '#10b981' : r.completion_rate > 50 ? '#f59e0b' : '#ef4444'
                              }} />
                            </div>
                            <span>{r.completion_rate}%</span>
                          </div>
                        </td>
                        <td><span className="rm-num purple">{r.total_verified}</span></td>
                        <td>{r.total_expected_hours}h</td>
                        <td>
                          <div className="rm-skills">
                            {(r.skills || []).slice(0, 2).map(s => (
                              <span key={s} className="rm-skill-tag">{s}</span>
                            ))}
                            {r.skills?.length > 2 && <span className="rm-skill-more">+{r.skills.length - 2}</span>}
                          </div>
                        </td>
                        <td className="rm-text-sm">{r.fields_worked || '—'}</td>
                        <td>
                          <div className="rm-row-actions">
                            <button className="rm-icon-btn view" onClick={() => setSelected(r)}><FiEye size={14}/></button>
                            <button className="rm-icon-btn pdf" onClick={() => handleExportPDF([r])}><FiDownload size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Field Status Table */}
              {reportType === 'field-status' && (
                <table className="rm-table">
                  <thead>
                    <tr>
                      <th>Field</th><th>Crop</th><th>Location</th><th>Area</th>
                      <th>Supervisor</th><th>Assignments</th><th>Completion%</th>
                      <th>Overdue</th><th>Health</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r, i) => (
                      <tr key={i}>
                        <td><strong>{r.field_name}</strong></td>
                        <td><span className="rm-badge crop">{r.crop_name}</span></td>
                        <td>{r.location}</td>
                        <td>{r.area} ac</td>
                        <td>{r.supervisor_name || <span className="rm-text-muted">Unassigned</span>}</td>
                        <td>
                          <span className={`rm-badge ${r.completed_assignments === r.total_assignments && r.total_assignments > 0 ? 'done' : 'partial'}`}>
                            {r.completed_assignments}/{r.total_assignments}
                          </span>
                        </td>
                        <td>
                          <div className="rm-progress-cell">
                            <div className="rm-mini-bar">
                              <div className="rm-mini-fill" style={{ width: `${r.completion_rate}%`,
                                background: r.completion_rate == 100 ? '#10b981' : r.completion_rate > 50 ? '#f59e0b' : '#ef4444'
                              }} />
                            </div>
                            <span>{r.completion_rate}%</span>
                          </div>
                        </td>
                        <td>
                          {r.overdue_count > 0
                            ? <span className="rm-badge overdue">{r.overdue_count} overdue</span>
                            : <span className="rm-badge done">On track</span>
                          }
                        </td>
                        <td>
                          <span className={`rm-health ${r.health?.toLowerCase()}`}>{r.health}</span>
                        </td>
                        <td>
                          <div className="rm-row-actions">
                            <button className="rm-icon-btn view" onClick={() => setSelected(r)}><FiEye size={14}/></button>
                            <button className="rm-icon-btn pdf" onClick={() => handleExportPDF([r])}><FiDownload size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selectedReport && (
        <div className="rm-modal-overlay" onClick={() => setSelected(null)}>
          <div className="rm-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-modal-header">
              <h3>
                {selectedReport.task_name || selectedReport.full_name || selectedReport.field_name}
              </h3>
              <button className="rm-modal-close" onClick={() => setSelected(null)}><FiX size={18}/></button>
            </div>
            <div className="rm-modal-body">
              {/* Task Completion detail */}
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
                      <div className="rm-workers-list">
                        {selectedReport.workers.map((w, i) => (
                          <div key={i} className="rm-worker-row">
                            <div className="rm-avatar sm">{w.name.charAt(0)}</div>
                            <span>{w.name}</span>
                            <span className={`rm-badge ${w.status === 'completed' ? 'done' : 'partial'}`}>{w.status}</span>
                            <span className="rm-text-muted">{w.expected_hours}h</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Worker Performance detail */}
              {reportType === 'worker-performance' && (
                <div className="rm-detail-grid">
                  {[
                    ['Name', selectedReport.full_name],
                    ['Email', selectedReport.email],
                    ['Total Assigned', selectedReport.total_assigned],
                    ['Completed', selectedReport.total_completed],
                    ['Pending', selectedReport.total_pending],
                    ['In Progress', selectedReport.total_in_progress],
                    ['Verified', selectedReport.total_verified],
                    ['Completion Rate', `${selectedReport.completion_rate}%`],
                    ['Expected Hours', `${selectedReport.total_expected_hours}h`],
                    ['Max Daily Hours', `${selectedReport.max_daily_hours}h`],
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

              {/* Field Status detail */}
              {reportType === 'field-status' && (
                <div className="rm-detail-grid">
                  {[
                    ['Field Name', selectedReport.field_name],
                    ['Crop', selectedReport.crop_name],
                    ['Location', selectedReport.location],
                    ['Area', `${selectedReport.area} acres`],
                    ['Supervisor', selectedReport.supervisor_name || 'Unassigned'],
                    ['Total Assignments', selectedReport.total_assignments],
                    ['Completed', selectedReport.completed_assignments],
                    ['Pending', selectedReport.pending_assignments],
                    ['Completion Rate', `${selectedReport.completion_rate}%`],
                    ['Overdue Tasks', selectedReport.overdue_count],
                    ['Unique Workers', selectedReport.unique_workers],
                    ['Total Schedules', selectedReport.total_schedules],
                    ['Last Activity', selectedReport.last_activity_date ? new Date(selectedReport.last_activity_date).toLocaleDateString() : '—'],
                    ['Health Status', selectedReport.health],
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
              <button className="rm-btn rm-btn-primary" onClick={() => handleExportPDF([selectedReport])}>
                <FiDownload size={14}/> Export PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagement;