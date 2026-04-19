import React, { useState, useEffect } from 'react';
import SideNav from '../../components/SideNav';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  FiCalendar, FiCheckCircle, FiClock, FiUser,
  FiAlertCircle, FiChevronRight, FiMapPin,
  FiTrendingUp, FiThumbsUp, FiThumbsDown,
  FiSkipForward, FiRefreshCw, FiX, FiCheck,
  FiUsers, FiArrowRight, FiTrash2, FiPlay, FiSquare
} from 'react-icons/fi';
import './SmartSchedule.css';

const BASE = 'http://localhost:8081/api';

export default function SmartSchedule() {
  const [activeTab,      setActiveTab]      = useState('tasks');
  const [todayFields,    setTodayFields]    = useState([]);
  const [upcoming,       setUpcoming]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeView,     setActiveView]     = useState('today');

  // Calendar
  const [selectedDate,   setSelectedDate]   = useState(new Date());
  const [tasksForDate,   setTasksForDate]   = useState([]);

  // Selected task for detail panel
  const [selectedTask,   setSelectedTask]   = useState(null);
  const [selectedField,  setSelectedField]  = useState(null);

  // Workers panel
  const [availWorkers,   setAvailWorkers]   = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [assigning,      setAssigning]      = useState(false);

  // Verify panel
  const [verifyMode,     setVerifyMode]     = useState(false);
  const [verifyAssign,   setVerifyAssign]   = useState(null);
  const [rejectReason,   setRejectReason]   = useState('');
  const [verifying,      setVerifying]      = useState(false);
  const [expectedHours, setExpectedHours] = useState(2); // default per worker
  const [deadlineTime,   setDeadlineTime]   = useState('');

  const headers = {
    'Content-Type': 'application/json'
  };
  const getLocalDate = () => {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
};

