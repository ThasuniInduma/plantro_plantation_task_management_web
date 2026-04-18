import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import './workerDashboard.css';
import {
  FiArrowRight, FiBell, FiCheckCircle, FiClock,
  FiAlertCircle, FiTrendingUp, FiX, FiCalendar,
  FiMap, FiUsers, FiRefreshCw, FiMapPin,
} from 'react-icons/fi';

// ✅ FIX: Use locale-aware date strings so they match MySQL CURDATE() in local timezone
const localDateStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  // 'en-CA' gives YYYY-MM-DD format which matches MySQL date columns
  return d.toLocaleDateString('en-CA');
};

const tomorrowDate = () => localDateStr(1);

const WorkerDashboard = () => {
  const { userData, backendUrl } = useContext(AppContext);

  const [fields, setFields] = useState([]);

  const [tasks,           setTasks]           = useState([]);
  const [tomorrowTasks,   setTomorrowTasks]   = useState([]);
  const [loadingTasks,    setLoadingTasks]    = useState(true);
  const [taskError,       setTaskError]       = useState(null);

  const [activeTab,  setActiveTab]  = useState('worker');
  const [activedTab, setActivedTab] = useState('today');

  const [notifications,      setNotifications]      = useState([]);
  const [unreadCount,        setUnreadCount]        = useState(0);
  const [showNotifications,  setShowNotifications]  = useState(false);
  const [currentTime,        setCurrentTime]        = useState(new Date());

  const [taskReasons,     setTaskReasons]     = useState({});
  const [showReasonInput, setShowReasonInput] = useState({});
  const [completing,      setCompleting]      = useState({});

  const [selectedField, setSelectedField] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incident_type, setIncidentType] = useState('other');
  const [severity, setSeverity] = useState('low');

  const displayName = userData?.full_name || userData?.name || 'Worker';

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Fetch tasks ────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      setTaskError(null);
      const { data } = await axios.get(`${backendUrl}/api/worker/tasks`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (data.success) {
        setTasks(data.todayTasks || []);
        setTomorrowTasks(data.tomorrowTasks || []);
      }
    } catch (err) {
      console.error('fetchTasks:', err);
      setTaskError('Failed to load tasks. Please try again.');
    } finally {
      setLoadingTasks(false);
    }
  }, [backendUrl]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/notifications`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (Array.isArray(data)) {
        const newTaskUpdates = data.filter(n =>
          !n.is_read &&
          ['task_verified', 'task_rejected', 'task_assigned'].includes(n.type)
        );

        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);

        if (newTaskUpdates.length > 0) {
          fetchTasks();
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [backendUrl, fetchTasks]);

  useEffect(() => {
    const load = async () => {
      await fetchNotifications();
      await fetchTasks();
    };
    load();
  }, [fetchNotifications, fetchTasks]);

  // Poll every 30s for new notifications
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await axios.put(`${backendUrl}/api/notifications/read-all`, {}, { withCredentials: true });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  // ── Start (in_progress) ───────────────────────────────────────────────
  const handleStartTask = async (taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'In Progress' } : t));
    try {
      await axios.put(
        `${backendUrl}/api/worker/tasks/${taskId}/status`,
        { status: 'in_progress' },
        { withCredentials: true }
      );
      const task = tasks.find(t => t.id === taskId);
      addNotif(`Started: "${task?.name}"`, 'info');
    } catch (err) {
      console.error(err);
      addNotif('Failed to update status.', 'warning');
      fetchTasks();
    }
  };

  // ── Complete ──────────────────────────────────────────────────────────
  const handleCompleteTask = async (task) => {
    if (completing[task.id]) return;
    setCompleting(prev => ({ ...prev, [task.id]: true }));

    setTasks(prev => prev.map(t =>
      t.id === task.id
        ? { ...t, status: 'Completed', pending_verification: true }
        : t
    ));

    try {
      if (task.schedule_id) {
        await axios.post(
          `${backendUrl}/api/schedule/worker-complete`,
          { assignment_id: task.id },
          { withCredentials: true }
        );
      } else {
        await axios.put(
          `${backendUrl}/api/worker/tasks/${task.id}/status`,
          { status: 'completed' },
          { withCredentials: true }
        );
      }
      addNotif(`"${task.name}" marked done — awaiting supervisor approval ✓`, 'success');
      await fetchTasks();
    } catch (err) {
      console.error(err);
      addNotif('Failed to mark complete.', 'warning');
      fetchTasks();
    } finally {
      setCompleting(prev => ({ ...prev, [task.id]: false }));
    }
  };

  // ── Postpone ──────────────────────────────────────────────────────────
  const handleUnableToday = (task) =>
    setShowReasonInput(prev => ({ ...prev, [task.id]: true }));

  const submitReason = async (task) => {
    const reason = taskReasons[task.id];
    if (!reason?.trim()) { alert('Please enter a reason.'); return; }
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/worker/tasks/${task.id}/postpone`,
        { reason },
        { withCredentials: true }
      );
      if (data.success) {
        addNotif(`"${task.name}" postponed to tomorrow.`, 'info');
        setTaskReasons(prev => ({ ...prev, [task.id]: '' }));
        setShowReasonInput(prev => ({ ...prev, [task.id]: false }));
        await fetchTasks();
      }
    } catch { addNotif('Failed to postpone task.', 'warning'); }
  };

  const cancelReason = (id) => {
    setShowReasonInput(prev => ({ ...prev, [id]: false }));
    setTaskReasons(prev => ({ ...prev, [id]: '' }));
  };

