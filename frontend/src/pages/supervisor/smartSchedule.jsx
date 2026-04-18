import React, { useState, useEffect } from 'react';
import SideNav from '../../components/SideNav';
import {
  FiCalendar, FiCheckCircle, FiClock, FiUser,
  FiAlertCircle, FiChevronRight, FiMapPin,
  FiTrendingUp, FiThumbsUp, FiThumbsDown,
  FiSkipForward, FiRefreshCw, FiX, FiCheck,
  FiUsers, FiArrowRight
} from 'react-icons/fi';
import './SmartSchedule.css';

const BASE = 'http://localhost:8081/api';

export default function SmartSchedule() {
  const [activeTab,      setActiveTab]      = useState('tasks');
  const [todayFields,    setTodayFields]    = useState([]);
  const [upcoming,       setUpcoming]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeView,     setActiveView]     = useState('today');

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

  const headers = {
    'Content-Type': 'application/json'
  };
  const today   = new Date().toISOString().split('T')[0];
  const getToken = () => localStorage.getItem('token');
  const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
});


  useEffect(() => { fetchAll(); }, []);

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

  // Open a task in the right panel
  const openTask = async (task, field) => {
    setSelectedTask(task);
    setSelectedField(field);
    setSelectedWorkers([]);
    setVerifyMode(false);
    setVerifyAssign(null);
    setRejectReason('');

    // If needs verify, pre-select the pending assignment
    const pending = task.assignments?.find(a => a.status === 'completed' && !a.verified_at);
    if (pending) {
      setVerifyAssign(pending);
      setVerifyMode(true);
    }

    // Load workers for assignment
    if (!task.is_fully_assigned && !task.needs_verification) {
      await loadWorkers(field.field_id);
    }
  };

  const loadWorkers = async (fieldId) => {
    setLoadingWorkers(true);
    try {
      const res = await fetch(
  `${BASE}/schedule/workers-available?date=${today}&field_id=${fieldId}&task_id=${selectedTask.task_id}`,
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
            date: today
          })
        }).then(r => r.json())
      )
    );

    await fetchAll();
    setSelectedWorkers([]);
    setSelectedTask(null);

  } catch (err) {
    alert(err.message);
  } finally {
    setAssigning(false);
  }
};

  // Verify / Reject
  const handleVerify = async (action) => {
    if (!selectedTask || !verifyAssign) return;
    setVerifying(true);
    try {
      const res = await fetch(`${BASE}/schedule/verify`, {
        method: 'POST', headers: getHeaders(), credentials: 'include',
        body: JSON.stringify({
          schedule_id:   selectedTask.schedule_id,
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
      await fetch(`${BASE}/schedule/dismiss`, {
        method: 'POST', headers: getHeaders(), credentials: 'include',
        body: JSON.stringify({ schedule_id: selectedTask.schedule_id })
      });
      await fetchAll();
      setSelectedTask(null);
    } catch { alert('Failed.'); }
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
          <div className="ss-toggle-row">
            <button className={`ss-tog ${activeView==='today'?'on':''}`}
              onClick={() => { setActiveView('today'); setSelectedTask(null); }}>
              <FiCalendar size={14}/> Today
            </button>
            <button className={`ss-tog ${activeView==='upcoming'?'on':''}`}
              onClick={() => { setActiveView('upcoming'); setSelectedTask(null); }}>
              <FiTrendingUp size={14}/> Next 7 Days
            </button>
          </div>

          {/* Main content — two-panel when task selected */}
          <div className={`ss-content ${selectedTask ? 'split' : ''}`}>

            {/* LEFT: task list */}
            <div className="ss-list-panel">
              {loading ? (
                <div className="ss-empty"><div className="ss-spin"/><p>Loading...</p></div>
              ) : activeView === 'today' ? (
                todayFields.length === 0 ? (
                  <div className="ss-empty">
                    <FiCheckCircle size={40}/>
                    <h3>All clear!</h3>
                    <p>No tasks due today.</p>
                  </div>
                ) : (
                  todayFields.map(field => (
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
                )
              ) : (
                /* Upcoming */
                upcoming.length === 0 ? (
                  <div className="ss-empty">
                    <FiCalendar size={36}/><p>No tasks in next 7 days</p>
                  </div>
                ) : (
                  <div className="ss-upcoming-list">
                    {upcoming.map(row => (
                      <div key={row.schedule_id} className="ss-up-row">
                        <div className="ss-up-date">
                          <strong>
                            {new Date(row.next_due_date)
                              .toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                          </strong>
                          <span>
                            {row.days_until_due === 0 ? 'Today' :
                             row.days_until_due === 1 ? 'Tomorrow' :
                             `In ${row.days_until_due}d`}
                          </span>
                        </div>
                        <div className="ss-up-info">
                          <strong>{row.task_name}</strong>
                          <p>{row.field_name} · {row.crop_name}</p>
                        </div>
                        <div className="ss-up-meta">
                          <span><FiClock size={11}/> {row.estimated_man_hours}h</span>
                          <span>Every {row.frequency_days}d</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
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
                      Assign a Worker
                      <span className="ss-hours-needed">
                        {Math.max(0, selectedTask.estimated_man_hours - selectedTask.total_hours_assigned)}h still needed
                      </span>
                    </p>

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