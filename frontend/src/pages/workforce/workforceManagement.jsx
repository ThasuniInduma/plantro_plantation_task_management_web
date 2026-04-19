import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch,
    FiBell, FiClock, FiMapPin, FiPhone, FiMail,
    FiUser, FiAward, FiTrendingUp, FiClipboard,
    FiCheckCircle, FiCalendar, FiRefreshCw, FiAlertCircle,
    FiList, FiLock, FiEye, FiEyeOff, FiShield, FiLayers
} from 'react-icons/fi';
import './workforceManagement.css';
import { api } from '../../context/AppContext'; // ✅ import shared api instance

const API_BASE = '/api/workforce'; // ✅ relative path only

// ─── Constants ────────────────────────────────────────────
const EMPTY_WORKER_FORM = {
    name: '', email: '', phone: '', password: '', role: 'Worker',
    location: [], specialty: [], manHoursPerDay: '', field_id: ''
};

const EMPTY_TASK = {
    task_id: '', field_id: '', hoursRequired: '', dueDate: '', remarks: ''
};

// ─── Toast ────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
    <div className={`toast toast-${type}`}>
        {type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
        <span>{message}</span>
        <button onClick={onClose}><FiX /></button>
    </div>
);

// ─── Password input with show/hide ───────────────────────
const PasswordInput = ({ value, onChange, placeholder = 'Enter password' }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="password-wrapper">
            <input
                type={show ? 'text' : 'password'}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
            <button
                type="button"
                className="password-toggle"
                onClick={() => setShow(s => !s)}
                tabIndex={-1}
            >
                {show ? <FiEyeOff /> : <FiEye />}
            </button>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────
const WorkforceManagement = ({ logo }) => {
    const [workers, setWorkers]               = useState([]);
    const [tasks, setTasks]                   = useState([]);
    const [fields, setFields]                 = useState([]);
    const [unassignedFields, setUnassignedFields] = useState([]);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [workerHistory, setWorkerHistory]   = useState([]);
    const [activeTab, setActiveTab]           = useState('workforce');
    const [detailTab, setDetailTab]           = useState('overview');

    const [showAddModal, setShowAddModal]         = useState(false);
    const [showAssignModal, setShowAssignModal]   = useState(false);
    const [showFieldModal, setShowFieldModal]     = useState(false);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [editingWorker, setEditingWorker]       = useState(null);

    const [form, setForm]                     = useState(EMPTY_WORKER_FORM);
    const [taskAssignment, setTaskAssignment] = useState(EMPTY_TASK);
    const [promoteFieldId, setPromoteFieldId] = useState('');
    const [supervisorFieldId, setSupervisorFieldId] = useState('');

    const [searchTerm, setSearchTerm]     = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterRole, setFilterRole]     = useState('all');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState(false);
    const [toast, setToast]     = useState(null);

    const navigate = useNavigate();

    // ── Toast ────────────────────────────────────────────
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Fetchers ─────────────────────────────────────────
    const fetchWorkers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`${API_BASE}/workers`);
            setWorkers(data.workers || []);
        } catch (err) {
            showToast(err.response?.data?.message || err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDropdowns = useCallback(async () => {
        try {
            const [tasksRes, fieldsRes, unassignedRes] = await Promise.all([
                api.get(`${API_BASE}/tasks`),
                api.get(`${API_BASE}/fields`),
                api.get(`${API_BASE}/fields/unassigned`),
            ]);
            setTasks(tasksRes.data.tasks || []);
            setFields(fieldsRes.data.fields || []);
            setUnassignedFields(unassignedRes.data.fields || []);
        } catch (err) {
            console.error('Dropdown fetch error:', err.response?.data?.message || err.message);
        }
    }, []);

    const fetchWorkerHistory = useCallback(async (workerId) => {
        if (!workerId) return;
        try {
            const { data } = await api.get(`${API_BASE}/workers/${workerId}/tasks`);
            setWorkerHistory(data.tasks || []);
        } catch (err) {
            console.error('History fetch error:', err.response?.data?.message || err.message);
        }
    }, []);

    useEffect(() => {
        fetchWorkers();
        fetchDropdowns();
    }, [fetchWorkers, fetchDropdowns]);

    useEffect(() => {
        if (selectedWorker?.worker_id && detailTab === 'history') {
            fetchWorkerHistory(selectedWorker.worker_id);
        }
    }, [selectedWorker, detailTab, fetchWorkerHistory]);

    // ── Select worker ────────────────────────────────────
    const handleSelectWorker = (worker) => {
        setSelectedWorker(worker);
        setDetailTab('overview');
    };

    // ── Form helpers ─────────────────────────────────────
    const setFormField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const toggleSpecialty = (spec) => {
        setForm(prev => ({
            ...prev,
            specialty: prev.specialty.includes(spec)
                ? prev.specialty.filter(s => s !== spec)
                : [...prev.specialty, spec]
        }));
    };

    // ── Open Add modal ────────────────────────────────────
    const openAddModal = () => {
        setEditingWorker(null);
        setForm(EMPTY_WORKER_FORM);
        setShowAddModal(true);
    };

    // ── Open Edit modal ───────────────────────────────────
    const handleEditWorker = (worker) => {
        setEditingWorker(worker);
        setForm({
            name:           worker.name,
            email:          worker.email,
            phone:          worker.phone || '',
            password:       '',
            role:           worker.role,
            location:       worker.location ? [worker.location] : [],
            specialty:      worker.specialty || [],
            manHoursPerDay: worker.manHoursPerDay?.toString() || '',
            field_id:       worker.supervisorFieldId?.toString() || '',
        });
        setShowAddModal(true);
    };

    const validateWorkerForm = () => {
  const { name, email, phone, password, role, location, specialty, manHoursPerDay, field_id } = form;

  // ── Name: letters and spaces only ──────────────────────
  if (!name.trim()) {
    showToast('Full name is required.', 'error'); return false;
  }
  if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
    showToast('Name can only contain letters and spaces.', 'error'); return false;
  }
  if (name.trim().length < 2) {
    showToast('Name must be at least 2 characters.', 'error'); return false;
  }

  // ── Email ───────────────────────────────────────────────
  if (!email.trim()) {
    showToast('Email is required.', 'error'); return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    showToast('Please enter a valid email address.', 'error'); return false;
  }

  // ── Phone (optional but if filled must be 10 digits) ───
  if (phone && !/^\d{10}$/.test(phone)) {
    showToast('Phone number must be exactly 10 digits (numbers only).', 'error'); return false;
  }

  // ── Password ────────────────────────────────────────────
  if (!editingWorker && !password) {
    showToast('Password is required.', 'error'); return false;
  }
  if (password) {
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error'); return false;
    }
    if (!/(?=.*[a-z])/.test(password)) {
      showToast('Password must contain at least one lowercase letter.', 'error'); return false;
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      showToast('Password must contain at least one uppercase letter.', 'error'); return false;
    }
    if (!/(?=.*\d)/.test(password)) {
      showToast('Password must contain at least one number.', 'error'); return false;
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      showToast('Password must contain at least one special character (@$!%*?&).', 'error'); return false;
    }
  }

  // ── Worker-specific ─────────────────────────────────────
  if (!editingWorker && role === 'Worker') {
    if (!location.length) {
      showToast('Please select at least one preferred field.', 'error'); return false;
    }
    if (!specialty.length) {
      showToast('Please select at least one specialty.', 'error'); return false;
    }
    if (!manHoursPerDay) {
      showToast('Max hours per day is required.', 'error'); return false;
    }
  }

  // ── Supervisor-specific ─────────────────────────────────
  if (!editingWorker && role === 'Supervisor' && !field_id) {
    showToast('Please assign a field for the supervisor.', 'error'); return false;
  }

  return true;
};

    // ── Save: add or update ───────────────────────────────
    const handleSaveWorker = async () => {
  if (!validateWorkerForm()) return;   // ✅ all validation in one place

  setSaving(true);
  try {
    const { name, email, phone, password, role, location, specialty, manHoursPerDay, field_id } = form;

    const payload = {
      full_name: name.trim(),
      email:     email.trim(),
      phone:     phone || null,
      role,
      ...(role === 'Worker'
        ? { location, specialty, manHoursPerDay: parseInt(manHoursPerDay) }
        : { field_id: parseInt(field_id) }
      ),
    };
    if (!editingWorker) payload.password = password;
    if (editingWorker && password) payload.password = password;

    if (editingWorker) {
      await api.put(`${API_BASE}/workers/${editingWorker.user_id}`, payload);
      showToast('Worker updated successfully!');
    } else {
      await api.post(`${API_BASE}/workers`, payload);
      showToast('Worker registered successfully!');
    }

    await fetchWorkers();
    await fetchDropdowns();
    closeModals();
  } catch (err) {
    showToast(err.response?.data?.message || err.message, 'error');
  } finally {
    setSaving(false);
  }
};

    // ── Delete ────────────────────────────────────────────
    const handleDeleteWorker = async (worker) => {
        if (!window.confirm(`Remove ${worker.name} from the workforce?`)) return;
        try {
            await api.delete(`${API_BASE}/workers/${worker.user_id}`);
            showToast('Worker removed successfully.');
            setWorkers(prev => prev.filter(w => w.user_id !== worker.user_id));
            if (selectedWorker?.user_id === worker.user_id) setSelectedWorker(null);
        } catch (err) {
            showToast(err.response?.data?.message || err.message, 'error');
        }
    };

    // ── Toggle Status ─────────────────────────────────────
    const handleToggleStatus = async (worker) => {
        const newStatus = worker.status === 'active' ? 'INACTIVE' : 'ACTIVE';
        try {
            await api.put(`${API_BASE}/workers/${worker.user_id}/status`, { status: newStatus });
            const updated = { ...worker, status: newStatus === 'ACTIVE' ? 'active' : 'inactive' };
            setWorkers(prev => prev.map(w => w.user_id === worker.user_id ? updated : w));
            if (selectedWorker?.user_id === worker.user_id) setSelectedWorker(updated);
            showToast(`Account ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
        } catch (err) {
            showToast(err.response?.data?.message || err.message, 'error');
        }
    };

    // ── Toggle Availability ───────────────────────────────
    const handleToggleAvailability = async (worker) => {
        if (!worker.worker_id) {
            showToast('Worker profile not yet set up.', 'error'); return;
        }
        const newAvail = worker.availability === 'Available' ? 'unavailable' : 'available';
        try {
            await api.put(`${API_BASE}/workers/${worker.worker_id}/availability`, { status: newAvail });
            const updated = {
                ...worker,
                availability: newAvail === 'available' ? 'Available' : 'Not Available'
            };
            setWorkers(prev => prev.map(w => w.user_id === worker.user_id ? updated : w));
            if (selectedWorker?.user_id === worker.user_id) setSelectedWorker(updated);
            showToast('Availability updated.');
        } catch (err) {
            showToast(err.response?.data?.message || err.message, 'error');
        }
    };

    // ── Promote to Supervisor ─────────────────────────────
    const openPromoteModal = () => {
        setPromoteFieldId('');
        setShowPromoteModal(true);
    };

    const handlePromote = async () => {
        if (!promoteFieldId) {
            showToast('Please select a field to assign', 'error'); return;
        }
        setSaving(true);
        try {
            await api.put(`${API_BASE}/workers/${selectedWorker.user_id}/promote`, {
                field_id: parseInt(promoteFieldId)
            });
            showToast(`${selectedWorker.name} promoted to Supervisor!`);
            await fetchWorkers();
            await fetchDropdowns();
            setShowPromoteModal(false);
            setSelectedWorker(null);
        } catch (err) {
            showToast(err.response?.data?.message || err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Supervisor field assignment ───────────────────────
    const openFieldModal = (worker) => {
        setSupervisorFieldId(worker.supervisorFieldId?.toString() || '');
        setShowFieldModal(true);
    };

    const handleSaveSupervisorField = async () => {
        if (!supervisorFieldId) {
            showToast('Please select a field', 'error'); return;
        }
        setSaving(true);
        try {
            await api.put(`${API_BASE}/supervisors/${selectedWorker.user_id}/field`, {
                field_id: parseInt(supervisorFieldId)
            });
            showToast('Field assignment updated!');
            await fetchWorkers();
            await fetchDropdowns();
            const { data } = await api.get(`${API_BASE}/workers`);
            const updated = (data.workers || []).find(w => w.user_id === selectedWorker.user_id);
            if (updated) setSelectedWorker(updated);
            setShowFieldModal(false);
        } catch (err) {
            showToast(err.response?.data?.message || err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Demote Supervisor ─────────────────────────────────
    const handleDemoteSupervisor = async (userId) => {
        if (!window.confirm("Are you sure you want to demote this supervisor to a worker?")) return;
        try {
            await api.put(`${API_BASE}/workers/${userId}/demote`);
            showToast("Supervisor demoted successfully");
            await fetchWorkers();
            await fetchDropdowns();
            setSelectedWorker(null);
        } catch (err) {
            showToast(err.response?.data?.message || err.message, 'error');
        }
    };

    // ── Assign Task ───────────────────────────────────────
    const handleAssignTask = async () => {
        const { task_id, field_id, hoursRequired, dueDate } = taskAssignment;
        if (!task_id || !field_id || !dueDate) {
            showToast('Please fill all required fields', 'error'); return;
        }
        setSaving(true);
        try {
            await api.post(`${API_BASE}/assign-task`, {
                worker_id:     selectedWorker.worker_id,
                task_id:       parseInt(task_id),
                field_id:      parseInt(field_id),
                hoursRequired: parseInt(hoursRequired) || null,
                dueDate,
                remarks:       taskAssignment.remarks || null,
            });
            showToast('Task assigned successfully!');
            await fetchWorkers();
            closeModals();
        } catch (err) {
            showToast(err.response?.data?.message || err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Close all modals ──────────────────────────────────
    const closeModals = () => {
        setShowAddModal(false);
        setShowAssignModal(false);
        setShowFieldModal(false);
        setShowPromoteModal(false);
        setEditingWorker(null);
        setForm(EMPTY_WORKER_FORM);
        setTaskAssignment(EMPTY_TASK);
        setPromoteFieldId('');
        setSupervisorFieldId('');
    };

    // ── Filter ────────────────────────────────────────────
    const filteredWorkers = workers.filter(w => {
        const q = searchTerm.toLowerCase();
        const matchSearch = w.name?.toLowerCase().includes(q) ||
            w.email?.toLowerCase().includes(q);
        const matchStatus = filterStatus === 'all' || w.status === filterStatus;
        const matchRole   = filterRole   === 'all' || w.role   === filterRole;
        return matchSearch && matchStatus && matchRole;
    });

    // ── Helpers ───────────────────────────────────────────
    const statusBadge = (status) => (
        <span className={`status-badge ${status}`}>{status}</span>
    );

    const taskStatusColor = (status) => {
        const map = {
            pending:     'task-pending',
            in_progress: 'task-in-progress',
            completed:   'task-completed',
            rejected:    'task-rejected',
        };
        return map[status] || 'task-pending';
    };

    const fieldsForSupervisor = [
        ...unassignedFields,
        ...(selectedWorker?.supervisorFieldId
            ? fields.filter(f =>
                f.field_id === selectedWorker.supervisorFieldId &&
                !unassignedFields.find(u => u.field_id === f.field_id)
              )
            : []
        ),
    ];

    // ─────────────────────────────────────────────────────
    return (
        <div className="workforce-management-layout">
            <SideNav
                role="admin"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userName="Admin User"
                userRole="Plantation Owner"
                logo={logo}
            />

            <div className="main-content">
                {/* Header */}
                <header className="content-header">
                    <div className="header-left">
                        <h1 className="page-title">Workforce Management</h1>
                        <p className="page-subtitle">Register, manage, and assign workers to tasks</p>
                    </div>
                    <div className="header-actions">
                        <button className="icon-action-btn" onClick={fetchWorkers} title="Refresh">
                            <FiRefreshCw className={loading ? 'spin' : ''} />
                        </button>
                        
                    </div>
                </header>

                {/* Main */}
                <main className="content-body">
                    {loading && workers.length === 0 ? (
                        <div className="loading-state">
                            <FiRefreshCw className="spin" />
                            <p>Loading workforce data…</p>
                        </div>
                    ) : (
                        <div className="workforce-management-container">

                            {/* ── LEFT PANEL ──────────────────── */}
                            <div className="workers-panel">
                                <div className="panel-header">
                                    <div className="panel-title-row">
                                        <h2>Workforce</h2>
                                        <span className="worker-count">{filteredWorkers.length}</span>
                                    </div>
                                    <button className="add-btn" onClick={openAddModal}>
                                        <FiPlus /> Add Worker
                                    </button>
                                </div>

                                {/* Search & Filters */}
                                <div className="search-and-filters">
                                    <div className="search-bar">
                                        <FiSearch className="search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, email…"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                        {searchTerm && (
                                            <button className="clear-search" onClick={() => setSearchTerm('')}>
                                                <FiX />
                                            </button>
                                        )}
                                    </div>
                                    <div className="filter-row">
                                        <div className="filter-group">
                                            <label>Status</label>
                                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                                <option value="all">All</option>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                        <div className="filter-group">
                                            <label>Role</label>
                                            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                                                <option value="all">All</option>
                                                <option value="Supervisor">Supervisor</option>
                                                <option value="Worker">Worker</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Workers list */}
                                <div className="workers-list">
                                    {filteredWorkers.length === 0 ? (
                                        <div className="empty-state">
                                            <FiUser className="empty-icon-sm" />
                                            <p>No workers found</p>
                                        </div>
                                    ) : (
                                        filteredWorkers.map(worker => (
                                            <div
                                                key={worker.user_id}
                                                className={`worker-item ${selectedWorker?.user_id === worker.user_id ? 'active' : ''}`}
                                                onClick={() => handleSelectWorker(worker)}
                                            >
                                                <div className="worker-item-header">
                                                    <div className="worker-info">
                                                        <h3>{worker.name}</h3>
                                                        <span className={`role-badge ${worker.role.toLowerCase()}`}>{worker.role}</span>
                                                    </div>
                                                    {statusBadge(worker.status)}
                                                </div>
                                                <div className="worker-details">
                                                    {worker.role === 'Supervisor' ? (
                                                        <p>
                                                            <FiLayers className="icon" />
                                                            {worker.supervisorFieldName
                                                                ? `Field: ${worker.supervisorFieldName}`
                                                                : 'No field assigned'}
                                                        </p>
                                                    ) : (
                                                        <>
                                                            <p><FiClock className="icon" /> {worker.manHoursPerDay} hrs/day</p>
                                                        </>
                                                    )}
                                                </div>
                                                {worker.role !== 'Supervisor' && (
                                                    <div className="worker-stats">
                                                        <div className="stat">
                                                            <span className="label">Tasks</span>
                                                            <span className="value">{worker.assignedTasks}</span>
                                                        </div>
                                                        <div className="stat">
                                                            <span className="label">Completion</span>
                                                            <span className="value">{worker.completionRate}%</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="worker-item-actions" onClick={e => e.stopPropagation()}>
                                                    <button className="icon-btn edit" title="Edit" onClick={() => handleEditWorker(worker)}>
                                                        <FiEdit2 />
                                                    </button>
                                                    <button className="icon-btn delete" title="Remove" onClick={() => handleDeleteWorker(worker)}>
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* ── RIGHT PANEL ─────────────────── */}
                            <div className="details-panel">
                                {selectedWorker ? (
                                    <>
                                        <div className="panel-header">
                                            <div>
                                                <h2>{selectedWorker.name}</h2>
                                                <p className="panel-subtitle">
                                                    {selectedWorker.role} •{' '}
                                                    {selectedWorker.role === 'Supervisor'
                                                        ? (selectedWorker.supervisorFieldName || 'No field assigned')
                                                        : `${selectedWorker.manHoursPerDay}h/day`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Detail tabs */}
                                        <div className="detail-tab-bar">
                                            <button
                                                className={`detail-tab-btn ${detailTab === 'overview' ? 'active' : ''}`}
                                                onClick={() => setDetailTab('overview')}
                                            >
                                                Overview
                                            </button>
                                            {selectedWorker.role !== 'Supervisor' && (
                                                <button
                                                    className={`detail-tab-btn ${detailTab === 'history' ? 'active' : ''}`}
                                                    onClick={() => setDetailTab('history')}
                                                >
                                                    <FiList /> Task History
                                                </button>
                                            )}
                                        </div>

                                        <div className="details-tabs">
                                            {/* Overview tab */}
                                            {detailTab === 'overview' && (
                                                <div className="tab-content active">
                                                    <div className="info-grid">
                                                        <div className="info-card">
                                                            <span className="info-label">Email</span>
                                                            <span className="info-value">
                                                                <FiMail className="icon" /> {selectedWorker.email}
                                                            </span>
                                                        </div>
                                                        <div className="info-card">
                                                            <span className="info-label">Phone</span>
                                                            <span className="info-value">
                                                                <FiPhone className="icon" /> {selectedWorker.phone || '—'}
                                                            </span>
                                                        </div>
                                                        <div className="info-card">
                                                            <span className="info-label">Joined</span>
                                                            <span className="info-value">
                                                                <FiCalendar className="icon" /> {selectedWorker.joinDate || '—'}
                                                            </span>
                                                        </div>
                                                        {selectedWorker.role === 'Supervisor' ? (
                                                            <div className="info-card">
                                                                <span className="info-label">Assigned Field</span>
                                                                <span className="info-value">
                                                                    <FiLayers className="icon" />
                                                                    {selectedWorker.supervisorFieldName || 'Not assigned'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="info-card">
                                                                <span className="info-label">Availability</span>
                                                                <span className={`info-value availability-${selectedWorker.availability === 'Available' ? 'available' : 'not'}`}>
                                                                    {selectedWorker.availability}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Specialties */}
                                                    {selectedWorker.role !== 'Supervisor' && selectedWorker.specialty?.length > 0 && (
                                                        <div className="specialties-section">
                                                            <h3>Specialties</h3>
                                                            <div className="specialty-tags">
                                                                {selectedWorker.specialty.map((spec, i) => (
                                                                    <span key={i} className="specialty-tag">
                                                                        <FiAward className="icon" /> {spec}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Performance */}
                                                    {selectedWorker.role !== 'Supervisor' && (
                                                        <div className="performance-section">
                                                            <h3>Performance</h3>
                                                            <div className="performance-grid">
                                                                <div className="performance-card">
                                                                    <div className="perf-icon"><FiClipboard /></div>
                                                                    <div className="perf-info">
                                                                        <span className="perf-label">Total Tasks</span>
                                                                        <span className="perf-value">{selectedWorker.assignedTasks}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="performance-card">
                                                                    <div className="perf-icon"><FiCheckCircle /></div>
                                                                    <div className="perf-info">
                                                                        <span className="perf-label">Completion</span>
                                                                        <span className="perf-value">{selectedWorker.completionRate}%</span>
                                                                    </div>
                                                                </div>
                                                                <div className="performance-card">
                                                                    <div className="perf-icon"><FiClock /></div>
                                                                    <div className="perf-info">
                                                                        <span className="perf-label">Hours/Day</span>
                                                                        <span className="perf-value">{selectedWorker.manHoursPerDay}h</span>
                                                                    </div>
                                                                </div>
                                                                <div className="performance-card">
                                                                    <div className="perf-icon"><FiTrendingUp /></div>
                                                                    <div className="perf-info">
                                                                        <span className="perf-label">Account</span>
                                                                        <span className="perf-value" style={{ textTransform: 'capitalize' }}>
                                                                            {selectedWorker.status}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action buttons */}
                                                    <div className="action-buttons">
                                                        {selectedWorker.role !== 'Supervisor' && (
                                                            <button
                                                                className="btn-action primary"
                                                                onClick={() => handleToggleAvailability(selectedWorker)}
                                                            >
                                                                {selectedWorker.availability === 'Available' ? 'Mark Unavailable' : 'Mark Available'}
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn-action secondary"
                                                            onClick={() => handleToggleStatus(selectedWorker)}
                                                        >
                                                            {selectedWorker.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                                                        </button>
                                                    </div>

                                                    {/* Promote button */}
                                                    {selectedWorker.role === 'Worker' && (
                                                        <div className="action-buttons" style={{ marginTop: '0.75rem' }}>
                                                            <button
                                                                className="btn-action promote"
                                                                onClick={() => openPromoteModal(selectedWorker)}
                                                            >
                                                                <FiShield style={{ marginRight: '0.4rem' }} />
                                                                Promote to Supervisor
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Demote Supervisor */}
                                                    {selectedWorker.role === 'Supervisor' && (
                                                        <div className="action-buttons" style={{ marginTop: '0.75rem' }}>
                                                            <button
                                                                className="btn-action"
                                                                style={{ background: '#f59e0b', color: '#fff' }}
                                                                onClick={() => handleDemoteSupervisor(selectedWorker.user_id)}
                                                            >
                                                                Demote to Worker
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Task History tab */}
                                            {detailTab === 'history' && selectedWorker.role !== 'Supervisor' && (
                                                <div className="tab-content active">
                                                    <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                        Recent Task History (Last 20)
                                                    </h3>
                                                    {workerHistory.length === 0 ? (
                                                        <div className="empty-state">
                                                            <FiClipboard className="empty-icon-sm" />
                                                            <p>No task history available</p>
                                                        </div>
                                                    ) : (
                                                        <div className="task-history-list">
                                                            {workerHistory.map(task => (
                                                                <div key={task.assignment_id} className="history-item">
                                                                    <div className="history-item-left">
                                                                        <span className="history-task-name">{task.task_name}</span>
                                                                        <span className="history-field">{task.field_name} — {task.crop_name}</span>
                                                                        <span className="history-date">{task.assigned_date?.split('T')[0]}</span>
                                                                    </div>
                                                                    <div className="history-item-right">
                                                                        <span className={`task-status-badge ${taskStatusColor(task.status)}`}>
                                                                            {task.status}
                                                                        </span>
                                                                        {task.actual_hours && (
                                                                            <span className="history-hours">{task.actual_hours}h</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="empty-state large">
                                        <FiUser className="empty-icon" />
                                        <h3>Select a worker</h3>
                                        <p>Choose a worker from the left panel to view and manage their profile</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ADD / EDIT WORKER MODAL */}
            {showAddModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingWorker ? `Edit — ${editingWorker.name}` : 'Register New Member'}</h2>
                            <button className="close-btn" onClick={closeModals}><FiX /></button>
                        </div>

                        <div className="modal-role-tabs">
                            <button
                                className={`role-tab ${form.role === 'Worker' ? 'active' : ''}`}
                                onClick={() => setFormField('role', 'Worker')}
                                disabled={!!editingWorker}
                            >
                                <FiUser /> Worker
                            </button>
                            <button
                                className={`role-tab ${form.role === 'Supervisor' ? 'active' : ''}`}
                                onClick={() => setFormField('role', 'Supervisor')}
                                disabled={!!editingWorker}
                            >
                                <FiShield /> Supervisor
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        placeholder="Full name"
                                        value={form.name}
                                        onChange={e => {
    // Block numbers and symbols while typing
                                            const val = e.target.value;
                                            if (/^[a-zA-Z\s]*$/.test(val)) setFormField('name', val);
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input
                                        type="tel"
                                        placeholder="+94701234567"
                                        value={form.phone}
                                        onChange={e => {
                                            // Only allow digits
                                            const val = e.target.value.replace(/\D/g, '');
                                            setFormField('phone', val);
                                        }}
                                                                            />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        placeholder="email@plantation.com"
                                        value={form.email}
                                        onChange={e => setFormField('email', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>
                                        {editingWorker ? 'Password' : 'Password *'}
                                        {editingWorker && <span className="label-hint"> (leave blank to keep current)</span>}
                                    </label>
                                    <PasswordInput
                                        value={form.password}
                                        onChange={e => setFormField('password', e.target.value)}
                                        placeholder={editingWorker ? 'Leave blank to keep current' : 'Set a password'}
                                    />
                                </div>
                            </div>

                            {/* WORKER fields */}
                            {form.role === 'Worker' && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Preferred Fields *</label>
                                            <div className="location-checkboxes">
                                                {fields.map(field => (
                                                    <label key={field.field_id} className="checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={form.location.includes(field.field_id)}
                                                            onChange={() => {
                                                                const id = field.field_id;
                                                                setForm(prev => ({
                                                                    ...prev,
                                                                    location: prev.location.includes(id)
                                                                        ? prev.location.filter(l => l !== id)
                                                                        : [...prev.location, id]
                                                                }));
                                                            }}
                                                        />
                                                        <span>{field.field_name} ({field.location})</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Max Hours/Day *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="12"
                                                placeholder="e.g. 8"
                                                value={form.manHoursPerDay}
                                                onChange={e => {
                                                    // Only allow positive integers
                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                    if (val === '' || (Number(val) >= 1 && Number(val) <= 12)) {
                                                    setFormField('manHoursPerDay', val);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Specialties * <span className="label-hint">(select at least one)</span></label>
                                        <div className="specialty-checkboxes">
                                            {tasks.map(task => (
                                                <label
                                                    key={task.task_id}
                                                    className={`checkbox-label ${form.specialty.includes(task.task_name) ? 'selected' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={form.specialty.includes(task.task_name)}
                                                        onChange={() => toggleSpecialty(task.task_name)}
                                                    />
                                                    <span>{task.task_name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* SUPERVISOR fields */}
                            {form.role === 'Supervisor' && (
                                <div className="form-group">
                                    <label>Assign Field *</label>
                                    <select
                                        value={form.field_id}
                                        onChange={e => setFormField('field_id', e.target.value)}
                                    >
                                        <option value="">Select a field…</option>
                                        {(editingWorker ? fields : unassignedFields).map(f => (
                                            <option key={f.field_id} value={f.field_id}>
                                                {f.field_name} ({f.crop_name})
                                                {f.supervisor_name ? ` — Supervisor: ${f.supervisor_name}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {!editingWorker && unassignedFields.length === 0 && (
                                        <p className="field-warning">⚠ All fields already have supervisors assigned.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>Cancel</button>
                            <button className="btn-primary" onClick={handleSaveWorker} disabled={saving}>
                                {saving ? <FiRefreshCw className="spin" /> : <FiSave />}
                                {saving ? 'Saving…' : (editingWorker ? 'Update' : 'Register')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSIGN TASK MODAL */}
            {showAssignModal && selectedWorker && selectedWorker.role !== 'Supervisor' && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Assign Task — {selectedWorker.name}</h2>
                            <button className="close-btn" onClick={closeModals}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Task *</label>
                                    <select
                                        value={taskAssignment.task_id}
                                        onChange={e => setTaskAssignment({ ...taskAssignment, task_id: e.target.value })}
                                    >
                                        <option value="">Select task…</option>
                                        {tasks.map(t => (
                                            <option key={t.task_id} value={t.task_id}>{t.task_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Field *</label>
                                    <select
                                        value={taskAssignment.field_id}
                                        onChange={e => setTaskAssignment({ ...taskAssignment, field_id: e.target.value })}
                                    >
                                        <option value="">Select field…</option>
                                        {fields.map(f => (
                                            <option key={f.field_id} value={f.field_id}>
                                                {f.field_name} ({f.crop_name})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Hours Required</label>
                                    <input
                                        type="number" min="1" max="12" placeholder="e.g. 4"
                                        value={taskAssignment.hoursRequired}
                                        onChange={e => setTaskAssignment({ ...taskAssignment, hoursRequired: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Due Date *</label>
                                    <input
                                        type="date"
                                        value={taskAssignment.dueDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setTaskAssignment({ ...taskAssignment, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Remarks</label>
                                <textarea
                                    placeholder="Optional instructions…"
                                    value={taskAssignment.remarks}
                                    onChange={e => setTaskAssignment({ ...taskAssignment, remarks: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>Cancel</button>
                            <button className="btn-primary" onClick={handleAssignTask} disabled={saving}>
                                {saving ? <FiRefreshCw className="spin" /> : <FiSave />}
                                {saving ? 'Assigning…' : 'Assign Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PROMOTE TO SUPERVISOR MODAL */}
            {showPromoteModal && selectedWorker && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Promote to Supervisor</h2>
                            <button className="close-btn" onClick={closeModals}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="promote-warning">
                                <FiShield className="promote-warning-icon" />
                                <div><strong>Promoting {selectedWorker.name}</strong></div>
                            </div>
                            <div className="form-group" style={{ marginTop: '1.25rem' }}>
                                <label>Assign Field *</label>
                                <select value={promoteFieldId} onChange={e => setPromoteFieldId(e.target.value)}>
                                    <option value="">Select an unassigned field…</option>
                                    {unassignedFields.map(f => (
                                        <option key={f.field_id} value={f.field_id}>
                                            {f.field_name} ({f.crop_name}) — {f.location || 'No location'}
                                        </option>
                                    ))}
                                </select>
                                {unassignedFields.length === 0 && (
                                    <p className="field-warning">⚠ No unassigned fields available.</p>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>Cancel</button>
                            <button
                                className="btn-primary btn-promote"
                                onClick={handlePromote}
                                disabled={saving || !promoteFieldId}
                            >
                                {saving ? <FiRefreshCw className="spin" /> : <FiShield />}
                                {saving ? 'Promoting…' : 'Confirm Promotion'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SUPERVISOR FIELD ASSIGNMENT MODAL */}
            {showFieldModal && selectedWorker && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedWorker.supervisorFieldId ? 'Change Field Assignment' : 'Assign Field'}</h2>
                            <button className="close-btn" onClick={closeModals}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            {selectedWorker.supervisorFieldId && (
                                <div className="current-field-info">
                                    <span className="info-label">Current Field</span>
                                    <span className="current-field-name">
                                        <FiLayers /> {selectedWorker.supervisorFieldName}
                                    </span>
                                </div>
                            )}
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label>{selectedWorker.supervisorFieldId ? 'New Field *' : 'Select Field *'}</label>
                                <select value={supervisorFieldId} onChange={e => setSupervisorFieldId(e.target.value)}>
                                    <option value="">Select a field…</option>
                                    {fieldsForSupervisor.map(f => (
                                        <option key={f.field_id} value={f.field_id}>
                                            {f.field_name} ({f.crop_name})
                                            {f.field_id === selectedWorker.supervisorFieldId ? ' — Current' : ''}
                                        </option>
                                    ))}
                                </select>
                                {fieldsForSupervisor.length === 0 && (
                                    <p className="field-warning">⚠ No available fields to assign.</p>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>Cancel</button>
                            <button
                                className="btn-primary"
                                onClick={handleSaveSupervisorField}
                                disabled={saving || !supervisorFieldId}
                            >
                                {saving ? <FiRefreshCw className="spin" /> : <FiSave />}
                                {saving ? 'Saving…' : 'Save Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default WorkforceManagement;