const fetchFields = useCallback(async () => {
  try {
    const { data } = await axios.get(`${backendUrl}/api/fields`, {
      withCredentials: true,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    // ✅ backend returns array directly
    setFields(Array.isArray(data) ? data : []);

  } catch (err) {
    console.error("Error fetching fields:", err);
    setFields([]);
  }
}, [backendUrl]);

useEffect(() => {
  fetchFields();
}, [fetchFields]);

const submitIncident = async () => {
  if (!selectedField || !title || !description) {
    alert("Please fill all required fields");
    return;
  }

  try {
    // ✅ FORCE SAFE ENUM VALUES BEFORE SENDING
    const payload = {
      field_id: Number(selectedField),
      title: title.trim(),
      description: description.trim(),
      incident_type: (incident_type || 'other').toLowerCase(),
      severity: (severity || 'low').toLowerCase()
    };

    console.log("INCIDENT PAYLOAD:", payload);

    const { data } = await axios.post(
      `${backendUrl}/api/incidents`,
      payload,
      {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );

    console.log("INCIDENT RESPONSE:", data);

    if (data.success) {
      alert("Incident reported successfully!");

      // RESET FORM
      setSelectedField('');
      setTitle('');
      setDescription('');
      setIncidentType('other');
      setSeverity('low');
    }

  } catch (err) {
    console.error("INCIDENT ERROR:", err.response?.data || err.message);

    alert(err.response?.data?.message || "Failed to submit incident");
  }
};

  // ── Metrics ───────────────────────────────────────────────────────────
  const completedCount  = tasks.filter(t => t.status === 'Completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const pendingCount    = tasks.filter(t => t.status === 'Assigned').length;
  const completionRate  = tasks.length > 0
    ? Math.round((completedCount / tasks.length) * 100) : 0;

  const getGreeting = () => {
    const h = currentTime.getHours();
    return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
  };

  const tomorrowLabel = new Date(Date.now() + 86_400_000)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const displayTasks = activedTab === 'today' ? tasks : tomorrowTasks;

  const getCardClass = (status) => {
    if (status === 'Completed')   return 'completed';
    if (status === 'In Progress') return 'in-progress';
    return 'assigned';
  };

  const getStatusDot = (status) => {
    if (status === 'Completed')   return '#10b981';
    if (status === 'In Progress') return '#3b82f6';
    return '#f59e0b';
  };

  const notifIcon = (type) => {
    if (type === 'task_verified') return <FiCheckCircle color="#10b981"/>;
    if (type === 'task_rejected') return <FiAlertCircle color="#ef4444"/>;
    if (type === 'task_assigned') return <FiBell color="#3b82f6"/>;
    return <FiBell color="#64748b"/>;
  };

  return (
    <div className="worker-dashboard-layout">
      <div className="main-content">

        {/* ── Header ── */}
        <header className="content-header">
          <div className="header-left">
            <h1 className="page-title">My Dashboard</h1>
            <p className="page-subtitle">Track your daily tasks and progress</p>
          </div>
          <div className="header-actions">
            <button className="notification-btn"
              onClick={() => setShowNotifications(v => !v)}>
              <FiBell size={20}/>
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
            <button className="notification-btn" onClick={fetchTasks} title="Refresh">
              <FiRefreshCw size={18}/>
            </button>
          </div>
        </header>

        {/* ── Notifications dropdown ── */}
        {showNotifications && (
          <>
            <div className="notification-overlay" onClick={() => setShowNotifications(false)}/>
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className="mark-all-btn" onClick={markAllRead}>Mark all read</button>
                )}
              </div>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="empty-notifications">
                    <span className="empty-icon">📭</span>
                    <p>No notifications yet</p>
                  </div>
                ) : notifications.map(n => (
                  <div key={n.notification_id}
                    className={`notification-item ${n.is_read ? '' : 'unread'}`}
                    onClick={async () => {
                      if (!n.is_read) {
                        await axios.put(
                          `${backendUrl}/api/notifications/${n.notification_id}/read`,
                          {},
                          { withCredentials: true }
                        );
                        setNotifications(prev =>
                          prev.map(x =>
                            x.notification_id === n.notification_id
                              ? { ...x, is_read: true }
                              : x
                          )
                        );
                        setUnreadCount(prev => Math.max(0, prev - 1));
                      }
                    }}>
                    <div className="notif-icon">{notifIcon(n.type)}</div>
                    <div className="notif-content">
                      <p className="notif-message">{n.message}</p>
                      <span className="notif-time">
                        {n.created_at
                          ? new Date(n.created_at).toLocaleString('en-US', {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : n.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <main className="content-body">

          {/* ── Welcome ── */}
          <div className="welcome-section">
            <div className="welcome-card">
              <div className="welcome-text">
                <h2>{getGreeting()}, {displayName}! 👋</h2>
                <p>
                  {tasks.length === 0
                    ? 'No tasks assigned for today yet.'
                    : `You have ${tasks.length} task${tasks.length !== 1 ? 's' : ''} today.`}
                </p>
              </div>
              <div className="date-time-display">
                <div className="date-info">
                  <span className="date">
                    {currentTime.toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                  </span>
                  <span className="time">
                    {currentTime.toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Metrics ── */}
          <div className="metrics-section">
            <div className="metric-card completed">
              <div className="metric-icon"><FiCheckCircle size={28}/></div>
              <div className="metric-content">
                <h4>Completed</h4>
                <p className="metric-value">{completedCount}</p>
                <span className="metric-change positive">Today</span>
              </div>
            </div>
            <div className="metric-card progress">
              <div className="metric-icon"><FiClock size={28}/></div>
              <div className="metric-content">
                <h4>In Progress</h4>
                <p className="metric-value">{inProgressCount}</p>
                <span className="metric-change neutral">Active now</span>
              </div>
            </div>
            <div className="metric-card pending">
              <div className="metric-icon"><FiAlertCircle size={28}/></div>
              <div className="metric-content">
                <h4>Pending</h4>
                <p className="metric-value">{pendingCount}</p>
                <span className="metric-change neutral">Awaiting start</span>
              </div>
            </div>
            <div className="metric-card rate">
              <div className="metric-icon"><FiTrendingUp size={28}/></div>
              <div className="metric-content">
                <h4>Completion Rate</h4>
                <p className="metric-value">{completionRate}%</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${completionRate}%` }}/>
                </div>
              </div>
            </div>
          </div>

          {/* ── Incident Reports ── */}
          <div className="incident-card">

  <div className="incident-header">
    <h3>Incident Reports</h3>
    <p>Report issues quickly in one place</p>
  </div>

  {/* FORM INSIDE ONE CARD */}
  <div className="incident-form-row">

    <input
      type="text"
      placeholder="Title"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
    />

    <select
      value={selectedField}
      onChange={(e) => setSelectedField(e.target.value)}
    >
      <option value="">Field</option>
      {fields.map((field) => (
        <option key={field.field_id} value={field.field_id}>
          {field.field_name}
        </option>
      ))}
    </select>

    <select
      value={incident_type}
      onChange={(e) => setIncidentType(e.target.value)}
    >
      <option value="safety">Safety</option>
      <option value="equipment_damage">Equipment</option>
      <option value="weather_issue">Weather</option>
      <option value="theft">Theft</option>
      <option value="other">Other</option>
    </select>

    <select
      value={severity}
      onChange={(e) => setSeverity(e.target.value)}
    >
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>

    <button onClick={submitIncident}>
      Submit
    </button>

  </div>

  {/* DESCRIPTION */}
  <textarea
    className="incident-desc"
    placeholder="Describe the incident..."
    value={description}
    onChange={(e) => setDescription(e.target.value)}
  />

  {/* ACTIONS INSIDE SAME CARD */}
  <div className="incident-footer-actions">

    <button
      className="btn-outline"
      onClick={() => setActiveTab('my-reports')}
    >
      My Reports
    </button>

    <button
      className="btn-primary"
      onClick={() => setActiveTab('new-report')}
    >
      New Report
    </button>

  </div>

</div>

          {/* ── Tasks ── */}
          <div className="tasks-section">
            <div className="section-header">
              <h2>Your Tasks</h2>
              <div className="tab-buttons">
                <button
                  className={`tab-btn ${activedTab === 'today' ? 'active' : ''}`}
                  onClick={() => setActivedTab('today')}>
                  <FiCalendar size={14}/> Today ({tasks.length})
                </button>
                <button
                  className={`tab-btn ${activedTab === 'tomorrow' ? 'active' : ''}`}
                  onClick={() => setActivedTab('tomorrow')}>
                  <FiCalendar size={14}/> Tomorrow ({tomorrowTasks.length})
                </button>
              </div>
            </div>

            <div className="tasks-container">

              {/* Loading */}
              {loadingTasks && (
                <div className="no-tasks">
                  <div className="tasks-loading-spinner"/>
                  <p>Loading tasks…</p>
                </div>
              )}

              {/* Error */}
              {!loadingTasks && taskError && (
                <div className="no-tasks">
                  <FiAlertCircle size={40} color="#f59e0b"/>
                  <h3 style={{ marginTop: 8 }}>{taskError}</h3>
                  <button onClick={fetchTasks} style={{
                    marginTop: 12, padding: '8px 20px',
                    background: '#1a4d2e', color: 'white',
                    border: 'none', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 600,
                  }}>Retry</button>
                </div>
              )}

              {/* Empty */}
              {!loadingTasks && !taskError && displayTasks.length === 0 && (
                <div className="no-tasks">
                  <span className="no-tasks-icon">🌿</span>
                  <h3>No tasks for {activedTab === 'today' ? 'today' : 'tomorrow'}</h3>
                  <p>Check back later or contact your supervisor.</p>
                </div>
              )}

              {/* Task grid */}
              {!loadingTasks && !taskError && displayTasks.length > 0 && (
                <div className="tasks-grid">
                  {displayTasks.map(task => (
                    <div key={task.id}
                      className={`task-card ${getCardClass(task.status)}`}>

                      {/* Card Header */}
                      <div className="task-card-header">
                        <div className="task-status-badge">
                          <span className="status-dot"
                            style={{ background: getStatusDot(task.status) }}/>
                          {task.status}
                        </div>
                        <div className="task-time">
                          <FiClock size={12}/> {task.estimatedTime}h
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="task-title">{task.name}</h3>
                      {task.description && (
                        <p className="task-description">{task.description}</p>
                      )}

                      {/* Details grid */}
                      <div className="task-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">
                            <FiMap size={10}/> Field
                          </span>
                          <p>{task.field}</p>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Crop</span>
                          <p>{task.crop}</p>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">
                            <FiMapPin size={10}/> Location
                          </span>
                          <p>{task.location || '—'}</p>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">
                            <FiUsers size={10}/> Team
                          </span>
                          <p>
                            {task.team.length === 0
                              ? 'Solo task'
                              : `+${task.team.length} teammate${task.team.length > 1 ? 's' : ''}`}
                          </p>
                          
                        </div>
                        {task.deadline_time && (
                            <div className="detail-item">
                              <span className="detail-label">
                                <FiClock size={10}/> Deadline
                              </span>
                              <p style={{ color: '#ef4444', fontWeight: 700 }}>
                                {task.deadline_time}
                              </p>
                            </div>
                          )}
                      </div>
                      

                      {/* Teammates */}
                      {task.team.length > 0 && (
                        <div className="teammates-row">
                          {task.team.slice(0, 3).map((name, i) => (
                            <div key={i} className="teammate-chip">
                              <div className="teammate-av">
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <span>{name.split(' ')[0]}</span>
                            </div>
                          ))}
                          {task.team.length > 3 && (
                            <span className="teammate-more">
                              +{task.team.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Supervisor */}
                      {task.supervisor && task.supervisor !== 'N/A' && (
                        <p className="supervisor-label">
                          Supervisor: <strong>{task.supervisor}</strong>
                        </p>
                      )}

                      {/* ── Actions — today only ── */}
                      {activedTab === 'today' && (
                        <div className="task-actions">

                          {task.status === 'Assigned' && (
                            <>
                              <button className="task-action-btn start-btn"
                                onClick={() => handleStartTask(task.id)}>
                                <FiArrowRight size={15}/> Start Task
                              </button>
                              <button className="task-action-btn unable-btn"
                                onClick={() => handleUnableToday(task)}>
                                Unable Today
                              </button>
                            </>
                          )}

                          {task.status === 'In Progress' && (
                            <>
                              <button
                                className="task-action-btn complete-btn"
                                onClick={() => handleCompleteTask(task)}
                                disabled={completing[task.id]}>
                                <FiCheckCircle size={15}/>
                                {completing[task.id] ? 'Saving...' : 'Mark Complete'}
                              </button>
                              <button className="task-action-btn unable-btn"
                                onClick={() => handleUnableToday(task)}>
                                Unable Today
                              </button>
                            </>
                          )}

                          {task.pending_verification && (
                            <div className="task-verify-badge">
                               Awaiting Supervisor Verification
                            </div>
                          )}

                          {task.status === 'Completed' && !task.pending_verification && (
                            <div className="task-completed-badge">
                              <FiCheckCircle size={15}/> Completed & Verified
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tomorrow badge */}
                      {activedTab === 'tomorrow' && (
                        <div className="task-actions">
                          <div className="task-tomorrow-badge">
                            <FiCalendar size={13}/> Scheduled for tomorrow
                          </div>
                        </div>
                      )}

                      {/* Reason modal */}
                      {showReasonInput[task.id] && (
                        <div className="reason-modal-overlay"
                          onClick={() => cancelReason(task.id)}>
                          <div className="reason-modal"
                            onClick={e => e.stopPropagation()}>
                            <div className="reason-modal-header">
                              <h4>Unable to Complete</h4>
                              <button className="close-btn"
                                onClick={() => cancelReason(task.id)}>
                                <FiX size={18}/>
                              </button>
                            </div>
                            <div className="reason-modal-body">
                              <label>
                                Reason for postponing "{task.name}":
                              </label>
                              <textarea
                                className="reason-input" rows={4} autoFocus
                                placeholder="E.g., Equipment unavailable, weather conditions…"
                                value={taskReasons[task.id] || ''}
                                onChange={e => setTaskReasons(prev => ({
                                  ...prev, [task.id]: e.target.value,
                                }))}
                              />
                            </div>
                            <div className="reason-modal-footer">
                              <button className="reason-cancel-btn"
                                onClick={() => cancelReason(task.id)}>
                                Cancel
                              </button>
                              <button
                                className="reason-submit-btn"
                                onClick={() => submitReason(task)}
                                disabled={!taskReasons[task.id]?.trim()}>
                                Postpone to Tomorrow
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default WorkerDashboard;