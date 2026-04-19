import React, { useState, useEffect } from 'react';
import SideNav from '../../components/SideNav';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX,
    FiSearch, FiMap, FiMapPin, FiUser, FiLayers, FiBell,
    FiClock, FiCheckCircle, FiAlertCircle, FiCalendar,
    FiUsers, FiChevronRight, FiList, FiAward
} from 'react-icons/fi';
import './fieldManagement.css';

const API = 'http://localhost:8081/api';

const emptyForm = {
    field_name:    '',
    crop_id:       '',
    location:      '',
    area:          '',
    supervisor_id: ''
};

const emptyAssign = {
    task_id:        '',
    worker_id:      '',
    assigned_date:  new Date().toISOString().split('T')[0],
    expected_hours: '',
    remarks:        ''
};

const FieldManagement = ({ logo }) => {
    const [fields,        setFields]        = useState([]);
    const [crops,         setCrops]         = useState([]);
    const [supervisors,   setSupervisors]   = useState([]);
    const [workers,       setWorkers]       = useState([]);
    const [selectedField, setSelectedField] = useState(null);
    const [activeTab,     setActiveTab]     = useState('fields');
    const [detailTab,     setDetailTab]     = useState('overview'); // overview | available | done
    const [showModal,     setShowModal]     = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingField,  setEditingField]  = useState(null);
    const [formData,      setFormData]      = useState(emptyForm);
    const [assignForm,    setAssignForm]    = useState(emptyAssign);
    const [preselectedTask, setPreselectedTask] = useState(null);
    const [searchTerm,    setSearchTerm]    = useState('');
    const [filterCrop,    setFilterCrop]    = useState('all');
    const [loading,       setLoading]       = useState(false);
    const [fieldTasks,    setFieldTasks]    = useState({ scheduled: [], completed: [] });
    const [tasksLoading,  setTasksLoading]  = useState(false);

    useEffect(() => {
        fetchFields();
        fetchCrops();
        fetchSupervisors();
        fetchWorkers();
    }, []);

    const fetchFields = async () => {
        try {
            const res  = await fetch(`${API}/fields`);
            const data = await res.json();
            setFields(Array.isArray(data) ? data : []);
        } catch (err) { console.error('Failed to fetch fields:', err); }
    };

    const fetchCrops = async () => {
        try {
            const res  = await fetch(`${API}/crops`);
            const data = await res.json();
            setCrops(Array.isArray(data) ? data : []);
        } catch (err) { console.error('Failed to fetch crops:', err); }
    };

    const fetchSupervisors = async () => {
        try {
            const res  = await fetch(`${API}/fields/supervisors`);
            const data = await res.json();
            setSupervisors(Array.isArray(data) ? data : []);
        } catch (err) { console.error('Failed to fetch supervisors:', err); }
    };

    const fetchWorkers = async () => {
        try {
            const res  = await fetch(`${API}/fields/workers`);
            const data = await res.json();
            setWorkers(Array.isArray(data) ? data : []);
        } catch (err) { console.error('Failed to fetch workers:', err); }
    };

    const fetchFieldTasks = async (fieldId) => {
        setTasksLoading(true);
        try {
            const res  = await fetch(`${API}/fields/${fieldId}/tasks`);
            const data = await res.json();
            setFieldTasks({
                scheduled: Array.isArray(data.scheduled) ? data.scheduled : [],
                completed: Array.isArray(data.completed) ? data.completed : []
            });
        } catch (err) {
            console.error('Failed to fetch field tasks:', err);
            setFieldTasks({ scheduled: [], completed: [] });
        } finally {
            setTasksLoading(false);
        }
    };

    const handleSelectField = (f) => {
        setSelectedField(f);
        setDetailTab('overview');
        fetchFieldTasks(f.field_id);
    };

    // ── Field CRUD ────────────────────────────────────────────────────────────
    const openAddModal = () => {
        setEditingField(null);
        setFormData(emptyForm);
        setShowModal(true);
    };

    const openEditModal = (f) => {
        setEditingField(f);
        setFormData({
            field_name:    f.field_name,
            crop_id:       String(f.crop_id),
            location:      f.location || '',
            area:          String(f.area),
            supervisor_id: String(f.supervisor_id)
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingField(null);
        setFormData(emptyForm);
    };

    const validateFieldName = (name) => {
  if (!name.trim()) return 'Field name is required.';
  if (name.trim().length < 2) return 'Field name must be at least 2 characters.';
  // ✅ Allow letters, numbers, spaces — no symbols
  if (!/^[a-zA-Z0-9\s]+$/.test(name.trim()))
    return 'Field name can only contain letters, numbers and spaces (no symbols).';
  // ✅ Must have at least one letter
  if (!/[a-zA-Z]/.test(name))
    return 'Field name must contain at least one letter.';
  return null;
};

    const handleSave = async () => {
  const { field_name, crop_id, location, area, supervisor_id } = formData;

  // ── Validations ────────────────────────────────────────────
  const nameError = validateFieldName(field_name);
  if (nameError) { alert(nameError); return; }

  if (!crop_id) { alert('Please select a crop type.'); return; }

  if (!location.trim()) { alert('Location is required.'); return; }
  if (location.trim().length < 3) { alert('Please enter a valid location.'); return; }

  if (!area) { alert('Area is required.'); return; }
  if (isNaN(area) || Number(area) <= 0) { alert('Area must be a positive number.'); return; }
  if (Number(area) > 10000) { alert('Area seems too large. Please verify.'); return; }

  setLoading(true);
  try {
    const payload = {
      field_name: field_name.trim(),
      crop_id: Number(crop_id),
      location: location.trim(),
      area: parseFloat(area),
      supervisor_id: supervisor_id ? Number(supervisor_id) : null
    };

    const url    = editingField ? `${API}/fields/${editingField.field_id}` : `${API}/fields`;
    const method = editingField ? 'PUT' : 'POST';

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');

    if (editingField) {
      setFields(prev => prev.map(f => f.field_id === editingField.field_id ? data : f));
      if (selectedField?.field_id === editingField.field_id) setSelectedField(data);
    } else {
      setFields(prev => [...prev, data]);
    }

    closeModal();
  } catch (err) {
    alert(err.message || 'Something went wrong');
  } finally {
    setLoading(false);
  }
};

    const handleDelete = async (fieldId) => {
        if (!window.confirm('Delete this field? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API}/fields/${fieldId}`, { method: 'DELETE' });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            setFields(prev => prev.filter(f => f.field_id !== fieldId));
            if (selectedField?.field_id === fieldId) setSelectedField(null);
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    // ── Task assignment ───────────────────────────────────────────────────────
    const openAssignModal = (task = null) => {
        setPreselectedTask(task);
        setAssignForm({
            ...emptyAssign,
            task_id: task ? String(task.task_id) : '',
            expected_hours: task ? String(task.estimated_man_hours) : ''
        });
        setShowAssignModal(true);
    };

    const closeAssignModal = () => {
        setShowAssignModal(false);
        setPreselectedTask(null);
        setAssignForm(emptyAssign);
    };

    const handleAssign = async () => {
        const { task_id, worker_id, assigned_date, expected_hours, remarks } = assignForm;
        if (!task_id || !worker_id || !assigned_date) {
            alert('Please select a task, worker and date.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API}/fields/${selectedField.field_id}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task_id:        Number(task_id),
                    worker_id:      Number(worker_id),
                    assigned_date,
                    expected_hours: expected_hours ? Number(expected_hours) : null,
                    remarks:        remarks || null,
                    assigned_by:    1   // replace with auth user id
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Assign failed');
            await fetchFieldTasks(selectedField.field_id);
            closeAssignModal();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const filteredFields = fields.filter(f => {
        const matchSearch =
            f.field_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (f.location  || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (f.crop_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCrop = filterCrop === 'all' || String(f.crop_id) === filterCrop;
        return matchSearch && matchCrop;
    });

    const setField = (key) => (e) => setFormData(prev => ({ ...prev, [key]: e.target.value }));
    const setAssign = (key) => (e) => setAssignForm(prev => ({ ...prev, [key]: e.target.value }));

    const getDueStatus = (daysUntilDue) => {
        if (daysUntilDue < 0)  return { label: 'Overdue',    cls: 'overdue'  };
        if (daysUntilDue === 0) return { label: 'Due Today',  cls: 'today'    };
        if (daysUntilDue <= 7)  return { label: `${daysUntilDue}d`,  cls: 'soon'     };
        return { label: `${daysUntilDue}d`, cls: 'upcoming' };
    };

    const getAssignStatusBadge = (status) => {
        if (!status) return null;
        const map = {
            pending:     { label: 'Pending',     cls: 'badge-pending'     },
            in_progress: { label: 'In Progress', cls: 'badge-progress'    },
            completed:   { label: 'Completed',   cls: 'badge-completed'   },
            rejected:    { label: 'Rejected',    cls: 'badge-rejected'    },
        };
        return map[status] || null;
    };

    const overdueCount  = fieldTasks.scheduled.filter(t => t.days_until_due < 0).length;
    const dueSoonCount  = fieldTasks.scheduled.filter(t => t.days_until_due >= 0 && t.days_until_due <= 7).length;

    return (
        <div className="fm-layout">
            <SideNav
                role="admin"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userName="Admin User"
                userRole="Plantation Owner"
                logo={logo}
            />

            <div className="fm-main">
                {/* ── Header ── */}
                <header className="fm-header">
                    <div>
                        <h1 className="fm-title">Field Management</h1>
                        <p className="fm-subtitle">Manage plantation fields, tasks and assignments</p>
                    </div>
                    <div className="fm-header-actions">
                        
                        <button className="fm-add-btn" onClick={openAddModal}>
                            <FiPlus /> Add New Field
                        </button>
                    </div>
                </header>

                {/* ── Body ── */}
                <div className="fm-body">
                    <div className="fm-grid">

                        {/* ── Left panel ── */}
                        <div className="fm-left">
                            <div className="fm-panel-head">
                                <h2>All Fields ({filteredFields.length})</h2>
                            </div>

                            <div className="fm-controls">
                                <div className="fm-search">
                                    <FiSearch className="fm-search-icon" />
                                    <input
                                        type="text"
                                        className="fm-search-input"
                                        placeholder="Search name, location or crop..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="fm-filter"
                                    value={filterCrop}
                                    onChange={(e) => setFilterCrop(e.target.value)}
                                >
                                    <option value="all">All Crops</option>
                                    {crops.map(c => (
                                        <option key={c.crop_id} value={String(c.crop_id)}>
                                            {c.crop_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="fm-list">
                                {filteredFields.length > 0 ? filteredFields.map(f => (
                                    <div
                                        key={f.field_id}
                                        className={`fm-card ${selectedField?.field_id === f.field_id ? 'active' : ''}`}
                                        onClick={() => handleSelectField(f)}
                                    >
                                        <div className="fm-card-top">
                                            <div className="fm-card-title-group">
                                                <h3 className="fm-card-name">{f.field_name}</h3>
                                                <span className="fm-card-id">F{String(f.field_id).padStart(3,'0')}</span>
                                            </div>
                                            <span className="fm-crop-tag">{f.crop_name}</span>
                                        </div>
                                        <div className="fm-card-info">
                                            <div className="fm-info-row"><FiMapPin className="fm-info-icon" /><span>{f.location}</span></div>
                                            <div className="fm-info-row"><FiLayers className="fm-info-icon" /><span>{f.area} Acres</span></div>
                                            <div className="fm-info-row"><FiUser className="fm-info-icon" /><span>{f.supervisor_name}</span></div>
                                        </div>
                                        <div className="fm-card-actions">
                                            <button className="fm-btn-edit"
                                                onClick={(e) => { e.stopPropagation(); openEditModal(f); }}>
                                                <FiEdit2 /> Edit
                                            </button>
                                            <button className="fm-btn-delete"
                                                onClick={(e) => { e.stopPropagation(); handleDelete(f.field_id); }}>
                                                <FiTrash2 /> Delete
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="fm-empty">
                                        <div className="fm-empty-icon"><FiMap /></div>
                                        <p>No fields found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Right panel ── */}
                        <div className="fm-right">
                            {selectedField ? (
                                <>
                                    {/* Detail header */}
                                    <div className="fm-panel-head">
                                        <div>
                                            <h2>{selectedField.field_name}</h2>
                                            <p className="fm-detail-id">
                                                F{String(selectedField.field_id).padStart(3,'0')} &nbsp;·&nbsp; {selectedField.crop_name}
                                            </p>
                                        </div>
                                        <button className="fm-assign-btn" onClick={() => openAssignModal(null)}>
                                            <FiPlus /> Assign Task
                                        </button>
                                    </div>

                                    {/* Detail tabs */}
                                    <div className="fm-detail-tabs">
                                        {[
                                            { key: 'overview',  label: 'Overview',        icon: <FiMap /> },
                                            { key: 'available', label: `Scheduled (${fieldTasks.scheduled.length})`, icon: <FiList /> },
                                            { key: 'done',      label: `Completed (${fieldTasks.completed.length})`, icon: <FiAward /> },
                                        ].map(t => (
                                            <button
                                                key={t.key}
                                                className={`fm-dtab ${detailTab === t.key ? 'active' : ''}`}
                                                onClick={() => setDetailTab(t.key)}
                                            >
                                                {t.icon} {t.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* ── OVERVIEW TAB ── */}
                                    {detailTab === 'overview' && (
                                        <div className="fm-tab-content">
                                            {/* 3 stat cards */}
                                            <div className="fm-stat-grid">
                                                <div className="fm-stat">
                                                    <div className="fm-stat-icon crop"><FiLayers /></div>
                                                    <div>
                                                        <p className="fm-stat-label">Crop Type</p>
                                                        <p className="fm-stat-value">{selectedField.crop_name}</p>
                                                    </div>
                                                </div>
                                                <div className="fm-stat">
                                                    <div className="fm-stat-icon area"><FiMap /></div>
                                                    <div>
                                                        <p className="fm-stat-label">Field Area</p>
                                                        <p className="fm-stat-value">{selectedField.area} Acres</p>
                                                    </div>
                                                </div>
                                                <div className="fm-stat">
                                                    <div className="fm-stat-icon sup"><FiUser /></div>
                                                    <div>
                                                        <p className="fm-stat-label">Supervisor</p>
                                                        <p className="fm-stat-value">{selectedField.supervisor_name}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Task summary pills */}
                                            {!tasksLoading && (
                                                <div className="fm-task-summary">
                                                    <div className="fm-summary-pill overdue">
                                                        <FiAlertCircle />
                                                        <span><strong>{overdueCount}</strong> Overdue</span>
                                                    </div>
                                                    <div className="fm-summary-pill soon">
                                                        <FiClock />
                                                        <span><strong>{dueSoonCount}</strong> Due Soon</span>
                                                    </div>
                                                    <div className="fm-summary-pill done">
                                                        <FiCheckCircle />
                                                        <span><strong>{fieldTasks.completed.length}</strong> Completed</span>
                                                    </div>
                                                    <div className="fm-summary-pill total">
                                                        <FiLayers />
                                                        <span><strong>{fieldTasks.scheduled.length}</strong> Total Tasks</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="fm-detail-body">
                                                <div className="fm-detail-section">
                                                    <h4>Location</h4>
                                                    <div className="fm-detail-row">
                                                        <span>Address</span>
                                                        <span>{selectedField.location || '—'}</span>
                                                    </div>
                                                </div>
                                                <div className="fm-detail-section">
                                                    <h4>Supervisor</h4>
                                                    <div className="fm-detail-row">
                                                        <span>Name</span>
                                                        <span>{selectedField.supervisor_name}</span>
                                                    </div>
                                                    <div className="fm-detail-row">
                                                        <span>User ID</span>
                                                        <span>#{selectedField.supervisor_id}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="fm-detail-actions">
                                                <button className="fm-action-edit" onClick={() => openEditModal(selectedField)}>
                                                    <FiEdit2 /> Edit Field
                                                </button>
                                                <button className="fm-action-delete" onClick={() => handleDelete(selectedField.field_id)}>
                                                    <FiTrash2 /> Delete Field
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── SCHEDULED TASKS TAB ── */}
                                    {detailTab === 'available' && (
                                        <div className="fm-tab-content scrollable">
                                            {tasksLoading ? (
                                                <div className="fm-loading">Loading tasks…</div>
                                            ) : fieldTasks.scheduled.length > 0 ? (
                                                <div className="fm-task-list">
                                                    {fieldTasks.scheduled.map(task => {
                                                        const due = getDueStatus(task.days_until_due);
                                                        const badge = getAssignStatusBadge(task.latest_assignment_status);
                                                        return (
                                                            <div key={task.schedule_id} className={`fm-task-row ${due.cls}`}>
                                                                <div className="fm-task-row-left">
                                                                    <span className={`fm-due-badge ${due.cls}`}>{due.label}</span>
                                                                    <div className="fm-task-info">
                                                                        <h4>{task.task_name}</h4>
                                                                        <p>{task.description}</p>
                                                                        <div className="fm-task-meta">
                                                                            <span><FiClock /> Every {task.frequency_days}d</span>
                                                                            <span><FiUsers /> {task.estimated_man_hours}h est.</span>
                                                                            {task.last_done_date && (
                                                                                <span><FiCalendar /> Last: {task.last_done_date}</span>
                                                                            )}
                                                                            {task.assigned_worker_name && (
                                                                                <span><FiUser /> {task.assigned_worker_name}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="fm-task-row-right">
                                                                    {badge && (
                                                                        <span className={`fm-status-badge ${badge.cls}`}>{badge.label}</span>
                                                                    )}
                                                                    <button
                                                                        className="fm-assign-small-btn"
                                                                        onClick={() => openAssignModal(task)}
                                                                    >
                                                                        <FiChevronRight /> Assign
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="fm-empty large">
                                                    <div className="fm-empty-icon"><FiList /></div>
                                                    <h3>No Scheduled Tasks</h3>
                                                    <p>No tasks are scheduled for this field yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ── COMPLETED TASKS TAB ── */}
                                    {detailTab === 'done' && (
                                        <div className="fm-tab-content scrollable">
                                            {tasksLoading ? (
                                                <div className="fm-loading">Loading history…</div>
                                            ) : fieldTasks.completed.length > 0 ? (
                                                <div className="fm-task-list">
                                                    {fieldTasks.completed.map(task => (
                                                        <div key={task.assignment_id} className="fm-task-row done">
                                                            <div className="fm-task-row-left">
                                                                <span className="fm-due-badge done">Done</span>
                                                                <div className="fm-task-info">
                                                                    <h4>{task.task_name}</h4>
                                                                    <p>{task.description}</p>
                                                                    <div className="fm-task-meta">
                                                                        <span><FiUser /> {task.worker_name}</span>
                                                                        <span><FiCalendar /> Completed: {task.completed_at || task.assigned_date}</span>
                                                                        {task.actual_hours && (
                                                                            <span><FiClock /> {task.actual_hours}h actual</span>
                                                                        )}
                                                                        {task.expected_hours && (
                                                                            <span><FiClock /> {task.expected_hours}h expected</span>
                                                                        )}
                                                                    </div>
                                                                    {task.remarks && (
                                                                        <p className="fm-task-remarks">"{task.remarks}"</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="fm-task-row-right">
                                                                <span className="fm-status-badge badge-completed">Completed</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="fm-empty large">
                                                    <div className="fm-empty-icon"><FiAward /></div>
                                                    <h3>No Completed Tasks</h3>
                                                    <p>No tasks have been completed for this field yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="fm-empty large">
                                    <div className="fm-empty-icon"><FiMap /></div>
                                    <h3>Select a Field</h3>
                                    <p>Choose a field from the left panel to see its details and tasks</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* ── Add/Edit Field Modal ── */}
            {showModal && (
                <div className="fm-overlay" onClick={closeModal}>
                    <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="fm-modal-head">
                            <h2>{editingField ? 'Edit Field' : 'Add New Field'}</h2>
                            <button className="fm-modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="fm-modal-body">
                            <div className="fm-form-section">
                                <h3>Basic Information</h3>
                                <div className="fm-form-row">
                                    <div className="fm-form-group">
                                        <label>Field Name *</label>
                                        <input type="text" placeholder="e.g. North Hill Field"
                                            value={formData.field_name} onChange={(e) => {
                                                // ✅ Block symbols while typing — allow letters, numbers, spaces only
                                                const val = e.target.value;
                                                if (/^[a-zA-Z0-9\s]*$/.test(val)) {
                                                    setFormData(prev => ({ ...prev, field_name: val }));
                                                }
                                                }} />
                                                {formData.field_name && !/[a-zA-Z]/.test(formData.field_name) && (
                                                    <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>
                                                    Must contain at least one letter
                                                    </span>
                                                )}
                                    </div>
                                    <div className="fm-form-group">
                                        <label>Crop Type *</label>
                                        <select value={formData.crop_id} onChange={setField('crop_id')}>
                                            <option value="">Select Crop</option>
                                            {crops.map(c => (
                                                <option key={c.crop_id} value={c.crop_id}>{c.crop_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="fm-form-row">
                                    <div className="fm-form-group">
                                        <label>Location / Address *</label>
                                        <input type="text" placeholder="e.g. Matara District"
                                            value={formData.location} onChange={setField('location')} />
                                    </div>
                                    <div className="fm-form-group">
                                        <label>Area (Acres) *</label>
                                        <input type="number" step="0.01" min="0" placeholder="e.g. 5.50"
                                            value={formData.area} onChange={setField('area')} />
                                    </div>
                                </div>
                            </div>
                            <div className="fm-form-section">
                                <h3>Supervisor Assignment</h3>
                                <div className="fm-form-group">
                                    <label>Assign Supervisor *</label>
                                    <select value={formData.supervisor_id} onChange={setField('supervisor_id')}>
                                        <option value="">Select Supervisor</option>
                                        {supervisors.map(s => (
                                            <option key={s.user_id} value={s.user_id}>
                                                {s.full_name} — {s.email}
                                            </option>
                                        ))}
                                    </select>
                                    {supervisors.length === 0 && (
                                        <p className="fm-hint">⚠ No active supervisors found.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="fm-modal-foot">
                            <button className="fm-btn-cancel" onClick={closeModal}>Cancel</button>
                            <button className="fm-btn-save" onClick={handleSave} disabled={loading}>
                                {loading ? 'Saving…' : <><FiSave /> {editingField ? 'Update' : 'Save'} Field</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Assign Task Modal ── */}
            {showAssignModal && (
                <div className="fm-overlay" onClick={closeAssignModal}>
                    <div className="fm-modal fm-assign-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="fm-modal-head">
                            <h2>Assign Task — {selectedField?.field_name}</h2>
                            <button className="fm-modal-close" onClick={closeAssignModal}><FiX /></button>
                        </div>
                        <div className="fm-modal-body">
                            <div className="fm-form-section">
                                <h3>Task & Worker</h3>
                                <div className="fm-form-group">
                                    <label>Task *</label>
                                    <select
                                        value={assignForm.task_id}
                                        onChange={setAssign('task_id')}
                                        disabled={!!preselectedTask}
                                    >
                                        <option value="">Select Task</option>
                                        {fieldTasks.scheduled.map(t => (
                                            <option key={t.task_id} value={t.task_id}>{t.task_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="fm-form-group">
                                    <label>Assign Worker *</label>
                                    <select value={assignForm.worker_id} onChange={setAssign('worker_id')}>
                                        <option value="">Select Worker</option>
                                        {workers.map(w => (
                                            <option key={w.worker_id} value={w.worker_id}>
                                                {w.full_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="fm-form-section">
                                <h3>Schedule & Details</h3>
                                <div className="fm-form-row">
                                    <div className="fm-form-group">
                                        <label>Assigned Date *</label>
                                        <input
                                            type="date"
                                            value={assignForm.assigned_date}
                                            onChange={setAssign('assigned_date')}
                                        />
                                    </div>
                                    <div className="fm-form-group">
                                        <label>Expected Hours</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="e.g. 8"
                                            value={assignForm.expected_hours}
                                            onChange={setAssign('expected_hours')}
                                        />
                                    </div>
                                </div>
                                <div className="fm-form-group">
                                    <label>Remarks</label>
                                    <textarea
                                        placeholder="Any notes or instructions..."
                                        value={assignForm.remarks}
                                        onChange={setAssign('remarks')}
                                        rows="3"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="fm-modal-foot">
                            <button className="fm-btn-cancel" onClick={closeAssignModal}>Cancel</button>
                            <button className="fm-btn-save" onClick={handleAssign} disabled={loading}>
                                {loading ? 'Assigning…' : <><FiUsers /> Assign Task</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FieldManagement;