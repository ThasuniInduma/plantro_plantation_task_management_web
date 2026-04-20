import React, { useState, useEffect } from 'react';
import SideNav from '../../../components/SideNav';
import {
  FiChevronLeft, FiChevronRight, FiSearch, FiFilter,
  FiCheck, FiCalendar, FiX, FiUser, FiClock,
  FiMapPin, FiAlertCircle, FiChevronDown, FiChevronUp,
  FiThumbsUp, FiThumbsDown, FiSkipForward
} from 'react-icons/fi';
import './Tasks.css';

const BASE = 'http://localhost:8081/api';

const Tasks = () => {
  const getToken = () => localStorage.getItem('token');
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  });

  const [currentDate,    setCurrentDate]    = useState(new Date());
  const [selectedDate,   setSelectedDate]   = useState(new Date());
  const [activeTab,      setActiveTab]      = useState('tasks');

  const [fieldsWithTasks, setFieldsWithTasks] = useState([]);
  const [calendarDots,    setCalendarDots]    = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [expandedFields,  setExpandedFields]  = useState({});

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget,    setAssignTarget]    = useState(null);
  const [availWorkers,    setAvailWorkers]    = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [assigning,       setAssigning]       = useState(false);
  const [deadlineTime,    setDeadlineTime]    = useState('');
  const [workerCapacity,  setWorkerCapacity]  = useState(8);

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyTarget,    setVerifyTarget]    = useState(null);
  const [rejectReason,    setRejectReason]    = useState('');
  const [verifying,       setVerifying]       = useState(false);

  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deadlineHours, setDeadlineHours] = useState(1);

  const toDateStr = (d) => {
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day   = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const toMonthStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const isToday    = (d) => toDateStr(d) === toDateStr(new Date());
  

  useEffect(() => { fetchScheduleForDate(); }, [selectedDate]);
  useEffect(() => { fetchCalendarDots();    }, [currentDate]);

  const fetchScheduleForDate = async () => {
    setLoading(true);
    try {
      const dateStr = toDateStr(selectedDate);
      const url = isToday(selectedDate)
        ? `${BASE}/schedule/today`
        : `${BASE}/schedule/by-date?date=${dateStr}`;

      const res  = await fetch(url, { headers: getHeaders(), credentials: 'include' });
      const data = await res.json();

      const fields = Array.isArray(data) ? data : [];
      setFieldsWithTasks(fields);
      const exp = {};
      fields.forEach(f => { exp[f.field_id] = true; });
      setExpandedFields(exp);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarDots = async () => {
    try {
      const res  = await fetch(
        `${BASE}/assignments/calendar?month=${toMonthStr(currentDate)}`,
        { headers: getHeaders(), credentials: 'include' }
      );
      const data = await res.json();
      setCalendarDots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const openAssign = async (task, field) => {
    setAssignTarget({ task, field });
    setSelectedWorkers([]);
    setDeadlineTime('');
    try {
      const url = `${BASE}/schedule/workers-available?date=${toDateStr(selectedDate)}&field_id=${field.field_id}&task_id=${task.task_id}`;
      const res  = await fetch(url, { headers: getHeaders(), credentials: 'include' });
      const data = await res.json();
      setAvailWorkers(Array.isArray(data) ? data : []);
    } catch { setAvailWorkers([]); }
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async () => {
    if (selectedWorkers.length === 0) return;
    setAssigning(true);

    const getHoursPerWorker = () => {
      const totalRemaining =
        (assignTarget?.task?.estimated_man_hours || 0) -
        (assignTarget?.task?.total_hours_assigned || 0);

      const workers = selectedWorkers.length || 1;
      const value = totalRemaining / workers;
      return Math.max(0.5, Number.isFinite(value) ? value : 0.5);
    };

    try {
      const promises = selectedWorkers.map(workerId => {
        return fetch(`${BASE}/schedule/assign`, {
          method: 'POST',
          headers: getHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            schedule_id: assignTarget.task.schedule_id,
            worker_user_id: Number(workerId),
            date: toDateStr(selectedDate),
            expected_hours_per_worker: getHoursPerWorker(),
            deadline_time: deadlineTime || null
          })
        });
      });

      const results = await Promise.all(promises);
      for (const res of results) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed assignment');
      }

      await fetchScheduleForDate();
      await fetchCalendarDots();
      setShowAssignModal(false);
      setSelectedWorkers([]);
      setDeadlineTime('');
    } catch (err) {
      alert('Failed to assign: ' + err.message);
    } finally {
      setAssigning(false);
    }
  };
  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      await fetch(`${BASE}/assignments/${assignmentId}`, {
        method: 'DELETE', headers: getHeaders(), credentials: 'include'
      });
      await fetchScheduleForDate();
      await fetchCalendarDots();
    } catch { alert('Failed to remove.'); }
  };

  const handleUpdateStatus = async (assignmentId, status) => {
    try {
      await fetch(`${BASE}/assignments/${assignmentId}`, {
        method: 'PUT', headers: getHeaders(), credentials: 'include',
        body: JSON.stringify({ status })
      });
      await fetchScheduleForDate();
    } catch { alert('Failed to update status.'); }
  };

  const handleDismiss = async (scheduleId) => {
    if (!window.confirm('Postpone this task to tomorrow?')) return;
    try {
      await fetch(`${BASE}/schedule/dismiss`, {
        method: 'POST', headers: getHeaders(), credentials: 'include',
        body: JSON.stringify({ schedule_id: scheduleId })
      });
      await fetchScheduleForDate();
    } catch { alert('Failed to dismiss.'); }
  };

  const openVerify = (task, assignment) => {
    setVerifyTarget({ task, assignment });
    setRejectReason('');
    setShowVerifyModal(true);
  };

  const handleVerify = async (action) => {
    setVerifying(true);
    try {
      const res = await fetch(`${BASE}/schedule/verify`, {
        method: 'POST', headers: getHeaders(), credentials: 'include',
        body: JSON.stringify({
          schedule_id:   verifyTarget.task.schedule_id,
          assignment_id: verifyTarget.assignment.assignment_id,
          action,
          reject_reason: rejectReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await fetchScheduleForDate();
      setShowVerifyModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const getDaysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDay    = (d) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();

  const getLocalDateKey = (dateStr) => {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dotsMap = {};
calendarDots.forEach(r => {
  const key = getLocalDateKey(r.date || r.assigned_date);
  dotsMap[key] = r.task_count;
});

  const calendarDaysList = () => {
    const days = [];
    for (let i = 0; i < getFirstDay(currentDate); i++) days.push(null);
    for (let d = 1; d <= getDaysInMonth(currentDate); d++) days.push(d);
    return days;
  };

  const allRows = fieldsWithTasks.flatMap(field =>
    (field.due_tasks || []).map(t => ({ ...t, field }))
  );

  const filteredFields = fieldsWithTasks.map(field => ({
    ...field,
    due_tasks: (field.due_tasks || []).filter(task => {
      const matchSearch =
        task.task_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.field_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.crop_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const hasAssignment = (task.assignments?.length || 0) > 0;
      const matchStatus =
        filterStatus === 'all'        ? true :
        filterStatus === 'assigned'   ? hasAssignment :
        filterStatus === 'unassigned' ? !hasAssignment :
        filterStatus === 'verify'     ? task.needs_verification : true;

      return matchSearch && matchStatus;
    })
  })).filter(f => f.due_tasks.length > 0);

  const totalTasks    = allRows.length;
  const assignedCount = allRows.filter(r => (r.assignments?.length || 0) > 0).length;
  const pendingCount  = totalTasks - assignedCount;
  const verifyCount   = allRows.filter(r => r.needs_verification).length;

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prioColor = (d) => d > 7 ? '#ef4444' : d > 0 ? '#f59e0b' : '#10b981';
  const prioLabel = (d) => d > 7 ? 'Overdue'  : d > 0 ? `${d}d late` : 'Due Today';

  const statusColor = (s) =>
    s === 'completed'   ? '#10b981' :
    s === 'in_progress' ? '#3b82f6' :
    s === 'rejected'    ? '#ef4444' : '#f59e0b';

  // Workers needed calculation based on deadline time
  const calcWorkersNeeded = () => {
  if (!assignTarget?.task?.estimated_man_hours || !deadlineHours) return null;

  const hoursAvailable = Math.max(0.5, Number(deadlineHours));
  

  const totalHours =
    assignTarget.task.estimated_man_hours -
    (assignTarget.task.total_hours_assigned || 0);

  return {
    hoursAvailable: hoursAvailable.toFixed(1),
    workersNeeded: Math.ceil(totalHours / hoursAvailable)
  };
};
const workersNeededInfo =
  assignTarget && deadlineHours ? calcWorkersNeeded() : null;

  return (
    <div className="task-layout">
      <SideNav
        role="supervisor"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userName="Supervisor"
        userRole="Supervisor"
      />

      <div className="main-content">
        <div className="content-header">
          <div className="header-left">
            <h1 className="page-title">Task Allocation</h1>
            <p className="page-subtitle">
              {isToday(selectedDate)
                ? 'Smart schedule — tasks auto-calculated by crop frequency'
                : 'Assign crop tasks to workers by date'}
            </p>
          </div>
        </div>

        <div className="content-body">
          <div className="task-container">

            {/* Calendar  */}
            <div className="calendar-section">
              <div className="calendar-card">
                <div className="calendar-header">
                  <button className="calendar-nav-btn"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                    <FiChevronLeft size={18} />
                  </button>
                  <h3 className="calendar-month">{monthName}</h3>
                  <button className="calendar-nav-btn"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                    <FiChevronRight size={18} />
                  </button>
                </div>

                <div className="weekdays">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} className="weekday">{d}</div>
                  ))}
                </div>

                <div className="calendar-days">
                  {calendarDaysList().map((day, i) => {
                    if (!day) return <div key={`e${i}`} className="calendar-day empty" />;
                    const dsDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const ds = toDateStr(dsDate);
                    const isSelected = toDateStr(selectedDate) === ds;
                    const isTodayDay = toDateStr(new Date()) === ds;
                    const count = dotsMap[ds] || 0;
                    return (
                      <button key={day}
                        className={`calendar-day ${isSelected ? 'selected' : ''} ${isTodayDay ? 'today' : ''} ${count > 0 ? 'has-tasks' : ''}`}
                        onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}>
                        <span className="day-number">{day}</span>
                        {count > 0 && <span className="task-badge">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="stats-card">
                <div className="stat-item"><span className="stat-label">Total</span><span className="stat-value">{totalTasks}</span></div>
                <div className="stat-item"><span className="stat-label">Assigned</span><span className="stat-value assigned">{assignedCount}</span></div>
                <div className="stat-item"><span className="stat-label">Pending</span><span className="stat-value pending">{pendingCount}</span></div>
              </div>

              {isToday(selectedDate) && verifyCount > 0 && (
                <div className="verify-alert">
                  <FiAlertCircle size={16} />
                  {verifyCount} task{verifyCount !== 1 ? 's' : ''} awaiting verification
                </div>
              )}

              {!isToday(selectedDate) && (
                <button className="today-shortcut-btn" onClick={() => setSelectedDate(new Date())}>
                  <FiCalendar size={14} /> Go to Today
                </button>
              )}
            </div>

            {/* ── Right: Tasks ── */}
            <div className="tasks-section">
              <div className="date-display">
                <FiCalendar size={20} />
                <h2>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                  })}
                </h2>
                {isToday(selectedDate) && <span className="today-badge">Smart Schedule</span>}
              </div>

              <div className="filters-section">
                <div className="search-box">
                  <FiSearch size={16} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search tasks, fields, crops..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label><FiFilter size={14} /> Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All</option>
                    <option value="assigned">Assigned</option>
                    <option value="unassigned">Unassigned</option>
                    {isToday(selectedDate) && <option value="verify">Needs Verify</option>}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="no-tasks"><div className="task-spinner" /><p>Loading tasks...</p></div>
              ) : filteredFields.length === 0 ? (
                <div className="no-tasks">
                  <FiCalendar size={36} style={{ color: '#9ca3af', marginBottom: 8 }} />
                  <p>{isToday(selectedDate) ? 'No tasks due today — all fields on schedule!' : 'No tasks found for this date'}</p>
                </div>
              ) : (
                <div className="tasks-list">
                  {filteredFields.map(field => (
                    <div key={field.field_id} className="field-group">
                      <div
                        className="field-group-header"
                        onClick={() => setExpandedFields(p => ({ ...p, [field.field_id]: !p[field.field_id] }))}
                      >
                        <div className="field-group-left">
                          <FiMapPin size={15} />
                          <span className="field-group-name">{field.field_name}</span>
                          <span className="field-crop-badge">{field.crop_name}</span>
                          <span className="field-loc">{field.location}</span>
                        </div>
                        <div className="field-group-right">
                          <span className="field-task-count">{field.due_tasks.length} task{field.due_tasks.length !== 1 ? 's' : ''}</span>
                          {expandedFields[field.field_id] ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                        </div>
                      </div>

                      {expandedFields[field.field_id] && field.due_tasks.map(task => {
                        const pendingVerify = task.assignments?.find(a =>
                          (a.status || '').toLowerCase() === 'completed' && !a.verified_at && !a.is_verified
                        );
                        const hoursLeft = Math.max(0, task.estimated_man_hours - (task.total_hours_assigned || 0));

                        return (
                          <div
                            key={task.crop_task_id || task.schedule_id}
                            className={`task-item ${task.needs_verification ? 'needs-verify' : ''}`}
                          >
                            <div className="task-info">
                              <div className="task-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  {isToday(selectedDate) && (
                                    <span className="prio-dot" style={{
                                      background: task.needs_verification ? '#8b5cf6' : prioColor(task.days_overdue || 0)
                                    }} />
                                  )}
                                  <h4 className="task-title">{task.task_name}</h4>
                                  {isToday(selectedDate) && (
                                    task.needs_verification ? (
                                      <span className="verify-tag">Needs Verification</span>
                                    ) : (
                                      <span className="prio-tag" style={{ background: prioColor(task.days_overdue || 0) }}>
                                        {prioLabel(task.days_overdue || 0)}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>

                              <p className="task-description">{task.description}</p>

                              <div className="task-meta-row">
                                <span className="task-meta-pill"><FiClock size={12} /> {task.estimated_man_hours} hrs</span>
                                <span className="task-meta-pill"><FiMapPin size={12} /> {field.location}</span>
                                <span className="task-meta-pill">Every {task.frequency_days} days</span>
                                {isToday(selectedDate) && task.last_done_date && (
                                  <span className="task-meta-pill">
                                    Last: {new Date(task.last_done_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                {isToday(selectedDate) && !task.last_done_date && (
                                  <span className="task-meta-pill never-done">Never done</span>
                                )}
                              </div>

                              {isToday(selectedDate) && (
                                <div className="hours-bar">
                                  <div className="hours-track">
                                    <div className="hours-fill" style={{
                                      width: `${Math.min(100, ((task.total_hours_assigned || 0) / task.estimated_man_hours) * 100)}%`,
                                      background: task.is_fully_assigned ? '#10b981' : '#3b82f6'
                                    }} />
                                  </div>
                                  <span className="hours-label">
                                    {task.total_hours_assigned || 0}/{task.estimated_man_hours}h assigned
                                    {hoursLeft > 0 && ` · ${hoursLeft}h still needed`}
                                  </span>
                                </div>
                              )}

                              {task.assignments?.length > 0 && (
                                <div className="assignment-list">
                                  {task.assignments.map(a => (
                                    <div key={a.assignment_id} className={`assignment-chip ${a.status === 'completed' ? 'completed-chip' : ''}`}>
                                      <FiUser size={12} />
                                      <span>{a.worker_name}</span>
                                      {a.deadline_time && (
                                        <span className="deadline-badge">⏰ {a.deadline_time}</span>
                                      )}
                                      <span className="assignment-status" style={{ background: statusColor(a.status) }}>
                                        {a.status === 'completed' && !a.verified_at ? '✓ Done (unverified)' : a.status}
                                      </span>
                                      {!isToday(selectedDate) && (
                                        <select
                                          className="status-quick-select"
                                          value={a.status}
                                          onChange={e => handleUpdateStatus(a.assignment_id, e.target.value)}
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="in_progress">In Progress</option>
                                          <option value="completed">Completed</option>
                                          <option value="rejected">Rejected</option>
                                        </select>
                                      )}
                                      <button className="remove-btn" onClick={() => handleRemoveAssignment(a.assignment_id)} title="Remove">
                                        <FiX size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="task-assignment">
                              {pendingVerify && (
                                <button className="verify-btn" onClick={() => openVerify(task, pendingVerify)}>
                                  <FiThumbsUp size={13} /> Verify
                                </button>
                              )}

                              {!task.needs_verification && (task.assignments?.length || 0) === 0 && (
                                <div className="unassigned"><span>Unassigned</span></div>
                              )}

                              {!task.needs_verification && !task.is_fully_assigned && (
                                <button className="assign-btn" onClick={() => openAssign(task, field)}>
                                  {(task.assignments?.length || 0) > 0 ? '+ Add Worker' : '→ Assign'}
                                </button>
                              )}

                              {task.is_fully_assigned && !task.needs_verification && (
                                <span className="fully-assigned-tag">✓ Fully Assigned</span>
                              )}

                              {isToday(selectedDate) && !task.needs_verification && (task.assignments?.length || 0) === 0 && task.schedule_id && (
                                <button className="dismiss-btn" onClick={() => handleDismiss(task.schedule_id)} title="Postpone to tomorrow">
                                  <FiSkipForward size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/*  Assign Worker Modal  */}
      {showAssignModal && assignTarget && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Assign Worker</h2>
                <p>{assignTarget.task.task_name} — {assignTarget.field.field_name}</p>
              </div>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}><FiX size={22} /></button>
            </div>

            <div className="modal-body">
              {/* Deadline Time */}
              <div className="deadline-section">
                <label>Hours until deadline</label>

                <div className="number-stepper">
                  <button
                    type="button"
                    onClick={() => setDeadlineHours(prev => Math.max(1, prev - 1))}
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={deadlineHours}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDeadlineHours(isNaN(val) ? 1 : val);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setDeadlineHours(prev => prev + 1)}
                  >
                    +
                  </button>
                </div>
                  </div>
                  {workersNeededInfo && (
                    <div className="workers-needed-preview">
                      <p>
                        Hours available: <b>{workersNeededInfo.hoursAvailable}h</b>
                      </p>
                      <p>
                        Workers needed: <b>{workersNeededInfo.workersNeeded}</b>
                      </p>
                    </div>
                  )}

              <p className="modal-subtitle">
                Only showing workers assigned to {assignTarget.field.field_name}
              </p>

              {availWorkers.length === 0 ? (
                <div className="no-workers">
                  <FiAlertCircle size={28} />
                  <p>No available workers for this field on this date</p>
                </div>
              ) : (
                <div className="workers-list">
                {[...availWorkers]
                  .sort((a, b) => (b.hours_remaining || 0) - (a.hours_remaining || 0))
                  .map(w => (
                    <div
                      key={w.user_id}
                      className={`worker-option ${selectedWorkers.includes(w.user_id) ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedWorkers(prev =>
                          prev.includes(w.user_id)
                            ? prev.filter(id => id !== w.user_id)
                            : [...prev, w.user_id]
                        );
                      }}
                    >
                      <div className="worker-avatar">
                        {w.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>

                      <div className="worker-info">
                        <h4>{w.full_name}</h4>

                        <p>
                          {w.skills?.join(', ') || 'No skills listed'}

                          {w.attendance_status && (
                            <span style={{
                              marginLeft: 6,
                              color:
                                w.attendance_status === 'present' ? '#10b981' :
                                w.attendance_status === 'absent' ? '#ef4444' :
                                w.attendance_status === 'late' ? '#f59e0b' : '#94a3b8',
                              fontWeight: 700
                            }}>
                              · {w.attendance_status === 'not_marked'
                                ? 'Not marked'
                                : w.attendance_status}
                            </span>
                          )}
                        </p>

                        {w.hours_remaining !== undefined && (
                          <>
                            <div className="worker-hours-bar">
                              <div
                                className="worker-hours-fill"
                                style={{
                                  width: `${((w.hours_remaining || 0) / w.max_daily_hours) * 100}%`
                                }}
                              />
                            </div>

                            <span className="worker-hours-text">
                              {w.hours_remaining}h of {w.max_daily_hours}h available
                            </span>
                          </>
                        )}
                      </div>

                      <div className={`checkbox ${selectedWorkers.includes(w.user_id) ? 'checked' : ''}`}>
                        {selectedWorkers.includes(w.user_id) && <FiCheck size={15} />}
                      </div>
                    </div>
                  ))}
              </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button
                className="btn-assign"
                onClick={handleConfirmAssign}
                disabled={selectedWorkers.length === 0 || assigning}
              >
                <FiCheck size={16} />
                {assigning ? 'Assigning...' : `Assign ${selectedWorkers.length > 0 ? `(${selectedWorkers.length})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  Verify Modal  */}
      {showVerifyModal && verifyTarget && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Verify Task Completion</h2>
                <p>{verifyTarget.task.task_name} — completed by {verifyTarget.assignment.worker_name}</p>
              </div>
              <button className="modal-close" onClick={() => setShowVerifyModal(false)}><FiX size={22} /></button>
            </div>

            <div className="modal-body">
              <div className="verify-info">
                <div className="verify-row"><span>Worker</span><strong>{verifyTarget.assignment.worker_name}</strong></div>
                <div className="verify-row"><span>Task</span><strong>{verifyTarget.task.task_name}</strong></div>
                <div className="verify-row"><span>Hours worked</span><strong>{verifyTarget.assignment.expected_hours}h</strong></div>
                <div className="verify-row"><span>Next due after approval</span><strong>In {verifyTarget.task.frequency_days} days</strong></div>
              </div>

              <p className="verify-question">Did the worker complete this task satisfactorily?</p>

              <div className="reject-reason-box">
                <label>Rejection reason (required if rejecting):</label>
                <textarea
                  placeholder="e.g. Work incomplete, wrong area covered..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowVerifyModal(false)}>Cancel</button>
              <button className="btn-reject" onClick={() => handleVerify('reject')} disabled={verifying || !rejectReason.trim()}>
                <FiThumbsDown size={14} /> Reject
              </button>
              <button className="btn-approve" onClick={() => handleVerify('approve')} disabled={verifying}>
                <FiThumbsUp size={14} />
                {verifying ? 'Saving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;