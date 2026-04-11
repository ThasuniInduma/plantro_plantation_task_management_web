import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch,
    FiBell, FiClock, FiMapPin, FiPhone, FiMail,
    FiUser, FiAward, FiTrendingUp, FiClipboard,
    FiCheckCircle, FiCalendar, FiRefreshCw, FiAlertCircle,
    FiList
} from 'react-icons/fi';
import './workforceManagement.css';

const API_BASE = 'http://localhost:8081/api/workforce';

// ─── small helper ────────────────────────────────────────────
const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
};

const SPECIALTY_OPTIONS = [
    'Tea', 'Coconut', 'Rubber', 'Cinnamon',
    'Tuning', 'Plucking', 'Harvesting', 'Tapping',
    'Weeding', 'Pest Control'
];

const LOCATION_OPTIONS = [
    'Nuwara Eliya District', 'Kandy District', 'Kegalle District',
    'Matara District', 'Galle District', 'Colombo District',
    'Ratnapura District', 'Badulla District'
];

const EMPTY_WORKER = {
    name: '', email: '', phone: '', role: 'Worker',
    location: '', specialty: [], manHoursPerDay: ''
};

const EMPTY_TASK = {
    task_id: '', field_id: '', hoursRequired: '', dueDate: '', remarks: ''
};

// ─── Toast notification ──────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
    <div className={`toast toast-${type}`}>
        {type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
        <span>{message}</span>
        <button onClick={onClose}><FiX /></button>
    </div>
);

