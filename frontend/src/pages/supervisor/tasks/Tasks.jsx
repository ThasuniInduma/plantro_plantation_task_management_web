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
  const [currentDate,     setCurrentDate]     = useState(new Date());
  const [selectedDate,    setSelectedDate]     = useState(new Date());
  const [activeTab,       setActiveTab]        = useState('tasks');

  // Schedule data
  const [fieldsWithTasks, setFieldsWithTasks]  = useState([]);
  const [calendarDots,    setCalendarDots]     = useState([]);
  const [loading,         setLoading]          = useState(false);
  const [expandedFields,  setExpandedFields]   = useState({});

  // Assign modal
  const [showAssignModal, setShowAssignModal]  = useState(false);
  const [assignTarget,    setAssignTarget]     = useState(null);
  const [availWorkers,    setAvailWorkers]     = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [assigning,       setAssigning]        = useState(false);

  // Verify modal
  const [showVerifyModal, setShowVerifyModal]  = useState(false);
  const [verifyTarget,    setVerifyTarget]     = useState(null);
  const [rejectReason,    setRejectReason]     = useState('');
  const [verifying,       setVerifying]        = useState(false);

  // Filters
  const [searchTerm,      setSearchTerm]       = useState('');
  const [filterStatus,    setFilterStatus]     = useState('all');
  const headers = {
    'Content-Type': 'application/json'
  };

  const toDateStr  = (d) => d.toISOString().split('T')[0];
  const toMonthStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const isToday    = (d) => toDateStr(d) === toDateStr(new Date());

  const [workerCapacity, setWorkerCapacity] = useState(5);


  // ── Fetch when date changes ───────────────────────────────────────────────
  useEffect(() => { fetchScheduleForDate(); }, [selectedDate]);
  useEffect(() => { fetchCalendarDots();    }, [currentDate]);

  const fetchScheduleForDate = async () => {
    setLoading(true);
    try {
      const dateStr = toDateStr(selectedDate);
      // Use today endpoint if selected date is today, else use assignments endpoint
      const url = isToday(selectedDate)
        ? `${BASE}/schedule/today`
        : `${BASE}/assignments?date=${dateStr}`;

      const res  = await fetch(url, { headers, credentials: 'include' });
      const data = await res.json();

      if (isToday(selectedDate)) {
        // Smart schedule format: fields with due_tasks
        const fields = Array.isArray(data) ? data : [];
        setFieldsWithTasks(fields);
        const exp = {};
        fields.forEach(f => { exp[f.field_id] = true; });
        setExpandedFields(exp);
      } else {
        // Assignments format: fields with crop_tasks
        const fields = Array.isArray(data) ? data : [];
        // Normalise to same shape as schedule format
        const normalised = fields.map(f => ({
          ...f,
          due_tasks: (f.crop_tasks || []).map(ct => ({
            ...ct,
            schedule_id:          null,
            needs_verification:   false,
            is_fully_assigned:    (ct.assignments?.length || 0) > 0,
            total_hours_assigned: (ct.assignments || [])
              .reduce((s, a) => s + (a.expected_hours || 0), 0),
            days_overdue:         0,
            last_done_date:       null
          }))
        }));
        setFieldsWithTasks(normalised);
        const exp = {};
        normalised.forEach(f => { exp[f.field_id] = true; });
        setExpandedFields(exp);
      }
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
        { headers, credentials: 'include' }
      );
      const data = await res.json();
      setCalendarDots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Open assign modal ─────────────────────────────────────────────────────
  const openAssign = async (task, field) => {
    setAssignTarget({ task, field });
    setSelectedWorkers([]);
    try {
      const url = isToday(selectedDate)
        ? `${BASE}/schedule/workers-available?date=${toDateStr(selectedDate)}&field_id=${field.field_id}`
        : `${BASE}/assignments/workers?date=${toDateStr(selectedDate)}&field_id=${field.field_id}`;
      const res  = await fetch(url, { headers, credentials: 'include' });
      const data = await res.json();
      setAvailWorkers(Array.isArray(data) ? data : []);
    } catch { setAvailWorkers([]); }
    setShowAssignModal(true);
  };

  // ── Confirm assign ────────────────────────────────────────────────────────
  const handleConfirmAssign = async () => {
  if (selectedWorkers.length === 0) return;

  setAssigning(true);
  try {
    const promises = selectedWorkers.map(workerId => {
      if (isToday(selectedDate) && assignTarget.task.schedule_id) {
        return fetch(`${BASE}/schedule/assign`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            schedule_id: assignTarget.task.schedule_id,
            worker_user_id: Number(workerId),
            date: toDateStr(selectedDate)
          })
        });
      } else {
        return fetch(`${BASE}/assignments`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            task_id: assignTarget.task.task_id,
            field_id: assignTarget.field.field_id,
            worker_user_id: Number(workerId),
            assigned_date: toDateStr(selectedDate),
            expected_hours: assignTarget.task.estimated_man_hours
          })
        });
      }
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

  } catch (err) {
    alert('Failed to assign: ' + err.message);
  } finally {
    setAssigning(false);
  }
};

  // ── Remove assignment ─────────────────────────────────────────────────────
  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      await fetch(`${BASE}/assignments/${assignmentId}`, { method: 'DELETE', headers, credentials: 'include' });
      await fetchScheduleForDate();
      await fetchCalendarDots();
    } catch { alert('Failed to remove.'); }
  };

  // ── Update assignment status ──────────────────────────────────────────────
  const handleUpdateStatus = async (assignmentId, status) => {
    try {
      await fetch(`${BASE}/assignments/${assignmentId}`, {
        method: 'PUT', headers, credentials: 'include',
        body: JSON.stringify({ status })
      });
      await fetchScheduleForDate();
    } catch { alert('Failed to update status.'); }
  };

  // ── Dismiss task (today only) ─────────────────────────────────────────────
  const handleDismiss = async (scheduleId) => {
    if (!window.confirm('Postpone this task to tomorrow?')) return;
    try {
      await fetch(`${BASE}/schedule/dismiss`, {
        method: 'POST', headers, credentials: 'include',
        body: JSON.stringify({ schedule_id: scheduleId })
      });
      await fetchScheduleForDate();
    } catch { alert('Failed to dismiss.'); }
  };

  // ── Open verify modal ─────────────────────────────────────────────────────
  const openVerify = (task, assignment) => {
    setVerifyTarget({ task, assignment });
    setRejectReason('');
    setShowVerifyModal(true);
  };

  // ── Confirm verify ────────────────────────────────────────────────────────
  const handleVerify = async (action) => {
    setVerifying(true);
    try {
      const res = await fetch(`${BASE}/schedule/verify`, {
        method: 'POST', headers, credentials: 'include',
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

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const getDaysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDay    = (d) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();

  const dotsMap = {};
  calendarDots.forEach(r => {
    const key = String(r.assigned_date).split('T')[0];
    dotsMap[key] = r.task_count;
  });

  const calendarDaysList = () => {
    const days = [];
    for (let i = 0; i < getFirstDay(currentDate); i++) days.push(null);
    for (let d = 1; d <= getDaysInMonth(currentDate); d++) days.push(d);
    return days;
  };

  // ── Flatten + filter all tasks ────────────────────────────────────────────
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
        filterStatus === 'all'         ? true :
        filterStatus === 'assigned'    ? hasAssignment :
        filterStatus === 'unassigned'  ? !hasAssignment :
        filterStatus === 'verify'      ? task.needs_verification : true;

      return matchSearch && matchStatus;
    })
  })).filter(f => f.due_tasks.length > 0);

  // ── Stats ─────────────────────────────────────────────────────────────────
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

            {/* ── Left: Calendar ── */}
            <div className="calendar-section">
              <div className="calendar-card">
                <div className="calendar-header">
                  <button className="calendar-nav-btn"
                    onClick={() => setCurrentDate(
                      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
                    )}>
                    <FiChevronLeft size={18} />
                  </button>
                  <h3 className="calendar-month">{monthName}</h3>
                  <button className="calendar-nav-btn"
                    onClick={() => setCurrentDate(
                      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
                    )}>
                    <FiChevronRight size={18} />
                  </button>
                </div>

                <div className="weekdays">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="weekday">{d}</div>
                  ))}
                </div>

                <div className="calendar-days">
                  {calendarDaysList().map((day, i) => {
                    if (!day) return <div key={`e${i}`} className="calendar-day empty" />;

                    const ds = new Date(
                      currentDate.getFullYear(), currentDate.getMonth(), day
                    ).toISOString().split('T')[0];

                    const isSelected = toDateStr(selectedDate) === ds;
                    const isTodayDay = toDateStr(new Date()) === ds;
                    const count      = dotsMap[ds] || 0;

                    return (
                      <button
                        key={day}
                        className={`calendar-day
                          ${isSelected  ? 'selected'  : ''}
                          ${isTodayDay  ? 'today'     : ''}
                          ${count > 0   ? 'has-tasks' : ''}
                        `}
                        onClick={() => setSelectedDate(
                          new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                        )}
                      >
                        <span className="day-number">{day}</span>
                        {count > 0 && <span className="task-badge">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="stats-card">
                <div className="stat-item">
                  <span className="stat-label">Total</span>
                  <span className="stat-value">{totalTasks}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Assigned</span>
                  <span className="stat-value assigned">{assignedCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Pending</span>
                  <span className="stat-value pending">{pendingCount}</span>
                </div>
              </div>

              {/* Today badge */}
              {isToday(selectedDate) && verifyCount > 0 && (
                <div className="verify-alert">
                  <FiAlertCircle size={16} />
                  {verifyCount} task{verifyCount !== 1 ? 's' : ''} awaiting verification
                </div>
              )}

              {/* Today shortcut */}
              {!isToday(selectedDate) && (
                <button
                  className="today-shortcut-btn"
                  onClick={() => setSelectedDate(new Date())}
                >
                  <FiCalendar size={14} /> Go to Today
                </button>
              )}
            </div>

            {/* ── Right: Tasks ── */}
            <div className="tasks-section">
              {/* Date display */}
              <div className="date-display">
                <FiCalendar size={20} />
                <h2>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                  })}
                </h2>
                {isToday(selectedDate) && (
                  <span className="today-badge">Smart Schedule</span>
                )}
              </div>

              {/* Filters */}
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
                    {isToday(selectedDate) && (
                      <option value="verify">Needs Verify</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Content */}
              {loading ? (
                <div className="no-tasks">
                  <div className="task-spinner" />
                  <p>Loading tasks...</p>
                </div>
              ) : filteredFields.length === 0 ? (
                <div className="no-tasks">
                  <FiCalendar size={36} style={{ color: '#9ca3af', marginBottom: 8 }} />
                  <p>
                    {isToday(selectedDate)
                      ? 'No tasks due today — all fields on schedule!'
                      : 'No tasks found for this date'}
                  </p>
                </div>
              ) : (
                <div className="tasks-list">
                  {filteredFields.map(field => (
                    <div key={field.field_id} className="field-group">

                      {/* Field header */}
                      <div
                        className="field-group-header"
                        onClick={() => setExpandedFields(p => ({
                          ...p, [field.field_id]: !p[field.field_id]
                        }))}
                      >
                        <div className="field-group-left">
                          <FiMapPin size={15} />
                          <span className="field-group-name">{field.field_name}</span>
                          <span className="field-crop-badge">{field.crop_name}</span>
                          <span className="field-loc">{field.location}</span>
                        </div>
                        <div className="field-group-right">
                          <span className="field-task-count">
                            {field.due_tasks.length} task{field.due_tasks.length !== 1 ? 's' : ''}
                          </span>
                          {expandedFields[field.field_id]
                            ? <FiChevronUp size={16} />
                            : <FiChevronDown size={16} />
                          }
                        </div>
                      </div>

                      {/* Task rows */}
                      {expandedFields[field.field_id] && field.due_tasks.map(task => {
                        const pendingVerify = task.assignments?.find(
                          a => a.status === 'completed' && !a.verified_at
                        );
                        const hoursLeft = Math.max(
                          0, task.estimated_man_hours - (task.total_hours_assigned || 0)
                        );

                        return (
                          <div
                            key={task.crop_task_id || task.schedule_id}
                            className={`task-item ${task.needs_verification ? 'needs-verify' : ''}`}
                          >
                            <div className="task-info">
                              {/* Title row */}
                              <div className="task-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  {isToday(selectedDate) && (
                                    <span
                                      className="prio-dot"
                                      style={{
                                        background: task.needs_verification
                                          ? '#8b5cf6'
                                          : prioColor(task.days_overdue || 0)
                                      }}
                                    />
                                  )}
                                  <h4 className="task-title">{task.task_name}</h4>
                                  {isToday(selectedDate) && (
                                    task.needs_verification ? (
                                      <span className="verify-tag">⏳ Needs Verification</span>
                                    ) : (
                                      <span
                                        className="prio-tag"
                                        style={{ background: prioColor(task.days_overdue || 0) }}
                                      >
                                        {prioLabel(task.days_overdue || 0)}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>

                              <p className="task-description">{task.description}</p>

                              {/* Meta pills */}
                              <div className="task-meta-row">
                                <span className="task-meta-pill">
                                  <FiClock size={12} /> {task.estimated_man_hours} hrs
                                </span>
                                <span className="task-meta-pill">
                                  <FiMapPin size={12} /> {field.location}
                                </span>
                                <span className="task-meta-pill">
                                  Every {task.frequency_days} days
                                </span>
                                {isToday(selectedDate) && task.last_done_date && (
                                  <span className="task-meta-pill">
                                    Last: {new Date(task.last_done_date)
                                      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                {isToday(selectedDate) && !task.last_done_date && (
                                  <span className="task-meta-pill never-done">Never done</span>
                                )}
                              </div>

                              {/* Hours progress bar (today only) */}
                              {isToday(selectedDate) && (
                                <div className="hours-bar">
                                  <div className="hours-track">
                                    <div
                                      className="hours-fill"
                                      style={{
                                        width: `${Math.min(100,
                                          ((task.total_hours_assigned || 0) /
                                           task.estimated_man_hours) * 100
                                        )}%`,
                                        background: task.is_fully_assigned ? '#10b981' : '#3b82f6'
                                      }}
                                    />
                                  </div>
                                  <span className="hours-label">
                                    {task.total_hours_assigned || 0}/{task.estimated_man_hours}h assigned
                                    {hoursLeft > 0 && ` · ${hoursLeft}h still needed`}
                                  </span>
                                </div>
                              )}

                              {/* Assigned workers */}
                              {task.assignments?.length > 0 && (
                                <div className="assignment-list">
                                  {task.assignments.map(a => (
                                    <div key={a.assignment_id} className={`assignment-chip ${
                                      a.status === 'completed' ? 'completed-chip' : ''
                                    }`}>
                                      <FiUser size={12} />
                                      <span>{a.worker_name}</span>
                                      <span
                                        className="assignment-status"
                                        style={{ background: statusColor(a.status) }}
                                      >
                                        {a.status === 'completed' && !a.verified_at
                                          ? '✓ Done (unverified)'
                                          : a.status}
                                      </span>
                                      {/* Status dropdown (non-today dates) */}
                                      {!isToday(selectedDate) && (
                                        <select
                                          className="status-quick-select"
                                          value={a.status}
                                          onChange={e =>
                                            handleUpdateStatus(a.assignment_id, e.target.value)
                                          }
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="in_progress">In Progress</option>
                                          <option value="completed">Completed</option>
                                          <option value="rejected">Rejected</option>
                                        </select>
                                      )}
                                      <button
                                        className="remove-btn"
                                        onClick={() => handleRemoveAssignment(a.assignment_id)}
                                        title="Remove"
                                      >
                                        <FiX size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="task-assignment">
                              {/* Verify button */}
                              {pendingVerify && (
                                <button
                                  className="verify-btn"
                                  onClick={() => openVerify(task, pendingVerify)}
                                >
                                  <FiThumbsUp size={13} /> Verify
                                </button>
                              )}

                              {/* Assign button */}
                              {!task.needs_verification && (
                                (task.assignments?.length || 0) === 0 ? (
                                  <div className="unassigned"><span>Unassigned</span></div>
                                ) : null
                              )}
                              {!task.needs_verification && !task.is_fully_assigned && (
                                <button
                                  className="assign-btn"
                                  onClick={() => openAssign(task, field)}
                                >
                                  {(task.assignments?.length || 0) > 0
                                    ? '+ Add Worker'
                                    : '→ Assign'}
                                </button>
                              )}
                              {task.is_fully_assigned && !task.needs_verification && (
                                <span className="fully-assigned-tag">✓ Fully Assigned</span>
                              )}

                              {/* Dismiss (today, unassigned only) */}
                              {isToday(selectedDate) &&
                               !task.needs_verification &&
                               (task.assignments?.length || 0) === 0 &&
                               task.schedule_id && (
                                <button
                                  className="dismiss-btn"
                                  onClick={() => handleDismiss(task.schedule_id)}
                                  title="Postpone to tomorrow"
                                >
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

      {/* ── Assign Worker Modal ── */}
      {showAssignModal && assignTarget && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Assign Worker</h2>
                <p>
                  {assignTarget.task.task_name} — {assignTarget.field.field_name}
                  {isToday(selectedDate) && assignTarget.task.estimated_man_hours && (
                    <> · {assignTarget.task.estimated_man_hours - (assignTarget.task.total_hours_assigned || 0)}h needed</>
                  )}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>
                <FiX size={22} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-subtitle">
                {isToday(selectedDate)
                  ? 'Hours auto-capped to each worker\'s remaining daily capacity'
                  : `Select a worker for ${selectedDate.toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric'
                    })}`
                }
              </p>
                <div className="deadline-section">
                  <label>Worker Capacity Planning</label>

                  <input
                    type="number"
                    min="1"
                    value={workerCapacity}
                    onChange={(e) => setWorkerCapacity(Number(e.target.value))}
                    className="deadline-input"
                    placeholder="Hours per worker (e.g. 5)"
                  />

                  {assignTarget?.task?.estimated_man_hours && workerCapacity > 0 && (
                    <div className="workers-needed-hint">
                      {(() => {
                        const totalHours = assignTarget.task.estimated_man_hours;
                        const capacity = workerCapacity;

                        const neededWorkers = Math.ceil(totalHours / capacity);
                        const perWorker = Math.min(totalHours, capacity);

                        return (
                          <span className="workers-calc">
                            Task requires <b>{totalHours}h</b> total → 
                            ≈ <b>{neededWorkers}</b> worker{neededWorkers !== 1 ? 's' : ''} needed 
                            (at {capacity}h per worker)
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
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
                        key={w.worker_id}
                        className={`worker-option ${
                          selectedWorkers.includes(w.user_id) ? 'selected' : ''
                        }`}
                        onClick={() => {
                          setSelectedWorkers(prev =>
                            prev.includes(w.user_id)
                              ? prev.filter(id => id !== w.user_id)
                              : [...prev, w.user_id]
                          );
                        }}
                      >
                        <div className="worker-avatar">
                          {w.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="worker-info">
                          <h4>{w.full_name}</h4>
                          <p>
                            {w.skills?.join(', ') || 'No skills listed'}
                            {w.hours_remaining !== undefined && (
                              <span style={{
                                color: w.hours_remaining > 0 ? '#10b981' : '#ef4444',
                                marginLeft: 6
                              }}>
                                · {w.hours_remaining}h remaining
                              </span>
                            )}
                          </p>
                          {w.hours_remaining !== undefined && (
                            <>
                              <div className="worker-hours-bar">
                                <div
                                  className="worker-hours-fill"
                                  style={{
                                    width: `${((w.hours_used || 0) / w.max_daily_hours) * 100}%`
                                  }}
                                />
                              </div>
                              <span className="worker-hours-text">
                                {w.hours_remaining}h of {w.max_daily_hours}h available
                              </span>
                            </>
                          )}
                        </div>
                        <div className={`checkbox ${
                          selectedWorkers.includes(w.user_id) ? 'checked' : ''
                        }`}>
                          {selectedWorkers.includes(w.user_id) && <FiCheck size={15} />}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button
                className="btn-assign"
                onClick={handleConfirmAssign}
                disabled={selectedWorkers.length === 0 || assigning}
              >
                <FiCheck size={16} />
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Verify Modal ── */}
      {showVerifyModal && verifyTarget && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Verify Task Completion</h2>
                <p>
                  {verifyTarget.task.task_name} — completed by{' '}
                  {verifyTarget.assignment.worker_name}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowVerifyModal(false)}>
                <FiX size={22} />
              </button>
            </div>

            <div className="modal-body">
              <div className="verify-info">
                <div className="verify-row">
                  <span>Worker</span>
                  <strong>{verifyTarget.assignment.worker_name}</strong>
                </div>
                <div className="verify-row">
                  <span>Task</span>
                  <strong>{verifyTarget.task.task_name}</strong>
                </div>
                <div className="verify-row">
                  <span>Hours worked</span>
                  <strong>{verifyTarget.assignment.expected_hours}h</strong>
                </div>
                <div className="verify-row">
                  <span>Next due after approval</span>
                  <strong>
                    In {verifyTarget.task.frequency_days} days
                  </strong>
                </div>
              </div>

              <p className="verify-question">
                Did the worker complete this task satisfactorily?
              </p>

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
              <button className="btn-cancel" onClick={() => setShowVerifyModal(false)}>
                Cancel
              </button>
              <button
                className="btn-reject"
                onClick={() => handleVerify('reject')}
                disabled={verifying || !rejectReason.trim()}
              >
                <FiThumbsDown size={14} /> Reject
              </button>
              <button
                className="btn-approve"
                onClick={() => handleVerify('approve')}
                disabled={verifying}
              >
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