import React, { useState, useEffect, useCallback } from 'react';
import './supervisorDashboard.css';
import {
  FiPlus, FiClock, FiMapPin, FiUser,
  FiCheck, FiX, FiAlertCircle, FiSkipForward,
  FiThumbsUp, FiThumbsDown, FiUsers, FiCalendar,
  FiCheckCircle, FiChevronDown, FiChevronUp
} from 'react-icons/fi';

const BASE = 'http://localhost:8081/api';

const SupervisorDashboard = ({ logo }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // ── Data ──────────────────────────────────────────────────────────────────
  const [fieldsWithTasks, setFieldsWithTasks] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [viewMode, setViewMode]               = useState('today');    // 'today' | 'tomorrow'
  const [expandedFields, setExpandedFields]   = useState({});

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [workers, setWorkers]       = useState([]);
  const [attendance, setAttendance] = useState([]);

  // ── Assign modal ──────────────────────────────────────────────────────────
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget]       = useState(null);
  const [availWorkers, setAvailWorkers]       = useState([]);
  const [selectedWorker, setSelectedWorker]   = useState('');
  const [assigning, setAssigning]             = useState(false);

  // ── Verify modal ──────────────────────────────────────────────────────────
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyTarget, setVerifyTarget]       = useState(null);
  const [rejectReason, setRejectReason]       = useState('');
  const [verifying, setVerifying]             = useState(false);

  // ── Add worker modal ──────────────────────────────────────────────────────
  const [showAddWorker, setShowAddWorker] = useState(false);

  const token   = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const date = viewMode === 'today' ? today : tomorrow;
      const url  = viewMode === 'today'
        ? `${BASE}/schedule/today`
        : `${BASE}/assignments?date=${date}`;

      const res  = await fetch(url, { headers });
      const data = await res.json();
      const fields = Array.isArray(data) ? data : [];

      if (viewMode === 'today') {
        setFieldsWithTasks(fields);
        const exp = {};
        fields.forEach(f => { exp[f.field_id] = true; });
        setExpandedFields(exp);
      } else {
        const normalised = fields.map(f => ({
          ...f,
          due_tasks: (f.crop_tasks || []).map(ct => ({
            ...ct,
            schedule_id:          null,
            needs_verification:   false,
            is_fully_assigned:    (ct.assignments?.length || 0) > 0,
            total_hours_assigned: (ct.assignments || []).reduce((s, a) => s + (a.expected_hours || 0), 0),
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
      console.error('fetchTasks error:', err);
      setFieldsWithTasks([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  const fetchWorkers = useCallback(async () => {
    try {
      const res  = await fetch(`${BASE}/workers`, { headers });
      const data = await res.json();
      setWorkers(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      const res  = await fetch(`${BASE}/attendance/today`, { headers });
      const data = await res.json();
      setAttendance(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { fetchWorkers(); fetchAttendance(); }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const allTasks      = fieldsWithTasks.flatMap(f => f.due_tasks || []);
  const totalTasks    = allTasks.length;
  const assignedCount = allTasks.filter(t => (t.assignments?.length || 0) > 0 || t.is_fully_assigned).length;
  const verifyCount   = allTasks.filter(t => t.needs_verification).length;
  const overdueCount  = allTasks.filter(t => (t.days_overdue || 0) > 0 && !t.needs_verification).length;

  // ── Assign ────────────────────────────────────────────────────────────────
  const openAssign = async (task, field) => {
    setAssignTarget({ task, field });
    setSelectedWorker('');
    try {
      const url = viewMode === 'today'
        ? `${BASE}/schedule/workers-available?date=${today}&field_id=${field.field_id}`
        : `${BASE}/assignments/workers?date=${tomorrow}&field_id=${field.field_id}`;
      const res  = await fetch(url, { headers });
      const data = await res.json();
      setAvailWorkers(Array.isArray(data) ? data : []);
    } catch { setAvailWorkers([]); }
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedWorker) return;
    setAssigning(true);
    try {
      let res;
      if (viewMode === 'today' && assignTarget.task.schedule_id) {
        res = await fetch(`${BASE}/schedule/assign`, {
          method: 'POST', headers,
          body: JSON.stringify({
            schedule_id:    assignTarget.task.schedule_id,
            worker_user_id: Number(selectedWorker),
            date:           today
          })
        });
      } else {
        res = await fetch(`${BASE}/assignments`, {
          method: 'POST', headers,
          body: JSON.stringify({
            task_id:        assignTarget.task.task_id || assignTarget.task.crop_task_id,
            field_id:       assignTarget.field.field_id,
            worker_user_id: Number(selectedWorker),
            assigned_date:  viewMode === 'today' ? today : tomorrow,
            expected_hours: assignTarget.task.estimated_man_hours
          })
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await fetchTasks();
      setShowAssignModal(false);
    } catch (err) {
      alert('Failed to assign: ' + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      await fetch(`${BASE}/assignments/${assignmentId}`, { method: 'DELETE', headers });
      await fetchTasks();
    } catch { alert('Failed to remove.'); }
  };

  // ── Verify ────────────────────────────────────────────────────────────────
  const openVerify = (task, assignment) => {
    setVerifyTarget({ task, assignment });
    setRejectReason('');
    setShowVerifyModal(true);
  };

  const handleVerify = async (action) => {
    setVerifying(true);
    try {
      const res = await fetch(`${BASE}/schedule/verify`, {
        method: 'POST', headers,
        body: JSON.stringify({
          schedule_id:   verifyTarget.task.schedule_id,
          assignment_id: verifyTarget.assignment.assignment_id,
          action,
          reject_reason: rejectReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await fetchTasks();
      setShowVerifyModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setVerifying(false);
    }
  };

  // ── Dismiss ───────────────────────────────────────────────────────────────
  const handleDismiss = async (scheduleId) => {
    if (!window.confirm('Postpone this task to tomorrow?')) return;
    try {
      await fetch(`${BASE}/schedule/dismiss`, {
        method: 'POST', headers,
        body: JSON.stringify({ schedule_id: scheduleId })
      });
      await fetchTasks();
    } catch { alert('Failed.'); }
  };

  // ── Urgency helpers ───────────────────────────────────────────────────────
  const urgencyColor = (task) => {
    if (task.needs_verification)    return '#8b5cf6';
    if ((task.days_overdue || 0) > 7)  return '#ef4444';
    if ((task.days_overdue || 0) > 0)  return '#f59e0b';
    return '#10b981';
  };
  const urgencyLabel = (task) => {
    if (task.needs_verification)     return 'Verify';
    if ((task.days_overdue || 0) > 7)   return `${task.days_overdue}d overdue`;
    if ((task.days_overdue || 0) > 0)   return `${task.days_overdue}d late`;
    return 'On time';
  };

  // ── Task Card (compact) ───────────────────────────────────────────────────
  const TaskCard = ({ task, field }) => {
    const pendingVerify = task.assignments?.find(a => a.status === 'completed' && !a.verified_at);
    const pct = Math.min(100,
      ((task.total_hours_assigned || 0) / (task.estimated_man_hours || 1)) * 100
    );
    const hoursLeft = Math.max(0, (task.estimated_man_hours || 0) - (task.total_hours_assigned || 0));
    const accentColor = urgencyColor(task);

    return (
      <div className={`sd-task-card ${task.needs_verification ? 'verify-card' : ''}`}
           style={{ '--accent': accentColor }}>
        {/* Top row: name + badge */}
        <div className="sd-card-top">
          <div className="sd-card-dot" style={{ background: accentColor }} />
          <span className="sd-card-name">{task.task_name}</span>
          <span className="sd-card-badge" style={{ background: accentColor + '20', color: accentColor }}>
            {urgencyLabel(task)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="sd-card-progress">
          <div className="sd-progress-track">
            <div className="sd-progress-fill"
              style={{ width: `${pct}%`, background: task.is_fully_assigned ? '#10b981' : '#3b82f6' }} />
          </div>
          <span className="sd-progress-label">
            {task.total_hours_assigned || 0}/{task.estimated_man_hours}h
            {hoursLeft > 0 && ` · ${hoursLeft}h needed`}
          </span>
        </div>

        {/* Meta row */}
        <div className="sd-card-meta">
          {task.estimated_man_hours && (
            <span><FiClock size={11} /> {task.estimated_man_hours}h</span>
          )}
          {task.frequency_days && (
            <span>Every {task.frequency_days}d</span>
          )}
          {task.last_done_date ? (
            <span>Last: {new Date(task.last_done_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          ) : (
            <span className="never-done">Never done</span>
          )}
        </div>

        {/* Assigned workers */}
        {task.assignments?.length > 0 && (
          <div className="sd-card-workers">
            {task.assignments.map(a => (
              <div key={a.assignment_id} className="sd-worker-chip">
                <div className="sd-worker-av">{(a.worker_name || '?').charAt(0)}</div>
                <span>{a.worker_name}</span>
                <span className="sd-worker-status"
                  style={{
                    background: a.status === 'completed' && !a.verified_at ? '#8b5cf6'
                      : a.status === 'completed' ? '#10b981'
                      : a.status === 'in_progress' ? '#3b82f6' : '#f59e0b'
                  }}>
                  {a.status === 'completed' && !a.verified_at ? '✓ Done' : a.status}
                </span>
                <button className="sd-remove-btn" onClick={() => handleRemoveAssignment(a.assignment_id)}>
                  <FiX size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="sd-card-actions">
          {pendingVerify && (
            <button className="sd-btn sd-btn-verify" onClick={() => openVerify(task, pendingVerify)}>
              <FiThumbsUp size={12} /> Verify
            </button>
          )}
          {!task.needs_verification && !task.is_fully_assigned && (
            <button className="sd-btn sd-btn-assign" onClick={() => openAssign(task, field)}>
              {(task.assignments?.length || 0) > 0 ? '+ Worker' : '→ Assign'}
            </button>
          )}
          {task.is_fully_assigned && !task.needs_verification && (
            <span className="sd-fully-assigned"><FiCheck size={11} /> Assigned</span>
          )}
          {viewMode === 'today' && !task.needs_verification
           && (task.assignments?.length || 0) === 0 && task.schedule_id && (
            <button className="sd-btn sd-btn-dismiss" onClick={() => handleDismiss(task.schedule_id)}
                    title="Postpone to tomorrow">
              <FiSkipForward size={12} />
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Add Worker Form ───────────────────────────────────────────────────────
  const AddWorkerModal = () => {
    const [form, setForm] = useState({
      name: '', phone: '', email: '', skills: '', maxHours: '8', preferredLocation: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
      if (!form.name.trim() || !form.email.trim()) return alert('Name and email are required.');
      setSaving(true);
      try {
        const res = await fetch(`${BASE}/workers/invite`, {
          method: 'POST', headers,
          body: JSON.stringify({
            full_name:  form.name,
            email:      form.email,
            phone:      form.phone,
            skills:     form.skills.split(',').map(s => s.trim()).filter(Boolean),
            max_daily_hours: Number(form.maxHours)
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        alert(`Worker ${form.name} added successfully!`);
        setShowAddWorker(false);
        fetchWorkers();
      } catch (err) {
        alert('Failed: ' + err.message);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="sd-modal-overlay" onClick={() => setShowAddWorker(false)}>
        <div className="sd-modal" onClick={e => e.stopPropagation()}>
          <div className="sd-modal-header">
            <h3>Add New Worker</h3>
            <button className="sd-modal-close" onClick={() => setShowAddWorker(false)}><FiX size={18} /></button>
          </div>
          <div className="sd-modal-body">
            {[
              { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'e.g. Kamal Perera' },
              { label: 'Email *', key: 'email', type: 'email', placeholder: 'worker@email.com' },
              { label: 'Phone', key: 'phone', type: 'tel', placeholder: '07XXXXXXXX' },
              { label: 'Skills (comma-separated)', key: 'skills', type: 'text', placeholder: 'Tea Plucking, Weeding' },
              { label: 'Max Hours/Day', key: 'maxHours', type: 'number', placeholder: '8' },
            ].map(f => (
              <div key={f.key} className="sd-form-group">
                <label>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="sd-modal-footer">
            <button className="sd-btn-cancel" onClick={() => setShowAddWorker(false)}>Cancel</button>
            <button className="sd-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Add Worker'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Assign Modal ──────────────────────────────────────────────────────────
  const AssignModal = () => (
    <div className="sd-modal-overlay" onClick={() => setShowAssignModal(false)}>
      <div className="sd-modal" onClick={e => e.stopPropagation()}>
        <div className="sd-modal-header">
          <div>
            <h3>Assign Worker</h3>
            <p>{assignTarget?.task?.task_name} — {assignTarget?.field?.field_name}</p>
          </div>
          <button className="sd-modal-close" onClick={() => setShowAssignModal(false)}><FiX size={18} /></button>
        </div>
        <div className="sd-modal-body">
          {availWorkers.length === 0 ? (
            <div className="sd-empty-state">
              <FiAlertCircle size={28} />
              <p>No available workers for this field</p>
            </div>
          ) : (
            <div className="sd-worker-list">
              {[...availWorkers]
                .sort((a, b) => (b.hours_remaining || 0) - (a.hours_remaining || 0))
                .map(w => (
                  <div key={w.user_id || w.worker_id}
                    className={`sd-worker-option ${String(selectedWorker) === String(w.user_id) ? 'selected' : ''}`}
                    onClick={() => setSelectedWorker(w.user_id)}>
                    <div className="sd-worker-av large">{(w.full_name || '?').charAt(0)}</div>
                    <div className="sd-worker-info">
                      <strong>{w.full_name}</strong>
                      <span>{w.skills?.join(', ') || 'No skills listed'}</span>
                      {w.hours_remaining !== undefined && (
                        <>
                          <div className="sd-hours-bar">
                            <div className="sd-hours-fill"
                              style={{ width: `${((w.hours_used || 0) / w.max_daily_hours) * 100}%` }} />
                          </div>
                          <span className={`sd-hours-text ${w.hours_remaining > 0 ? 'ok' : 'full'}`}>
                            {w.hours_remaining}h of {w.max_daily_hours}h available
                          </span>
                        </>
                      )}
                    </div>
                    <div className={`sd-radio ${String(selectedWorker) === String(w.user_id) ? 'on' : ''}`}>
                      {String(selectedWorker) === String(w.user_id) && <FiCheck size={12} />}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="sd-modal-footer">
          <button className="sd-btn-cancel" onClick={() => setShowAssignModal(false)}>Cancel</button>
          <button className="sd-btn-primary" onClick={handleConfirmAssign}
                  disabled={!selectedWorker || assigning}>
            <FiCheck size={14} /> {assigning ? 'Assigning...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Verify Modal ──────────────────────────────────────────────────────────
  const VerifyModal = () => (
    <div className="sd-modal-overlay" onClick={() => setShowVerifyModal(false)}>
      <div className="sd-modal" onClick={e => e.stopPropagation()}>
        <div className="sd-modal-header">
          <div>
            <h3>Verify Task Completion</h3>
            <p>{verifyTarget?.task?.task_name} — {verifyTarget?.assignment?.worker_name}</p>
          </div>
          <button className="sd-modal-close" onClick={() => setShowVerifyModal(false)}><FiX size={18} /></button>
        </div>
        <div className="sd-modal-body">
          <div className="sd-verify-info">
            <div className="sd-verify-row"><span>Worker</span><strong>{verifyTarget?.assignment?.worker_name}</strong></div>
            <div className="sd-verify-row"><span>Hours logged</span><strong>{verifyTarget?.assignment?.expected_hours}h</strong></div>
            {verifyTarget?.task?.frequency_days && (
              <div className="sd-verify-row"><span>Next due</span><strong>In {verifyTarget?.task?.frequency_days} days</strong></div>
            )}
          </div>
          <p className="sd-verify-q">Was this task completed satisfactorily?</p>
          <div className="sd-form-group">
            <label>Rejection reason (required if rejecting)</label>
            <textarea placeholder="e.g. Work incomplete, wrong area covered..."
              value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} />
          </div>
        </div>
        <div className="sd-modal-footer">
          <button className="sd-btn-cancel" onClick={() => setShowVerifyModal(false)}>Cancel</button>
          <button className="sd-btn-reject" onClick={() => handleVerify('reject')}
                  disabled={verifying || !rejectReason.trim()}>
            <FiThumbsDown size={13} /> Reject
          </button>
          <button className="sd-btn-approve" onClick={() => handleVerify('approve')} disabled={verifying}>
            <FiThumbsUp size={13} /> {verifying ? 'Saving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="sd-layout">
      
      <div className="sd-main">
        {/* Header */}
        <header className="sd-header">
          <div>
            <h1 className="sd-title">Supervisor Dashboard</h1>
            <p className="sd-subtitle">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </header>

        <div className="sd-body">
          {/* Stats */}
          <div className="sd-stats-row">
            {[
              { label: 'Total Tasks',    val: totalTasks,    icon: <FiCalendar size={16} />,     cls: 'blue'   },
              { label: 'Assigned',       val: assignedCount, icon: <FiUsers size={16} />,         cls: 'green'  },
              { label: 'Needs Verify',   val: verifyCount,   icon: <FiCheckCircle size={16} />,   cls: 'purple' },
              { label: 'Overdue',        val: overdueCount,  icon: <FiAlertCircle size={16} />,   cls: 'red'    },
              { label: 'Workers',        val: workers.length, icon: <FiUser size={16} />,          cls: 'teal'   },
            ].map(s => (
              <div key={s.label} className={`sd-stat-card ${s.cls}`}>
                <div className="sd-stat-icon">{s.icon}</div>
                <div>
                  <p className="sd-stat-val">{s.val}</p>
                  <p className="sd-stat-lbl">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* View toggle */}
          <div className="sd-toggle-row">
            <div className="sd-toggle">
              <button className={`sd-tog ${viewMode === 'today' ? 'on' : ''}`}
                      onClick={() => setViewMode('today')}>
                <FiCalendar size={13} /> Today
              </button>
              <button className={`sd-tog ${viewMode === 'tomorrow' ? 'on' : ''}`}
                      onClick={() => setViewMode('tomorrow')}>
                Tomorrow
              </button>
            </div>
          </div>

          {/* Task grid */}
          <div className="sd-content">
            {loading ? (
              <div className="sd-loading">
                <div className="sd-spinner" />
                <p>Loading tasks...</p>
              </div>
            ) : fieldsWithTasks.length === 0 ? (
              <div className="sd-empty-full">
                <FiCheckCircle size={44} />
                <h3>All clear!</h3>
                <p>No tasks scheduled for {viewMode}.</p>
              </div>
            ) : (
              fieldsWithTasks.map(field => {
                const tasks = field.due_tasks || [];
                if (!tasks.length) return null;
                const isExpanded = expandedFields[field.field_id] !== false;

                return (
                  <div key={field.field_id} className="sd-field-group">
                    {/* Field header */}
                    <div className="sd-field-header"
                         onClick={() => setExpandedFields(p => ({ ...p, [field.field_id]: !isExpanded }))}>
                      <div className="sd-field-header-left">
                        <FiMapPin size={14} />
                        <span className="sd-field-name">{field.field_name}</span>
                        <span className="sd-crop-pill">{field.crop_name}</span>
                        {field.location && <span className="sd-field-loc">{field.location}</span>}
                      </div>
                      <div className="sd-field-header-right">
                        <span className="sd-task-count">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
                        {isExpanded ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
                      </div>
                    </div>

                    {/* Task cards grid */}
                    {isExpanded && (
                      <div className="sd-tasks-grid">
                        {tasks.map(task => (
                          <TaskCard key={task.crop_task_id || task.schedule_id || task.task_id}
                                    task={task} field={field} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddWorker  && <AddWorkerModal />}
      {showAssignModal && assignTarget && <AssignModal />}
      {showVerifyModal && verifyTarget && <VerifyModal />}
    </div>
  );
};

export default SupervisorDashboard;