const today = getLocalDate();
  const getToken = () => localStorage.getItem('token');
  const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
});


  useEffect(() => { fetchAll(); fetchTasksForDate(selectedDate); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, uRes] = await Promise.all([
  fetch(`${BASE}/schedule/today`, {
    headers: getHeaders(),
    credentials: 'include'
  }),
  fetch(`${BASE}/schedule/upcoming?days=7`, {
    headers: getHeaders(),
    credentials: 'include'
  })
]);
      const tData = await tRes.json();
      const uData = await uRes.json();
      setTodayFields(Array.isArray(tData) ? tData : []);
      setUpcoming(Array.isArray(uData) ? uData : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchTasksForDate = async (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    try {
      const res = await fetch(`${BASE}/schedule/by-date?date=${dateStr}`, {
        headers: getHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      setTasksForDate(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setTasksForDate([]);
    }
  };

  // Open a task in the right panel
  const openTask = async (task, field) => {
    setSelectedTask(task);
    setSelectedField(field);
    setSelectedWorkers([]);
    setVerifyMode(false);
    setVerifyAssign(null);
    setRejectReason('');

    // If needs verify, pre-select the pending assignment
    const pending = task.assignments?.find(
  a => a.assignment_id === task.pending_assignment_id
);
    if (pending) {
      setVerifyAssign(pending);
      setVerifyMode(true);
    }

    // Load workers for assignment
    if (!task.is_fully_assigned && !task.needs_verification) {
      await loadWorkers(field.field_id, task.task_id);
    }
  };

  const loadWorkers = async (fieldId, taskId) => {
    setLoadingWorkers(true);
    try {
      const res = await fetch(
  `${BASE}/schedule/workers-available?date=${today}&field_id=${fieldId}&task_id=${taskId}`,
  {
    headers: getHeaders(),
    credentials: 'include'
  }
);
      const data = await res.json();
      setAvailWorkers(Array.isArray(data) ? data : []);
    } catch { setAvailWorkers([]); }
    finally { setLoadingWorkers(false); }
  };

  // Assign worker
const handleAssign = async () => {
  if (!selectedWorkers.length || !selectedTask) return;

  setAssigning(true);
  try {
    const results = await Promise.all(
      selectedWorkers.map(workerId =>
        fetch(`${BASE}/schedule/assign`, {
          method: 'POST',
          headers: getHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            schedule_id: selectedTask.schedule_id,
            worker_user_id: Number(workerId),
            date: today,
            expected_hours_per_worker: expectedHours,
            deadline_time: deadlineTime || null
          })
        }).then(r => r.json())
      )
    );

    await fetchAll();
    await fetchTasksForDate(selectedDate);
    setSelectedWorkers([]);
    setSelectedTask(null);

  } catch (err) {
    alert(err.message);
  } finally {
    setAssigning(false);
  }
};
const workersNeeded =
  selectedTask
    ? Math.ceil(selectedTask.estimated_man_hours / (expectedHours || 1))
    : 0;

const assignedWorkers = selectedTask?.assignments?.length || 0;

const remainingWorkers = Math.max(0, workersNeeded - assignedWorkers);

  // Verify / Reject
  const handleVerify = async (action) => {
    if (!selectedTask?.schedule_id || !verifyAssign?.assignment_id) {
    alert("Missing verification data");
    return;
  }
    setVerifying(true);
    try {
      const res = await fetch(`${BASE}/schedule/verify`, {
        method: 'POST', headers: getHeaders(), credentials: 'include',
        body: JSON.stringify({
          task_id: selectedTask.task_id,
field_id: selectedTask.field_id,
          assignment_id: verifyAssign.assignment_id,
          action,
          reject_reason: rejectReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchAll();
      setSelectedTask(null);
      setSelectedField(null);
      setVerifyMode(false);
    } catch (err) { alert(err.message); }
    finally { setVerifying(false); }
  };

  // Dismiss
  const handleDismiss = async () => {
    if (!window.confirm('Postpone this task to tomorrow?')) return;
    try {
      await fetch(`${BASE}/schedule/pause`, {
        method: 'POST', headers: getHeaders(), credentials: 'include',
        body: JSON.stringify({ schedule_id: selectedTask.schedule_id })
      });
      await fetchAll();
      await fetchTasksForDate(selectedDate);
      setSelectedTask(null);
    } catch { alert('Failed.'); }
  };

  // Unassign
  const handleUnassign = async (assignmentId) => {
    if (!confirm('Unassign this worker?')) return;
    try {
      await fetch(`${BASE}/schedule/unassign`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ assignment_id: assignmentId })
      });
      await fetchTasksForDate(selectedDate);
    } catch (err) {
      alert('Failed to unassign');
    }
  };

  // Update status
  const handleUpdateStatus = async (assignmentId, status) => {
    try {
      await fetch(`${BASE}/schedule/update-status`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ assignment_id: assignmentId, status })
      });
      await fetchTasksForDate(selectedDate);
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Stats
  const allTasks      = todayFields.flatMap(f => f.due_tasks);
  const totalDue      = allTasks.length;
  const needsVerify   = allTasks.filter(t => t.needs_verification).length;
  const fullyAssigned = allTasks.filter(t => t.is_fully_assigned).length;
  const overdue       = allTasks.filter(t => t.days_overdue > 0 && !t.needs_verification).length;

  const urgencyColor = (task) => {
    if (task.needs_verification) return '#8b5cf6';
    if (task.days_overdue > 7)   return '#ef4444';
    if (task.days_overdue > 0)   return '#f59e0b';
    return '#10b981';
  };

  const urgencyLabel = (task) => {
    if (task.needs_verification) return 'Verify';
    if (task.days_overdue > 7)   return `${task.days_overdue}d overdue`;
    if (task.days_overdue > 0)   return `${task.days_overdue}d late`;
    return 'Today';
  };

  return (
    <div className="ss-layout">
      <SideNav role="supervisor" activeTab={activeTab}
        setActiveTab={setActiveTab} userName="Supervisor" userRole="Supervisor" />

      <div className="ss-main">
        {/* Header */}
        <header className="ss-header">
          <div>
            <h1 className="ss-title">Smart Schedule</h1>
            <p className="ss-subtitle">
              {new Date().toLocaleDateString('en-US',{
                weekday:'long', month:'long', day:'numeric', year:'numeric'
              })}
            </p>
          </div>
          <button className="ss-refresh-btn" onClick={fetchAll}>
            <FiRefreshCw size={15}/> Refresh
          </button>
        </header>

        <div className="ss-body">
          {/* Stats row */}
          <div className="ss-stats">
            {[
              { icon: <FiCalendar size={18}/>,    label: 'Due Today',      val: totalDue,      cls: 'due'    },
              { icon: <FiUser size={18}/>,         label: 'Assigned',       val: fullyAssigned, cls: 'ok'     },
              { icon: <FiCheckCircle size={18}/>,  label: 'Needs Verify',   val: needsVerify,   cls: 'verify' },
              { icon: <FiAlertCircle size={18}/>,  label: 'Overdue',        val: overdue,       cls: 'over'   },
            ].map(s => (
              <div key={s.label} className="ss-stat">
                <div className={`ss-stat-ic ${s.cls}`}>{s.icon}</div>
                <div>
                  <p className="ss-stat-n">{s.val}</p>
                  <p className="ss-stat-l">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* View toggle */}
          <div className="ss-calendar-container">
            <Calendar
              onChange={(date) => {
                setSelectedDate(date);
                fetchTasksForDate(date);
                setSelectedTask(null);
              }}
              value={selectedDate}
            />
          </div>

          {/* Main content — two-panel when task selected */}
          <div className={`ss-content ${selectedTask ? 'split' : ''}`}>

            {/* LEFT: task list */}
            <div className="ss-list-panel">
              {loading ? (
                <div className="ss-empty"><div className="ss-spin"/><p>Loading...</p></div>
              ) : tasksForDate.length === 0 ? (
                <div className="ss-empty">
                  <FiCheckCircle size={40}/>
                  <h3>No tasks</h3>
                  <p>No tasks for {selectedDate.toDateString()}.</p>
                </div>
              ) : (
                tasksForDate.map(field => (
                  <div key={field.field_id} className="ss-field-section">
                    {/* Field label */}
                    <div className="ss-field-label">
                      <FiMapPin size={13}/>
                      <span>{field.field_name}</span>
                      <span className="ss-crop-pill">{field.crop_name}</span>
                      <span className="ss-loc-text">{field.location}</span>
                    </div>

                    {/* Task cards */}
                    <div className="ss-task-cards">
                      {field.due_tasks.map(task => {
                        const isSelected = selectedTask?.schedule_id === task.schedule_id;
                        const hoursLeft  = Math.max(0,
                          task.estimated_man_hours - task.total_hours_assigned
                        );
                        const pct = Math.min(100,
                          (task.total_hours_assigned / task.estimated_man_hours) * 100
                        );

                        return (
                          <div
                            key={task.schedule_id}
                            className={`ss-task-card ${isSelected ? 'selected' : ''} ${task.needs_verification ? 'verify-card' : ''}`}
                            onClick={() => openTask(task, field)}
                          >
                            {/* Left accent */}
                            <div className="ss-card-accent"
                              style={{ background: urgencyColor(task) }}/>

                            <div className="ss-card-body">
                              <div className="ss-card-top">
                                <span className="ss-card-name">{task.task_name}</span>
                                <span className="ss-card-badge"
                                  style={{ background: urgencyColor(task) + '22',
                                           color: urgencyColor(task) }}>
                                  {urgencyLabel(task)}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="ss-card-bar">
                                <div className="ss-card-bar-fill"
                                  style={{ width: `${pct}%`,
                                           background: task.is_fully_assigned ? '#10b981' : '#3b82f6' }}/>
                              </div>

                              <div className="ss-card-foot">
                                <span className="ss-card-meta">
                                  <FiClock size={11}/>
                                  {task.total_hours_assigned}/{task.estimated_man_hours}h
                                  {hoursLeft > 0 && ` · ${hoursLeft}h needed`}
                                </span>
                                {task.assignments?.length > 0 && (
                                  <span className="ss-card-workers">
                                    <FiUsers size={11}/> {task.assignments.length}
                                  </span>
                                )}
                                <FiChevronRight size={14} className="ss-card-arrow"/>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* RIGHT: detail panel */}
            {selectedTask && selectedField && (
              <div className="ss-detail-panel">
                <div className="ss-detail-head">
                  <div>
                    <h2>{selectedTask.task_name}</h2>
                    <p>{selectedField.field_name} · {selectedField.crop_name}</p>
                  </div>
                  <button className="ss-close-btn"
                    onClick={() => { setSelectedTask(null); setSelectedField(null); }}>
                    <FiX size={18}/>
                  </button>
                </div>

                {/* Task info */}
                <div className="ss-detail-info">
                  <div className="ss-detail-row">
                    <span>Hours needed</span>
                    <strong>{selectedTask.estimated_man_hours}h</strong>
                  </div>
                  <div className="ss-detail-row">
                    <span>Assigned so far</span>
                    <strong style={{color: selectedTask.is_fully_assigned ? '#10b981' : '#f59e0b'}}>
                      {selectedTask.total_hours_assigned}h
                    </strong>
                  </div>
                  <div className="ss-detail-row">
                    <span>Frequency</span>
                    <strong>Every {selectedTask.frequency_days} days</strong>
                  </div>
                  {selectedTask.last_done_date && (
                    <div className="ss-detail-row">
                      <span>Last done</span>
                      <strong>
                        {new Date(selectedTask.last_done_date)
                          .toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Currently assigned workers */}
                {selectedTask.assignments?.length > 0 && (
                  <div className="ss-detail-section">
                    <p className="ss-section-label">Assigned Workers</p>
                    <div className="ss-worker-chips">
                      {selectedTask.assignments.map(a => (
                        <div key={a.assignment_id} className={`ss-wchip ${a.status}`}>
                          <div className="ss-wchip-av">
                            {a.worker_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="ss-wchip-name">{a.worker_name}</p>
                            <p className="ss-wchip-hours">{a.expected_hours}h</p>
                          </div>
                          <div className="ss-wchip-actions">
                            {a.status === 'pending' && (
                              <button onClick={() => handleUpdateStatus(a.assignment_id, 'in_progress')} title="Start">
                                <FiPlay size={12}/>
                              </button>
                            )}
                            {a.status === 'in_progress' && (
                              <button onClick={() => handleUpdateStatus(a.assignment_id, 'completed')} title="Complete">
                                <FiSquare size={12}/>
                              </button>
                            )}
                            <button onClick={() => handleUnassign(a.assignment_id)} title="Unassign">
                              <FiTrash2 size={12}/>
                            </button>
                          </div>
                          <span className="ss-wchip-status"
                            style={{
                              background:
                                a.status === 'completed' && !a.verified_at ? '#8b5cf6' :
                                a.status === 'completed'   ? '#10b981' :
                                a.status === 'in_progress' ? '#3b82f6' : '#f59e0b'
                            }}>
                            {a.status === 'completed' && !a.verified_at ? '✓ Done' :
                             a.status === 'completed' ? '✓ Verified' :
                             a.status === 'in_progress' ? 'Working' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* VERIFY section */}
                {verifyMode && verifyAssign && (
                  <div className="ss-verify-section">
                    <p className="ss-section-label">Verify Completion</p>
                    <div className="ss-verify-info">
                      <p><strong>{verifyAssign.worker_name}</strong> marked this task complete.</p>
                      <p style={{color:'#64748b', fontSize:'0.8125rem', marginTop:4}}>
                        {verifyAssign.expected_hours}h logged
                      </p>
                    </div>
                    <p className="ss-verify-q">Did they complete it satisfactorily?</p>
                    <textarea
                      className="ss-reject-ta"
                      placeholder="Rejection reason (required if rejecting)..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      rows={3}
                    />
                    <div className="ss-verify-actions">
                      <button
                        className="ss-btn-reject"
                        onClick={() => handleVerify('reject')}
                        disabled={verifying || !rejectReason.trim()}>
                        <FiThumbsDown size={14}/> Reject
                      </button>
                      <button
                        className="ss-btn-approve"
                        onClick={() => handleVerify('approve')}
                        disabled={verifying}>
                        <FiThumbsUp size={14}/>
                        {verifying ? 'Saving...' : 'Approve'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ASSIGN section */}
                {!selectedTask.needs_verification && !selectedTask.is_fully_assigned && (
                  <div className="ss-assign-section">
                    <p className="ss-section-label">
                      Assign a Worker</p>
                      <div className="ss-assignment-meta">
    
    <div className="ss-hours-input">
  <label>Expected hours per worker</label>
  <input
    type="number"
    min="1"
    step="1"
    value={expectedHours}
    onChange={(e) => {
      const val = parseInt(e.target.value, 10);
      setExpectedHours(isNaN(val) ? 1 : val);
    }}
  />
</div>

    <div className="ss-hours-input">
  <label>Deadline Time</label>
  <input
    type="time"
    value={deadlineTime}
    onChange={(e) => setDeadlineTime(e.target.value)}
  />
</div>

    <div className="ss-assignment-stats">
      <div className="ss-detail-row">
        <span>Workers needed</span>
        <strong>
          {workersNeeded} worker{workersNeeded !== 1 ? 's' : ''}
        </strong>
      </div>

      <div className="ss-detail-row">
        <span>Already assigned</span>
        <strong>{assignedWorkers}</strong>
      </div>

      <div className="ss-detail-row">
        <span>Remaining workers</span>
        <strong style={{ color: remainingWorkers > 0 ? '#f59e0b' : '#10b981' }}>
          {remainingWorkers}
        </strong>
      </div>
    </div></div>
                          
                          
                          

                    {loadingWorkers ? (
                      <div className="ss-workers-loading">
                        <div className="ss-mini-spin"/> Loading workers...
                      </div>
                    ) : availWorkers.length === 0 ? (
                      <div className="ss-no-workers">
                        <FiAlertCircle size={22}/>
                        <p>No available workers with remaining hours today</p>
                      </div>
                    ) : (
                      <div className="ss-worker-list">
                        {[...availWorkers]
                          .sort((a,b) => b.hours_remaining - a.hours_remaining)
                          .map(w => (
                            <div
                              key={w.user_id}
                              className={`ss-worker-row ${selectedWorkers.includes(w.user_id) ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedWorkers(prev =>
                                  prev.includes(w.user_id)
                                    ? prev.filter(id => id !== w.user_id)
                                    : [...prev, w.user_id]
                                );
                              }}
                            >
                              <div className="ss-worker-av">
                                {w.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="ss-worker-inf">
                                <p className="ss-worker-nm">{w.full_name}</p>
                                <p className="ss-worker-sk">
                                  {w.skills?.slice(0,2).join(', ') || 'No skills'}
                                </p>
                                <div className="ss-worker-bar">
                                  <div className="ss-worker-bar-fill"
                                    style={{ width:`${((w.hours_used||0)/w.max_daily_hours)*100}%` }}/>
                                </div>
                                <p className="ss-worker-hrs">
                                  {w.hours_remaining}h of {w.max_daily_hours}h remaining
                                </p>
                              </div>
                              <div className={`ss-worker-radio ${selectedWorkers.includes(w.user_id) ? 'on' : ''}`}>
                                {selectedWorkers.includes(w.user_id) && <FiCheck size={12}/>}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {selectedWorkers.length > 0 && (
                      <button
                        className="ss-assign-confirm-btn"
                        onClick={handleAssign}
                        disabled={assigning}
                      >
                        <FiArrowRight size={15}/>
                        {assigning ? 'Assigning...' : `Confirm Assignment (${selectedWorkers.length})`}
                      </button>
                    )}
                  </div>
                )}

                {/* Fully assigned */}
                {selectedTask.is_fully_assigned && !selectedTask.needs_verification && (
                  <div className="ss-fully-done">
                    <FiCheckCircle size={18}/>
                    <span>Fully assigned — {selectedTask.estimated_man_hours}h covered</span>
                  </div>
                )}

                {/* Dismiss — only for unassigned tasks */}
                {!selectedTask.needs_verification &&
                 (selectedTask.assignments?.length || 0) === 0 && (
                  <button className="ss-dismiss-btn" onClick={handleDismiss}>
                    <FiSkipForward size={14}/> Postpone to Tomorrow
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}