// ─── Main component ──────────────────────────────────────────
const WorkforceManagement = ({ logo }) => {
    const [workers, setWorkers] = useState([]);
    const [tasks, setTasks] = useState([]);       // available tasks for dropdown
    const [fields, setFields] = useState([]);      // available fields for dropdown
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [workerHistory, setWorkerHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('workforce');
    const [detailTab, setDetailTab] = useState('overview'); // 'overview' | 'history'

    const [showAddModal, setShowAddModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState(null);

    const [newWorker, setNewWorker] = useState(EMPTY_WORKER);
    const [taskAssignment, setTaskAssignment] = useState(EMPTY_TASK);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterRole, setFilterRole] = useState('all');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const navigate = useNavigate();

    // ── Toast helper ─────────────────────────────────────────
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Fetch workers ─────────────────────────────────────────
    const fetchWorkers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch(`${API_BASE}/workers`);
            setWorkers(data.workers || []);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Fetch tasks & fields for dropdowns ───────────────────
    const fetchDropdowns = useCallback(async () => {
        try {
            const [tasksData, fieldsData] = await Promise.all([
                apiFetch(`${API_BASE}/tasks`),
                apiFetch(`${API_BASE}/fields`),
            ]);
            setTasks(tasksData.tasks || []);
            setFields(fieldsData.fields || []);
        } catch (err) {
            console.error('Dropdown fetch error:', err);
        }
    }, []);

    // ── Fetch worker task history ─────────────────────────────
    const fetchWorkerHistory = useCallback(async (workerId) => {
        if (!workerId) return;
        try {
            const data = await apiFetch(`${API_BASE}/workers/${workerId}/tasks`);
            setWorkerHistory(data.tasks || []);
        } catch (err) {
            console.error('History fetch error:', err);
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

    // ── Select worker (sync state from latest workers list) ───
    const handleSelectWorker = (worker) => {
        setSelectedWorker(worker);
        setDetailTab('overview');
    };

    // ── Add Worker ────────────────────────────────────────────
    const handleAddWorker = async () => {
        const { name, email, phone, role, location, specialty, manHoursPerDay } = newWorker;
        if (!name || !email || !phone || !location || !specialty.length || !manHoursPerDay) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        setSaving(true);
        try {
            await apiFetch(`${API_BASE}/workers`, {
                method: 'POST',
                body: JSON.stringify({
                    full_name: name, email, phone, role, location,
                    specialty, manHoursPerDay: parseInt(manHoursPerDay)
                }),
            });
            showToast('Worker registered successfully!');
            await fetchWorkers();
            closeModals();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Edit Worker ───────────────────────────────────────────
    const handleEditWorker = (worker) => {
        setEditingWorker(worker);
        setNewWorker({
            name: worker.name,
            email: worker.email,
            phone: worker.phone,
            role: worker.role,
            location: worker.location,
            specialty: worker.specialty || [],
            manHoursPerDay: worker.manHoursPerDay?.toString() || ''
        });
        setShowAddModal(true);
    };

    // ── Update Worker ─────────────────────────────────────────
    const handleUpdateWorker = async () => {
        if (!editingWorker) return;
        const { name, email, phone, role, location, specialty, manHoursPerDay } = newWorker;
        if (!name || !email || !location || !specialty.length || !manHoursPerDay) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        setSaving(true);
        try {
            await apiFetch(`${API_BASE}/workers/${editingWorker.user_id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    full_name: name, email, phone, role, location,
                    specialty, manHoursPerDay: parseInt(manHoursPerDay)
                }),
            });
            showToast('Worker updated successfully!');
            await fetchWorkers();
            // Re-sync selected worker
            if (selectedWorker?.user_id === editingWorker.user_id) {
                setSelectedWorker(prev => ({
                    ...prev, name, email, phone, role, location,
                    specialty, manHoursPerDay: parseInt(manHoursPerDay)
                }));
            }
            closeModals();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete Worker ─────────────────────────────────────────
    const handleDeleteWorker = async (worker) => {
        if (!window.confirm(`Remove ${worker.name} from the workforce?`)) return;
        try {
            await apiFetch(`${API_BASE}/workers/${worker.user_id}`, { method: 'DELETE' });
            showToast('Worker removed successfully.');
            setWorkers(prev => prev.filter(w => w.user_id !== worker.user_id));
            if (selectedWorker?.user_id === worker.user_id) setSelectedWorker(null);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // ── Toggle Status ─────────────────────────────────────────
    const handleToggleStatus = async (worker) => {
        const newStatus = worker.status === 'active' ? 'INACTIVE' : 'ACTIVE';
        try {
            await apiFetch(`${API_BASE}/workers/${worker.user_id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus }),
            });
            const updated = { ...worker, status: newStatus === 'ACTIVE' ? 'active' : 'inactive' };
            setWorkers(prev => prev.map(w => w.user_id === worker.user_id ? updated : w));
            if (selectedWorker?.user_id === worker.user_id) setSelectedWorker(updated);
            showToast(`Worker ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Toggle Role: Worker <-> Supervisor
    const handleToggleRole = async (worker) => {
        const newRole = worker.role === 'Worker' ? 'Supervisor' : 'Worker';
        const action = worker.role === 'Worker' ? 'Promote' : 'Demote';
        if (!window.confirm(`${action} ${worker.name} to ${newRole}?`)) return;
        try {
            await apiFetch(`${API_BASE}/workers/${worker.user_id}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole }),
            });
            const updated = { ...worker, role: newRole };
            setWorkers(prev => prev.map(w => w.user_id === worker.user_id ? updated : w));
            if (selectedWorker?.user_id === worker.user_id) setSelectedWorker(updated);
            showToast(`${worker.name} is now a ${newRole}.`);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // ── Toggle Availability ───────────────────────────────────
    const handleToggleAvailability = async (worker) => {
        if (!worker.worker_id) {
            showToast('Worker profile not yet set up.', 'error');
            return;
        }
        const newAvail = worker.availability === 'Available' ? 'unavailable' : 'available';
        try {
            await apiFetch(`${API_BASE}/workers/${worker.worker_id}/availability`, {
                method: 'PUT',
                body: JSON.stringify({ status: newAvail }),
            });
            const updated = {
                ...worker,
                availability: newAvail === 'available' ? 'Available' : 'Not Available'
            };
            setWorkers(prev => prev.map(w => w.user_id === worker.user_id ? updated : w));
            if (selectedWorker?.user_id === worker.user_id) setSelectedWorker(updated);
            showToast(`Availability updated.`);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // ── Assign Task ───────────────────────────────────────────
    const handleAssignTask = async () => {
        const { task_id, field_id, hoursRequired, dueDate } = taskAssignment;
        if (!task_id || !field_id || !dueDate) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        setSaving(true);
        try {
            await apiFetch(`${API_BASE}/assign-task`, {
                method: 'POST',
                body: JSON.stringify({
                    worker_id: selectedWorker.worker_id,
                    task_id: parseInt(task_id),
                    field_id: parseInt(field_id),
                    hoursRequired: parseInt(hoursRequired) || null,
                    dueDate,
                    remarks: taskAssignment.remarks || null,
                }),
            });
            showToast('Task assigned successfully!');
            // Refresh worker to update task count
            await fetchWorkers();
            closeModals();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Specialty toggle ──────────────────────────────────────
    const toggleSpecialty = (spec) => {
        setNewWorker(prev => ({
            ...prev,
            specialty: prev.specialty.includes(spec)
                ? prev.specialty.filter(s => s !== spec)
                : [...prev.specialty, spec]
        }));
    };

    // ── Close modals ──────────────────────────────────────────
    const closeModals = () => {
        setShowAddModal(false);
        setShowAssignModal(false);
        setEditingWorker(null);
        setNewWorker(EMPTY_WORKER);
        setTaskAssignment(EMPTY_TASK);
    };

    // ── Filter workers ────────────────────────────────────────
    const filteredWorkers = workers.filter(w => {
        const q = searchTerm.toLowerCase();
        const matchSearch = w.name?.toLowerCase().includes(q) ||
            w.location?.toLowerCase().includes(q) ||
            w.email?.toLowerCase().includes(q);
        const matchStatus = filterStatus === 'all' || w.status === filterStatus;
        const matchRole = filterRole === 'all' || w.role === filterRole;
        return matchSearch && matchStatus && matchRole;
    });

    // ── Status label helpers ──────────────────────────────────
    const statusBadge = (status) => (
        <span className={`status-badge ${status}`}>{status}</span>
    );

    const taskStatusColor = (status) => {
        const map = {
            pending: 'task-pending',
            in_progress: 'task-in-progress',
            completed: 'task-completed',
            rejected: 'task-rejected',
        };
        return map[status] || 'task-pending';
    };

    // ─────────────────────────────────────────────────────────
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
                        <button className="notification-btn">
                            <FiBell />
                            <span className="notification-badge">5</span>
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

                            {/* ── LEFT PANEL ─────────────────────── */}
                            <div className="workers-panel">
                                <div className="panel-header">
                                    <div className="panel-title-row">
                                        <h2>Workforce</h2>
                                        <span className="worker-count">{filteredWorkers.length}</span>
                                    </div>
                                    <button className="add-btn" onClick={() => setShowAddModal(true)}>
                                        <FiPlus /> Add Worker
                                    </button>
                                </div>

                                {/* Search & Filters */}
                                <div className="search-and-filters">
                                    <div className="search-bar">
                                        <FiSearch className="search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, location…"
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
                                                    <p><FiMapPin className="icon" /> {worker.location}</p>
                                                    <p><FiClock className="icon" /> {worker.manHoursPerDay} hrs/day</p>
                                                </div>
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

                            {/* ── RIGHT PANEL ────────────────────── */}
                            <div className="details-panel">
                                {selectedWorker ? (
                                    <>
                                        <div className="panel-header">
                                            <div>
                                                <h2>{selectedWorker.name}</h2>
                                                <p className="panel-subtitle">
                                                    {selectedWorker.role} • {selectedWorker.location}
                                                </p>
                                            </div>
                                            <button
                                                className="add-btn"
                                                onClick={() => setShowAssignModal(true)}
                                                disabled={!selectedWorker.worker_id}
                                                title={!selectedWorker.worker_id ? 'Worker profile incomplete' : ''}
                                            >
                                                <FiClipboard /> Assign Task
                                            </button>
                                        </div>

                                        {/* Detail tabs */}
                                        <div className="detail-tab-bar">
                                            <button
                                                className={`detail-tab-btn ${detailTab === 'overview' ? 'active' : ''}`}
                                                onClick={() => setDetailTab('overview')}
                                            >
                                                Overview
                                            </button>
                                            <button
                                                className={`detail-tab-btn ${detailTab === 'history' ? 'active' : ''}`}
                                                onClick={() => setDetailTab('history')}
                                            >
                                                <FiList /> Task History
                                            </button>
                                        </div>

                                        <div className="details-tabs">
                                            {detailTab === 'overview' && (
                                                <div className="tab-content active">
                                                    {/* Info grid */}
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
                                                        <div className="info-card">
                                                            <span className="info-label">Availability</span>
                                                            <span className={`info-value availability-${selectedWorker.availability === 'Available' ? 'available' : 'not'}`}>
                                                                {selectedWorker.availability}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Specialties */}
                                                    {selectedWorker.specialty?.length > 0 && (
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

                                                    {/* Action buttons */}
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn-action primary"
                                                            onClick={() => handleToggleAvailability(selectedWorker)}
                                                        >
                                                            {selectedWorker.availability === 'Available' ? 'Mark Unavailable' : 'Mark Available'}
                                                        </button>
                                                        <button
                                                            className="btn-action secondary"
                                                            onClick={() => handleToggleStatus(selectedWorker)}
                                                        >
                                                            {selectedWorker.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                                                        </button>
                                                    </div>
                                                    <div className="action-buttons" style={{ marginTop: '0.75rem' }}>
                                                        <button
                                                            className={`btn-action ${selectedWorker.role === 'Worker' ? 'promote' : 'demote'}`}
                                                            onClick={() => handleToggleRole(selectedWorker)}
                                                        >
                                                            {selectedWorker.role === 'Worker' ? '⬆ Promote to Supervisor' : '⬇ Demote to Worker'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {detailTab === 'history' && (
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

            {/* ── ADD / EDIT WORKER MODAL ───────────────── */}
            {showAddModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingWorker ? 'Edit Worker' : 'Register New Worker'}</h2>
                            <button className="close-btn" onClick={closeModals}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        placeholder="Worker's full name"
                                        value={newWorker.name}
                                        onChange={e => setNewWorker({ ...newWorker, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Role *</label>
                                    <select
                                        value={newWorker.role}
                                        onChange={e => setNewWorker({ ...newWorker, role: e.target.value })}
                                    >
                                        <option value="Worker">Worker</option>
                                        <option value="Supervisor">Supervisor</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        placeholder="worker@plantation.com"
                                        value={newWorker.email}
                                        onChange={e => setNewWorker({ ...newWorker, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone *</label>
                                    <input
                                        type="tel"
                                        placeholder="+94701234567"
                                        value={newWorker.phone}
                                        onChange={e => setNewWorker({ ...newWorker, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Location *</label>
                                    <select
                                        value={newWorker.location}
                                        onChange={e => setNewWorker({ ...newWorker, location: e.target.value })}
                                    >
                                        <option value="">Select location…</option>
                                        {LOCATION_OPTIONS.map(loc => (
                                            <option key={loc} value={loc}>{loc}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Max Hours/Day *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        placeholder="e.g. 8"
                                        value={newWorker.manHoursPerDay}
                                        onChange={e => setNewWorker({ ...newWorker, manHoursPerDay: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Specialties * <span className="label-hint">(select at least one)</span></label>
                                <div className="specialty-checkboxes">
                                    {SPECIALTY_OPTIONS.map(spec => (
                                        <label key={spec} className={`checkbox-label ${newWorker.specialty.includes(spec) ? 'selected' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={newWorker.specialty.includes(spec)}
                                                onChange={() => toggleSpecialty(spec)}
                                            />
                                            <span>{spec}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModals}>Cancel</button>
                            <button
                                className="btn-primary"
                                onClick={editingWorker ? handleUpdateWorker : handleAddWorker}
                                disabled={saving}
                            >
                                {saving ? <FiRefreshCw className="spin" /> : <FiSave />}
                                {saving ? 'Saving…' : (editingWorker ? 'Update Worker' : 'Register Worker')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ASSIGN TASK MODAL ─────────────────────── */}
            {showAssignModal && selectedWorker && (
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
                                        type="number"
                                        min="1"
                                        max="12"
                                        placeholder="e.g. 4"
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
                                    placeholder="Optional instructions or notes…"
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

            {/* ── TOAST ─────────────────────────────────── */}
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