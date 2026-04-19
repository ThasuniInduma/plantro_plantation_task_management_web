import React, { useState, useEffect, useCallback } from 'react';
import {
  FiCalendar, FiCheckCircle, FiClock, FiAlertCircle,
  FiTrendingUp, FiMapPin, FiUsers, FiRefreshCw,
} from 'react-icons/fi';
import './SupervisorDashboard.css';

const BASE = 'http://localhost:8081/api';

export default function SupervisorDashboard() {
  const [harvestModal, setHarvestModal] = useState(false);
  const [harvestData, setHarvestData] = useState({
    field_id: "", quantity: "", unit: "kg", harvest_date: ""
  });

  const [taskView,     setTaskView]     = useState('today');
  const [todayFields,  setTodayFields]  = useState([]);
  const [upcoming,     setUpcoming]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fields,       setFields]       = useState([]);

  const getToken = () => localStorage.getItem('token');
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, uRes] = await Promise.all([
        fetch(`${BASE}/schedule/today`,          { headers: getHeaders(), credentials: 'include' }),
        fetch(`${BASE}/schedule/upcoming?days=7`, { headers: getHeaders(), credentials: 'include' })
      ]);
      const tData = await tRes.json();
      const uData = await uRes.json();
      setTodayFields(Array.isArray(tData) ? tData : []);
      setUpcoming(Array.isArray(uData) ? uData : []);

      if (Array.isArray(tData)) {
        setFields(tData.map(f => ({
          field_id:       f.field_id,
          field_name:     f.field_name,
          location:       f.location,
          area:           f.area,
          crop_name:      f.crop_name,
          total_tasks:    f.due_tasks?.length || 0,
          assigned_tasks: f.due_tasks?.filter(t => (t.assignments?.length || 0) > 0).length || 0,
          needs_verify:   f.due_tasks?.filter(t => t.needs_verification).length || 0,
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const allTasks      = todayFields.flatMap(f => f.due_tasks || []);
  const totalDue      = allTasks.length;
  const fullyAssigned = allTasks.filter(t => t.is_fully_assigned).length;
  const needsVerify   = allTasks.filter(t => t.needs_verification).length;
  const overdue       = allTasks.filter(t => (t.days_overdue || 0) > 0 && !t.needs_verification).length;

  const urgencyColor = (task) => {
    if (task.needs_verification)         return '#8b5cf6';
    if ((task.days_overdue || 0) > 7)    return '#ef4444';
    if ((task.days_overdue || 0) > 0)    return '#f59e0b';
    return '#10b981';
  };
  const urgencyLabel = (task) => {
    if (task.needs_verification)         return 'Verify';
    if ((task.days_overdue || 0) > 7)    return `${task.days_overdue}d overdue`;
    if ((task.days_overdue || 0) > 0)    return `${task.days_overdue}d late`;
    return 'Today';
  };

  const handleHarvestChange = (e) =>
    setHarvestData({ ...harvestData, [e.target.name]: e.target.value });

  const addHarvest = async () => {
    try {
      const res = await fetch(`${BASE}/harvest/add`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(harvestData)
      });
      const data = await res.json();
      if (data.success) {
        alert("Harvest added successfully!");
        setHarvestModal(false);
        setHarvestData({ field_id: "", quantity: "", unit: "kg", harvest_date: "" });
      } else {
        alert(data.message || "Failed to add harvest");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="supdb-layout">
      <div className="supdb-main">
        <header className="supdb-header">
          <div>
            <h1 className="supdb-title">Supervisor Dashboard</h1>
            <p className="supdb-subtitle">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
              })}
            </p>
          </div>
          <button className="supdb-refresh-btn" onClick={fetchAll}>
            <FiRefreshCw size={15} /> Refresh
          </button>
        </header>

        <div className="supdb-body">

          {/* Stats Row */}
          <div className="supdb-stats">
            {[
              { icon: <FiCalendar size={18} />, label: 'Due Today',    val: totalDue,      cls: 'due'    },
              { icon: <FiUsers size={18} />,    label: 'Assigned',     val: fullyAssigned, cls: 'ok'     },
              { icon: <FiCheckCircle size={18}/>,label: 'Needs Verify', val: needsVerify,   cls: 'verify' },
              { icon: <FiAlertCircle size={18}/>, label: 'Overdue',    val: overdue,       cls: 'over'   },
            ].map(s => (
              <div key={s.label} className="supdb-stat">
                <div className={`supdb-stat-ic ${s.cls}`}>{s.icon}</div>
                <div>
                  <p className="supdb-stat-n">{s.val}</p>
                  <p className="supdb-stat-l">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Field Overview */}
          <div className="supdb-section-title"><FiMapPin size={16} /> Fields Overview</div>
          <div className="supdb-fields-grid">
            {loading ? (
              <div className="supdb-loading"><div className="supdb-spin" /><p>Loading...</p></div>
            ) : fields.length === 0 ? (
              <div className="supdb-empty"><p>No fields assigned to you.</p></div>
            ) : fields.map(f => (
              <div key={f.field_id} className="supdb-field-card">
                <div className="supdb-field-top">
                  <div>
                    <h3>{f.field_name}</h3>
                    <p className="supdb-field-loc"><FiMapPin size={11} /> {f.location}</p>
                  </div>
                  <span className="supdb-crop-badge">{f.crop_name}</span>
                </div>
                <div className="supdb-field-stats">
                  <div className="supdb-field-stat">
                    <span className="supdb-fs-label">Tasks Due</span>
                    <span className="supdb-fs-val">{f.total_tasks}</span>
                  </div>
                  <div className="supdb-field-stat">
                    <span className="supdb-fs-label">Assigned</span>
                    <span className="supdb-fs-val ok">{f.assigned_tasks}</span>
                  </div>
                  <div className="supdb-field-stat">
                    <span className="supdb-fs-label">Verify</span>
                    <span className="supdb-fs-val verify">{f.needs_verify}</span>
                  </div>
                </div>
                {f.total_tasks > 0 && (
                  <div className="supdb-field-progress">
                    <div className="supdb-progress-track">
                      <div className="supdb-progress-fill"
                        style={{ width: `${(f.assigned_tasks / f.total_tasks) * 100}%` }} />
                    </div>
                    <span>{Math.round((f.assigned_tasks / f.total_tasks) * 100)}% assigned</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Harvest Management */}
          <div className="supdb-section-title">🌾 Harvest Management</div>
          <div className="supdb-harvest-card">
            <div className="supdb-harvest-info">
              <h3>Record Harvest</h3>
              <p>Add harvest of the field</p>
            </div>
            <button className="supdb-harvest-btn" onClick={() => setHarvestModal(true)}>
              + Add Harvest
            </button>
          </div>

          {harvestModal && (
            <div className="supdb-modal-backdrop">
              <div className="supdb-modal">
                <h3>Add Harvest Record</h3>
                <div className="supdb-form-grid">
                  <select name="field_id" value={harvestData.field_id} onChange={handleHarvestChange}>
                    <option value="">Select Field</option>
                    {fields.map(f => (
                      <option key={f.field_id} value={f.field_id}>{f.field_name}</option>
                    ))}
                  </select>
                  <input name="quantity" type="number" placeholder="Quantity" value={harvestData.quantity} onChange={handleHarvestChange} />
                  <select name="unit" value={harvestData.unit} onChange={handleHarvestChange}>
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                    <option value="count">count</option>
                  </select>
                  <input type="date" name="harvest_date" value={harvestData.harvest_date} onChange={handleHarvestChange} />
                </div>
                <div className="supdb-modal-actions">
                  <button onClick={() => setHarvestModal(false)}>Cancel</button>
                  <button className="primary" onClick={addHarvest}>Save Harvest</button>
                </div>
              </div>
            </div>
          )}

          {/* Task Toggle */}
          <div className="supdb-toggle-row">
            <button className={`supdb-tog ${taskView === 'today' ? 'on' : ''}`} onClick={() => setTaskView('today')}>
              <FiCalendar size={14} /> Today's Tasks
            </button>
            <button className={`supdb-tog ${taskView === 'upcoming' ? 'on' : ''}`} onClick={() => setTaskView('upcoming')}>
              <FiTrendingUp size={14} /> Upcoming (7 Days)
            </button>
          </div>

          {/* Task Content */}
          {loading ? (
            <div className="supdb-loading"><div className="supdb-spin" /><p>Loading tasks...</p></div>
          ) : taskView === 'today' ? (
            todayFields.length === 0 ? (
              <div className="supdb-empty">
                <FiCheckCircle size={36} />
                <p>No tasks due today — all fields on schedule!</p>
              </div>
            ) : (
              <div className="supdb-task-list">
                {todayFields.map(field =>
                  (field.due_tasks || []).map(task => (
                    <div key={`${field.field_id}-${task.schedule_id}`}
                      className={`supdb-task-row ${task.needs_verification ? 'verify-row' : ''}`}>
                      <div className="supdb-task-accent" style={{ background: urgencyColor(task) }} />
                      <div className="supdb-task-info">
                        <div className="supdb-task-top">
                          <span className="supdb-task-name">{task.task_name}</span>
                          <span className="supdb-task-badge"
                            style={{ background: urgencyColor(task) + '22', color: urgencyColor(task) }}>
                            {urgencyLabel(task)}
                          </span>
                        </div>
                        <p className="supdb-task-field">
                          <FiMapPin size={11} /> {field.field_name} · {field.crop_name}
                        </p>
                        <p className="supdb-task-meta">
                          <FiClock size={11} /> {task.total_hours_assigned || 0}/{task.estimated_man_hours}h assigned
                          {(task.assignments?.length || 0) > 0 && (
                            <span> · {task.assignments.length} worker{task.assignments.length !== 1 ? 's' : ''}</span>
                          )}
                        </p>
                      </div>
                      <div className="supdb-task-status">
                        {task.needs_verification ? (
                          <span className="supdb-status-badge verify">Needs Verification</span>
                        ) : task.is_fully_assigned ? (
                          <span className="supdb-status-badge assigned">✓ Assigned</span>
                        ) : (
                          <span className="supdb-status-badge pending">Unassigned</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          ) : (
            upcoming.length === 0 ? (
              <div className="supdb-empty">
                <FiCalendar size={36} /><p>No upcoming tasks in the next 7 days</p>
              </div>
            ) : (
              <div className="supdb-upcoming-list">
                {upcoming.map(row => (
                  <div key={row.schedule_id} className="supdb-up-row">
                    <div className="supdb-up-date">
                      <strong>
                        {new Date(row.next_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </strong>
                      <span>
                        {row.days_until_due === 0 ? 'Today' :
                         row.days_until_due === 1 ? 'Tomorrow' : `In ${row.days_until_due}d`}
                      </span>
                    </div>
                    <div className="supdb-up-info">
                      <strong>{row.task_name}</strong>
                      <p>{row.field_name} · {row.crop_name}</p>
                    </div>
                    <div className="supdb-up-meta">
                      <span><FiClock size={11} /> {row.estimated_man_hours}h</span>
                      <span>Every {row.frequency_days}d</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}